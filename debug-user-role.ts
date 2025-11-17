import { supabase } from './src/integrations/supabase/client.js';
import { logger } from './src/utils/logger';

async function debugUserRole() {
  console.log('=== Debugging User Role Issue ===\n');
  
  const adminUserId = 'eec68d01-fb71-4381-b06d-ffb593b3f21e';
  
  // 1. Check auth user
  console.log('1. Checking auth user...');
  try {
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(adminUserId);
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else {
      console.log('✅ Auth user found:', {
        id: authUser.user.id,
        email: authUser.user.email
      });
    }
  } catch (error) {
    console.log('❌ Exception checking auth user:', error);
  }
  
  // 2. Check profiles
  console.log('\n2. Checking profiles...');
  try {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUserId);
      
    if (profileError) {
      console.log('❌ Profile error:', profileError.message);
    } else {
      console.log('✅ Profiles found:', profiles);
    }
  } catch (error) {
    console.log('❌ Exception checking profiles:', error);
  }
  
  // 3. Check user_roles with the exact query used in getUserRole
  console.log('\n3. Checking user_roles with exact getUserRole query...');
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .maybeSingle();
      
    if (error) {
      console.log('❌ Error in getUserRole query:', error.message);
    } else {
      console.log('✅ getUserRole query result:', data);
    }
  } catch (error) {
    console.log('❌ Exception in getUserRole query:', error);
  }
  
  // 4. Check user_roles with alternative query
  console.log('\n4. Checking user_roles with alternative query...');
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId);
      
    if (error) {
      console.log('❌ Error in alternative query:', error.message);
    } else {
      console.log('✅ Alternative query result:', data);
    }
  } catch (error) {
    console.log('❌ Exception in alternative query:', error);
  }
  
  // 5. Check all user_roles for this user
  console.log('\n5. Checking all user_roles entries for this user...');
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUserId);
      
    if (error) {
      console.log('❌ Error in full query:', error.message);
    } else {
      console.log('✅ Full query result:', data);
    }
  } catch (error) {
    console.log('❌ Exception in full query:', error);
  }
  
  console.log('\n=== Debug Complete ===');
}

// Run the debug
debugUserRole().catch(console.error);