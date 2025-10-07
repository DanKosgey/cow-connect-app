/**
 * Utility functions for handling Supabase operations with better timeout and error handling
 */

/**
 * Execute a Supabase operation with timeout
 * @param operation The Supabase operation promise
 * @param timeoutMs Timeout in milliseconds (default: 30000ms)
 * @returns The result of the operation or throws an error
 */
export async function executeWithTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  // Race the operation against the timeout
  return Promise.race([operation, timeoutPromise]);
}

/**
 * Execute a Supabase operation with retry logic
 * @param operation The Supabase operation function
 * @param maxRetries Maximum number of retries (default: 3)
 * @param timeoutMs Timeout for each attempt (default: 30000ms)
 * @param retryDelayMs Delay between retries in milliseconds (default: 1000ms)
 * @returns The result of the operation or throws an error
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  timeoutMs: number = 30000,
  retryDelayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the operation with timeout
      const result = await executeWithTimeout(operation(), timeoutMs);
      return result;
    } catch (error) {
      lastError = error;
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Operation failed after ${maxRetries + 1} attempts: ${lastError.message}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * Math.pow(2, attempt)));
    }
  }
  
  throw new Error(`Operation failed: ${lastError.message}`);
}

/**
 * Execute a Supabase RPC call with proper error handling
 * @param rpcFunction The RPC function to call
 * @param params Parameters for the RPC call
 * @param options Additional options
 * @returns The result of the RPC call
 */
export async function executeRpcCall<T>(
  rpcFunction: () => Promise<T>,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    fallbackValue?: T;
  } = {}
): Promise<T> {
  const {
    timeoutMs = 30000,
    maxRetries = 2,
    retryDelayMs = 1000,
    fallbackValue = undefined
  } = options;

  try {
    return await executeWithRetry(rpcFunction, maxRetries, timeoutMs, retryDelayMs);
  } catch (error) {
    console.warn('RPC call failed, using fallback if available:', error);
    
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    
    throw error;
  }
}