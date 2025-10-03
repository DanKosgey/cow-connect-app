import { useCallback } from 'react';
import ErrorService from '@/services/ErrorService';
import { ErrorContext } from '@/types/error';
import { useToastContext } from '@/components/ToastWrapper';

const useApiErrorHandler = () => {
  const errorService = ErrorService.getInstance();
  const toast = useToastContext();

  const handleApiError = useCallback((
    error: any, 
    context?: ErrorContext
  ) => {
    // Process the error using ErrorService
    const apiError = errorService.processError(error, context);
    
    // Show a toast notification for the error
    toast.showError('Error', apiError.message);
    
    return apiError;
  }, [errorService, toast]);

  return { handleApiError };
};

export default useApiErrorHandler;