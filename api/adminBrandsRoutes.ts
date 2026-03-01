import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import {
  createBrandSchema,
  updateBrandSchema,
  listBrandsQuerySchema,
} from './schemas/brandSchemas';
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
      entityType: 'brand',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Brand auditLog write failed');
  }
}

// ─── GET /export/csv — export all brands as CSV ─────────────────────────────
// NOTE: Must be defined BEFORE /:id to avoid route conflict

router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const snapshot = await getFirestore().collection('brands').orderBy('name').get();
    const brands = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown[];

    const fields = ['id', 'name', 'industry', 'brandVoice', 'brandPositioning', 'logoUrl', 'createdAt'];
    const header = fields.join(',');
    const rows = brands.map((b) =>
      fields.map((f) => {
        const v = b[f] ?? '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="brands.csv"');
    res.send(csv);
  } catch (error) {
    logger.error({ err: error }, 'GET /brands/export/csv failed');
    res.status(500).json({ success: false, error: 'CSV export failed' });
  }
});

// ─── GET / — paginated list ──────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listBrandsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, search, memberId } = query.data;

    let q = getFirestore().collection('brands').orderBy('name').limit(limit) as FirebaseFirestore.Query;
    if (memberId) q = q.where('memberIds', 'array-contains', memberId);
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('brands').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let brands = snapshot.docs.map((d: any) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        memberCount: Array.isArray(data.memberIds) ? data.memberIds.length : 0,
      };
    });

    if (search) {
      const s = search.toLowerCase();
      brands = brands.filter((b: any) =>
        (b.name ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('brands').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: brands,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /brands failed');
    res.status(500).json({ success: false, error: 'Failed to list brands' });
  }
});

// ─── GET /:id ────────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('brands').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Brand not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /brands/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get brand' });
  }
});

// ─── POST / — create brand ──────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createBrandSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('brands').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { name: data.name });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /brands failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create brand' });
  }
});

// ─── PUT /:id — update brand ─────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateBrandSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('brands').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Brand not found' });

    await db.collection('brands').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /brands/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update brand' });
  }
});

// ─── DELETE /:id — delete with cascade warning ──────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const force = req.query.force === 'true';
    const db = getFirestore();

    const doc = await db.collection('brands').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Brand not found' });

    // Count related entities
    const projectCountSnap = await db.collection('projects').where('brandId', '==', id).count().get();
    const projectCount = projectCountSnap.data().count;
    const boardCountSnap = await db.collection('boards').where('brandId', '==', id).count().get();
    const boardCount = boardCountSnap.data().count;

    const cascadeWarning = { projectCount, boardCount };

    if (!force && (projectCount > 0 || boardCount > 0)) {
      return res.json({
        success: true,
        data: {
          id,
          deleted: false,
          cascadeWarning,
        },
      });
    }

    await db.collection('brands').doc(id as string).delete();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id, { cascadeWarning });

    res.json({
      success: true,
      data: {
        id,
        deleted: true,
        cascadeWarning,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /brands/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete brand' });
  }
});

export default router;
