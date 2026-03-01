import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getAuth, getFirestore, isAdminInitialized } from './firebaseAdmin';
import logger from './logger';

// Augment Express Request so req.adminUser compiles everywhere
declare global {
  namespace Express {
    interface Request {
      adminUser?: { uid: string; email: string; role: string };
    }
  }
}

/**
 * Rate limiter: 100 requests per 15 minutes per IP.
 * Usage in server.ts: app.use('/admin/api', adminRateLimiter, adminAuthMiddleware, adminRouter)
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many admin requests. Try again later.' },
});

/**
 * Admin auth middleware.
 * 1. Checks Firebase Admin SDK is initialized (503 if not)
 * 2. Extracts Bearer token from Authorization header (401 if missing)
 * 3. Calls verifyIdToken(token, true) with checkRevoked=true (401 on failure)
 * 4. Fetches Firestore users/{uid} and checks role === 'admin' (403 if not)
 * 5. Attaches req.adminUser = { uid, email, role }
 * 6. Writes auth failures to adminAuditLog collection (best-effort, never blocks)
 * 7. Calls next()
 */
export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isAdminInitialized()) {
    res.status(503).json({
      success: false,
      error: 'Firebase Admin SDK not available. Service account not configured.',
    });
    return;
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await writeAuditLog('missing_token', null, req);
    res.status(401).json({
      success: false,
      error: 'Authorization header required. Use: Authorization: Bearer <token>',
    });
    return;
  }

  const token = authHeader.slice(7);
  let uid: string;
  let email: string;

  try {
    const decodedToken = await getAuth().verifyIdToken(token, true);
    uid = decodedToken.uid;
    email = decodedToken.email ?? '';
  } catch (error) {
    logger.warn({ err: error }, 'Admin auth: token verification failed');
    await writeAuditLog('invalid_token', null, req);
    res.status(401).json({ success: false, error: 'Invalid or expired token.' });
    return;
  }

  try {
    const userDoc = await getFirestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
      logger.warn({ uid }, 'Admin auth: user doc not found in Firestore');
      await writeAuditLog('user_not_found', uid, req);
      res.status(403).json({ success: false, error: 'Admin access required.' });
      return;
    }

    const data = userDoc.data()!;
    const role: string = data.role ?? 'client';

    if (role !== 'admin') {
      logger.warn({ uid, role }, 'Admin auth: non-admin user attempted access');
      await writeAuditLog('not_admin', uid, req);
      res.status(403).json({ success: false, error: 'Admin access required.' });
      return;
    }

    req.adminUser = { uid, email, role };
    next();
  } catch (error) {
    logger.error({ err: error, uid }, 'Admin auth: Firestore role check failed');
    await writeAuditLog('firestore_error', uid, req);
    res.status(500).json({ success: false, error: 'Authentication check failed.' });
  }
}

/**
 * Best-effort audit log write. Never throws.
 */
async function writeAuditLog(
  reason: string,
  uid: string | null,
  req: Request
): Promise<void> {
  try {
    await getFirestore().collection('adminAuditLog').add({
      event: 'auth_failure',
      reason,
      uid,
      ip: req.ip ?? null,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'adminAuthMiddleware: failed to write audit log');
  }
}
