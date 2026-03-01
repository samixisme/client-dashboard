import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import {
  createFeedbackSchema,
  updateFeedbackSchema,
  listFeedbackQuerySchema,
  bulkStatusSchema,
  addVersionSchema,
  updateStatusSchema,
} from './schemas/feedbackSchemas';
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
      entityType: 'feedback',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Feedback auditLog write failed');
  }
}

// ─── Helper: get comment count for a feedback item ───────────────────────────

async function getCommentCount(feedbackItemId: string): Promise<number> {
  const snap = await getFirestore()
    .collection('feedbackComments')
    .where('feedbackItemId', '==', feedbackItemId)
    .count()
    .get();
  return snap.data().count;
}

// ─── GET /feedback — paginated list with filters ─────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listFeedbackQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, projectId, type, status, search } = query.data;

    let q = getFirestore().collection('feedbackItems').orderBy('createdAt', 'desc').limit(limit) as FirebaseFirestore.Query;
    if (projectId) q = q.where('projectId', '==', projectId);
    if (type) q = q.where('type', '==', type);
    if (status) q = q.where('status', '==', status);
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('feedbackItems').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Client-side search on name (Firestore doesn't support full-text)
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((item: any) =>
        (item.name ?? '').toLowerCase().includes(s) ||
        (item.description ?? '').toLowerCase().includes(s)
      );
    }

    // Attach comment counts
    const itemsWithCounts = await Promise.all(
      items.map(async (item: any) => ({
        ...item,
        commentCount: await getCommentCount(item.id),
      }))
    );

    const countSnap = await getFirestore().collection('feedbackItems').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: itemsWithCounts,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /feedback failed');
    res.status(500).json({ success: false, error: 'Failed to list feedback items' });
  }
});

// ─── GET /feedback/:id ───────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('feedbackItems').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Feedback item not found' });

    const commentCount = await getCommentCount(doc.id);

    res.json({ success: true, data: { id: doc.id, ...doc.data(), commentCount } });
  } catch (error) {
    logger.error({ err: error }, 'GET /feedback/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get feedback item' });
  }
});

// ─── POST /feedback — create ─────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('feedbackItems').add({
      ...data,
      version: 1,
      versions: [],
      createdAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { name: data.name, type: data.type });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data, version: 1 } });
  } catch (error) {
    logger.error({ err: error }, 'POST /feedback failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create feedback item' });
  }
});

// ─── PUT /feedback/:id — update ──────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('feedbackItems').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Feedback item not found' });

    await db.collection('feedbackItems').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /feedback/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update feedback item' });
  }
});

// ─── DELETE /feedback/:id — delete + cascade comments ────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();

    const doc = await db.collection('feedbackItems').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Feedback item not found' });

    // Cascade delete feedbackComments where feedbackItemId matches
    const commentsSnap = await db
      .collection('feedbackComments')
      .where('feedbackItemId', '==', id)
      .get();

    if (!commentsSnap.empty) {
      const batch = db.batch();
      commentsSnap.docs.forEach((commentDoc) => {
        batch.delete(commentDoc.ref);
      });
      await batch.commit();
    }

    await db.collection('feedbackItems').doc(id as string).delete();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id, { commentsDeleted: commentsSnap.size });

    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /feedback/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete feedback item' });
  }
});

// ─── PATCH /feedback/:id/status — inline status update ───────────────────────

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { status } = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('feedbackItems').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Feedback item not found' });

    await db.collection('feedbackItems').doc(id as string).update({ status, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'status-update', id, { status });

    res.json({ success: true, data: { id, ...existing.data(), status } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /feedback/:id/status failed');
    res.status(500).json({ success: false, error: 'Failed to update feedback status' });
  }
});

// ─── POST /feedback/bulk-approve — batch approve ─────────────────────────────

router.post('/bulk-approve', async (req: Request, res: Response) => {
  try {
    const parsed = bulkStatusSchema.safeParse({ ...req.body, status: 'approved' });
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { feedbackIds } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    feedbackIds.forEach((fid) => {
      batch.update(db.collection('feedbackItems').doc(fid), { status: 'approved', updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-approve', feedbackIds.join(','), { count: feedbackIds.length });

    res.json({ success: true, data: { approved: feedbackIds.length, feedbackIds } });
  } catch (error) {
    logger.error({ err: error }, 'POST /feedback/bulk-approve failed');
    res.status(500).json({ success: false, error: 'Bulk approve failed' });
  }
});

// ─── POST /feedback/bulk-reject — batch reject ──────────────────────────────

router.post('/bulk-reject', async (req: Request, res: Response) => {
  try {
    const parsed = bulkStatusSchema.safeParse({ ...req.body, status: 'changes_requested' });
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { feedbackIds } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    feedbackIds.forEach((fid) => {
      batch.update(db.collection('feedbackItems').doc(fid), { status: 'changes_requested', updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-reject', feedbackIds.join(','), { count: feedbackIds.length });

    res.json({ success: true, data: { rejected: feedbackIds.length, feedbackIds } });
  } catch (error) {
    logger.error({ err: error }, 'POST /feedback/bulk-reject failed');
    res.status(500).json({ success: false, error: 'Bulk reject failed' });
  }
});

// ─── POST /feedback/:id/versions — add a new version ─────────────────────────

router.post('/:id/versions', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = addVersionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { assetUrl, notes, createdBy } = parsed.data;
    const db = getFirestore();

    const docRef = db.collection('feedbackItems').doc(id as string);
    const existing = await docRef.get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Feedback item not found' });

    const currentData = existing.data() as Record<string, any>;
    const currentVersion = currentData.version ?? 1;
    const newVersionNumber = currentVersion + 1;

    const versionEntry = {
      versionNumber: newVersionNumber,
      assetUrl,
      createdAt: new Date().toISOString(),
      createdBy,
      ...(notes !== undefined ? { notes } : {}),
    };

    const existingVersions = currentData.versions ?? [];

    await docRef.update({
      version: newVersionNumber,
      assetUrl,
      versions: [...existingVersions, versionEntry],
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'add-version', id, { versionNumber: newVersionNumber });

    res.status(201).json({ success: true, data: versionEntry });
  } catch (error) {
    logger.error({ err: error }, 'POST /feedback/:id/versions failed');
    res.status(500).json({ success: false, error: 'Failed to add version' });
  }
});

// ─── GET /feedback/:id/versions — version history ────────────────────────────

router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('feedbackItems').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Feedback item not found' });

    const data = doc.data() as Record<string, any>;
    const versions = data.versions ?? [];

    res.json({ success: true, data: versions });
  } catch (error) {
    logger.error({ err: error }, 'GET /feedback/:id/versions failed');
    res.status(500).json({ success: false, error: 'Failed to get version history' });
  }
});

export default router;
