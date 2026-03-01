import { Router, Request, Response, NextFunction } from 'express';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import { z } from 'zod';
import logger from './logger';
import { getAuth, getFirestore, isAdminInitialized } from './firebaseAdmin';

const router = Router();
router.use(adminAuthMiddleware);

/**
 * Middleware to check if Firebase Admin is initialized
 * Returns 503 if not available
 */
function requireAdminSDK(req: Request, res: Response, next: NextFunction) {
  if (!isAdminInitialized()) {
    return res.status(503).json({
      success: false,
      error: 'Firebase Admin SDK not available. Service account not configured.'
    });
  }
  next();
}

// Apply middleware to all admin routes
router.use(requireAdminSDK);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
  disabled: z.boolean().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
  photoURL: z.string().url().optional(),
  disabled: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const claimsSchema = z.object({
  claims: z.record(z.unknown()),
});

const bulkImportSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().optional(),
    phoneNumber: z.string().optional(),
  })).min(1),
});

const backupSchema = z.object({
  collection: z.string().min(1),
});

const restoreSchema = z.object({
  collection: z.string().min(1),
  documents: z.array(z.object({
    id: z.string(),
    data: z.record(z.unknown()),
  })).min(1),
});

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Create a new user
 * POST /admin/api/users
 * Body: { email, password, displayName?, phoneNumber?, disabled? }
 */
router.post('/users', async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { email, password, displayName, phoneNumber, disabled } = parsed.data;

    // Create user with Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
      phoneNumber,
      disabled: disabled || false
    });

    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        phoneNumber: userRecord.phoneNumber,
        disabled: userRecord.disabled,
        createdAt: userRecord.metadata.creationTime
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating user');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    });
  }
});

/**
 * Get user by UID
 * GET /admin/api/users/:uid
 */
router.get('/users/:uid', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;

    const userRecord = await getAuth().getUser(uid);

    res.json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email || null,
        displayName: userRecord.displayName || null,
        phoneNumber: userRecord.phoneNumber || null,
        photoURL: userRecord.photoURL || null,
        disabled: userRecord.disabled,
        emailVerified: userRecord.emailVerified,
        customClaims: userRecord.customClaims || {},
        createdAt: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime || null
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error getting user');
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'User not found'
    });
  }
});

/**
 * List users (paginated)
 * GET /admin/api/users?limit=100&pageToken=xxx
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const pageToken = req.query.pageToken as string | undefined;

    const listUsersResult = await getAuth().listUsers(limit, pageToken);

    res.json({
      success: true,
      data: {
        users: listUsersResult.users.map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          disabled: user.disabled,
          emailVerified: user.emailVerified,
          createdAt: user.metadata.creationTime
        })),
        pageToken: listUsersResult.pageToken
      },
      meta: {
        total: listUsersResult.users.length,
        hasMore: !!listUsersResult.pageToken
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error listing users');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list users'
    });
  }
});

/**
 * Update user
 * PUT /admin/api/users/:uid
 * Body: { email?, displayName?, phoneNumber?, photoURL?, disabled? }
 */
router.put('/users/:uid', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { email, displayName, phoneNumber, photoURL, disabled, password } = parsed.data;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (disabled !== undefined) updateData.disabled = disabled;
    if (password !== undefined) updateData.password = password;

    const userRecord = await getAuth().updateUser(uid, updateData);

    res.json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email || null,
        displayName: userRecord.displayName || null,
        phoneNumber: userRecord.phoneNumber || null,
        photoURL: userRecord.photoURL || null,
        disabled: userRecord.disabled
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating user');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user'
    });
  }
});

/**
 * Delete user
 * DELETE /admin/api/users/:uid
 */
router.delete('/users/:uid', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;

    await getAuth().deleteUser(uid);

    res.json({
      success: true,
      data: { uid, deleted: true }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting user');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user'
    });
  }
});

/**
 * Disable user account
 * POST /admin/api/users/:uid/disable
 */
router.post('/users/:uid/disable', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;

    const userRecord = await getAuth().updateUser(uid, { disabled: true });

    res.json({
      success: true,
      data: {
        uid: userRecord.uid,
        disabled: userRecord.disabled
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error disabling user');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable user'
    });
  }
});

