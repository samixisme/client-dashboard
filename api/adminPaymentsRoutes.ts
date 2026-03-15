import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import { adminAuthMiddleware } from './adminAuthMiddleware';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  createEstimateSchema,
  updateEstimateSchema,
  listPaymentsQuerySchema,
  bulkStatusSchema,
  revenueQuerySchema,
} from './schemas/invoiceAdminSchemas';

const router = Router();
router.use(adminAuthMiddleware);

// ─── Helper: audit log (best-effort) ─────────────────────────────────────────

async function auditLog(
  adminUid: string,
  actionType: string,
  entityType: 'invoice' | 'estimate',
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
    logger.warn({ err }, 'Payments auditLog write failed');
  }
}

// ─── Helper: status transition validation ────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  Draft: ['Sent'],
  Sent: ['Paid', 'Overdue'],
  Overdue: ['Paid'],
  Paid: [],
};

function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

// ============================================================================
// INVOICE ENDPOINTS
// ============================================================================

// ─── GET /invoices — paginated list with filters ─────────────────────────────

router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const query = listPaymentsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, clientId, status, startDate, endDate, search } = query.data;

    let q = getFirestore().collection('invoices').orderBy('date', 'desc').limit(limit) as FirebaseFirestore.Query;
    if (clientId) q = q.where('clientId', '==', clientId);
    if (status) q = q.where('status', '==', status);
    if (startDate) q = q.where('date', '>=', startDate);
    if (endDate) q = q.where('date', '<=', endDate);
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('invoices').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let invoices = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      invoices = invoices.filter((inv: any) =>
        (inv.invoiceNumber ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('invoices').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: invoices,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /invoices failed');
    res.status(500).json({ success: false, error: 'Failed to list invoices' });
  }
});

// ─── GET /invoices/:id ───────────────────────────────────────────────────────

router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('invoices').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /invoices/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get invoice' });
  }
});

// ─── POST /invoices — create ─────────────────────────────────────────────────

router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('invoices').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', 'invoice', docRef.id, { invoiceNumber: data.invoiceNumber });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /invoices failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create invoice' });
  }
});

// ─── PUT /invoices/:id — update with status transition enforcement ───────────

router.put('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('invoices').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Invoice not found' });

    if (data.status) {
      const currentStatus = existing.data()!.status as string;
      if (!isValidTransition(currentStatus, data.status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from "${currentStatus}" to "${data.status}"`,
        });
      }
    }

    await db.collection('invoices').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', 'invoice', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /invoices/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
});

// ─── DELETE /invoices/:id ────────────────────────────────────────────────────

router.delete('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('invoices').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Invoice not found' });
    await db.collection('invoices').doc(id as string).delete();
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', 'invoice', id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /invoices/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete invoice' });
  }
});

// ─── POST /invoices/:id/duplicate ────────────────────────────────────────────

router.post('/invoices/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('invoices').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const original = doc.data()!;
    const { ...copyData } = original;
    Reflect.deleteProperty(copyData, 'createdAt');
    Reflect.deleteProperty(copyData, 'updatedAt');

    const duplicated = {
      ...copyData,
      invoiceNumber: `${original.invoiceNumber}-COPY`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newRef = await db.collection('invoices').add(duplicated);

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'duplicate', 'invoice', newRef.id, { sourceId: id });

    res.status(201).json({ success: true, data: { id: newRef.id, ...duplicated } });
  } catch (error) {
    logger.error({ err: error }, 'POST /invoices/:id/duplicate failed');
    res.status(500).json({ success: false, error: 'Failed to duplicate invoice' });
  }
});

// ─── POST /invoices/bulk-status — batch status update ────────────────────────

router.post('/invoices/bulk-status', async (req: Request, res: Response) => {
  try {
    const parsed = bulkStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { ids, status } = parsed.data;
    const db = getFirestore();

    // Fetch all docs to validate transitions
    // ⚡ Bolt: Using db.getAll() for batched reads instead of Promise.all with N get() calls
    const refs = ids.map((docid) => db.collection('invoices').doc(docid));
    const docs = refs.length > 0 ? await db.getAll(...refs) : [];
    const invalid: string[] = [];
    const notFound: string[] = [];

    docs.forEach((doc, idx) => {
      if (!doc.exists) {
        notFound.push(ids[idx]);
      } else if (!isValidTransition(doc.data()!.status, status)) {
        invalid.push(ids[idx]);
      }
    });

    if (notFound.length > 0) {
      return res.status(404).json({ success: false, error: `Invoices not found: ${notFound.join(', ')}` });
    }
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, error: `Invalid status transition for invoices: ${invalid.join(', ')}` });
    }

    const batch = db.batch();
    ids.forEach((docid) => {
      batch.update(db.collection('invoices').doc(docid), { status, updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-status', 'invoice', ids.join(','), { status, count: ids.length });

    res.json({ success: true, data: { updated: ids.length, status, ids } });
  } catch (error) {
    logger.error({ err: error }, 'POST /invoices/bulk-status failed');
    res.status(500).json({ success: false, error: 'Bulk status update failed' });
  }
});

// ============================================================================
// ESTIMATE ENDPOINTS
// ============================================================================

// ─── GET /estimates — paginated list with filters ────────────────────────────

router.get('/estimates', async (req: Request, res: Response) => {
  try {
    const query = listPaymentsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, clientId, status, startDate, endDate, search } = query.data;

    let q = getFirestore().collection('estimates').orderBy('date', 'desc').limit(limit) as FirebaseFirestore.Query;
    if (clientId) q = q.where('clientId', '==', clientId);
    if (status) q = q.where('status', '==', status);
    if (startDate) q = q.where('date', '>=', startDate);
    if (endDate) q = q.where('date', '<=', endDate);
    if (startAfter) {
      const cursorDoc = await getFirestore().collection('estimates').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let estimates = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      estimates = estimates.filter((est: any) =>
        (est.estimateNumber ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('estimates').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: estimates,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /estimates failed');
    res.status(500).json({ success: false, error: 'Failed to list estimates' });
  }
});

// ─── GET /estimates/:id ──────────────────────────────────────────────────────

router.get('/estimates/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('estimates').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Estimate not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /estimates/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get estimate' });
  }
});

// ─── POST /estimates — create ────────────────────────────────────────────────

router.post('/estimates', async (req: Request, res: Response) => {
  try {
    const parsed = createEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('estimates').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', 'estimate', docRef.id, { estimateNumber: data.estimateNumber });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /estimates failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create estimate' });
  }
});

// ─── PUT /estimates/:id — update with status transition enforcement ──────────

router.put('/estimates/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('estimates').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Estimate not found' });

    if (data.status) {
      const currentStatus = existing.data()!.status as string;
      if (!isValidTransition(currentStatus, data.status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from "${currentStatus}" to "${data.status}"`,
        });
      }
    }

    await db.collection('estimates').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', 'estimate', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /estimates/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update estimate' });
  }
});

