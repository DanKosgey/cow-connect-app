import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { authService } from '@/lib/supabase/auth-service';

interface UseSessionRefreshOptions {
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface RefreshResult {
  success: boolean;
  session: any | null;
  error?: Error;
}

/**
 * Custom hook to automatically refresh Supabase session to prevent timeouts.
 * Handles periodic refreshes, visibility changes, and focus events with rate limiting.
 * @param options - Configuration options for session refresh
 * @returns { refreshSession } - Function to manually trigger session refresh
 */
export function useSessionRefresh(options: UseSessionRefreshOptions = {}) {
  const { enabled = true, refreshInterval = 30 * 60 * 1000 } = options; // Default to 30 minutes
  const isMountedRef = useRef(true);
  const lastRefreshRef = useRef<number>(0);
  const refreshAttemptCountRef = useRef<number>(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false); // New ref to prevent concurrent processing

  const refreshSession = useCallback(async (): Promise<RefreshResult> => {
    // Prevent concurrent calls
    if (isProcessingRef.current) {
      logger.debug('Skipping session refresh - already processing');
      return { success: true, session: null };
    }

    try {
      isProcessingRef.current = true;
      
      // Prevent too frequent refreshes (at least 10 minutes between refreshes)
      const now = Date.now();
      const minInterval = 10 * 60 * 1000;
      if (now - lastRefreshRef.current < minInterval) {
        logger.debug('Skipping session refresh - too soon since last refresh', {
          timeSinceLast: (now - lastRefreshRef.current) / 1000,
          minInterval: minInterval / 1000
        });
        return { success: true, session: null };
      }

      // Limit consecutive failed attempts
      const maxAttempts = 3;
      if (refreshAttemptCountRef.current >= maxAttempts) {
        logger.warn('Skipping session refresh - max attempts reached', { attempts: refreshAttemptCountRef.current });
        // Reset counter to allow future attempts
        refreshAttemptCountRef.current = 0;
        return { success: false, session: null, error: new Error('Max refresh attempts reached') };
      }

      logger.debug('Attempting session refresh', { attempt: refreshAttemptCountRef.current + 1 });

      // Timeout for refresh operation - increased to 60 seconds for better reliability
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session refresh timeout after 60 seconds')), 60000);
      });

      // Perform refresh using the new authService
      const refreshPromise = authService.refreshSession();
      const result = await Promise.race([refreshPromise, timeoutPromise]);

      if (result.error) {
        throw result.error;
      }

      // Get updated session after successful refresh
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      // Reset on success
      refreshAttemptCountRef.current = 0;
      lastRefreshRef.current = now;
      logger.info('Session refreshed successfully');
      
      return { success: true, session };
    } catch (error) {
      if (!isMountedRef.current) {
        return { success: false, session: null, error: new Error('Component unmounted') };
      }

      logger.error('Session refresh failed', error);
      refreshAttemptCountRef.current++;

      // Handle network/transient errors with backoff
      let isTransient = false;
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        isTransient = msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('offline');
      }
      if (isTransient) {
        logger.warn('Transient error detected - will retry later');
        // Reduce attempt count for transient errors to allow more retries
        refreshAttemptCountRef.current = Math.max(0, refreshAttemptCountRef.current - 1);
      }

      // Fallback: Check current session validity
      try {
        const { data: { session }, error: fallbackError } = await supabase.auth.getSession();
        if (fallbackError) throw fallbackError;
        if (session) {
          logger.info('Fallback: Using existing valid session');
          refreshAttemptCountRef.current = 0;
          lastRefreshRef.current = Date.now();
          return { success: true, session };
        }
        throw new Error('No valid session found in fallback');
      } catch (fallbackError) {
        logger.error('Fallback session check failed', fallbackError);
        return { success: false, session: null, error: fallbackError instanceof Error ? fallbackError : new Error('Unknown fallback error') };
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refreshAttemptCountRef.current = 0;
    isProcessingRef.current = false; // Reset processing flag on mount

    if (!enabled) return;

    // Clear existing interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Set up periodic refresh with reduced frequency
    const adjustedRefreshInterval = Math.max(refreshInterval, 25 * 60 * 1000); // Minimum 25 minutes
    intervalIdRef.current = setInterval(async () => {
      if (isMountedRef.current && !isProcessingRef.current) {
        await refreshSession();
      }
    }, adjustedRefreshInterval);

    // Handle visibility change with debouncing
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        // Clear any pending visibility timeout
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        
        // Debounce visibility change handling
        visibilityTimeout = setTimeout(async () => {
          const now = Date.now();
          // Refresh if it's been more than half the refresh interval since last refresh
          if (now - lastRefreshRef.current > adjustedRefreshInterval / 2 && !isProcessingRef.current) {
            await refreshSession();
          }
        }, 1000); // 1 second debounce
      }
    };

    // Handle window focus with debouncing
    let focusTimeout: NodeJS.Timeout | null = null;
    const handleFocus = () => {
      if (isMountedRef.current) {
        // Clear any pending focus timeout
        if (focusTimeout) {
          clearTimeout(focusTimeout);
        }
        
        // Debounce focus handling
        focusTimeout = setTimeout(async () => {
          const now = Date.now();
          // Refresh if it's been more than half the refresh interval since last refresh
          if (now - lastRefreshRef.current > adjustedRefreshInterval / 2 && !isProcessingRef.current) {
            await refreshSession();
          }
        }, 1000); // 1 second debounce
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Initial refresh on mount if enabled (but not immediately)
    if (enabled) {
      // Delay initial refresh to prevent immediate calls
      setTimeout(() => {
        if (isMountedRef.current) {
          refreshSession();
        }
      }, 5000); // 5 second delay
    }

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refreshInterval, refreshSession]);

  return { refreshSession };
}