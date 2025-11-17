import { supabase } from '@/integrations/supabase/client';
import AdminDebugLogger from './adminDebugLogger';

// Test function to verify admin role functionality
export const testAdminRole = async (userId: string) => {
  AdminDebugLogger.auth('Testing admin role for user:', userId);
  
  try {
    // Test 1: Direct query to user_roles table
    AdminDebugLogger.database('Test 1: Direct query to user_roles table');
    const { data: directData, error: directError } = await supabase
      .from('user_roles')
      .select('role, active')
      .eq('user_id', userId)
      .eq('active', true);
    
    AdminDebugLogger.database('Direct query result:', { data: directData, error: directError?.message });
    
    // Test 2: Using the secure function
    AdminDebugLogger.database('Test 2: Using get_user_role_secure function');
    const { data: functionData, error: functionError } = await supabase.rpc('get_user_role_secure', {
      user_id_param: userId
    });
    
    AdminDebugLogger.database('Function call result:', { data: functionData, error: functionError?.message });
    
    // Test 3: Check if user exists in auth.users
    AdminDebugLogger.database('Test 3: Checking if user exists in auth.users');
    const { data: authData, error: authError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();
    
    AdminDebugLogger.database('Auth users query result:', { data: authData, error: authError?.message });
    
    return {
      directQuery: { data: directData, error: directError },
      functionCall: { data: functionData, error: functionError },
      authCheck: { data: authData, error: authError }
    };
  } catch (error) {
    AdminDebugLogger.error('Error in testAdminRole:', error);
    return { error };
  }
};

export default testAdminRole;