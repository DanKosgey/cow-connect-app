import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class AuthTest {
  static async testUserRolesTable() {
    try {
      logger.info('Testing user_roles table access');
      
      // Test a simple query to user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .limit(1);
      
      logger.info('User roles table test result', { data, error });
      
      if (error) {
        // Try a more basic query
        const { data: countData, error: countError } = await supabase
          .from('user_roles')
          .select('count', { count: 'exact' });
        
        logger.info('User roles count test', { countData, countError });
        
        return { success: !countError, data: countData, error: countError };
      }
      
      return { success: true, data, error: null };
    } catch (error) {
      logger.errorWithContext('User roles table test', error);
      return { success: false, data: null, error };
    }
  }
  
  static async testAuthConnection() {
    try {
      logger.info('Testing authentication connection');
      
      // Test getting session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      logger.info('Session test', { session: sessionData, error: sessionError });
      
      // Test getting user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      logger.info('User test', { user: userData, error: userError });
      
      return {
        session: { data: sessionData, error: sessionError },
        user: { data: userData, error: userError }
      };
    } catch (error) {
      logger.errorWithContext('Auth connection test', error);
      return { error };
    }
  }
  
  static async verifyAdminUser(email: string) {
    try {
      logger.info('Verifying admin user', { email });
      
      // First check if user exists
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);
      
      logger.info('User lookup result', { users, usersError });
      
      if (usersError || !users || users.length === 0) {
        return { exists: false, hasRole: false, error: usersError };
      }
      
      const userId = users[0].id;
      
      // Check if user has admin role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);
      
      logger.info('Role lookup result', { roles, rolesError });
      
      if (rolesError) {
        return { exists: true, hasRole: false, error: rolesError };
      }
      
      const hasAdminRole = roles.some(role => role.role === 'admin');
      
      return { 
        exists: true, 
        hasRole: hasAdminRole, 
        userId,
        roles,
        error: null 
      };
    } catch (error) {
      logger.errorWithContext('Verify admin user', error);
      return { exists: false, hasRole: false, error };
    }
  }
}