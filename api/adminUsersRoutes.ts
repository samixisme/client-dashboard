import { Router, Request, Response } from 'express';
import { getAuth, getFirestore } from './firebaseAdmin';
import logger from './logger';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import {
  createUserSchema,
  updateUserSchema,
  bulkUserIdsSchema,
  listUsersQuerySchema,
} from './schemas/userSchemas';

const router = Router();
router.use(adminAuthMiddleware);

// ─── Helper: write to adminAuditLog (best-effort) ────────────────────────────

async function auditLog(
  adminUid: string,
  actionType: string,
  entityId: string,
  details: Record<string, unknown> = {}
) {
  try {
    await getFirestore().collection('adminAuditLog').add({
      adminUserId: adminUid,
      entityType: 'user',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'auditLog write failed');
  }
}

// ─── GET /users — paginated list with search/filter ──────────────────────────
// Query params: limit, startAfter, role, status, search

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listUsersQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, role, status, search } = query.data;

    let q = getFirestore().collection('users').orderBy('email').limit(limit);

    if (role) q = q.where('role', '==', role) as FirebaseFirestore.Query;
    if (status) q = q.where('status', '==', status) as FirebaseFirestore.Query;
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('users').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc) as FirebaseFirestore.Query;
    }

    const snapshot = await q.get();
    let users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Client-side search on email/name (Firestore doesn't support full-text)
    if (search) {
      const s = search.toLowerCase();
      users = users.filter((u: any) =>
        (u.email ?? '').toLowerCase().includes(s) ||
        (u.displayName ?? '').toLowerCase().includes(s) ||
        (u.firstName ?? '').toLowerCase().includes(s) ||
        (u.lastName ?? '').toLowerCase().includes(s)
      );
    }

    // Total count (approximate — full collection without filters)
    const countSnap = await getFirestore().collection('users').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: users,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /users failed');
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

// ─── GET /users/:uid ──────────────────────────────────────────────────────────

router.get('/:uid', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;
    const [authUser, firestoreDoc] = await Promise.all([
      getAuth().getUser(uid),
      getFirestore().collection('users').doc(uid).get(),
    ]);
    res.json({
      success: true,
      data: {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName,
        disabled: authUser.disabled,
        emailVerified: authUser.emailVerified,
        createdAt: authUser.metadata.creationTime,
        lastSignInTime: authUser.metadata.lastSignInTime,
        ...(firestoreDoc.exists ? firestoreDoc.data() : {}),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /users/:uid failed');
    res.status(404).json({ success: false, error: 'User not found' });
  }
});

// ─── POST /users — create user in Auth + Firestore ───────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { email, password, displayName, firstName, lastName, phoneNumber, role, status } = parsed.data;

    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: displayName ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || undefined),
      phoneNumber,
    });

    await getFirestore().collection('users').doc(userRecord.uid).set({
      email,
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      name: displayName ?? `${firstName ?? ''} ${lastName ?? ''}`.trim(),
      role,
      status,
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', userRecord.uid, { email, role, status });

    res.status(201).json({
      success: true,
      data: { uid: userRecord.uid, email, role, status },
    });
  } catch (error) {
    logger.error({ err: error }, 'POST /users failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create user' });
  }
});

// ─── PUT /users/:uid — update Auth + Firestore ───────────────────────────────

router.put('/:uid', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { email, displayName, phoneNumber, photoURL, disabled, role, status, firstName, lastName } = parsed.data;

    const authUpdate: Record<string, unknown> = {};
    if (email !== undefined) authUpdate.email = email;
    if (displayName !== undefined) authUpdate.displayName = displayName;
    if (phoneNumber !== undefined) authUpdate.phoneNumber = phoneNumber;
    if (photoURL !== undefined) authUpdate.photoURL = photoURL;
    if (disabled !== undefined) authUpdate.disabled = disabled;

    const firestoreUpdate: Record<string, unknown> = {};
    if (email !== undefined) firestoreUpdate.email = email;
    if (firstName !== undefined) firestoreUpdate.firstName = firstName;
    if (lastName !== undefined) firestoreUpdate.lastName = lastName;
    if (role !== undefined) firestoreUpdate.role = role;
    if (status !== undefined) firestoreUpdate.status = status;
    if (photoURL !== undefined) firestoreUpdate.avatarUrl = photoURL;

    await Promise.all([
      Object.keys(authUpdate).length ? getAuth().updateUser(uid, authUpdate) : Promise.resolve(),
      Object.keys(firestoreUpdate).length
        ? getFirestore().collection('users').doc(uid).update({ ...firestoreUpdate, updatedAt: new Date().toISOString() })
        : Promise.resolve(),
    ]);

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', uid, parsed.data as Record<string, unknown>);

    res.json({ success: true, data: { uid, ...parsed.data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /users/:uid failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update user' });
  }
});

// ─── DELETE /users/:uid ───────────────────────────────────────────────────────

router.delete('/:uid', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;
    await Promise.all([
      getAuth().deleteUser(uid),
      getFirestore().collection('users').doc(uid).delete(),
    ]);
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', uid);
    res.json({ success: true, data: { uid, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /users/:uid failed');
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// ─── POST /users/bulk-approve ─────────────────────────────────────────────────

router.post('/bulk-approve', async (req: Request, res: Response) => {
  try {
    const parsed = bulkUserIdsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { uids } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    uids.forEach((uid) => {
      batch.update(db.collection('users').doc(uid), { status: 'approved', updatedAt: new Date().toISOString() });
    });
    await batch.commit();
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-approve', uids.join(','), { count: uids.length });
    res.json({ success: true, data: { approved: uids.length, uids } });
  } catch (error) {
    logger.error({ err: error }, 'POST /users/bulk-approve failed');
    res.status(500).json({ success: false, error: 'Bulk approve failed' });
  }
});

// ─── POST /users/bulk-disable ─────────────────────────────────────────────────

router.post('/bulk-disable', async (req: Request, res: Response) => {
  try {
    const parsed = bulkUserIdsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { uids } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    uids.forEach((uid) => {
      batch.update(db.collection('users').doc(uid), { status: 'disabled', updatedAt: new Date().toISOString() });
    });
    await Promise.all([
      batch.commit(),
      ...uids.map((uid) => getAuth().updateUser(uid, { disabled: true })),
    ]);
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-disable', uids.join(','), { count: uids.length });
    res.json({ success: true, data: { disabled: uids.length, uids } });
  } catch (error) {
    logger.error({ err: error }, 'POST /users/bulk-disable failed');
    res.status(500).json({ success: false, error: 'Bulk disable failed' });
  }
});

// ─── POST /users/bulk-delete ──────────────────────────────────────────────────

router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const parsed = bulkUserIdsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { uids } = parsed.data;
    const db = getFirestore();
    const batch = db.batch();
    uids.forEach((uid) => batch.delete(db.collection('users').doc(uid)));
    const results = await Promise.allSettled([
      batch.commit(),
      ...uids.map((uid) => getAuth().deleteUser(uid)),
    ]);
    const failed = results.filter((r) => r.status === 'rejected').length;
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-delete', uids.join(','), { count: uids.length, failed });
    res.json({ success: true, data: { deleted: uids.length - failed, failed, uids } });
  } catch (error) {
    logger.error({ err: error }, 'POST /users/bulk-delete failed');
    res.status(500).json({ success: false, error: 'Bulk delete failed' });
  }
});

export default router;
