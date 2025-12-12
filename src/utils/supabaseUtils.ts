/**
 * Utility functions for handling Supabase operations with improved timeout, retry, and error handling.
 * These functions provide robust wrappers for Supabase operations, including logging and fallback support.
 */

import { devLog } from './client'; // Assuming devLog from previous supabase client code

/**
 * Execute a promise with a timeout.
 * @param operation The promise to execute.
 * @param timeoutMs Timeout in milliseconds (default: 30000ms).
 * @returns The result of the operation.
 * @throws Error if the operation times out or fails.
 */
export async function executeWithTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  return Promise.race([operation, timeoutPromise]);
}

/**
 * Execute an operation with retry logic and exponential backoff.
 * @param operation The function that returns a promise to execute.
 * @param maxRetries Maximum number of retries (default: 3). Total attempts = maxRetries + 1.
 * @param timeoutMs Timeout for each attempt (default: 30000ms).
 * @param baseRetryDelayMs Base delay between retries in milliseconds (default: 1000ms).
 * @returns The result of the operation.
 * @throws Error if the operation fails after all attempts.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  timeoutMs: number = 30000,
  baseRetryDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executeWithTimeout(operation(), timeoutMs);
    } catch (error) {
      lastError = error;
      devLog(`Operation failed on attempt ${attempt + 1}/${maxRetries + 1}`, { error });

      if (attempt === maxRetries) {
        throw new Error(
          `Operation failed after ${maxRetries + 1} attempts: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseRetryDelayMs * Math.pow(2, attempt), 8000);
      const jitter = Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  // Unreachable, but for type safety
  throw new Error(`Operation failed: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
}

/**
 * Execute a Supabase RPC call with retry, timeout, and fallback support.
 * @param rpcFunction The RPC function to call.
 * @param options Configuration options for the execution.
 * @returns The result of the RPC call or fallback value if provided.
 * @throws Error if the operation fails and no fallback is provided.
 */
export async function executeRpcCall<T>(
  rpcFunction: () => Promise<T>,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    baseRetryDelayMs?: number;
    fallbackValue?: T;
  } = {}
): Promise<T> {
  const {
    timeoutMs = 30000,
    maxRetries = 2,
    baseRetryDelayMs = 1000,
    fallbackValue,
  } = options;

  try {
    return await executeWithRetry(rpcFunction, maxRetries, timeoutMs, baseRetryDelayMs);
  } catch (error) {
    devLog('RPC call failed', { error });

    if (fallbackValue !== undefined) {
      devLog('Using fallback value');
      return fallbackValue;
    }

    throw error;
  }
}