// ─── DELETE /estimates/:id ───────────────────────────────────────────────────

router.delete('/estimates/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('estimates').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Estimate not found' });
    await db.collection('estimates').doc(id as string).delete();
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', 'estimate', id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /estimates/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete estimate' });
  }
});

// ─── POST /estimates/:id/duplicate ───────────────────────────────────────────

router.post('/estimates/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('estimates').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Estimate not found' });

    const original = doc.data()!;
    const { ...copyData } = original;
    Reflect.deleteProperty(copyData, 'createdAt');
    Reflect.deleteProperty(copyData, 'updatedAt');

    const duplicated = {
      ...copyData,
      estimateNumber: `${original.estimateNumber}-COPY`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newRef = await db.collection('estimates').add(duplicated);

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'duplicate', 'estimate', newRef.id, { sourceId: id });

    res.status(201).json({ success: true, data: { id: newRef.id, ...duplicated } });
  } catch (error) {
    logger.error({ err: error }, 'POST /estimates/:id/duplicate failed');
    res.status(500).json({ success: false, error: 'Failed to duplicate estimate' });
  }
});

// ─── POST /estimates/bulk-status — batch status update ───────────────────────

router.post('/estimates/bulk-status', async (req: Request, res: Response) => {
  try {
    const parsed = bulkStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const { ids, status } = parsed.data;
    const db = getFirestore();

    // ⚡ Bolt: Using db.getAll() for batched reads instead of Promise.all with N get() calls
    const refs = ids.map((docid) => db.collection('estimates').doc(docid));
    const docs = refs.length > 0 ? await db.getAll(...refs) : [];
    const invalid: string[] = [];
    const notFound: string[] = [];

    docs.forEach((doc, idx) => {
      if (!doc.exists) {
        notFound.push(ids[idx]);
      } else if (!isValidTransition(doc.data()!.status, status)) {
        invalid.push(ids[idx]);
      }
    });

    if (notFound.length > 0) {
      return res.status(404).json({ success: false, error: `Estimates not found: ${notFound.join(', ')}` });
    }
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, error: `Invalid status transition for estimates: ${invalid.join(', ')}` });
    }

    const batch = db.batch();
    ids.forEach((docid) => {
      batch.update(db.collection('estimates').doc(docid), { status, updatedAt: new Date().toISOString() });
    });
    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk-status', 'estimate', ids.join(','), { status, count: ids.length });

    res.json({ success: true, data: { updated: ids.length, status, ids } });
  } catch (error) {
    logger.error({ err: error }, 'POST /estimates/bulk-status failed');
    res.status(500).json({ success: false, error: 'Bulk status update failed' });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// ─── GET /analytics/revenue — aggregate revenue from Paid invoices ───────────

router.get('/analytics/revenue', async (req: Request, res: Response) => {
  try {
    const query = revenueQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { startDate, endDate } = query.data;
    const db = getFirestore();

    let q = db.collection('invoices').where('status', '==', 'Paid') as FirebaseFirestore.Query;
    if (startDate) q = q.where('date', '>=', startDate);
    if (endDate) q = q.where('date', '<=', endDate);

    const snapshot = await q.get();
    const invoices = snapshot.docs.map((d: any) => d.data());

    let totalRevenue = 0;
    const byMonthMap: Record<string, { revenue: number; count: number }> = {};

    for (const inv of invoices) {
      const net = inv.totals?.totalNet ?? 0;
      totalRevenue += net;

      const month = (inv.date ?? '').substring(0, 7); // "YYYY-MM"
      if (month) {
        if (!byMonthMap[month]) byMonthMap[month] = { revenue: 0, count: 0 };
        byMonthMap[month].revenue += net;
        byMonthMap[month].count += 1;
      }
    }

    const invoiceCount = invoices.length;
    const averageInvoice = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

    const byMonth = Object.entries(byMonthMap)
      .map(([month, data]) => ({ month, revenue: data.revenue, count: data.count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: {
        totalRevenue,
        invoiceCount,
        averageInvoice,
        byMonth,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /analytics/revenue failed');
    res.status(500).json({ success: false, error: 'Failed to compute revenue analytics' });
  }
});

export default router;
