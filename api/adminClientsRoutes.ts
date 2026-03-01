import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import {
  createClientSchema,
  updateClientSchema,
  listClientsQuerySchema,
} from './schemas/clientSchemas';
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
      entityType: 'client',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Client auditLog write failed');
  }
}

// ─── GET /clients — paginated list ───────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listClientsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, userId, search } = query.data;

    let q = getFirestore().collection('clients').orderBy('name').limit(limit) as FirebaseFirestore.Query;
    if (userId) q = q.where('userId', '==', userId);
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('clients').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let clients = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      clients = clients.filter((c: any) =>
        (c.name ?? '').toLowerCase().includes(s) ||
        (c.ice ?? '').toLowerCase().includes(s) ||
        (c.rc ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('clients').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: clients,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /clients failed');
    res.status(500).json({ success: false, error: 'Failed to list clients' });
  }
});

// ─── GET /clients/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('clients').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Client not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /clients/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get client' });
  }
});

// ─── POST /clients — create with unique rc/ice check ─────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    // Unique rc check
    const rcSnap = await db.collection('clients').where('rc', '==', data.rc).limit(1).get();
    if (!rcSnap.empty) {
      return res.status(409).json({ success: false, error: `A client with RC "${data.rc}" already exists` });
    }
    // Unique ice check
    const iceSnap = await db.collection('clients').where('ice', '==', data.ice).limit(1).get();
    if (!iceSnap.empty) {
      return res.status(409).json({ success: false, error: `A client with ICE "${data.ice}" already exists` });
    }

    const docRef = await db.collection('clients').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { name: data.name });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /clients failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create client' });
  }
});

// ─── PUT /clients/:id ─────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('clients').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Client not found' });

    await db.collection('clients').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /clients/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update client' });
  }
});

// ─── DELETE /clients/:id ──────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('clients').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Client not found' });
    await db.collection('clients').doc(id as string).delete();
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /clients/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete client' });
  }
});

// ─── GET /clients/export/csv — export all as CSV ─────────────────────────────

router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const snapshot = await getFirestore().collection('clients').orderBy('name').get();
    const clients = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown[];

    const fields = ['id', 'name', 'ice', 'rc', 'if', 'adresse', 'adresse2', 'userId', 'brandId', 'paymenterUserId'];
    const header = fields.join(',');
    const rows = clients.map((c) =>
      fields.map((f) => {
        const v = c[f] ?? '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
    res.send(csv);
  } catch (error) {
    logger.error({ err: error }, 'GET /clients/export/csv failed');
    res.status(500).json({ success: false, error: 'CSV export failed' });
  }
});

export default router;
