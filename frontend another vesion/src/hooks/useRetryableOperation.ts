import { useState, useCallback, useRef } from 'react';

interface RetryableOperationConfig {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  maxDelay?: number;
  onError?: (error: Error, attempt: number, maxRetries: number) => void;
  onSuccess?: (result: any, attempt: number) => void;
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
}

interface RetryableOperationResult<T> {
  execute: () => Promise<T>;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  canRetry: boolean;
  reset: () => void;
  isRetrying: boolean;
}

function useRetryableOperation<T>(
  operation: () => Promise<T>,
  config: RetryableOperationConfig = {}
): RetryableOperationResult<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    maxDelay = 30000,
    onError,
    onSuccess,
    onRetry,
  } = config;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const calculateDelay = useCallback((attempt: number): number => {
    if (exponentialBackoff) {
      const delay = retryDelay * Math.pow(2, attempt);
      return Math.min(delay, maxDelay);
    }
    return retryDelay;
  }, [retryDelay, exponentialBackoff, maxDelay]);

  const execute = useCallback(async (): Promise<T> => {
    // Reset previous state
    setError(null);
    setIsRetrying(retryCount > 0);
    setLoading(true);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    let lastError: Error;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // Check if operation was aborted
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Operation aborted');
        }
        
        const result = await operation();
        
        // Success - reset state and return result
        setLoading(false);
        setRetryCount(0);
        setIsRetrying(false);
        onSuccess?.(result, attempt);
        return result;
      } catch (err) {
        lastError = err as Error;
        attempt++;

        // If this is the last attempt or it's an abort error, don't retry
        if (attempt > maxRetries || (err as Error).name === 'AbortError') {
          break;
        }

        setRetryCount(attempt);
        onError?.(lastError, attempt, maxRetries);
        
        // Calculate delay before next retry
        const delay = calculateDelay(attempt - 1);
        onRetry?.(attempt, lastError, delay);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Final error state
    setLoading(false);
    setIsRetrying(false);
    setError(lastError!);
    
    throw lastError!;
  }, [operation, maxRetries, retryDelay, exponentialBackoff, maxDelay, onError, onSuccess, onRetry, retryCount, calculateDelay]);

  return {
    execute,
    loading,
    error,
    retryCount,
    canRetry: retryCount < maxRetries,
    reset,
    isRetrying,
  };
}

export default useRetryableOperation;