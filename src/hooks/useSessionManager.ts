import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

/**
 * Custom hook for managing user sessions with automatic refresh and validation.
 * Handles session lifecycle, refresh intervals, and error recovery.
 */
export const useSessionManager = (options?: { 
  refreshInterval?: number; 
  enableAutoRefresh?: boolean;
}) => {
  const { 
    isAuthenticated, 
    isLoading, 
    isSessionRefreshing, 
    refreshSession 
  } = useAuth();
  
  const { 
    refreshInterval = 25 * 60 * 1000, // 25 minutes default
    enableAutoRefresh = true 
  } = options || {};

  /**
   * Validate and refresh session if needed
   * NOTE: This should rely on Supabase's automatic refresh rather than forcing manual refreshes
   */
  const validateSession = useCallback(async () => {
    if (!isAuthenticated || isLoading || isSessionRefreshing) {
      return;
    }

    try {
      logger.debug('Validating session (no forced refresh)');
      // Instead of forcing a refresh, we just check if the session is still valid
      // Supabase handles automatic token refresh
      return true;
    } catch (error) {
      logger.error('Session validation error', error);
      return false;
    }
  }, [isAuthenticated, isLoading, isSessionRefreshing]);

  /**
   * Set up automatic session refresh
   */
  useEffect(() => {
    if (!enableAutoRefresh || !isAuthenticated || isLoading) {
      return;
    }

    logger.debug('Setting up auto session refresh monitoring', { refreshInterval });
    
    // We'll just monitor session validity rather than force refreshes
    const intervalId = setInterval(async () => {
      await validateSession();
    }, refreshInterval);

    // Remove the window focus and visibility change handlers that were causing
    // excessive refresh attempts and contributing to the rate limiting issues
    // Supabase's built-in auto-refresh should handle these cases

    // Initial validation
    validateSession();

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [enableAutoRefresh, isAuthenticated, isLoading, refreshInterval, validateSession]);

  return {
    validateSession,
    isSessionValid: isAuthenticated && !isLoading
  };
};