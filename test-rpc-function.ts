import { supabase } from './src/integrations/supabase/client';

async function testRpcFunction() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return;
    }
    
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    console.log('Testing RPC function for user:', user.id);
    
    // Test the optimized RPC function
    const { data, error } = await supabase.rpc('get_user_role_optimized', {
      user_id_param: user.id
    });
    
    console.log('RPC Result:', { data, error });
    
    // Also test the view directly
    const { data: viewData, error: viewError } = await supabase
      .from('user_roles_view')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
      
    console.log('View Result:', { viewData, viewError });
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testRpcFunction();