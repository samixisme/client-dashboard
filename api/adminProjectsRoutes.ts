import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  duplicateProjectSchema,
} from './schemas/projectSchemas';

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
      entityType: 'project',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Project auditLog write failed');
  }
}

// ─── GET /projects — paginated list with filters ─────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listProjectsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, search, brandId, status, memberId } = query.data;

    let q = getFirestore().collection('projects').orderBy('name').limit(limit) as FirebaseFirestore.Query;
    if (brandId) q = q.where('brandId', '==', brandId);
    if (status) q = q.where('status', '==', status);
    if (memberId) q = q.where('memberIds', 'array-contains', memberId);
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('projects').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let projects = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      projects = projects.filter((p: any) =>
        (p.name ?? '').toLowerCase().includes(s)
      );
    }

    // Aggregate boardCount per project
    const projectIds = projects.map((p: any) => p.id);
    const boardCounts: Record<string, number> = {};
    if (projectIds.length > 0) {
      // Firestore 'in' queries support max 30 items per batch
      const batches: string[][] = [];
      for (let i = 0; i < projectIds.length; i += 30) {
        batches.push(projectIds.slice(i, i + 30));
      }
      await Promise.all(
        batches.map(async (batch) => {
          const boardSnap = await getFirestore()
            .collection('boards')
            .where('projectId', 'in', batch)
            .get();
          boardSnap.docs.forEach((d: any) => {
            const pid = d.data().projectId;
            boardCounts[pid] = (boardCounts[pid] ?? 0) + 1;
          });
        })
      );
    }
    projects = projects.map((p: any) => ({ ...p, boardCount: boardCounts[p.id] ?? 0 }));

    const countSnap = await getFirestore().collection('projects').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: projects,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /projects failed');
    res.status(500).json({ success: false, error: 'Failed to list projects' });
  }
});

// ─── GET /projects/:id ───────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('projects').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /projects/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get project' });
  }
});

// ─── POST /projects — create with member validation ─────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    // Validate memberIds exist in users collection
    if (data.memberIds.length > 0) {
      // ⚡ Bolt: Use db.getAll for efficient batched fetching instead of Promise.all with individual gets
      const refs = data.memberIds.map((uid) => db.collection('users').doc(uid));
      const memberChecks = await db.getAll(...refs);
      const missing = data.memberIds.filter((_, i) => !memberChecks[i].exists);
      if (missing.length > 0) {
        return res.status(400).json({ success: false, error: `Users not found: ${missing.join(', ')}` });
      }
    }

    const docRef = await db.collection('projects').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { name: data.name });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /projects failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create project' });
  }
});

// ─── PUT /projects/:id ───────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('projects').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Project not found' });

    await db.collection('projects').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /projects/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// ─── DELETE /projects/:id ────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('projects').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Project not found' });
    await db.collection('projects').doc(id as string).delete();
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /projects/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

// ─── POST /projects/:id/duplicate — duplicate project + boards ──────────────

router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = duplicateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const db = getFirestore();

    const originalDoc = await db.collection('projects').doc(id as string).get();
    if (!originalDoc.exists) return res.status(404).json({ success: false, error: 'Project not found' });

    const originalData = originalDoc.data()!;
    const newName = parsed.data.newName ?? `Copy of ${originalData.name}`;
    const now = new Date().toISOString();

    // Create duplicated project
    const { ...projectFields } = originalData;
    Reflect.deleteProperty(projectFields, 'createdAt');
    Reflect.deleteProperty(projectFields, 'updatedAt');
    const newProjectRef = await db.collection('projects').add({
      ...projectFields,
      name: newName,
      createdAt: now,
      updatedAt: now,
    });

    // Copy all boards belonging to original project
    const boardsSnap = await db.collection('boards').where('projectId', '==', id).get();
    if (!boardsSnap.empty) {
      const batch = db.batch();
      boardsSnap.docs.forEach((boardDoc: any) => {
        const boardData = boardDoc.data();
        const newBoardRef = db.collection('boards').doc();
        batch.set(newBoardRef, {
          ...boardData,
          projectId: newProjectRef.id,
          createdAt: now,
          updatedAt: now,
        });
      });
      await batch.commit();
    }

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'duplicate', newProjectRef.id, { sourceProjectId: id, name: newName });

    res.status(201).json({
      success: true,
      data: { id: newProjectRef.id, ...projectFields, name: newName, createdAt: now, updatedAt: now },
    });
  } catch (error) {
    logger.error({ err: error }, 'POST /projects/:id/duplicate failed');
    res.status(500).json({ success: false, error: 'Failed to duplicate project' });
  }
});

// ─── PATCH /projects/:id/archive — toggle Active ↔ Archived ─────────────────

router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();

    const doc = await db.collection('projects').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Project not found' });

    const current = doc.data()!;
    const newStatus = current.status === 'Active' ? 'Archived' : 'Active';

    await db.collection('projects').doc(id as string).update({ status: newStatus, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'archive-toggle', id, { from: current.status, to: newStatus });

    res.json({ success: true, data: { id, ...current, status: newStatus } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /projects/:id/archive failed');
    res.status(500).json({ success: false, error: 'Failed to toggle archive status' });
  }
});

export default router;
