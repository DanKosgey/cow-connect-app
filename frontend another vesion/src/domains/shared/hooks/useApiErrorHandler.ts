import { useCallback } from 'react';
import ErrorService from '@/services/ErrorService';
import { ErrorContext } from '@/types/error';

const useApiErrorHandler = () => {
  const errorService = ErrorService.getInstance();

  const handleApiError = useCallback((
    error: any, 
    context?: ErrorContext
  ) => {
    return errorService.processError(error, context);
  }, [errorService]);

  return { handleApiError };
};

export default useApiErrorHandler;