// Simple script to check admin user role
const { createClient } = require('@supabase/supabase-js');

// Configuration - replace with your actual values
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAdminRole() {
  console.log('=== Checking Admin User Role ===');
  
  const adminUserId = 'eec68d01-fb71-4381-b06d-ffb593b3f21e';
  
  try {
    // Check if user exists in auth
    console.log('1. Checking auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(adminUserId);
    if (authError) {
      console.log('❌ Auth error:', authError.message);
    } else {
      console.log('✅ Auth user found:', authUser.user.email);
    }
    
    // Check user roles
    console.log('\n2. Checking user roles...');
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUserId);
      
    if (roleError) {
      console.log('❌ User roles error:', roleError.message);
    } else {
      console.log('✅ User roles found:', userRoles);
    }
    
    // Check profiles
    console.log('\n3. Checking profiles...');
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
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n=== Check Complete ===');
}

checkAdminRole();