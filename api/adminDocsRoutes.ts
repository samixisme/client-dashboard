import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import {
  createDocSchema,
  updateDocSchema,
  listDocsQuerySchema,
} from './schemas/docSchemas';
import { z } from 'zod';
import { adminAuthMiddleware } from './adminAuthMiddleware';

const router = Router();
router.use(adminAuthMiddleware);

// ─── Helper: audit log ─────────────────────────────────────────

async function auditLog(
  adminUid: string,
  actionType: string,
  entityId: string,
  details: Record<string, unknown> = {}
) {
  try {
    await getFirestore().collection('adminAuditLog').add({
      adminUserId: adminUid,
      entityType: 'doc',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Doc auditLog write failed');
  }
}

// ─── GET /docs — paginated list ───────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listDocsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, projectId, brandId, mode, search, isPinned } = query.data;

    let q = getFirestore().collection('docs').orderBy('title').limit(limit) as FirebaseFirestore.Query;
    
    if (projectId || brandId || mode || isPinned !== undefined) {
      q = getFirestore().collection('docs').limit(limit);
      if (projectId) q = q.where('projectId', '==', projectId);
      if (brandId) q = q.where('brandId', '==', brandId);
      if (mode) q = q.where('mode', '==', mode);
      if (isPinned !== undefined) q = q.where('isPinned', '==', isPinned);
    }

    if (startAfter) {
      const cursorDoc = await getFirestore().collection('docs').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let docs = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      docs = docs.filter((d: any) =>
        (d.title ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('docs').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: docs,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /docs failed');
    res.status(500).json({ success: false, error: 'Failed to list docs' });
  }
});

// ─── GET /docs/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('docs').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Doc not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /docs/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get doc' });
  }
});

// ─── POST /docs — create ─────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createDocSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();
    const adminUid = req.adminUser?.uid ?? 'system';

    const docRef = await db.collection('docs').add({
      ...data,
      createdBy: adminUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await auditLog(adminUid, 'create', docRef.id, { title: data.title });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data, createdBy: adminUid } });
  } catch (error) {
    logger.error({ err: error }, 'POST /docs failed');
    res.status(500).json({ success: false, error: 'Failed to create doc' });
  }
});

// ─── PUT /docs/:id ─────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateDocSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('docs').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Doc not found' });

    await db.collection('docs').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /docs/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update doc' });
  }
});

// ─── DELETE /docs/:id ──────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('docs').doc(id as string).get();
    
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Doc not found' });
    
    await db.collection('docs').doc(id as string).delete();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /docs/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete doc' });
  }
});

// ─── PATCH /docs/:id/pin ──────────────────────────────────────────────────────

router.patch('/:id/pin', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const pinSchema = z.object({
      isPinned: z.boolean()
    });
    
    const parsed = pinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    
    const { isPinned } = parsed.data;
    const db = getFirestore();
    
    const existing = await db.collection('docs').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Doc not found' });
    
    await db.collection('docs').doc(id as string).update({ 
      isPinned, 
      updatedAt: new Date().toISOString() 
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update_pin', id, { isPinned });

    res.json({ success: true, data: { id, isPinned } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /docs/:id/pin failed');
    res.status(500).json({ success: false, error: 'Failed to update doc pin status' });
  }
});

// ─── POST /docs/bulk-delete ───────────────────────────────────────────────────

router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const bulkDeleteSchema = z.object({
      ids: z.array(z.string()).min(1, 'Must provide at least one ID to delete')
    });
    
    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    
    const { ids } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    
    ids.forEach((id) => {
      const docRef = db.collection('docs').doc(id as string);
      batch.delete(docRef);
    });
    
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk_delete', 'multiple', { ids });

    res.json({ success: true, data: { deletedIds: ids } });
  } catch (error) {
    logger.error({ err: error }, 'POST /docs/bulk-delete failed');
    res.status(500).json({ success: false, error: 'Failed to bulk delete docs' });
  }
});

export default router;
