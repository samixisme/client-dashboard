import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import {
  createBoardSchema,
  updateBoardSchema,
  listBoardsQuerySchema,
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
  bulkTaskMoveSchema,
} from './schemas/boardSchemas';
import { adminAuthMiddleware } from './adminAuthMiddleware';

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
      entityType: 'board',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Board auditLog write failed');
  }
}

// ─── GET /boards — paginated list ────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listBoardsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, projectId } = query.data;

    let q = getFirestore().collection('boards').orderBy('name').limit(limit) as FirebaseFirestore.Query;
    if (projectId) q = q.where('projectId', '==', projectId);
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('boards').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    const boards = await Promise.all(
      snapshot.docs.map(async (d: any) => {
        const stageCountSnap = await getFirestore()
          .collection('stages')
          .where('boardId', '==', d.id)
          .count()
          .get();
        return {
          id: d.id,
          ...d.data(),
          stageCount: stageCountSnap.data().count,
        };
      })
    );

    const countSnap = await getFirestore().collection('boards').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: boards,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /boards failed');
    res.status(500).json({ success: false, error: 'Failed to list boards' });
  }
});

// ─── GET /boards/:id — single board with stages ─────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('boards').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Board not found' });

    const stagesSnap = await getFirestore()
      .collection('stages')
      .where('boardId', '==', req.params.id)
      .orderBy('order')
      .get();
    const stages = stagesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    res.json({ success: true, data: { id: doc.id, ...doc.data(), stages } });
  } catch (error) {
    logger.error({ err: error }, 'GET /boards/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get board' });
  }
});

// ─── POST /boards — create board + default "To Do" stage ─────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createBoardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const boardRef = await db.collection('boards').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Auto-create default "To Do" stage
    await db.collection('stages').add({
      boardId: boardRef.id,
      name: 'To Do',
      order: 0,
      status: 'Open',
      createdAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', boardRef.id, { name: data.name, projectId: data.projectId });

    res.status(201).json({ success: true, data: { id: boardRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /boards failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create board' });
  }
});

// ─── PUT /boards/:id — update board ──────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateBoardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('boards').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Board not found' });

    await db.collection('boards').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /boards/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update board' });
  }
});

// ─── DELETE /boards/:id — delete board + cascade delete stages ───────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();

    const doc = await db.collection('boards').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Board not found' });

    // Cascade delete all stages belonging to this board
    const stagesSnap = await db.collection('stages').where('boardId', '==', id).get();
    const batch = db.batch();
    stagesSnap.docs.forEach((stageDoc: any) => batch.delete(stageDoc.ref));
    batch.delete(db.collection('boards').doc(id));
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id, { stagesDeleted: stagesSnap.size });

    res.json({ success: true, data: { id, deleted: true, stagesDeleted: stagesSnap.size } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /boards/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete board' });
  }
});

// ─── GET /boards/:id/stages — list stages for board ─────────────────────────

router.get('/:id/stages', async (req: Request, res: Response) => {
  try {
    const stagesSnap = await getFirestore()
      .collection('stages')
      .where('boardId', '==', req.params.id)
      .orderBy('order')
      .get();
    const stages = stagesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    res.json({ success: true, data: stages });
  } catch (error) {
    logger.error({ err: error }, 'GET /boards/:id/stages failed');
    res.status(500).json({ success: false, error: 'Failed to list stages' });
  }
});

// ─── POST /boards/:id/stages — create stage ──────────────────────────────────

