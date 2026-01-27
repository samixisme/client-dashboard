import { toast } from 'sonner';

export const useToast = () => {
  const showSuccess = (message: string, description?: string) => {
    return toast.success(message, {
      description,
      duration: 3000,
    });
  };

  const showError = (message: string, description?: string) => {
    return toast.error(message, {
      description,
      duration: 4000,
    });
  };

  const showInfo = (message: string, description?: string) => {
    return toast.info(message, {
      description,
      duration: 3000,
    });
  };

  const showWarning = (message: string, description?: string) => {
    return toast.warning(message, {
      description,
      duration: 3500,
    });
  };

  const showLoading = (message: string) => {
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
    return toast.promise(promise, {
      loading,
      success,
      error,
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
