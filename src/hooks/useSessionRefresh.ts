import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { authManager } from '@/utils/authManager';

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

  const refreshSession = useCallback(async (): Promise<RefreshResult> => {
    try {
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
        return { success: false, session: null, error: new Error('Max refresh attempts reached') };
      }

      logger.debug('Attempting session refresh', { attempt: refreshAttemptCountRef.current + 1 });

      // Timeout for refresh operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session refresh timeout after 30 seconds')), 30000);
      });

      // Perform refresh
      const refreshPromise = authManager.refreshSession();
      const success = await Promise.race([refreshPromise, timeoutPromise]);

      if (!success) {
        throw new Error('Session refresh returned false');
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
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refreshAttemptCountRef.current = 0;

    if (!enabled) return;

    // Clear existing interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Set up periodic refresh
    intervalIdRef.current = setInterval(async () => {
      if (isMountedRef.current) {
        await refreshSession();
      }
    }, refreshInterval);

    // Handle visibility change
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        const now = Date.now();
        if (now - lastRefreshRef.current > refreshInterval) {
          await refreshSession();
        }
      }
    };

    // Handle window focus
    const handleFocus = async () => {
      if (isMountedRef.current) {
        const now = Date.now();
        if (now - lastRefreshRef.current > refreshInterval) {
          await refreshSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Initial refresh on mount if enabled
    refreshSession();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refreshInterval]);

  return { refreshSession };
}