router.post('/:id/stages', async (req: Request, res: Response) => {
  try {
    const parsed = createStageSchema.safeParse({ ...req.body, boardId: req.params.id });
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const stageRef = await db.collection('stages').add({
      ...data,
      createdAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create-stage', stageRef.id, { boardId: req.params.id, name: data.name });

    res.status(201).json({ success: true, data: { id: stageRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /boards/:id/stages failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create stage' });
  }
});

// ─── PUT /boards/:id/stages/reorder — reorder stages atomically ─────────────
// NOTE: Registered BEFORE /:id/stages/:stageId to avoid route collision

router.put('/:id/stages/reorder', async (req: Request, res: Response) => {
  try {
    const parsed = reorderStagesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { stages } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();

    stages.forEach(({ id, order }) => {
      batch.update(db.collection('stages').doc(id), { order, updatedAt: new Date().toISOString() });
    });

    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'reorder-stages', req.params.id as string, { count: stages.length });

    res.json({ success: true, data: { reordered: stages.length } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /boards/:id/stages/reorder failed');
    res.status(500).json({ success: false, error: 'Failed to reorder stages' });
  }
});

// ─── PUT /boards/:id/stages/:stageId — update stage ─────────────────────────

router.put('/:id/stages/:stageId', async (req: Request, res: Response) => {
  try {
    const { id, stageId } = req.params;
    const parsed = updateStageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('stages').doc(stageId as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Stage not found' });

    await db.collection('stages').doc(stageId as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update-stage', stageId as string, { boardId: id, ...data as Record<string, unknown> });

    res.json({ success: true, data: { id: stageId, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /boards/:id/stages/:stageId failed');
    res.status(500).json({ success: false, error: 'Failed to update stage' });
  }
});

// ─── DELETE /boards/:id/stages/:stageId — delete stage ──────────────────────

router.delete('/:id/stages/:stageId', async (req: Request, res: Response) => {
  try {
    const { id, stageId } = req.params;
    const db = getFirestore();

    const doc = await db.collection('stages').doc(stageId as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Stage not found' });

    await db.collection('stages').doc(stageId as string).delete();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete-stage', stageId as string, { boardId: id });

    res.json({ success: true, data: { id: stageId, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /boards/:id/stages/:stageId failed');
    res.status(500).json({ success: false, error: 'Failed to delete stage' });
  }
});

// ─── POST /boards/:id/tasks/move-all — move tasks between stages ────────────

router.post('/:id/tasks/move-all', async (req: Request, res: Response) => {
  try {
    const parsed = bulkTaskMoveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { fromStageId, toStageId } = parsed.data;
    const db = getFirestore();

    const tasksSnap = await db.collection('tasks').where('stageId', '==', fromStageId).get();
    if (tasksSnap.empty) {
      return res.json({ success: true, data: { moved: 0 } });
    }

    const batch = db.batch();
    tasksSnap.docs.forEach((taskDoc: any) => {
      batch.update(taskDoc.ref, { stageId: toStageId, updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'move-all-tasks', req.params.id as string, { fromStageId, toStageId, count: tasksSnap.size });

    res.json({ success: true, data: { moved: tasksSnap.size } });
  } catch (error) {
    logger.error({ err: error }, 'POST /boards/:id/tasks/move-all failed');
    res.status(500).json({ success: false, error: 'Failed to move tasks' });
  }
});

// ─── DELETE /boards/:id/tasks/completed — delete completed tasks ─────────────

router.delete('/:id/tasks/completed', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();

    // Get all stages for this board to find tasks scoped to the board
    const stagesSnap = await db.collection('stages').where('boardId', '==', id).get();
    const stageIds = stagesSnap.docs.map((d: any) => d.id);

    if (stageIds.length === 0) {
      return res.json({ success: true, data: { deleted: 0 } });
    }

    // Firestore 'in' queries support max 30 values; batch if needed
    let allCompletedDocs: any[] = [];
    for (let i = 0; i < stageIds.length; i += 30) {
      const chunk = stageIds.slice(i, i + 30);
      const snap = await db
        .collection('tasks')
        .where('stageId', 'in', chunk)
        .where('status', '==', 'completed')
        .get();
      allCompletedDocs = allCompletedDocs.concat(snap.docs);
    }

    if (allCompletedDocs.length === 0) {
      return res.json({ success: true, data: { deleted: 0 } });
    }

    const batch = db.batch();
    allCompletedDocs.forEach((taskDoc: any) => batch.delete(taskDoc.ref));
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete-completed-tasks', id, { count: allCompletedDocs.length });

    res.json({ success: true, data: { deleted: allCompletedDocs.length } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /boards/:id/tasks/completed failed');
    res.status(500).json({ success: false, error: 'Failed to delete completed tasks' });
  }
});

export default router;
