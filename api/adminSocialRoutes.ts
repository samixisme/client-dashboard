import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import {
  createSocialAccountSchema,
  updateSocialAccountSchema,
  listSocialAccountsQuerySchema,
  createScheduledPostSchema,
  updateScheduledPostSchema,
  listScheduledPostsQuerySchema,
} from './schemas/socialSchemas';
import { z } from 'zod';

const router = Router();
router.use(adminAuthMiddleware);

// ─── Helper: audit log (best-effort) ─────────────────────────────────────────

async function auditLog(
  adminUid: string,
  entityType: 'socialAccount' | 'scheduledPost',
  actionType: string,
  entityId: string,
  details: Record<string, unknown> = {}
) {
  try {
    await getFirestore().collection('adminAuditLog').add({
      adminUserId: adminUid,
      entityType,
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, `${entityType} auditLog write failed`);
  }
}

// ============================================================================
// Social Accounts
// ============================================================================

// ─── GET /accounts — paginated list ──────────────────────────────────────────

router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const query = listSocialAccountsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, platform, search } = query.data;

    let q = getFirestore().collection('socialAccounts').orderBy('displayName').limit(limit) as FirebaseFirestore.Query;
    if (platform) q = q.where('platform', '==', platform);
    
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('socialAccounts').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let accounts = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      accounts = accounts.filter((a: any) =>
        (a.handle ?? '').toLowerCase().includes(s) ||
        (a.displayName ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('socialAccounts').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: accounts,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /accounts failed');
    res.status(500).json({ success: false, error: 'Failed to list social accounts' });
  }
});

// ─── GET /accounts/:id ────────────────────────────────────────────────────────

router.get('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('socialAccounts').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Social account not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /accounts/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get social account' });
  }
});

// ─── POST /accounts — create ──────────────────────────────────────────────────

router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const parsed = createSocialAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('socialAccounts').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'socialAccount', 'create', docRef.id, { handle: data.handle });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /accounts failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create social account' });
  }
});

// ─── PUT /accounts/:id ────────────────────────────────────────────────────────

router.put('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateSocialAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('socialAccounts').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Social account not found' });

    await db.collection('socialAccounts').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'socialAccount', 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /accounts/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update social account' });
  }
});

// ─── DELETE /accounts/:id ─────────────────────────────────────────────────────

router.delete('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('socialAccounts').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Social account not found' });
    
    await db.collection('socialAccounts').doc(id as string).delete();
    
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'socialAccount', 'delete', id);
    
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /accounts/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete social account' });
  }
});

// ============================================================================
// Scheduled Posts
// ============================================================================

// ─── GET /posts — paginated list ─────────────────────────────────────────────

router.get('/posts', async (req: Request, res: Response) => {
  try {
    const query = listScheduledPostsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, accountId, platform, status } = query.data;

    let q = getFirestore().collection('scheduledPosts').orderBy('scheduledFor', 'desc').limit(limit) as FirebaseFirestore.Query;
    if (accountId) q = q.where('accountId', '==', accountId);
    if (platform) q = q.where('platform', '==', platform);
    if (status) q = q.where('status', '==', status);
    
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('scheduledPosts').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    const posts = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const countSnap = await getFirestore().collection('scheduledPosts').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: posts,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /posts failed');
    res.status(500).json({ success: false, error: 'Failed to list scheduled posts' });
  }
});

// ─── GET /posts/:id ──────────────────────────────────────────────────────────

router.get('/posts/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('scheduledPosts').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Scheduled post not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /posts/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get scheduled post' });
  }
});

// ─── POST /posts — create ────────────────────────────────────────────────────

router.post('/posts', async (req: Request, res: Response) => {
  try {
    const parsed = createScheduledPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('scheduledPosts').add({
      ...data,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'scheduledPost', 'create', docRef.id, { accountId: data.accountId });

    res.status(201).json({ success: true, data: { id: docRef.id, status: 'scheduled', ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /posts failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create scheduled post' });
  }
});

// ─── PUT /posts/:id ──────────────────────────────────────────────────────────

router.put('/posts/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateScheduledPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('scheduledPosts').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Scheduled post not found' });

    await db.collection('scheduledPosts').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'scheduledPost', 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /posts/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update scheduled post' });
  }
});

// ─── DELETE /posts/:id ───────────────────────────────────────────────────────

router.delete('/posts/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('scheduledPosts').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Scheduled post not found' });
    
    await db.collection('scheduledPosts').doc(id as string).delete();
    
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'scheduledPost', 'delete', id);
    
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /posts/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete scheduled post' });
  }
});

// ─── PATCH /posts/:id/cancel ─────────────────────────────────────────────────

router.patch('/posts/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('scheduledPosts').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Scheduled post not found' });
    
    await db.collection('scheduledPosts').doc(id as string).update({ 
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
    
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'scheduledPost', 'cancel', id);
    
    res.json({ success: true, data: { id, status: 'cancelled' } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /posts/:id/cancel failed');
    res.status(500).json({ success: false, error: 'Failed to cancel scheduled post' });
  }
});

// ─── PATCH /posts/:id/reschedule ─────────────────────────────────────────────

router.patch('/posts/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const rescheduleSchema = z.object({ scheduledFor: z.string().min(1) });
    const parsed = rescheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    
    const db = getFirestore();
    const doc = await db.collection('scheduledPosts').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Scheduled post not found' });
    
    await db.collection('scheduledPosts').doc(id as string).update({ 
      scheduledFor: parsed.data.scheduledFor,
      status: 'scheduled',
      updatedAt: new Date().toISOString()
    });
    
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'scheduledPost', 'reschedule', id, { scheduledFor: parsed.data.scheduledFor });
    
    res.json({ success: true, data: { id, status: 'scheduled', scheduledFor: parsed.data.scheduledFor } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /posts/:id/reschedule failed');
    res.status(500).json({ success: false, error: 'Failed to reschedule scheduled post' });
  }
});

// ─── POST /posts/:id/publish-now ─────────────────────────────────────────────

router.post('/posts/:id/publish-now', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('scheduledPosts').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Scheduled post not found' });
    
    const now = new Date().toISOString();
    await db.collection('scheduledPosts').doc(id as string).update({ 
      status: 'published',
      publishedAt: now,
      updatedAt: now
    });
    
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'scheduledPost', 'publish-now', id);
    
    res.json({ success: true, data: { id, status: 'published', publishedAt: now } });
  } catch (error) {
    logger.error({ err: error }, 'POST /posts/:id/publish-now failed');
    res.status(500).json({ success: false, error: 'Failed to publish scheduled post' });
  }
});

export default router;
