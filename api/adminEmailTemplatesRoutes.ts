import { Router, Request, Response } from 'express';
import { getFirestore } from './firebaseAdmin';
import logger from './logger';
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  listEmailTemplatesQuerySchema,
} from './schemas/emailTemplateSchemas';
import { z } from 'zod';
import { adminAuthMiddleware } from './adminAuthMiddleware';

const router = Router();
router.use(adminAuthMiddleware);

// ─── Helper: audit log ─────────────────────────────────────────

async function auditLog(
  adminUid: string,
  actionType: string,
  entityId: string,
  details: Record<string, unknown> = {}
) {
  try {
    await getFirestore().collection('adminAuditLog').add({
      adminUserId: adminUid,
      entityType: 'emailTemplate',
      actionType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'EmailTemplate auditLog write failed');
  }
}

// ─── GET /email-templates — paginated list ───────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listEmailTemplatesQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ success: false, error: query.error.errors[0].message });
    }
    const { limit, startAfter, category, status, search, projectId, brandId } = query.data;

    let q = getFirestore().collection('emailTemplates').orderBy('name').limit(limit) as FirebaseFirestore.Query;
    
    // If filters exist, avoid strictly ordering by name to prevent index requirements
    if (category || status || projectId || brandId) {
       q = getFirestore().collection('emailTemplates').limit(limit);
       if (category) q = q.where('category', '==', category);
       if (status) q = q.where('status', '==', status);
       if (projectId) q = q.where('projectId', '==', projectId);
       if (brandId) q = q.where('brandId', '==', brandId);
    }

    if (startAfter) {
      const cursorDoc = await getFirestore().collection('emailTemplates').doc(startAfter).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snapshot = await q.get();
    let templates = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (search) {
      const s = search.toLowerCase();
      templates = templates.filter((t: any) =>
        (t.name ?? '').toLowerCase().includes(s)
      );
    }

    const countSnap = await getFirestore().collection('emailTemplates').count().get();
    const total = countSnap.data().count;

    res.json({
      success: true,
      data: templates,
      meta: {
        total,
        hasMore: snapshot.docs.length === limit,
        nextCursor: snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /email-templates failed');
    res.status(500).json({ success: false, error: 'Failed to list email templates' });
  }
});

// ─── GET /email-templates/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getFirestore().collection('emailTemplates').doc(req.params.id as string).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Email template not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    logger.error({ err: error }, 'GET /email-templates/:id failed');
    res.status(500).json({ success: false, error: 'Failed to get email template' });
  }
});

// ─── POST /email-templates — create ─────────────────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createEmailTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();
    const adminUid = req.adminUser?.uid ?? 'system';

    const docRef = await db.collection('emailTemplates').add({
      ...data,
      createdBy: adminUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await auditLog(adminUid, 'create', docRef.id, { name: data.name });

    res.status(201).json({ success: true, data: { id: docRef.id, ...data, createdBy: adminUid } });
  } catch (error) {
    logger.error({ err: error }, 'POST /email-templates failed');
    res.status(500).json({ success: false, error: 'Failed to create email template' });
  }
});

// ─── PUT /email-templates/:id ─────────────────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateEmailTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    const data = parsed.data;
    const db = getFirestore();

    const existing = await db.collection('emailTemplates').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Email template not found' });

    await db.collection('emailTemplates').doc(id as string).update({ ...data, updatedAt: new Date().toISOString() });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update', id, data as Record<string, unknown>);

    res.json({ success: true, data: { id, ...existing.data(), ...data } });
  } catch (error) {
    logger.error({ err: error }, 'PUT /email-templates/:id failed');
    res.status(500).json({ success: false, error: 'Failed to update email template' });
  }
});

// ─── DELETE /email-templates/:id ──────────────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const doc = await db.collection('emailTemplates').doc(id as string).get();
    
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Email template not found' });
    
    await db.collection('emailTemplates').doc(id as string).delete();

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'delete', id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /email-templates/:id failed');
    res.status(500).json({ success: false, error: 'Failed to delete email template' });
  }
});

// ─── POST /email-templates/:id/duplicate ────────────────────────────────────────────────

router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const db = getFirestore();
    const existing = await db.collection('emailTemplates').doc(id as string).get();
    
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Email template not found' });
    
    const existingData = existing.data() as Record<string, any>;
    const adminUid = req.adminUser?.uid ?? 'system';

    const duplicateData = {
      ...existingData,
      name: `Copy of ${existingData.name}`,
      status: 'draft',
      createdBy: adminUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('emailTemplates').add(duplicateData);

    await auditLog(adminUid, 'duplicate', docRef.id, { originalId: id });

    res.status(201).json({ success: true, data: { id: docRef.id, ...duplicateData } });
  } catch (error) {
    logger.error({ err: error }, 'POST /email-templates/:id/duplicate failed');
    res.status(500).json({ success: false, error: 'Failed to duplicate email template' });
  }
});

// ─── PATCH /email-templates/:id/status ────────────────────────────────────────────────

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const statusSchema = z.object({
      status: z.enum(['draft', 'published', 'archived'])
    });
    
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    }
    
    const { status } = parsed.data;
    const db = getFirestore();
    
    const existing = await db.collection('emailTemplates').doc(id as string).get();
    if (!existing.exists) return res.status(404).json({ success: false, error: 'Email template not found' });
    
    const existingData = existing.data() as Record<string, any>;
    const currentStatus = existingData.status || 'draft';
    
    // Validate transitions: draft->published, published->archived, archived->draft
    const validTransitions: Record<string, string[]> = {
      'draft': ['published'],
      'published': ['archived'],
      'archived': ['draft'],
    };
    
    if (!validTransitions[currentStatus]?.includes(status) && currentStatus !== status) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid status transition from ${currentStatus} to ${status}` 
      });
    }

    await db.collection('emailTemplates').doc(id as string).update({ 
      status, 
      updatedAt: new Date().toISOString() 
    });

    const adminUid = req.adminUser?.uid ?? 'system';
    await auditLog(adminUid, 'update_status', id, { from: currentStatus, to: status });

    res.json({ success: true, data: { id, status } });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /email-templates/:id/status failed');
    res.status(500).json({ success: false, error: 'Failed to update email template status' });
  }
});

export default router;
