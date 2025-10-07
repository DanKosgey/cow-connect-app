import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface UseSessionRefreshOptions {
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

/**
 * Custom hook to automatically refresh Supabase session to prevent timeouts
 * @param options - Configuration options for session refresh
 */
export function useSessionRefresh(options: UseSessionRefreshOptions = {}) {
  const { enabled = true, refreshInterval = 15 * 60 * 1000 } = options; // Default to 15 minutes

  const refreshSession = useCallback(async () => {
    try {
      logger.debug('Auto-refreshing session');
      
      // Get current session first
      const { data: { session } } = await supabase.auth.getSession();
      
      // Only refresh if we have a session
      if (session) {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          logger.errorWithContext('Auto session refresh', error);
          return { success: false, error };
        }
        
        logger.info('Session auto-refreshed successfully');
        return { success: true, session: data?.session };
      }
      
      return { success: true, session: null };
    } catch (error) {
      logger.errorWithContext('Auto session refresh exception', error);
      return { success: false, error };
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Set up interval for periodic session refresh
    const intervalId = setInterval(() => {
      refreshSession();
    }, refreshInterval);

    // Also refresh on page visibility change to handle cases where
    // the user switches tabs and comes back after a while
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    // Also refresh when the window regains focus
    const handleFocus = () => {
      refreshSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refreshInterval, refreshSession]);

  return { refreshSession };
}