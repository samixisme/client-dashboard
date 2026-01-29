import { toast } from 'sonner';
import { useNotificationHistory } from '../../contexts/NotificationHistoryContext';

export const useToast = () => {
  const { addNotification } = useNotificationHistory();

  const showSuccess = (message: string, description?: string) => {
    addNotification({ type: 'success', message, description });
    return toast.success(message, {
      description,
      duration: 3000,
    });
  };

  const showError = (message: string, description?: string) => {
    addNotification({ type: 'error', message, description });
    return toast.error(message, {
      description,
      duration: 4000,
    });
  };

  const showInfo = (message: string, description?: string) => {
    addNotification({ type: 'info', message, description });
    return toast.info(message, {
      description,
      duration: 3000,
    });
  };

  const showWarning = (message: string, description?: string) => {
    addNotification({ type: 'warning', message, description });
    return toast.warning(message, {
      description,
      duration: 3500,
    });
  };

  const showLoading = (message: string) => {
    addNotification({ type: 'loading', message });
    return toast.loading(message);
  };

  const showPromise = <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    addNotification({ type: 'promise', message: loading });
    return toast.promise(promise, {
      loading,
      success: (data) => {
        const msg = typeof success === 'function' ? success(data) : success;
        addNotification({ type: 'success', message: msg });
        return msg;
      },
      error: (err) => {
        const msg = typeof error === 'function' ? error(err) : error;
        addNotification({ type: 'error', message: msg });
        return msg;
      },
    });
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
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
