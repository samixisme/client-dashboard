import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  listCalendarEventsQuerySchema,
} from './schemas/calendarSchemas';
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
      entityType: 'calendarEvent',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Calendar auditLog write failed');
  }
}

// ─── GET / — paginated list ──────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listCalendarEventsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, type, startDateFrom, startDateTo, userId, projectId } = query.data;
    const db = getFirestore();

    let q = db.collection('calendarEvents').orderBy('startDate').limit(limit) as FirebaseFirestore.Query;
    
    if (type) q = q.where('type', '==', type);
    if (userId) q = q.where('userId', '==', userId);
    if (projectId) q = q.where('projectId', '==', projectId);
    if (startDateFrom) q = q.where('startDate', '>=', startDateFrom);
    if (startDateTo) q = q.where('startDate', '<=', startDateTo);
    
    if (startAfter) {
      const cursorDoc = await db.collection('calendarEvents').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    const events = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const countSnap = await db.collection('calendarEvents').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: events,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /calendar failed');
    res.status(500).json({ success: false, error: 'Failed to list calendar events' });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('calendarEvents').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Calendar event not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /calendar/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get calendar event' });
  }
});

// ─── POST / — create ──────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createCalendarEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const docRef = await db.collection('calendarEvents').add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'create', docRef.id, { title: data.title });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data } });
  } catch (error) {
    logger.error({ err: error }, 'POST /calendar failed');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create calendar event' });
  }
});

// ─── PUT /:id ─────────────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateCalendarEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('calendarEvents').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Calendar event not found' });

    await db.collection('calendarEvents').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /calendar/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update calendar event' });
  }
});

// ─── PATCH /:id — inline date edit ────────────────────────────────────────────

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateCalendarEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    // Only pick date fields
    const { startDate, endDate } = parsed.data;
    if (!startDate && !endDate) {
      return res.status(400).json({ success: false, error: 'No dates provided for update' });
    }
    const updateData: any = { updatedAt: new Date().toISOString() };
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;

    const db = getFirestore();
    const existing = await db.collection('calendarEvents').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Calendar event not found' });

    await db.collection('calendarEvents').doc(id as string).update(updateData);

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'patch_dates', id, updateData);

    res.json({ success: true, data: { id, ...existing.data(), ...updateData } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /calendar/:id failed');
    res.status(500).json({ success: false, error: 'Failed to patch calendar event dates' });
  }
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('calendarEvents').doc(id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Calendar event not found' });
    
    await db.collection('calendarEvents').doc(id as string).delete();
    
    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /calendar/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete calendar event' });
  }
});

// ─── POST /bulk-delete-past — batch delete ────────────────────────────────────

router.post('/bulk-delete-past', async (req: Request, res: Response) => {
  try {
    const db = getFirestore();
    const today = new Date().toISOString();
    
    const snapshot = await db.collection('calendarEvents').where('endDate', '<', today).get();
    
    if (snapshot.empty) {
      return res.json({ success: true, data: { deletedCount: 0 } });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'bulk_delete_past', 'multiple', { count: snapshot.docs.length });

    res.json({ success: true, data: { deletedCount: snapshot.docs.length } });
  } catch (error) {
    logger.error({ err: error }, 'POST /bulk-delete-past failed');
    res.status(500).json({ success: false, error: 'Failed to bulk delete past calendar events' });
  }
});

export default router;
