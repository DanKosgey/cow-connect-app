import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { authManager } from '@/utils/authManager';

/**
 * Utility functions for session validation and management
 */

/**
 * Check if the current session is valid
 * @returns {Promise<boolean>} True if session is valid, false otherwise
 */
export const isSessionValid = async (): Promise<boolean> => {
  return await authManager.isSessionValid();
};

/**
 * Validate and refresh session if needed
 * @returns {Promise<boolean>} True if session is valid or successfully refreshed, false otherwise
 */
export const validateAndRefreshSession = async (): Promise<boolean> => {
  return await authManager.validateAndRefreshSession();
};

/**
 * Force session refresh
 * @returns {Promise<boolean>} True if refresh was successful, false otherwise
 */
export const forceSessionRefresh = async (): Promise<boolean> => {
  return await authManager.refreshSession();
};

/**
 * Clear all session data and sign out
 * @returns {Promise<void>}
 */
export const clearSessionAndSignOut = async (): Promise<void> => {
  return await authManager.signOut();
};

export default {
  isSessionValid,
  validateAndRefreshSession,
  forceSessionRefresh,
  clearSessionAndSignOut
};