import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import {
  createRoadmapItemSchema,
  updateRoadmapItemSchema,
  listRoadmapItemsQuerySchema,
  reorderRoadmapItemsSchema
} from './schemas/roadmapSchemas';

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
      entityType: 'roadmapItem',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Roadmap auditLog write failed');
  }
}

// ─── GET / — paginated list ──────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listRoadmapItemsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, projectId, status, quarter, search } = query.data;
    const db = getFirestore();

    const collectionRef = db.collection(`projects/${projectId}/roadmapItems`);
    let q = collectionRef.orderBy('order').limit(limit) as FirebaseFirestore.Query;
    
    if (status) q = q.where('status', '==', status);
    if (quarter) q = q.where('quarter', '==', quarter);
    
    if (startAfter) {
      const cursorDoc = await collectionRef.doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      items = items.filter((item: any) => (item.title ?? '').toLowerCase().includes(s));
    }

    const countSnap = await collectionRef.count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /roadmap failed');
    res.status(500).json({ success: false, error: 'Failed to list roadmap items' });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required in query params' });
    }

    const doc = await getFirestore().collection(`projects/${projectId}/roadmapItems`).doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Roadmap item not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /roadmap/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get roadmap item' });
  }
});

// ─── POST / — create ──────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createRoadmapItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection(`projects/${data.projectId}/roadmapItems`).add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { title: data.title, projectId: data.projectId });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /roadmap failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create roadmap item' });
  }
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const projectId = req.query.projectId as string;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required in query params' });
    }

    const parsed = updateRoadmapItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const collectionRef = db.collection(`projects/${projectId}/roadmapItems`);
    const existing = await collectionRef.doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Roadmap item not found' });

    await collectionRef.doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, { ...data, projectId });

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /roadmap/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update roadmap item' });
  }
});

// ─── PATCH /reorder ───────────────────────────────────────────────────────────

router.patch('/reorder', async (req: Request, res: Response) => {
  try {
    const { projectId, items } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required in body' });
    }
    
    const parsed = reorderRoadmapItemsSchema.safeParse({ items });
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }

    const db = getFirestore();
    const batch = db.batch();
    const collectionRef = db.collection(`projects/${projectId}/roadmapItems`);

    parsed.data.items.forEach((item) => {
      const docRef = collectionRef.doc(item.id);
      batch.update(docRef, { order: item.order, updatedAt: new Date().toISOString() });
    });

    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'reorder', 'multiple', { projectId, count: items.length });

    res.json({ success: true, data: { reorderedCount: items.length } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /reorder failed');
    res.status(500).json({ success: false, error: 'Failed to reorder roadmap items' });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const projectId = req.query.projectId as string;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required in query params' });
    }

    const db = getFirestore();
    const collectionRef = db.collection(`projects/${projectId}/roadmapItems`);
    const doc = await collectionRef.doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Roadmap item not found' });
    
    await collectionRef.doc(id as string).delete();
    
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id, { projectId });
    
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /roadmap/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete roadmap item' });
  }
});

export default router;
