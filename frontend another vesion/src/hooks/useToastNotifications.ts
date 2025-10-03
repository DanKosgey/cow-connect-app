import { toast as sonnerToast } from "sonner";
import { toast, toastSuccess, toastError, toastWarning, toastInfo } from "./use-toast";

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

/**
 * Unified toast notification hook that works with both custom toast system and Sonner
 */
const useToastNotifications = () => {
  /**
   * Show a success toast notification
   */
  const showSuccess = (
    title: string,
    description?: string,
    options?: ToastOptions
  ) => {
    // Use custom toast system
    const toastId = toastSuccess(title, description);
    
    // Also show in Sonner for better UX
    sonnerToast.success(title, {
      description,
      duration: options?.duration,
      action: options?.action,
      onDismiss: options?.onDismiss,
    });
    
    return toastId;
  };

  /**
   * Show an error toast notification
   */
  const showError = (
    title: string,
    description?: string,
    options?: ToastOptions
  ) => {
    // Use custom toast system
    const toastId = toastError(title, description);
    
    // Also show in Sonner for better UX
    sonnerToast.error(title, {
      description,
      duration: options?.duration,
      action: options?.action,
      onDismiss: options?.onDismiss,
    });
    
    return toastId;
  };

  /**
   * Show a warning toast notification
   */
  const showWarning = (
    title: string,
    description?: string,
    options?: ToastOptions
  ) => {
    // Use custom toast system
    const toastId = toastWarning(title, description);
    
    // Also show in Sonner for better UX
    sonnerToast.warning(title, {
      description,
      duration: options?.duration,
      action: options?.action,
      onDismiss: options?.onDismiss,
    });
    
    return toastId;
  };

  /**
   * Show an info toast notification
   */
  const showInfo = (
    title: string,
    description?: string,
    options?: ToastOptions
  ) => {
    // Use custom toast system
    const toastId = toastInfo(title, description);
    
    // Also show in Sonner for better UX
    sonnerToast.info(title, {
      description,
      duration: options?.duration,
      action: options?.action,
      onDismiss: options?.onDismiss,
    });
    
    return toastId;
  };

  /**
   * Show a loading toast notification
   */
  const showLoading = (
    title: string,
    description?: string,
    options?: ToastOptions
  ) => {
    // Only use Sonner for loading toasts as it has better loading support
    const toastId = sonnerToast.loading(title, {
      description,
      duration: options?.duration,
    });
    
    return toastId;
  };

  /**
   * Update a toast notification
   */
  const updateToast = (
    toastId: string | number,
    title: string,
    description?: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    switch (type) {
      case 'success':
        sonnerToast.success(title, { id: toastId, description });
        break;
      case 'error':
        sonnerToast.error(title, { id: toastId, description });
        break;
      case 'warning':
        sonnerToast.warning(title, { id: toastId, description });
        break;
      default:
        sonnerToast.info(title, { id: toastId, description });
        break;
    }
  };

  /**
   * Dismiss a toast notification
   */
  const dismissToast = (toastId?: string | number) => {
    if (toastId) {
      // Dismiss from both systems
      toast({ id: toastId.toString() } as any); // Custom toast system
      sonnerToast.dismiss(toastId); // Sonner
    } else {
      // Dismiss all
      toast({} as any); // Custom toast system
      sonnerToast.dismiss(); // Sonner
    }
  };

  /**
   * Promise-based toast notifications
   */
  const promiseToast = <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: ToastOptions
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      duration: options?.duration,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    updateToast,
    dismissToast,
    promiseToast,
  };
};

export default useToastNotifications;