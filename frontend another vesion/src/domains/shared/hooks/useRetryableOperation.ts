import { useState, useCallback } from 'react';

interface RetryableOperationConfig {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, attempt: number) => void;
  onSuccess?: () => void;
}

interface RetryableOperationResult<T> {
  execute: () => Promise<T>;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  canRetry: boolean;
}

function useRetryableOperation<T>(
  operation: () => Promise<T>,
  config: RetryableOperationConfig = {}
): RetryableOperationResult<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onSuccess,
  } = config;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async (): Promise<T> => {
    setLoading(true);
    setError(null);

    let lastError: Error;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        setLoading(false);
        setRetryCount(0);
        onSuccess?.();
        return result;
      } catch (err) {
        lastError = err as Error;
        attempt++;

        if (attempt <= maxRetries) {
          setRetryCount(attempt);
          onError?.(lastError, attempt);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    setLoading(false);
    setError(lastError!);
    throw lastError!;
  }, [operation, maxRetries, retryDelay, onError, onSuccess]);

  return {
    execute,
    loading,
    error,
    retryCount,
    canRetry: retryCount < maxRetries,
  };
}

export default useRetryableOperation;