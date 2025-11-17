import { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import { ErrorReportingService, ErrorReport } from '@/services/error-reporting-service';

interface UseEnhancedErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  reportErrors?: boolean;
  componentName?: string;
}

interface ErrorState {
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
  isOffline: boolean;
}

export const useEnhancedErrorHandling = <T>(
  options: UseEnhancedErrorHandlingOptions = {}
) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    reportErrors = true,
    componentName = 'UnknownComponent'
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
    isOffline: false
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced error handler with retry logic
  const handleError = useCallback(async (
    error: Error,
    context: string,
    additionalInfo?: Record<string, any>
  ) => {
    logger.errorWithContext(context, error, additionalInfo);
    
    // Check if it's a network error
    const isNetworkError = error.message.includes('Failed to fetch') || 
                          error.message.includes('Network Error') ||
                          error.message.includes('timeout');
    
    // Update error state
    setErrorState(prev => ({
      ...prev,
      error,
      isOffline: isNetworkError,
      isLoading: false
    }));

    // Report error if enabled
    if (reportErrors) {
      try {
        const errorReport: Omit<ErrorReport, 'id' | 'reported_at'> = {
          error_message: error.message,
          error_stack: error.stack,
          error_context: context,
          error_type: error.name,
          severity: isNetworkError ? 'medium' : 'high',
          component: componentName,
          additional_info: additionalInfo
        };
        
        await ErrorReportingService.reportError(errorReport);
      } catch (reportError) {
        logger.warn('Failed to report error', reportError);
      }
    }
  }, [reportErrors, componentName]);

  // Retry function with exponential backoff
  const retryOperation = useCallback(async (
    operation: () => Promise<T>,
    context: string
  ) => {
    if (errorState.retryCount >= maxRetries) {
      const error = new Error(`Max retries (${maxRetries}) exceeded`);
      await handleError(error, `${context} - Max Retries Exceeded`);
      return Promise.reject(error);
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true
    }));

    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    try {
      const result = await operation();
      
      // Success - reset error state
      setErrorState({
        error: null,
        isLoading: false,
        isRetrying: false,
        retryCount: 0,
        isOffline: false
      });
      
      return result;
    } catch (error: any) {
      const currentRetry = errorState.retryCount + 1;
      
      setErrorState(prev => ({
        ...prev,
        retryCount: currentRetry
      }));

      // Calculate exponential backoff delay
      const delay = retryDelay * Math.pow(2, errorState.retryCount);
      
      // Schedule retry
      return new Promise<T>((resolve, reject) => {
        retryTimeoutRef.current = setTimeout(async () => {
          try {
            const result = await retryOperation(operation, context);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        }, delay);
      });
    }
  }, [errorState.retryCount, maxRetries, retryDelay, handleError]);

  // Execute operation with error handling and retry
  const executeWithErrorHandling = useCallback(async (
    operation: () => Promise<T>,
    context: string,
    additionalInfo?: Record<string, any>
  ) => {
    setErrorState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const result = await operation();
      
      setErrorState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        retryCount: 0
      }));
      
      return result;
    } catch (error: any) {
      await handleError(error, context, additionalInfo);
      throw error;
    }
  }, [handleError]);

  // Clean up on unmount
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  return {
    ...errorState,
    handleError,
    retryOperation,
    executeWithErrorHandling,
    cleanup
  };
};