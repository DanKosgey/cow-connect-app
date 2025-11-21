import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { authManager } from '@/utils/authManager';

interface UseSessionRefreshOptions {
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

/**
 * Custom hook to automatically refresh Supabase session to prevent timeouts
 * @param options - Configuration options for session refresh
 */
export function useSessionRefresh(options: UseSessionRefreshOptions = {}) {
  const { enabled = true, refreshInterval = 45 * 60 * 1000 } = options; // Refresh every 45 minutes
  const isMountedRef = useRef(true);
  const lastRefreshRef = useRef<number>(0);
  const refreshAttemptCountRef = useRef<number>(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      // Prevent too frequent refreshes (at least 15 minutes between refreshes)
      const now = Date.now();
      if (now - lastRefreshRef.current < 15 * 60 * 1000) {
        logger.debug('Skipping session refresh - too soon since last refresh');
        return { success: true, session: null };
      }

      // Limit refresh attempts to prevent excessive requests
      if (refreshAttemptCountRef.current >= 3) {
        logger.warn('Skipping session refresh - too many attempts');
        return { success: true, session: null };
      }

      logger.debug('Auto-refreshing session');
      
      // Use auth manager to refresh session
      const success = await authManager.refreshSession();
      
      if (!success) {
        logger.error('Session refresh failed');
        refreshAttemptCountRef.current++;
        return { success: false, error: new Error('Session refresh failed') };
      }
      
      // Get updated session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Reset attempt count on success
      refreshAttemptCountRef.current = 0;
      
      // Update last refresh time
      lastRefreshRef.current = Date.now();
      logger.info('Session auto-refreshed successfully');
      return { success: true, session };
    } catch (error) {
      // Check if component is still mounted
      if (!isMountedRef.current) return { success: false, error: new Error('Component unmounted') };
      
      logger.errorWithContext('Auto session refresh exception', error);
      refreshAttemptCountRef.current++;
      
      // If it's a network error, we might want to retry
      if (error instanceof Error && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch'))) {
        logger.warn('Network error during session refresh, will retry on next attempt');
        // Don't increment attempt count for network errors
        refreshAttemptCountRef.current = Math.max(0, refreshAttemptCountRef.current - 1);
      }
      
      // Try to get current session as fallback
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          logger.info('Fallback: Current session still valid');
          refreshAttemptCountRef.current = 0;
          lastRefreshRef.current = Date.now();
          return { success: true, session };
        }
      } catch (fallbackError) {
        logger.errorWithContext('Fallback session check failed', fallbackError);
      }
      
      return { success: false, error };
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refreshAttemptCountRef.current = 0;
    
    if (!enabled) return;

    // Clear any existing interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }

    // Set up interval for periodic session refresh
    intervalIdRef.current = setInterval(() => {
      if (isMountedRef.current) {
        refreshSession();
      }
    }, refreshInterval);

    // Also refresh on page visibility change to handle cases where
    // the user switches tabs and comes back after a while
    // But only if enough time has passed since last refresh
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        const now = Date.now();
        // Refresh if it's been more than 30 minutes since last refresh
        if (now - lastRefreshRef.current > 30 * 60 * 1000) {
          refreshSession();
        }
      }
    };

    // Also refresh when the window regains focus, but with rate limiting
    const handleFocus = () => {
      if (isMountedRef.current) {
        const now = Date.now();
        // Refresh if it's been more than 30 minutes since last refresh
        if (now - lastRefreshRef.current > 30 * 60 * 1000) {
          refreshSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refreshInterval, refreshSession]);

  return { refreshSession };
}