/**
 * Enable user account
 * POST /admin/api/users/:uid/enable
 */
router.post('/users/:uid/enable', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;

    const userRecord = await getAuth().updateUser(uid, { disabled: false });

    res.json({
      success: true,
      data: {
        uid: userRecord.uid,
        disabled: userRecord.disabled
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error enabling user');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable user'
    });
  }
});

// ============================================================================
// CUSTOM CLAIMS ENDPOINTS
// ============================================================================

/**
 * Set custom claims on user (roles/permissions)
 * POST /admin/api/users/:uid/claims
 * Body: { claims: { admin: true, role: 'editor', ... } }
 */
router.post('/users/:uid/claims', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;
    const parsed = claimsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { claims } = parsed.data;

    await getAuth().setCustomUserClaims(uid, claims);

    res.json({
      success: true,
      data: {
        uid,
        claims
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error setting custom claims');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set custom claims'
    });
  }
});

/**
 * Get custom claims for user
 * GET /admin/api/users/:uid/claims
 */
router.get('/users/:uid/claims', async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid as string;

    const userRecord = await getAuth().getUser(uid);

    res.json({
      success: true,
      data: {
        uid,
        claims: userRecord.customClaims || {}
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error getting custom claims');
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : 'User not found'
    });
  }
});

// ============================================================================
// BULK OPERATIONS ENDPOINTS
// ============================================================================

/**
 * Bulk import users
 * POST /admin/api/bulk/users/import
 * Body: { users: [{ email, password, displayName?, ... }] }
 */
router.post('/bulk/users/import', async (req: Request, res: Response) => {
  try {
    const parsed = bulkImportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { users } = parsed.data;

    const results = await Promise.allSettled(
      users.map((userData: any) => getAuth().createUser(userData))
    );

    const successful = results.filter((r: any) => r.status === 'fulfilled').length;
    const failed = results.filter((r: any) => r.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        total: users.length,
        successful,
        failed,
        results: results.map((r: any, idx: number) => ({
          index: idx,
          status: r.status,
          uid: r.status === 'fulfilled' ? r.value.uid : null,
          error: r.status === 'rejected' ? r.reason.message : null
        }))
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error importing users');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import users'
    });
  }
});

/**
 * Bulk export users
 * GET /admin/api/bulk/users/export?limit=1000
 */
router.get('/bulk/users/export', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;
    const allUsers: any[] = [];
    let pageToken: string | undefined = undefined;

    // Paginate through all users
    do {
      const listUsersResult = await getAuth().listUsers(1000, pageToken);
      allUsers.push(...listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        customClaims: user.customClaims,
        createdAt: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      })));
      pageToken = listUsersResult.pageToken;

      if (allUsers.length >= limit) break;
    } while (pageToken);

    res.json({
      success: true,
      data: {
        users: allUsers.slice(0, limit),
        total: allUsers.length,
        exportedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error exporting users');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export users'
    });
  }
});

/**
 * Backup Firestore collection
 * POST /admin/api/bulk/firestore/backup
 * Body: { collection: 'collectionName' }
 */
router.post('/bulk/firestore/backup', async (req: Request, res: Response) => {
  try {
    const parsed = backupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { collection } = parsed.data;

    const snapshot = await getFirestore().collection(collection).get();
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    res.json({
      success: true,
      data: {
        collection,
        documents,
        count: documents.length,
        backedUpAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error backing up collection');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to backup collection'
    });
  }
});

/**
 * Restore Firestore collection
 * POST /admin/api/bulk/firestore/restore
 * Body: { collection: 'collectionName', documents: [{ id, data }, ...] }
 */
router.post('/bulk/firestore/restore', async (req: Request, res: Response) => {
  try {
    const parsed = restoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { collection, documents } = parsed.data;

    const batch = getFirestore().batch();
    documents.forEach(doc => {
      const docRef = getFirestore().collection(collection).doc(doc.id);
      batch.set(docRef, doc.data);
    });

    await batch.commit();

    res.json({
      success: true,
      data: {
        collection,
        restored: documents.length,
        restoredAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error restoring collection');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore collection'
    });
  }
});

export default router;
