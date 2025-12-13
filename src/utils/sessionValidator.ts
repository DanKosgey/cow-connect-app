import { logger } from '@/utils/logger';
import { authService } from '@/lib/supabase/auth-service';

/**
 * Utility functions for session validation and management.
 * These functions provide a consistent interface for session operations,
 * with built-in error handling and logging.
 */

/**
 * Check if the current session is valid.
 * @returns {Promise<boolean>} True if session is valid, false otherwise.
 */
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const session = await authService.getCurrentSession();
    return !!session;
  } catch (error) {
    logger.error('Failed to check session validity', { error });
    return false;
  }
};

/**
 * Validate the current session and refresh if necessary.
 * @returns {Promise<boolean>} True if session is valid or successfully refreshed, false otherwise.
 */
export const validateAndRefreshSession = async (): Promise<boolean> => {
  try {
    const result = await authService.refreshSession();
    return !!result.session && !result.error;
  } catch (error) {
    logger.error('Failed to validate and refresh session', { error });
    return false;
  }
};

/**
 * Force a session refresh.
 * @returns {Promise<boolean>} True if refresh was successful, false otherwise.
 */
export const forceSessionRefresh = async (): Promise<boolean> => {
  try {
    const result = await authService.refreshSession();
    return !!result.session && !result.error;
  } catch (error) {
    logger.error('Failed to force session refresh', { error });
    return false;
  }
};

/**
 * Clear all session data and sign out.
 * @returns {Promise<void>}
 */
export const clearSessionAndSignOut = async (): Promise<void> => {
  try {
    await authService.signOut();
  } catch (error) {
    logger.error('Failed to clear session and sign out', { error });
    throw error; // Rethrow to allow caller handling
  }
};