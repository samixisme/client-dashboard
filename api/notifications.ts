import { Router, Request, Response } from 'express';
import { Novu } from '@novu/api';

const router = Router();

const novu = new Novu({
  secretKey: process.env.NOVU_API_KEY || '',
});

interface TriggerNotificationBody {
  workflowId: string;
  subscriberId: string;
  payload?: Record<string, unknown>;
}

router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { workflowId, subscriberId, payload = {} } = req.body as TriggerNotificationBody;

    if (!workflowId || !subscriberId) {
      return res.status(400).json({ error: 'workflowId and subscriberId are required' });
    }

    const result = await novu.trigger({
      workflowId,
      to: { subscriberId },
      payload,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Novu trigger error:', error);
    return res.status(500).json({ error: 'Failed to trigger notification' });
  }
});

export default router;
