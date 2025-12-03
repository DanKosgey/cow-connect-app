import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { UserRole } from '@/types/auth.types';

/**
 * Comprehensive Authentication Manager
 * Handles session validation, refresh, and cross-tab synchronization
 */

class AuthManager {
  private static instance: AuthManager;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private storageHandler: ((e: StorageEvent) => void) | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastSessionCheck: number = 0;
  private sessionCheckCooldown: number = 30000; // 30 seconds

  private constructor() {
    this.setupCrossTabSync();
    // Initialize Broadcast Channel for modern browsers
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('auth-events');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'LOGOUT') {
          this.handleCrossTabLogout();
        }
      };
    }
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Check if current session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.errorWithContext('Session validation error', error);
        return false;
      }
      
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
      
      // Additional validation: Check if access token is valid
      if (session.access_token) {
        try {
          // Decode JWT to check expiration (without using external libraries)
          const tokenParts = session.access_token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
              logger.warn('Access token has expired');
              return false;
            }
          }
        } catch (decodeError) {
          logger.warn('Could not decode access token for validation');
        }
      }
      
      logger.info('Session is valid');
      return true;
    } catch (error) {
      logger.errorWithContext('Session validation exception', error);
      return false;
    }
  }

  /**
   * Validate and refresh session if needed
   */
  async validateAndRefreshSession(): Promise<boolean> {
    try {
      // Rate limiting to prevent excessive checks
      const now = Date.now();
      if (now - this.lastSessionCheck < this.sessionCheckCooldown) {
        logger.debug('Skipping session check - too soon since last check');
        return true;
      }
      this.lastSessionCheck = now;

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.errorWithContext('Session fetch error', error);
        return false;
      }
      
      if (!session) {
        logger.info('No session to validate');
        return false;
      }
      
      // Check if session is about to expire (increased to 30 minutes buffer)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const timeUntilExpiry = expiresAt * 1000 - Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (timeUntilExpiry < thirtyMinutes) {
          logger.info('Session is about to expire, attempting refresh');
          return await this.refreshSession();
        }
      }
      
      logger.info('Session is valid and not close to expiration');
      return true;
    } catch (error) {
      logger.errorWithContext('Session validation and refresh error', error);
      return false;
    }
  }

  /**
   * Force session refresh
   */
  async refreshSession(): Promise<boolean> {
    try {
      logger.info('Forcing session refresh');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.errorWithContext('Forced session refresh failed', error);
        
        // If it's an auth error, sign out
        if (this.isAuthError(error)) {
          logger.info('Session invalid during refresh, signing out...');
          await this.signOut();
          return false;
        }
        
        return false;
      }
      
      if (!data.session) {
        logger.warn('No session returned from forced refresh');
        return false;
      }
      
      logger.info('Session successfully force refreshed');
      return true;
    } catch (error) {
      logger.errorWithContext('Forced session refresh exception', error);
      // Try to get current session as fallback
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          logger.info('Fallback: Current session still valid');
          return true;
        }
      } catch (fallbackError) {
        logger.errorWithContext('Fallback session check failed', fallbackError);
      }
      return false;
    }
  }

  /**
   * Check if error is an authentication error
   */
  private isAuthError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const authErrorIndicators = [
      'invalid authentication credentials',
      'jwt expired',
      'not authenticated',
      'invalid token',
      'token expired',
      'no authorization',
      '401',
      '403'
    ];
    
    return authErrorIndicators.some(indicator => 
      message.includes(indicator)
    );
  }

  /**
   * Sign out user and clear all session data
   */
  async signOut(): Promise<void> {
    try {
      logger.info('Signing out user and clearing session data');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.errorWithContext('Sign out error', error);
      }
      
      // Clear all auth-related data
      this.clearAuthData();
      
      // Notify other tabs via BroadcastChannel
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'LOGOUT' });
      }
      
      logger.info('User signed out successfully');
    } catch (error) {
      logger.errorWithContext('Error during sign out', error);
    }
  }

  /**
   * Clear all authentication data
   */
  clearAuthData(): void {
    try {
      logger.info('Clearing all authentication data');
      
      // Clear localStorage items
      const itemsToRemove = [
        'cached_user', 
        'cached_role', 
        'auth_cache_timestamp',
        'last_auth_clear_time',
        'auth_role_cache'
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
      
      logger.info('Authentication data cleared successfully');
    } catch (error) {
      logger.errorWithContext('Error clearing authentication data', error);
    }
  }

  /**
   * Handle cross-tab logout via BroadcastChannel
   */
  private handleCrossTabLogout() {
    logger.info('Logout detected in another tab via BroadcastChannel');
    this.clearAuthData();
    if (window.location.pathname !== '/' && !window.location.pathname.includes('/login')) {
      window.location.href = '/';
    }
  }

  /**
   * Setup cross-tab synchronization
   */
  private setupCrossTabSync(): void {
    try {
      // Handle storage changes for cross-tab logout
      this.storageHandler = (e: StorageEvent) => {
        // Enhanced session key detection
        if ((e.key === 'sb-current-session' || e.key?.includes('supabase')) && e.newValue === null) {
          logger.info('Session cleared in another tab, signing out locally');
          this.clearAuthData();
          // Redirect to login if not already on login page
          if (window.location.pathname !== '/' && !window.location.pathname.includes('/login')) {
            window.location.href = '/';
          }
        }
      };
      
      window.addEventListener('storage', this.storageHandler);
      
      // Handle page visibility changes with improved logging
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          logger.debug('Page became visible, checking session validity');
          this.validateAndRefreshSession().catch(error => {
            logger.errorWithContext('Error during visibility-based session check', error);
          });
        }
      };
      
      document.addEventListener('visibilitychange', this.visibilityHandler);
      
      // Setup less frequent session checks to reduce load
      this.sessionCheckInterval = setInterval(() => {
        this.validateAndRefreshSession().catch(error => {
          logger.errorWithContext('Error during periodic session check', error);
        });
      }, 30 * 60 * 1000); // Check every 30 minutes
      
    } catch (error) {
      logger.errorWithContext('Error setting up cross-tab sync', error);
    }
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    
    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
    }
    
    // Close BroadcastChannel if it exists
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }

  /**
   * Get user role with proper error handling
   */
  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      logger.debug('Fetching user role for user:', userId);
      
      // Use the secure function that bypasses RLS
      const { data, error } = await supabase.rpc('get_user_role_secure', { user_id_param: userId });

      if (error) {
        logger.errorWithContext('Error calling secure function to get user role', error);
        return null;
      }

      // No role found
      if (!data) {
        logger.warn('No active role found for user:', userId);
        return null;
      }

      // The function returns a text string
      const roleValue = data as string;
      logger.debug('Role from secure function:', roleValue);

      // Map string values to enum values
      let role: UserRole | null = null;
      switch (roleValue.toLowerCase()) {
        case 'admin':
          role = UserRole.ADMIN;
          break;
        case 'staff':
          role = UserRole.STAFF;
          break;
        case 'farmer':
          role = UserRole.FARMER;
          break;
        case 'collector':
          role = UserRole.COLLECTOR;
          break;
        case 'creditor':
          role = UserRole.CREDITOR;
          break;
        default:
          logger.error('Invalid role value:', roleValue);
          return null;
      }

      logger.debug('User role fetched successfully:', role);
      return role;
    } catch (error) {
      logger.errorWithContext('Exception getting user role', error);
      return null;
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();

// Export for backward compatibility
export default authManager;