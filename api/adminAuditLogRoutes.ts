import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import { listAuditLogQuerySchema } from './schemas/auditLogSchemas';
import { adminAuthMiddleware } from './adminAuthMiddleware';

const router = Router();
router.use(adminAuthMiddleware);

// ─── GET / — paginated list ───────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listAuditLogQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, adminUserId, entityType, actionType, startDate, endDate } = query.data;

    const db = getFirestore();
    let q = db.collection('adminAuditLog').orderBy('timestamp', 'desc').limit(limit) as FirebaseFirestore.Query;

    if (adminUserId) q = q.where('adminUserId', '==', adminUserId);
    if (entityType) q = q.where('entityType', '==', entityType);
    if (actionType) q = q.where('actionType', '==', actionType);
    if (startDate) q = q.where('timestamp', '>=', startDate);
    if (endDate) q = q.where('timestamp', '<=', endDate);

    if (startAfter) {
      const cursorDoc = await db.collection('adminAuditLog').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    const entries = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const countSnap = await db.collection('adminAuditLog').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: entries,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET / failed');
    res.status(500).json({ success: false, error: 'Failed to list audit logs' });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('adminAuditLog').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Audit log not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /:id failed');
    res.status(500).json({ success: false, error: 'Failed to get audit log' });
  }
});

export default router;
