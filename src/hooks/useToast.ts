import { useNotificationHistory } from '../../contexts/NotificationHistoryContext';
import { useNovuTrigger, NovuWorkflowId } from './useNovuTrigger';

interface NovuOptions {
  workflowId: NovuWorkflowId;
  payload?: Record<string, unknown>;
  targetSubscriberId?: string;
}

export const useToast = () => {
  const { addNotification } = useNotificationHistory();
  const { trigger } = useNovuTrigger();

  const showSuccess = (message: string, description?: string, novu?: NovuOptions) => {
    addNotification({ type: 'success', message, description });
    if (novu) {
      trigger({ ...novu, payload: { ...novu.payload, message, description } });
    }
  };

  const showError = (message: string, description?: string, novu?: NovuOptions) => {
    addNotification({ type: 'error', message, description });
    if (novu) {
      trigger({ ...novu, payload: { ...novu.payload, message, description } });
    }
  };

  const showInfo = (message: string, description?: string, novu?: NovuOptions) => {
    addNotification({ type: 'info', message, description });
    if (novu) {
      trigger({ ...novu, payload: { ...novu.payload, message, description } });
    }
  };

  const showWarning = (message: string, description?: string, novu?: NovuOptions) => {
    addNotification({ type: 'warning', message, description });
    if (novu) {
      trigger({ ...novu, payload: { ...novu.payload, message, description } });
    }
  };

  const showLoading = (message: string) => {
    addNotification({ type: 'loading', message });
  };

  const showPromise = <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
      novu,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
      novu?: NovuOptions;
    }
  ) => {
    addNotification({ type: 'promise', message: loading });
    return promise.then(
      (data) => {
        const msg = typeof success === 'function' ? success(data) : success;
        addNotification({ type: 'success', message: msg });
        if (novu) {
          trigger({ ...novu, payload: { ...novu.payload, message: msg } });
        }
        return data;
      },
      (err) => {
        const msg = typeof error === 'function' ? error(err) : error;
        addNotification({ type: 'error', message: msg });
        throw err;
      }
    );
  };

  const dismiss = () => {
    // No-op since toasts are disabled
  };

  return {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    loading: showLoading,
    promise: showPromise,
    dismiss,
  };
};
