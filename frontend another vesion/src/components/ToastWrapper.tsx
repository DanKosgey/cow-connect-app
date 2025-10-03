import React, { ReactNode, createContext, useContext } from 'react';
import useToastNotifications from '@/hooks/useToastNotifications';

interface ToastContextType {
  showSuccess: (title: string, description?: string, options?: any) => void;
  showError: (title: string, description?: string, options?: any) => void;
  showWarning: (title: string, description?: string, options?: any) => void;
  showInfo: (title: string, description?: string, options?: any) => void;
  showLoading: (title: string, description?: string, options?: any) => void;
  updateToast: (toastId: string | number, title: string, description?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  dismissToast: (toastId?: string | number) => void;
  promiseToast: <T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }, options?: any) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastWrapperProps {
  children: ReactNode;
}

/**
 * ToastWrapper component that provides toast notification context to child components
 */
const ToastWrapper: React.FC<ToastWrapperProps> = ({ children }) => {
  const toast = useToastNotifications();
  
  const contextValue: ToastContextType = {
    showSuccess: toast.showSuccess,
    showError: toast.showError,
    showWarning: toast.showWarning,
    showInfo: toast.showInfo,
    showLoading: toast.showLoading,
    updateToast: toast.updateToast,
    dismissToast: toast.dismissToast,
    promiseToast: toast.promiseToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Hook to use toast notifications in components
 */
export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastWrapper');
  }
  return context;
};

export default ToastWrapper;

// Export the hook for convenience
export { useToastNotifications };