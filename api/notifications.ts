import { Router, Request, Response } from 'express';
import { Novu } from '@novu/api';
import { getFirestore } from './firebaseAdmin';

const router = Router();

const novu = new Novu({
  secretKey: process.env.NOVU_API_KEY || '',
});

interface TriggerNotificationBody {
  workflowId: string;
  subscriberId: string;
  payload?: Record<string, unknown>;
}

export async function triggerNotification({ workflowId, subscriberId, payload = {} }: TriggerNotificationBody) {
  // Check user notification preferences before triggering
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(subscriberId).get();
    if (userDoc.exists) {
      const prefs = userDoc.data()?.notificationPreferences;
      if (prefs && prefs.emailNotifications === false && prefs.pushNotifications === false) {
        return { success: true, data: null, skipped: true, reason: 'User has disabled all notifications' };
      }
    }
  } catch (prefError) {
    // If we cannot check preferences, proceed with the trigger
  }

  const result = await novu.trigger({
    workflowId,
    to: { subscriberId },
    payload,
  });

  return { success: true, data: result };
}

router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { workflowId, subscriberId, payload = {} } = req.body as TriggerNotificationBody;

    if (!workflowId || !subscriberId) {
      return res.status(400).json({ error: 'workflowId and subscriberId are required' });
    }

    const result = await triggerNotification({ workflowId, subscriberId, payload });
    return res.json(result);
  } catch (error) {
    console.error('Novu trigger error:', error);
    return res.status(500).json({ error: 'Failed to trigger notification' });
  }
});

export default router;