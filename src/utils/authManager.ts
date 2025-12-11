import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { UserRole } from '@/types/auth.types';

/**
 * Comprehensive Authentication Manager
 * Handles session validation, refresh, and cross-tab synchronization
 */

interface SessionCheckResult {
  isValid: boolean;
  needsRefresh: boolean;
  error?: Error;
}

interface JWTPayload {
  exp?: number;
  iat?: number;
  sub?: string;
}

class AuthManager {
  private static instance: AuthManager;
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private storageHandler: ((e: StorageEvent) => void) | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastSessionCheck: number = 0;
  private readonly sessionCheckCooldown: number = 30000; // 30 seconds
  private readonly sessionRefreshBuffer: number = 30 * 60 * 1000; // 30 minutes
  private readonly periodicCheckInterval: number = 30 * 60 * 1000; // 30 minutes
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  private constructor() {
    this.setupCrossTabSync();
    this.initBroadcastChannel();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Initialize Broadcast Channel for modern browsers
   */
  private initBroadcastChannel(): void {
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('auth-events');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'LOGOUT') {
            this.handleCrossTabLogout();
          } else if (event.data?.type === 'SESSION_REFRESH') {
            logger.debug('Session refreshed in another tab');
          }
        };
      } catch (error) {
        logger.errorWithContext('Failed to initialize BroadcastChannel', error);
      }
    }
  }

  /**
   * Check if current session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const result = await this.checkSession();
      return result.isValid;
    } catch (error) {
      logger.errorWithContext('Session validation exception', error);
      return false;
    }
  }

  /**
   * Internal session check with detailed results
   */
  private async checkSession(): Promise<SessionCheckResult> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.errorWithContext('Session validation error', error);
        return { isValid: false, needsRefresh: false, error: error as Error };
      }
      
      if (!session) {
        logger.info('No active session found');
        return { isValid: false, needsRefresh: false };
      }
      
      // Check if session is expired
      const expiresAt = session.expires_at;
      if (expiresAt && Date.now() >= expiresAt * 1000) {
        logger.warn('Session has expired');
        return { isValid: false, needsRefresh: true };
      }
      
      // Validate access token expiration
      const tokenExpired = this.isTokenExpired(session.access_token);
      if (tokenExpired) {
        logger.warn('Access token has expired');
        return { isValid: false, needsRefresh: true };
      }
      
      // Check if session is about to expire
      if (expiresAt) {
        const timeUntilExpiry = expiresAt * 1000 - Date.now();
        if (timeUntilExpiry < this.sessionRefreshBuffer) {
          logger.info('Session is valid but approaching expiration');
          return { isValid: true, needsRefresh: true };
        }
      }
      
      logger.debug('Session is valid');
      return { isValid: true, needsRefresh: false };
    } catch (error) {
      logger.errorWithContext('Session check exception', error);
      return { isValid: false, needsRefresh: false, error: error as Error };
    }
  }

  /**
   * Check if JWT token is expired
   */
  private isTokenExpired(token?: string): boolean {
    if (!token) return true;
    
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        logger.warn('Invalid JWT token format');
        return true;
      }
      
      const payload = JSON.parse(atob(tokenParts[1])) as JWTPayload;
      
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return true;
      }
      
      return false;
    } catch (error) {
      logger.warn('Could not decode access token for validation', error);
      return true; // Assume expired if we can't decode
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

      const result = await this.checkSession();
      
      if (!result.isValid && !result.needsRefresh) {
        logger.info('Session is invalid and cannot be refreshed');
        return false;
      }
      
      if (result.needsRefresh) {
        logger.info('Session needs refresh');
        return await this.refreshSession();
      }
      
      logger.debug('Session is valid and not close to expiration');
      return true;
    } catch (error) {
      logger.errorWithContext('Session validation and refresh error', error);
      return false;
    }
  }

  /**
   * Force session refresh with deduplication
   */
  async refreshSession(): Promise<boolean> {
    // Prevent concurrent refresh requests
    if (this.isRefreshing && this.refreshPromise) {
      logger.debug('Session refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual session refresh
   */
  private async performRefresh(): Promise<boolean> {
    try {
      logger.info('Refreshing session');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.errorWithContext('Session refresh failed', error);
        
        // If it's an auth error, sign out
        if (this.isAuthError(error)) {
          logger.info('Session invalid during refresh, signing out...');
          await this.signOut();
          return false;
        }
        
        return false;
      }
      
      if (!data.session) {
        logger.warn('No session returned from refresh');
        return false;
      }
      
      logger.info('Session successfully refreshed');
      
      // Notify other tabs
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'SESSION_REFRESH' });
        } catch (error) {
          logger.errorWithContext('Failed to broadcast session refresh', error);
        }
      }
      
      return true;
    } catch (error) {
      logger.errorWithContext('Session refresh exception', error);
      
      // Try to get current session as fallback
      const fallbackValid = await this.checkFallbackSession();
      return fallbackValid;
    }
  }

  /**
   * Check if current session is still valid as fallback
   */
  private async checkFallbackSession(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !this.isTokenExpired(session.access_token)) {
        logger.info('Fallback: Current session still valid');
        return true;
      }
    } catch (fallbackError) {
      logger.errorWithContext('Fallback session check failed', fallbackError);
    }
    return false;
  }

  /**
   * Check if error is an authentication error
   */
  private isAuthError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';
    const status = error.status?.toString() || '';
    
    const authErrorIndicators = [
      'invalid authentication credentials',
      'jwt expired',
      'not authenticated',
      'invalid token',
      'token expired',
      'no authorization',
      'unauthorized',
      'forbidden',
      'invalid_grant',
      'invalid_token'
    ];
    
    const statusCodes = ['401', '403'];
    
    return authErrorIndicators.some(indicator => message.includes(indicator)) ||
           authErrorIndicators.some(indicator => code.includes(indicator)) ||
           statusCodes.includes(status);
  }

  /**
   * Sign out user and clear all session data
   */
  async signOut(): Promise<void> {
    try {
      logger.info('Signing out user and clearing session data');
      
      // Notify other tabs before signing out
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'LOGOUT' });
        } catch (error) {
          logger.errorWithContext('Failed to broadcast logout', error);
        }
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.errorWithContext('Sign out error', error);
      }
      
      // Clear all auth-related data
      this.clearAuthData();
      
      logger.info('User signed out successfully');
    } catch (error) {
      logger.errorWithContext('Error during sign out', error);
      // Still clear auth data even if signout fails
      this.clearAuthData();
    }
  }

  /**
   * Clear all authentication data
   */
  clearAuthData(): void {
    try {
      logger.debug('Clearing all authentication data');
      
      // Clear known localStorage items
      const itemsToRemove = [
        'cached_user', 
        'cached_role', 
        'auth_cache_timestamp',
        'last_auth_clear_time',
        'auth_role_cache'
      ];
      
      itemsToRemove.forEach(item => {
        try {
          localStorage.removeItem(item);
        } catch (error) {
          logger.errorWithContext(`Failed to remove ${item}`, error);
        }
      });
      
      // Clear Supabase-specific items
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase.')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        logger.errorWithContext('Failed to clear Supabase items', error);
      }
      
      // Clear sessionStorage
      try {
        sessionStorage.clear();
      } catch (error) {
        logger.errorWithContext('Failed to clear sessionStorage', error);
      }
      
      logger.debug('Authentication data cleared successfully');
    } catch (error) {
      logger.errorWithContext('Error clearing authentication data', error);
    }
  }

  /**
   * Handle cross-tab logout via BroadcastChannel
   */
  private handleCrossTabLogout(): void {
    logger.info('Logout detected in another tab');
    this.clearAuthData();
    this.redirectToLogin();
  }

  /**
   * Redirect to login if not already there
   */
  private redirectToLogin(): void {
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && !currentPath.includes('/login')) {
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
        // Check if session was cleared
        if (this.isSessionClearedEvent(e)) {
          logger.info('Session cleared in another tab, signing out locally');
          this.clearAuthData();
          this.redirectToLogin();
        }
      };
      
      window.addEventListener('storage', this.storageHandler);
      
      // Handle page visibility changes
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          logger.debug('Page became visible, checking session validity');
          this.validateAndRefreshSession().catch(error => {
            logger.errorWithContext('Error during visibility-based session check', error);
          });
        }
      };
      
      document.addEventListener('visibilitychange', this.visibilityHandler);
      
      // Setup periodic session checks
      this.sessionCheckInterval = setInterval(() => {
        this.validateAndRefreshSession().catch(error => {
          logger.errorWithContext('Error during periodic session check', error);
        });
      }, this.periodicCheckInterval);
      
    } catch (error) {
      logger.errorWithContext('Error setting up cross-tab sync', error);
    }
  }

  /**
   * Check if storage event indicates session was cleared
   */
  private isSessionClearedEvent(e: StorageEvent): boolean {
    if (!e.key) return false;
    
    const isSupabaseKey = e.key.includes('supabase') || e.key.startsWith('sb-');
    const wasCleared = e.newValue === null && e.oldValue !== null;
    
    return isSupabaseKey && wasCleared;
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    
    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }

  /**
   * Get user role with proper error handling and caching
   */
  async getUserRole(userId: string): Promise<UserRole | null> {
    if (!userId) {
      logger.warn('getUserRole called with empty userId');
      return null;
    }

    try {
      logger.debug('Fetching user role for user:', userId);
      
      // Use the secure function that bypasses RLS
      const { data, error } = await supabase.rpc('get_user_role_secure', { 
        user_id_param: userId 
      });

      if (error) {
        logger.errorWithContext('Error calling secure function to get user role', error);
        return null;
      }

      if (!data) {
        logger.warn('No active role found for user:', userId);
        return null;
      }

      // Parse and validate role
      const role = this.parseUserRole(data as string);
      
      if (role) {
        logger.debug('User role fetched successfully:', role);
      }
      
      return role;
    } catch (error) {
      logger.errorWithContext('Exception getting user role', error);
      return null;
    }
  }

  /**
   * Parse user role string to enum
   */
  private parseUserRole(roleValue: string): UserRole | null {
    const roleMap: Record<string, UserRole> = {
      'admin': UserRole.ADMIN,
      'staff': UserRole.STAFF,
      'farmer': UserRole.FARMER,
      'collector': UserRole.COLLECTOR,
      'creditor': UserRole.CREDITOR
    };

    const normalizedRole = roleValue.toLowerCase().trim();
    const role = roleMap[normalizedRole];

    if (!role) {
      logger.error('Invalid role value:', roleValue);
      return null;
    }

    return role;
  }

  /**
   * Get current user session
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.errorWithContext('Error fetching current session', error);
        return null;
      }
      
      return session;
    } catch (error) {
      logger.errorWithContext('Exception getting current session', error);
      return null;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        logger.errorWithContext('Error fetching current user', error);
        return null;
      }
      
      return user;
    } catch (error) {
      logger.errorWithContext('Exception getting current user', error);
      return null;
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();

// Export for backward compatibility
export default authManager;