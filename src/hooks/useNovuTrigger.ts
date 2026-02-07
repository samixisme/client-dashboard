import { useUser } from '../../contexts/UserContext';

export type NovuWorkflowId =
  | 'task-assigned'
  | 'task-due-reminder'
  | 'comment-added'
  | 'feedback-request'
  | 'payment-reminder'
  | 'user-approved'
  | 'onboarding-demo-workflow';

interface TriggerOptions {
  workflowId: NovuWorkflowId;
  payload?: Record<string, unknown>;
  targetSubscriberId?: string;
}

export function useNovuTrigger() {
  const { user } = useUser();

  const trigger = async ({ workflowId, payload = {}, targetSubscriberId }: TriggerOptions) => {
    const subscriberId = targetSubscriberId || user?.uid;

    if (!subscriberId) {
      console.warn('[Novu] No subscriberId available, skipping trigger');
      return null;
    }

    try {
      const response = await fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, subscriberId, payload }),
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger notification: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Novu] Trigger failed:', error);
      return null;
    }
  };

  return { trigger };
}
