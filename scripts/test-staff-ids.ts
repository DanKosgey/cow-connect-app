#!/usr/bin/env ts-node

import { supabase } from '../src/integrations/supabase/client';
import { logger } from '../src/utils/logger';

async function testStaffIds() {
  console.log('🔍 Testing staff IDs for batch approval...\n');
  
  try {
    // 1. Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Authentication error:', authError.message);
      return;
    }
    
    if (!user) {
      console.log('⚠️  No authenticated user');
      return;
    }
    
    console.log(`✅ Authenticated user: ${user.id} (${user.email})`);
    
    // 2. Check if user has a staff record
    console.log('\n2. Checking staff record...');
    const { data: staffRecord, error: staffError } = await supabase
      .from('staff')
      .select('id, user_id, employee_id')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (staffError) {
      console.error('❌ Error fetching staff record:', staffError.message);
      return;
    }
    
    if (!staffRecord) {
      console.log('❌ No staff record found for current user');
      console.log('This is likely the cause of the "Invalid staff ID" error');
      return;
    }
    
    console.log(`✅ Staff record found:`);
    console.log(`   - Staff ID: ${staffRecord.id}`);
    console.log(`   - User ID: ${staffRecord.user_id}`);
    console.log(`   - Employee ID: ${staffRecord.employee_id}`);
    
    // 3. Check user roles
    console.log('\n3. Checking user roles...');
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, active')
      .eq('user_id', user.id);
      
    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError.message);
      return;
    }
    
    if (!userRoles || userRoles.length === 0) {
      console.log('❌ No user roles found for current user');
      console.log('User needs to have either "staff" or "admin" role for batch approval');
      return;
    }
    
    console.log('✅ User roles:');
    userRoles.forEach(role => {
      console.log(`   - Role: ${role.role}, Active: ${role.active}`);
    });
    
    // 4. Check if user has valid role for batch approval
    const hasValidRole = userRoles.some(role => 
      role.active && (role.role === 'staff' || role.role === 'admin')
    );
    
    if (!hasValidRole) {
      console.log('❌ User does not have valid staff or admin role');
      console.log('This could cause the "Staff member does not have permission" error');
      return;
    }
    
    console.log('✅ User has valid role for batch approval');
    
    // 5. Find available collectors
    console.log('\n4. Finding available collectors...');
    const { data: collectors, error: collectorsError } = await supabase
      .from('staff')
      .select(`
        id,
        employee_id,
        profiles:user_id(full_name, email)
      `)
      .limit(5);
      
    if (collectorsError) {
      console.error('❌ Error fetching collectors:', collectorsError.message);
      return;
    }
    
    if (!collectors || collectors.length === 0) {
      console.log('❌ No collectors found in system');
      return;
    }
    
    console.log(`✅ Found ${collectors.length} collectors:`);
    collectors.forEach((collector, index) => {
      console.log(`   ${index + 1}. ID: ${collector.id}`);
      console.log(`      Employee ID: ${collector.employee_id}`);
      console.log(`      Name: ${collector.profiles?.full_name || 'N/A'}`);
      console.log(`      Email: ${collector.profiles?.email || 'N/A'}`);
    });
    
    // 6. Test the batch approval function with one collector
    console.log('\n5. Testing batch approval function...');
    const testCollector = collectors[0];
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Testing with:`);
    console.log(`   - Staff ID (approving): ${staffRecord.id}`);
    console.log(`   - Collector ID (being approved): ${testCollector.id}`);
    console.log(`   - Date: ${today}`);
    
    const { data: result, error: batchError } = await supabase.rpc('batch_approve_collector_collections', {
      p_staff_id: staffRecord.id,
      p_collector_id: testCollector.id,
      p_collection_date: today,
      p_default_received_liters: 100
    });
    
    if (batchError) {
      console.log('ℹ️  Batch approval test result:');
      console.log('   Error message:', batchError.message);
      console.log('   Error code:', batchError.code);
      if (batchError.details) {
        console.log('   Error details:', batchError.details);
      }
      if (batchError.hint) {
        console.log('   Error hint:', batchError.hint);
      }
    } else {
      console.log('✅ Batch approval test successful:');
      console.log('   Result:', result);
    }
    
    console.log('\n✅ Diagnostic test completed');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testStaffIds()
  .then(() => {
    console.log('\n🏁 Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });