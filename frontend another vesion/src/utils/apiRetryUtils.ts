/**
 * Utility functions for API retry handling
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  maxDelay: 30000,
  shouldRetry: (error: any) => {
    // Don't retry client errors (4xx) except for 429 (rate limiting)
    if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
      return false;
    }
    // Retry server errors (5xx) and network errors
    return true;
  }
};

// Track consecutive server errors to prevent excessive retries
let consecutiveServerErrors = 0;
const MAX_CONSECUTIVE_SERVER_ERRORS = 3; // Reduced from 5 to 3

/**
 * Calculate delay for retry attempt
 */
export function calculateRetryDelay(attempt: number, options: Required<RetryOptions>): number {
  if (options.exponentialBackoff) {
    const delay = options.retryDelay * Math.pow(2, attempt);
    return Math.min(delay, options.maxDelay);
  }
  return options.retryDelay;
}

/**
 * Execute an API call with retry logic
 */
export async function executeWithRetry<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config: Required<RetryOptions> = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options
  };

  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await apiCall();
      
      // Reset consecutive server errors counter on success
      consecutiveServerErrors = 0;
      return result;
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt, don't retry
      if (attempt === config.maxRetries) {
        // If it's a server error, increment the consecutive counter
        if (error?.status >= 500) {
          consecutiveServerErrors++;
        }
        break;
      }
      
      // Check if we should retry based on the error
      if (!config.shouldRetry(error)) {
        throw error;
      }
      
      // If we've had too many consecutive server errors, stop retrying
      if (consecutiveServerErrors >= MAX_CONSECUTIVE_SERVER_ERRORS) {
        console.warn('Too many consecutive server errors, stopping retries');
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      
      // Calculate delay before next retry
      const delay = calculateRetryDelay(attempt, config);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Create a retryable API function
 */
export function createRetryableApiFunction<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {}
): () => Promise<T> {
  return () => executeWithRetry(apiCall, options);
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  return DEFAULT_RETRY_OPTIONS.shouldRetry(error);
}

/**
 * Get user-friendly error message for retry scenarios
 */
export function getRetryErrorMessage(error: any, retryCount: number, maxRetries: number): string {
  if (retryCount >= maxRetries) {
    return 'Failed to complete the operation after multiple attempts. Please try again later.';
  }
  
  if (error?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  if (error?.status >= 500) {
    return 'Server error. Retrying...';
  }
  
  if (error?.message?.includes('NetworkError') || error?.message?.includes('Failed to fetch')) {
    return 'Network connection issue. Retrying...';
  }
  
  return 'Operation failed. Retrying...';
}

/**
 * Reset the consecutive server errors counter
 * Call this when the app regains connectivity or when manually refreshing
 */
export function resetConsecutiveServerErrors() {
  consecutiveServerErrors = 0;
}