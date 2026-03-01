import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  bulkStatusSchema,
  bulkPrioritySchema,
  bulkReassignSchema,
  bulkDeleteSchema,
} from './schemas/taskSchemas';

const router = Router();
router.use(adminAuthMiddleware);

// ─── Helper: audit log (best-effort) ─────────────────────────────────────────

async function auditLog(
  adminUid: string,
  actionType: string,
  entityId: string,
  details: Record<string, unknown> = {}
) {
  try {
    await getFirestore().collection('adminAuditLog').add({
      adminUserId: adminUid,
      entityType: 'task',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Task auditLog write failed');
  }
}

// ─── Helper: fetch timeLogs for a set of task IDs ─────────────────────────────

async function fetchTimeLogsForTasks(taskIds: string[]) {
  if (taskIds.length === 0) return new Map<string, any[]>();

  const db = getFirestore();
  const map = new Map<string, any[]>();

  // Firestore 'in' queries support max 30 values per call
  const chunks: string[][] = [];
  for (let i = 0; i < taskIds.length; i += 30) {
    chunks.push(taskIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const snap = await db
      .collection('timeLogs')
      .where('taskId', 'in', chunk)
      .get();
    snap.docs.forEach((d) => {
      const log = { id: d.id, ...d.data() };
      const tid = d.data().taskId as string;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(log);
    });
  }

  return map;
}

// ─── Helper: delete timeLogs for task IDs (batched) ───────────────────────────

async function deleteTimeLogsForTasks(taskIds: string[]) {
  const db = getFirestore();
  const chunks: string[][] = [];
  for (let i = 0; i < taskIds.length; i += 30) {
    chunks.push(taskIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const snap = await db
      .collection('timeLogs')
      .where('taskId', 'in', chunk)
      .get();

    if (snap.empty) continue;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ─── GET /tasks — paginated list with filters ─────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listTasksQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, boardId, stageId, priority, status, assignee, search, sortBy, sortDir, expandTimeLogs } = query.data;

    const db = getFirestore();
    let q = db.collection('tasks').orderBy(sortBy, sortDir).limit(limit) as FirebaseFirestore.Query;

    if (boardId) q = q.where('boardId', '==', boardId);
    if (stageId) q = q.where('stageId', '==', stageId);
    if (priority) q = q.where('priority', '==', priority);
    if (status) q = q.where('status', '==', status);
    if (assignee) q = q.where('assignees', 'array-contains', assignee);

    if (startAfter) {
      const cursorDoc = await db.collection('tasks').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let tasks = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Client-side search on title (Firestore doesn't support full-text)
    if (search) {
      const s = search.toLowerCase();
      tasks = tasks.filter((t: any) => (t.title ?? '').toLowerCase().includes(s));
    }

    // Optionally expand timeLogs
    if (expandTimeLogs) {
      const taskIds = tasks.map((t: any) => t.id);
      const timeLogsMap = await fetchTimeLogsForTasks(taskIds);
      tasks = tasks.map((t: any) => {
        const logs = timeLogsMap.get(t.id) ?? [];
        const totalTimeLogged = logs.reduce((sum: number, l: any) => sum + (l.duration ?? 0), 0);
        return { ...t, timeLogs: logs, totalTimeLogged };
      });
    }

    const countSnap = await db.collection('tasks').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: tasks,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /tasks failed');
    res.status(500).json({ success: false, error: 'Failed to list tasks' });
  }
});

// ─── GET /tasks/:id ───────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('tasks').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Task not found' });

    const timeLogsSnap = await db
      .collection('timeLogs')
      .where('taskId', '==', req.params.id)
      .get();
    const timeLogs = timeLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const totalTimeLogged = timeLogs.reduce((sum: number, l: any) => sum + (l.duration ?? 0), 0);

    res.json({
      success: true,
      data: { id: doc.id, ...doc.data(), timeLogs, totalTimeLogged },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /tasks/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

// ─── POST /tasks — create task ────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();
    const now = new Date().toISOString();

    const docRef = await db.collection('tasks').add({
      ...data,
      createdAt: now,
      dateAssigned: now,
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { title: data.title, boardId: data.boardId });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data, createdAt: now, dateAssigned: now } });
  } catch (error) {
    logger.error({ err: error }, 'POST /tasks failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create task' });
  }
});

// ─── PUT /tasks/:id — update task ─────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('tasks').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Task not found' });

    await db.collection('tasks').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /tasks/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// ─── DELETE /tasks/:id — delete task + associated timeLogs ────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('tasks').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Task not found' });

    // Delete associated timeLogs in a batch
    const timeLogsSnap = await db.collection('timeLogs').where('taskId', '==', id).get();
    if (!timeLogsSnap.empty) {
      const batch = db.batch();
      timeLogsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await db.collection('tasks').doc(id as string).delete();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id);

    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /tasks/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

// ─── POST /tasks/bulk-status — batch update status ────────────────────────────

router.post('/bulk-status', async (req: Request, res: Response) => {
  try {
    const parsed = bulkStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { taskIds, status } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    taskIds.forEach((taskid) => {
      batch.update(db.collection('tasks').doc(taskid), { status, updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-status', taskIds.join(','), { count: taskIds.length, status });

    res.json({ success: true, data: { updated: taskIds.length } });
  } catch (error) {
    logger.error({ err: error }, 'POST /tasks/bulk-status failed');
    res.status(500).json({ success: false, error: 'Bulk status update failed' });
  }
});

// ─── POST /tasks/bulk-priority — batch update priority ────────────────────────

router.post('/bulk-priority', async (req: Request, res: Response) => {
  try {
    const parsed = bulkPrioritySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { taskIds, priority } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    taskIds.forEach((taskid) => {
      batch.update(db.collection('tasks').doc(taskid), { priority, updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-priority', taskIds.join(','), { count: taskIds.length, priority });

    res.json({ success: true, data: { updated: taskIds.length } });
  } catch (error) {
    logger.error({ err: error }, 'POST /tasks/bulk-priority failed');
    res.status(500).json({ success: false, error: 'Bulk priority update failed' });
  }
});

// ─── POST /tasks/bulk-reassign — batch update assignees ───────────────────────

router.post('/bulk-reassign', async (req: Request, res: Response) => {
  try {
    const parsed = bulkReassignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { taskIds, assignees } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    taskIds.forEach((taskid) => {
      batch.update(db.collection('tasks').doc(taskid), { assignees, updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-reassign', taskIds.join(','), { count: taskIds.length, assignees });

    res.json({ success: true, data: { updated: taskIds.length } });
  } catch (error) {
    logger.error({ err: error }, 'POST /tasks/bulk-reassign failed');
    res.status(500).json({ success: false, error: 'Bulk reassign failed' });
  }
});

// ─── POST /tasks/bulk-delete — batch delete tasks + timeLogs ──────────────────

router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { taskIds } = parsed.data;
    const db = getFirestore();

    // Delete associated timeLogs first
    await deleteTimeLogsForTasks(taskIds);

    // Delete tasks in batch
    const batch = db.batch();
    taskIds.forEach((taskid) => batch.delete(db.collection('tasks').doc(taskid)));
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-delete', taskIds.join(','), { count: taskIds.length });

    res.json({ success: true, data: { updated: taskIds.length } });
  } catch (error) {
    logger.error({ err: error }, 'POST /tasks/bulk-delete failed');
    res.status(500).json({ success: false, error: 'Bulk delete failed' });
  }
});

export default router;
