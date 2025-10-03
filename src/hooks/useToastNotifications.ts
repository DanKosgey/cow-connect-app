import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from '@/components/ui/sonner';

type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: any;
};

export default function useToastNotifications() {
  const { toast: radixToast, dismiss } = useToast();

  const show = (opts: ToastOptions) => {
    // Radix toast expects title/description to be string-like in this project
    const t = {
      ...opts,
      title: opts.title ? String(opts.title) : undefined,
      description: opts.description ? String(opts.description) : undefined,
    } as any;

    return radixToast(t);
  };

  const success = (title: React.ReactNode, description?: React.ReactNode) => {
    return radixToast({ title: title ? String(title) : undefined, description: description ? String(description) : undefined } as any);
  };

  const error = (title: React.ReactNode, description?: React.ReactNode) => {
    return radixToast({ title: title ? String(title) : undefined, description: description ? String(description) : undefined } as any);
  };

  function promiseWrapper<T, R = unknown>(
    p: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) {
    // Prefer sonner.promise if available (better UX for async flows)
    if (sonnerToast && typeof (sonnerToast as any).promise === 'function') {
      return (sonnerToast as any).promise(p, {
        loading: messages.loading,
        success: messages.success as any,
        error: messages.error as any,
      });
    }

    // Fallback: use radix-based toasts for loading/success/error transitions
    radixToast({ title: messages.loading });

    p
      .then((res) => {
        radixToast({ title: typeof messages.success === 'function' ? (messages.success as Function)(res) : (messages.success as string) });
        return res;
      })
      .catch((err) => {
        radixToast({ title: typeof messages.error === 'function' ? (messages.error as Function)(err) : (messages.error as string) });
        throw err;
      });

    return p;
  }

  return {
    show,
    success,
    error,
    promise: promiseWrapper,
    dismiss,
  } as const;
}
