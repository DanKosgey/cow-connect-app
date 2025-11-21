import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Utility functions for session validation and management
 */

/**
 * Check if the current session is valid
 * @returns {Promise<boolean>} True if session is valid, false otherwise
 */
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      logger.info('No active session found');
      return false;
    }
    
    // Check if session is expired
    const expiresAt = session.expires_at;
    if (expiresAt && Date.now() >= expiresAt * 1000) {
      logger.warn('Session has expired');
      return false;
    }
    
    logger.info('Session is valid');
    return true;
  } catch (error) {
    logger.errorWithContext('Session validation error', error);
    return false;
  }
};

/**
 * Validate and refresh session if needed
 * @returns {Promise<boolean>} True if session is valid or successfully refreshed, false otherwise
 */
export const validateAndRefreshSession = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      logger.info('No session to validate');
      return false;
    }
    
    // Check if session is about to expire (within 10 minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const timeUntilExpiry = expiresAt * 1000 - Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      if (timeUntilExpiry < tenMinutes) {
        logger.info('Session is about to expire, attempting refresh');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          logger.errorWithContext('Session refresh failed', error);
          return false;
        }
        
        if (!data.session) {
          logger.warn('No session returned from refresh');
          return false;
        }
        
        logger.info('Session successfully refreshed');
        return true;
      }
    }
    
    logger.info('Session is valid and not close to expiration');
    return true;
  } catch (error) {
    logger.errorWithContext('Session validation and refresh error', error);
    return false;
  }
};

/**
 * Force session refresh
 * @returns {Promise<boolean>} True if refresh was successful, false otherwise
 */
export const forceSessionRefresh = async (): Promise<boolean> => {
  try {
    logger.info('Forcing session refresh');
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      logger.errorWithContext('Forced session refresh failed', error);
      return false;
    }
    
    if (!data.session) {
      logger.warn('No session returned from forced refresh');
      return false;
    }
    
    logger.info('Session successfully force refreshed');
    return true;
  } catch (error) {
    logger.errorWithContext('Forced session refresh error', error);
    return false;
  }
};

/**
 * Clear all session data and sign out
 * @returns {Promise<void>}
 */
export const clearSessionAndSignOut = async (): Promise<void> => {
  try {
    logger.info('Clearing session and signing out');
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.errorWithContext('Sign out error', error);
    }
    
    // Clear localStorage items
    const itemsToRemove = [
      'cached_user', 
      'cached_role', 
      'auth_cache_timestamp',
      'last_auth_clear_time'
    ];
    
    itemsToRemove.forEach(item => {
      localStorage.removeItem(item);
    });
    
    // Clear specific Supabase items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('supabase-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    logger.info('Session cleared successfully');
  } catch (error) {
    logger.errorWithContext('Error clearing session', error);
  }
};

export default {
  isSessionValid,
  validateAndRefreshSession,
  forceSessionRefresh,
  clearSessionAndSignOut
};