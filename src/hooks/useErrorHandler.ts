import { useState, useCallback } from 'react';
import useToastNotifications from '@/hooks/useToastNotifications';

interface ErrorState {
  hasError: boolean;
  message: string | null;
  code?: string;
}

export const useErrorHandler = () => {
  const [error, setError] = useState<ErrorState>({ 
    hasError: false, 
    message: null 
  });
  const toast = useToastNotifications();

  const handleError = useCallback((error: any, title = 'Error', description?: string) => {
    console.error('Error caught:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : description || 'An unexpected error occurred';
    
    setError({
      hasError: true,
      message: errorMessage,
      code: error?.code || undefined
    });
    
    // Show toast notification
    toast.error(title, errorMessage);
    
    return errorMessage;
  }, [toast]);

  const clearError = useCallback(() => {
    setError({ 
      hasError: false, 
      message: null 
    });
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error.hasError
  };
};

export default useErrorHandler;