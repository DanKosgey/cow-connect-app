import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class AuthDebugger {
  static async getCurrentSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        logger.error('Error getting session:', error);
        return { session: null, error };
      }
      return { session: data.session, error: null };
    } catch (error) {
      logger.error('Exception getting session:', error);
      return { session: null, error };
    }
  }

  static async getUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        logger.error('Error getting user:', error);
        return { user: null, error };
      }
      return { user: data.user, error: null };
    } catch (error) {
      logger.error('Exception getting user:', error);
      return { user: null, error };
    }
  }

  static async getUserRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .maybeSingle();
        
      if (error) {
        logger.error('Error getting user role:', error);
        return { role: null, error };
      }
      return { role: data?.role, error: null };
    } catch (error) {
      logger.error('Exception getting user role:', error);
      return { role: null, error };
    }
  }

  static async clearAllAuthData() {
    try {
      logger.info('Clearing all auth data...');
      
      // Sign out from Supabase
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        logger.error('Error signing out:', signOutError);
      }
      
      // Clear localStorage items
      const itemsToRemove = [
        'cached_user', 
        'cached_role', 
        'auth_cache_timestamp',
        'pending_profile',
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
      
      logger.info('All auth data cleared');
      return { success: true };
    } catch (error) {
      logger.error('Error clearing auth data:', error);
      return { success: false, error };
    }
  }

  static getLocalStorageItems() {
    const authItems: Record<string, string> = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('supabase') || 
          key.includes('cached') || key.includes('auth') || key.includes('pending')) {
        authItems[key] = localStorage.getItem(key) || '';
      }
    });
    return authItems;
  }

  static async testLogin(email: string, password: string) {
    try {
      logger.info('Testing login with:', { email });
      
      // First, sign out any existing session
      await supabase.auth.signOut();
      
      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        logger.error('Login error:', error);
        return { data: null, error };
      }
      
      logger.info('Login successful');
      return { data, error: null };
    } catch (error) {
      logger.error('Exception during login test:', error);
      return { data: null, error };
    }
  }
}