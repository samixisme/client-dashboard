import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fetch from 'node-fetch';

const router = Router();

const PAYMENTER_URL = process.env.PAYMENTER_URL ?? 'http://localhost:8090';
const PAYMENTER_API_KEY = process.env.PAYMENTER_API_KEY ?? '';

// ─── Internal helper ─────────────────────────────────────────────────────────

async function paymenterFetch<T>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${PAYMENTER_URL}/api/v1/admin${endpoint}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${PAYMENTER_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Paymenter API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Health / connectivity check ─────────────────────────────────────────────

router.get('/status', async (_req: Request, res: Response) => {
  try {
    if (!PAYMENTER_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'PAYMENTER_API_KEY is not configured',
        configured: false,
      });
    }

    // Try a lightweight endpoint to verify connectivity
    await paymenterFetch('/users?limit=1');
    res.json({ success: true, configured: true, url: PAYMENTER_URL });
  } catch (error) {
    res.status(503).json({
      success: false,
      configured: !!PAYMENTER_API_KEY,
      error: error instanceof Error ? error.message : 'Cannot reach Paymenter',
    });
  }
});

// ─── Clients ─────────────────────────────────────────────────────────────────

/** GET /api/paymenter/clients — list all clients */
router.get('/clients', async (_req: Request, res: Response) => {
  try {
    const data = await paymenterFetch('/users');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch clients' });
  }
});

/** POST /api/paymenter/clients — create or sync a client */
const CreateClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

router.post('/clients', async (req: Request, res: Response) => {
  try {
    const body = CreateClientSchema.parse(req.body);
    const data = await paymenterFetch('/users', { method: 'POST', body });
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.flatten() });
    }
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create client' });
  }
});

// ─── Products / Plans ─────────────────────────────────────────────────────────

/** GET /api/paymenter/products — list available hosting plans */
router.get('/products', async (_req: Request, res: Response) => {
  try {
    const data = await paymenterFetch('/products');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch products' });
  }
});

// ─── Subscriptions / Services ─────────────────────────────────────────────────

/** GET /api/paymenter/subscriptions — list all active services */
router.get('/subscriptions', async (_req: Request, res: Response) => {
  try {
    const data = await paymenterFetch('/services');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch subscriptions' });
  }
});

/** GET /api/paymenter/subscriptions/:clientId — subscriptions for a specific client */
router.get('/subscriptions/client/:clientId', async (req: Request, res: Response) => {
  try {
    const data = await paymenterFetch(`/services?user_id=${req.params.clientId}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch client subscriptions' });
  }
});

/** POST /api/paymenter/subscriptions — create a subscription */
const CreateSubscriptionSchema = z.object({
  paymenterClientId: z.number().int().positive(),
  productId: z.number().int().positive(),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']),
  price: z.number().positive(),
  planName: z.string().min(1),
  notes: z.string().optional(),
});

router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const body = CreateSubscriptionSchema.parse(req.body);

    // Map billing cycle to Paymenter's period format
    const periodMap: Record<string, string> = {
      monthly: 'monthly',
      quarterly: 'quarterly',
      yearly: 'annually',
    };

    const data = await paymenterFetch('/services', {
      method: 'POST',
      body: {
        user_id: body.paymenterClientId,
        product_id: body.productId,
        billing_cycle: periodMap[body.billingCycle],
        price: body.price,
        notes: body.notes ?? '',
      },
    });
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.flatten() });
    }
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create subscription' });
  }
});

/** PUT /api/paymenter/subscriptions/:id/cancel — cancel a subscription */
router.put('/subscriptions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await paymenterFetch(`/services/${id}/cancel`, { method: 'POST' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to cancel subscription' });
  }
});

/** PUT /api/paymenter/subscriptions/:id/suspend — suspend a subscription */
router.put('/subscriptions/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await paymenterFetch(`/services/${id}/suspend`, { method: 'POST' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to suspend subscription' });
  }
});

/** PUT /api/paymenter/subscriptions/:id/unsuspend — reactivate a subscription */
router.put('/subscriptions/:id/unsuspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await paymenterFetch(`/services/${id}/unsuspend`, { method: 'POST' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to unsuspend subscription' });
  }
});

// ─── Invoices (billing records) ───────────────────────────────────────────────

/** GET /api/paymenter/invoices — list all billing invoices from Paymenter */
router.get('/invoices', async (_req: Request, res: Response) => {
  try {
    const data = await paymenterFetch('/invoices');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoices' });
  }
});

/** GET /api/paymenter/invoices/client/:clientId — billing invoices for a specific client */
router.get('/invoices/client/:clientId', async (req: Request, res: Response) => {
  try {
    const data = await paymenterFetch(`/invoices?user_id=${req.params.clientId}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch client invoices' });
  }
});

/** POST /api/paymenter/invoices/:id/mark-paid — mark an invoice as paid (bank transfer) */
const MarkPaidSchema = z.object({
  reference: z.string().optional(),
  paidAt: z.string().optional(),
});

router.post('/invoices/:id/mark-paid', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = MarkPaidSchema.parse(req.body);
    const data = await paymenterFetch(`/invoices/${id}/pay`, {
      method: 'POST',
      body: { payment_method: 'bank_transfer', reference: body.reference ?? '' },
    });
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.flatten() });
    }
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to mark invoice paid' });
  }
});

export default router;
