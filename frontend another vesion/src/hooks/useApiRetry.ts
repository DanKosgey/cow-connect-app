import { useState, useCallback } from 'react';
import useRetryableOperation from './useRetryableOperation';

interface ApiRetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
}

interface ApiRetryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  canRetry: boolean;
  execute: () => Promise<T | null>;
  reset: () => void;
  isRetrying: boolean;
}

/**
 * Hook for handling API calls with retry functionality
 * @param apiCall - The API function to call
 * @param config - Configuration for retry behavior
 */
function useApiRetry<T>(
  apiCall: () => Promise<T>,
  config: ApiRetryConfig = {}
): ApiRetryResult<T> {
  const [data, setData] = useState<T | null>(null);
  
  const retryableOperation = useRetryableOperation<T>(apiCall, {
    maxRetries: config.maxRetries ?? 3,
    retryDelay: config.retryDelay ?? 1000,
    exponentialBackoff: config.exponentialBackoff ?? true,
    maxDelay: config.maxDelay ?? 30000,
    onRetry: config.onRetry,
    onSuccess: (result) => {
      setData(result);
    },
    onError: (error, attempt) => {
      console.error(`API call failed (attempt ${attempt}):`, error);
    }
  });

  const execute = useCallback(async (): Promise<T | null> => {
    try {
      const result = await retryableOperation.execute();
      return result;
    } catch (error) {
      console.error('API call failed after all retries:', error);
      return null;
    }
  }, [retryableOperation]);

  return {
    data,
    loading: retryableOperation.loading,
    error: retryableOperation.error,
    retryCount: retryableOperation.retryCount,
    canRetry: retryableOperation.canRetry,
    execute,
    reset: retryableOperation.reset,
    isRetrying: retryableOperation.isRetrying,
  };
}

export default useApiRetry;