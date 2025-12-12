import { supabase } from '@/integrations/supabase/client';
import AdminDebugLogger from '@/utils/adminDebugLogger';

/**
 * Forcefully clear all authentication data including cookies, localStorage, and sessionStorage
 * This is a more aggressive approach than the standard signOut
 */
export const forceClearAllAuthData = async (): Promise<void> => {
  try {
    AdminDebugLogger.log('Force clearing all authentication data...');
    
    // 1. Sign out from Supabase (standard sign out)
    try {
      AdminDebugLogger.log('Signing out from Supabase...');
      await supabase.auth.signOut();
      AdminDebugLogger.success('Supabase sign out completed');
    } catch (error) {
      AdminDebugLogger.error('Error during Supabase sign out:', error);
    }
    
    // 2. Directly clear Supabase auth cookies
    try {
      AdminDebugLogger.log('Clearing Supabase auth cookies...');
      // Clear Supabase-specific cookies
      const supabaseCookies = [
        'sb-access-token',
        'sb-refresh-token',
        'sb-provider-token',
        'sb-provider-refresh-token'
      ];
      
      supabaseCookies.forEach(cookieName => {
        try {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
        } catch (error) {
          AdminDebugLogger.error(`Failed to clear cookie ${cookieName}:`, error);
        }
      });
    } catch (error) {
      AdminDebugLogger.error('Error clearing Supabase cookies:', error);
    }
    
    // 3. Clear all localStorage items related to auth
    try {
      AdminDebugLogger.log('Clearing localStorage auth data...');
      const localStorageKeys = Object.keys(localStorage);
      const authRelatedKeys = localStorageKeys.filter(key => 
        key.startsWith('sb-') || 
        key.startsWith('supabase-') ||
        key.includes('auth') ||
        key.includes('role') ||
        key.includes('session') ||
        key === 'cached_user' ||
        key === 'cached_role' ||
        key === 'auth_cache_timestamp' ||
        key === 'last_auth_clear_time' ||
        key === 'auth_role_cache'
      );
      
      authRelatedKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          AdminDebugLogger.log(`Removed localStorage key: ${key}`);
        } catch (error) {
          AdminDebugLogger.error(`Failed to remove localStorage key ${key}:`, error);
        }
      });
      AdminDebugLogger.success('LocalStorage auth data cleared');
    } catch (error) {
      AdminDebugLogger.error('Error clearing localStorage auth data:', error);
    }
    
    // 4. Clear all sessionStorage items
    try {
      AdminDebugLogger.log('Clearing sessionStorage...');
      sessionStorage.clear();
      AdminDebugLogger.success('SessionStorage cleared');
    } catch (error) {
      AdminDebugLogger.error('Error clearing sessionStorage:', error);
    }
    
    // 5. Clear all cookies (browser-specific)
    try {
      AdminDebugLogger.log('Clearing all cookies...');
      // Get all cookies
      const cookies = document.cookie.split(";");
      
      // Clear each cookie by setting expiration to past
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        
        // Set cookie to expire in the past
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      }
      AdminDebugLogger.success('All cookies cleared');
    } catch (error) {
      AdminDebugLogger.error('Error clearing cookies:', error);
    }
    
    AdminDebugLogger.success('All auth data cleared');
    
  } catch (error) {
    AdminDebugLogger.error('Error in forceClearAllAuthData:', error);
  }
};

/**
 * Force refresh the page with cache busting
 */
export const forceRefreshWithCacheBust = (): void => {
  AdminDebugLogger.log('Force refreshing with cache bust...');
  
  // Clear caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    }).catch(error => {
      AdminDebugLogger.error('Error clearing caches:', error);
    });
  }
  
  // Reload with cache busting
  window.location.href = window.location.origin + window.location.pathname + '?cache_bust=' + Date.now();
};

/**
 * Complete auth reset - clear everything and redirect to login
 */
export const completeAuthReset = async (redirectPath: string = '/'): Promise<void> => {
  AdminDebugLogger.log('Performing complete auth reset...');
  
  // Force clear all auth data
  await forceClearAllAuthData();
  
  // Small delay to ensure cleanup
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Try multiple approaches to ensure redirect
  try {
    // Approach 1: Hard redirect with cache busting
    const cacheBustedUrl = `${redirectPath}?t=${Date.now()}&cache_bust=true`;
    window.location.replace(cacheBustedUrl);
  } catch (error) {
    AdminDebugLogger.error('Error during window.location.replace:', error);
    try {
      // Approach 2: Assign href with cache busting
      const cacheBustedUrl = `${redirectPath}?t=${Date.now()}&cache_bust=true`;
      window.location.href = cacheBustedUrl;
    } catch (error2) {
      AdminDebugLogger.error('Error during window.location.href:', error2);
      try {
        // Approach 3: Force reload
        window.location.reload();
      } catch (error3) {
        AdminDebugLogger.error('Error during window.location.reload:', error3);
        // Final fallback: try to navigate using history
        try {
          window.history.replaceState(null, '', redirectPath);
          window.location.assign(redirectPath);
        } catch (error4) {
          AdminDebugLogger.error('All redirect methods failed:', error4);
        }
      }
    }
  }
};

export default {
  forceClearAllAuthData,
  forceRefreshWithCacheBust,
  completeAuthReset
};