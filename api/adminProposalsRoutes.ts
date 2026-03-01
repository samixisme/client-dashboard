import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import {
  createProposalSchema,
  updateProposalSchema,
  listProposalsQuerySchema,
  transitionProposalStatusSchema,
} from './schemas/proposalSchemas';

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
      entityType: 'proposal',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Proposal auditLog write failed');
  }
}

// ─── GET / — paginated list ──────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listProposalsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, status, search } = query.data;

    let q = getFirestore().collection('proposals').orderBy('createdAt', 'desc').limit(limit) as FirebaseFirestore.Query;
    if (status) q = q.where('status', '==', status);
    
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('proposals').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let proposals = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      proposals = proposals.filter((p: any) =>
        (p.title ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('proposals').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: proposals,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /proposals failed');
    res.status(500).json({ success: false, error: 'Failed to list proposals' });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('proposals').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Proposal not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /proposals/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get proposal' });
  }
});

// ─── POST / — create ──────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('proposals').add({
      ...data,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { title: data.title });

    res.status(201).json({ success: true, data: { id: docRef.id, status: 'Pending', ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /proposals failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create proposal' });
  }
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('proposals').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Proposal not found' });

    await db.collection('proposals').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /proposals/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update proposal' });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('proposals').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Proposal not found' });
    
    await db.collection('proposals').doc(id as string).delete();
    
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id);
    
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /proposals/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete proposal' });
  }
});

// ─── PATCH /:id/status ────────────────────────────────────────────────────────

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = transitionProposalStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { status } = parsed.data;
    const db = getFirestore();

    const doc = await db.collection('proposals').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Proposal not found' });
    
    const currentData = doc.data();
    if (currentData?.status !== 'Pending') {
      return res.status(400).json({ success: false, error: 'Can only transition status from Pending' });
    }

    await db.collection('proposals').doc(id as string).update({ 
      status,
      updatedAt: new Date().toISOString()
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'transition_status', id, { from: 'Pending', to: status });

    res.json({ success: true, data: { id, status } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /proposals/:id/status failed');
    res.status(500).json({ success: false, error: 'Failed to update proposal status' });
  }
});

export default router;
