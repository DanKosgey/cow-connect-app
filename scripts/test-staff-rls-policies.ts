import { supabase } from '../src/integrations/supabase/client';

/**
 * Script to test RLS policies for staff members
 * Tests milk_approvals and staff_performance table access
 */

async function testStaffRLSPolicies() {
  try {
    console.log('=== Staff RLS Policies Test Script ===\n');
    
    // Check if user is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }
    
    if (!sessionData.session) {
      console.log('❌ User is not authenticated');
      return;
    }
    
    console.log('✅ User is authenticated');
    console.log(`User ID: ${sessionData.session.user.id}\n`);
    
    // Check user's roles
    console.log('1. Checking user roles...');
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, active')
      .eq('user_id', sessionData.session.user.id);
    
    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return;
    }
    
    if (!userRoles || userRoles.length === 0) {
      console.log('⚠️  No roles found for user');
    } else {
      console.log('User roles:');
      userRoles.forEach(role => {
        console.log(`   - ${role.role} (${role.active ? 'active' : 'inactive'})`);
      });
    }
    console.log('');
    
    // Check if user has a staff record
    console.log('2. Checking staff record...');
    const { data: staffRecord, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', sessionData.session.user.id)
      .maybeSingle();
    
    if (staffError) {
      console.error('Error fetching staff record:', staffError);
      return;
    }
    
    if (!staffRecord) {
      console.log('❌ No staff record found for user');
      return;
    }
    
    const staffId = staffRecord.id;
    console.log(`✅ Staff record found: ${staffId}\n`);
    
    // Test milk_approvals access
    console.log('3. Testing milk_approvals access...');
    
    // Try to select milk approvals
    const { data: approvals, error: selectError } = await supabase
      .from('milk_approvals')
      .select('id')
      .limit(1);
    
    if (selectError) {
      console.log('❌ Cannot select milk approvals:', selectError.message);
    } else {
      console.log(`✅ Can select milk approvals (${approvals?.length || 0} records found)`);
    }
    
    // Try to insert a test milk approval (this should fail due to missing collection_id)
    const testApproval = {
      staff_id: staffId,
      company_received_liters: 100,
      variance_liters: 0,
      variance_percentage: 0,
      variance_type: 'none',
      penalty_amount: 0
    };
    
    const { error: insertError } = await supabase
      .from('milk_approvals')
      .insert(testApproval);
    
    if (insertError) {
      console.log('Expected insert error (missing collection_id):', insertError.message);
    } else {
      console.log('⚠️  Unexpected: Insert succeeded (should have failed)');
    }
    console.log('');
    
    // Test staff_performance access
    console.log('4. Testing staff_performance access...');
    
    // Try to select staff performance records
    const { data: performanceRecords, error: perfSelectError } = await supabase
      .from('staff_performance')
      .select('id')
      .limit(1);
    
    if (perfSelectError) {
      console.log('❌ Cannot select staff performance records:', perfSelectError.message);
    } else {
      console.log(`✅ Can select staff performance records (${performanceRecords?.length || 0} records found)`);
    }
    
    // Try to insert a test performance record
    const testPerformance = {
      staff_id: staffId,
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_approvals: 0,
      total_collections_approved: 0,
      total_liters_approved: 0,
      total_variance_handled: 0,
      average_variance_percentage: 0,
      positive_variances: 0,
      negative_variances: 0,
      total_penalty_amount: 0,
      accuracy_score: 100
    };
    
    const { error: perfInsertError } = await supabase
      .from('staff_performance')
      .insert(testPerformance);
    
    if (perfInsertError) {
      console.log('❌ Cannot insert staff performance record:', perfInsertError.message);
    } else {
      console.log('✅ Can insert staff performance record');
      
      // Clean up the test record
      await supabase
        .from('staff_performance')
        .delete()
        .match({ 
          staff_id: staffId,
          period_start: testPerformance.period_start,
          period_end: testPerformance.period_end
        });
    }
    console.log('');
    
    console.log('=== Test Complete ===');
    
  } catch (error) {
    console.error('Error in testStaffRLSPolicies:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  testStaffRLSPolicies()
    .then(() => {
      console.log('Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

export default testStaffRLSPolicies;