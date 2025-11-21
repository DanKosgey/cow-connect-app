#!/usr/bin/env ts-node

import { supabase } from '../src/integrations/supabase/client';
import { logger } from '../src/utils/logger';

async function diagnoseStaffBatchApproval() {
  console.log('🔍 Diagnosing staff and batch approval system...\n');
  
  try {
    // 1. Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('❌ Error getting current user:', userError.message);
      return;
    }
    
    if (!user) {
      console.log('⚠️  No authenticated user found');
      return;
    }
    
    console.log(`✅ Current user: ${user.id} (${user.email})`);
    
    // 2. Check if user has a staff record
    console.log('\n2. Checking staff record for current user...');
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
      console.log('⚠️  No staff record found for current user');
      // Check if user has any staff records at all
      const { count: totalStaff, error: countError } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('❌ Error counting staff records:', countError.message);
      } else {
        console.log(`📊 Total staff records in system: ${totalStaff}`);
      }
      return;
    }
    
    console.log(`✅ Staff record found: ID=${staffRecord.id}, Employee ID=${staffRecord.employee_id}`);
    
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
      console.log('⚠️  No user roles found for current user');
      return;
    }
    
    console.log('✅ User roles found:');
    userRoles.forEach(role => {
      console.log(`   - Role: ${role.role}, Active: ${role.active}`);
    });
    
    // 4. Check if user has staff or admin role
    const hasValidRole = userRoles.some(role => 
      role.active && (role.role === 'staff' || role.role === 'admin')
    );
    
    if (!hasValidRole) {
      console.log('⚠️  User does not have valid staff or admin role for batch approval');
      return;
    }
    
    console.log('✅ User has valid role for batch approval');
    
    // 5. Check collectors/staff members available for batch approval
    console.log('\n4. Checking available collectors for batch approval...');
    const { data: collectors, error: collectorsError } = await supabase
      .from('staff')
      .select(`
        id,
        employee_id,
        profiles:user_id(full_name, email)
      `)
      .limit(10);
      
    if (collectorsError) {
      console.error('❌ Error fetching collectors:', collectorsError.message);
      return;
    }
    
    if (!collectors || collectors.length === 0) {
      console.log('⚠️  No collectors found in system');
      return;
    }
    
    console.log(`✅ Found ${collectors.length} collectors:`);
    collectors.forEach(collector => {
      console.log(`   - ID: ${collector.id}`);
      console.log(`     Employee ID: ${collector.employee_id}`);
      console.log(`     Name: ${collector.profiles?.full_name || 'N/A'}`);
      console.log(`     Email: ${collector.profiles?.email || 'N/A'}`);
    });
    
    // 6. Test the batch approval function with valid data
    console.log('\n5. Testing batch approval function with valid data...');
    const testCollectorId = collectors[0].id;
    console.log(`Testing with collector ID: ${testCollectorId}`);
    
    const { data: testData, error: testError } = await supabase.rpc('batch_approve_collector_collections', {
      p_staff_id: staffRecord.id,
      p_collector_id: testCollectorId,
      p_collection_date: new Date().toISOString().split('T')[0], // Today's date
      p_default_received_liters: 100
    });
    
    if (testError) {
      console.log('ℹ️  Batch approval test result (expected to fail with no collections):');
      console.log('   Error:', testError.message);
    } else {
      console.log('✅ Batch approval test successful:');
      console.log('   Result:', testData);
    }
    
    console.log('\n✅ Diagnosis completed successfully');
    
  } catch (error) {
    console.error('❌ Unexpected error during diagnosis:', error);
  }
}

// Run the diagnosis
diagnoseStaffBatchApproval();