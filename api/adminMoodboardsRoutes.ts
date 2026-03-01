import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import {
  createMoodboardSchema,
  updateMoodboardSchema,
  listMoodboardsQuerySchema,
} from './schemas/moodboardSchemas';

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
      entityType: 'moodboard',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Moodboard auditLog write failed');
  }
}

// ─── GET /moodboards — paginated list ───────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listMoodboardsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, projectId, search } = query.data;

    let q = getFirestore().collection('moodboards').orderBy('name').limit(limit) as FirebaseFirestore.Query;
    
    if (projectId) {
      // Avoid strictly ordering by name if filtering to prevent composite index requirements
      q = getFirestore().collection('moodboards').where('projectId', '==', projectId).limit(limit);
    }

    if (startAfter) {
      const cursorDoc = await getFirestore().collection('moodboards').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let moodboards = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      moodboards = moodboards.filter((m: any) =>
        (m.name ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('moodboards').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: moodboards,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /moodboards failed');
    res.status(500).json({ success: false, error: 'Failed to list moodboards' });
  }
});

// ─── GET /moodboards/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('moodboards').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Moodboard not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /moodboards/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get moodboard' });
  }
});

// ─── POST /moodboards — create ─────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createMoodboardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('moodboards').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { name: data.name });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /moodboards failed');
    res.status(500).json({ success: false, error: 'Failed to create moodboard' });
  }
});

// ─── PUT /moodboards/:id ─────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateMoodboardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('moodboards').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Moodboard not found' });

    await db.collection('moodboards').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /moodboards/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update moodboard' });
  }
});

// ─── DELETE /moodboards/:id ──────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('moodboards').doc(id as string).get();
    
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Moodboard not found' });
    
    // Batch delete items subcollection
    const itemsSnapshot = await db.collection(`moodboards/${id}/items`).get();
    const batch = db.batch();
    itemsSnapshot.docs.forEach((itemDoc) => {
      batch.delete(itemDoc.ref);
    });
    // Delete the moodboard itself
    batch.delete(doc.ref);
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /moodboards/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete moodboard' });
  }
});

export default router;
