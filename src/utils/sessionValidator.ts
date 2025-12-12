import { logger } from '@/utils/logger';
import { authManager } from '@/utils/authManager';

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
    return await authManager.isSessionValid();
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
    return await authManager.validateAndRefreshSession();
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
    return await authManager.refreshSession();
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
    await authManager.signOut();
  } catch (error) {
    logger.error('Failed to clear session and sign out', { error });
    throw error; // Rethrow to allow caller handling
  }
};