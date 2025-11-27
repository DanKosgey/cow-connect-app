import { supabase } from '../src/integrations/supabase/client';

/**
 * Debug script for staff performance issues
 * Helps diagnose problems with staff performance calculations
 */

async function debugStaffPerformance() {
  try {
    console.log('=== Staff Performance Debug Script ===\n');
    
    // 1. Check if staff_performance table exists
    console.log('1. Checking if staff_performance table exists...');
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'staff_performance')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('Error checking table existence:', tableError);
      return;
    }
    
    if (!tableExists || tableExists.length === 0) {
      console.log('❌ staff_performance table does not exist!');
      return;
    }
    console.log('✅ staff_performance table exists\n');
    
    // 2. Check if functions exist
    console.log('2. Checking if staff performance functions exist...');
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .ilike('routine_name', '%staff_performance%');
    
    if (funcError) {
      console.error('Error checking functions:', funcError);
      return;
    }
    
    const expectedFunctions = [
      'calculate_staff_performance',
      'update_staff_performance',
      'trigger_update_staff_performance'
    ];
    
    expectedFunctions.forEach(func => {
      const exists = functions?.some(f => f.routine_name === func);
      console.log(`${exists ? '✅' : '❌'} ${func}: ${exists ? 'Exists' : 'Missing'}`);
    });
    console.log('');
    
    // 3. Check sample staff data
    console.log('3. Checking sample staff data...');
    const { data: staffSample, error: staffError } = await supabase
      .from('staff')
      .select('id, user_id')
      .limit(3);
    
    if (staffError) {
      console.error('Error fetching staff data:', staffError);
      return;
    }
    
    if (!staffSample || staffSample.length === 0) {
      console.log('❌ No staff records found!');
      return;
    }
    
    console.log(`✅ Found ${staffSample.length} staff records:`);
    staffSample.forEach(staff => {
      console.log(`   - ID: ${staff.id}, User ID: ${staff.user_id}`);
    });
    console.log('');
    
    // 4. Check if any staff have the 'staff' role
    console.log('4. Checking staff roles...');
    const { data: staffRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'staff')
      .eq('active', true)
      .limit(5);
    
    if (rolesError) {
      console.error('Error fetching staff roles:', rolesError);
      return;
    }
    
    if (!staffRoles || staffRoles.length === 0) {
      console.log('⚠️  No active staff roles found!');
    } else {
      console.log(`✅ Found ${staffRoles.length} staff roles`);
    }
    console.log('');
    
    // 5. Check milk approvals data
    console.log('5. Checking milk approvals data...');
    const { data: approvals, error: approvalsError } = await supabase
      .from('milk_approvals')
      .select('id, staff_id, created_at')
      .limit(3);
    
    if (approvalsError) {
      console.error('Error fetching milk approvals:', approvalsError);
      return;
    }
    
    if (!approvals || approvals.length === 0) {
      console.log('⚠️  No milk approvals found!');
    } else {
      console.log(`✅ Found ${approvals.length} milk approvals:`);
      approvals.forEach(approval => {
        console.log(`   - ID: ${approval.id}, Staff ID: ${approval.staff_id}, Date: ${approval.created_at}`);
      });
    }
    console.log('');
    
    // 6. Test function with a real staff ID if available
    if (staffSample.length > 0) {
      console.log('6. Testing function with real staff ID...');
      const testStaffId = staffSample[0].id;
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 30);
      
      const periodStartString = periodStart.toISOString().split('T')[0];
      const periodEndString = periodEnd.toISOString().split('T')[0];
      
      console.log(`   Testing staff ID: ${testStaffId}`);
      console.log(`   Period: ${periodStartString} to ${periodEndString}`);
      
      const { data: result, error: testError } = await supabase
        .rpc('calculate_staff_performance', {
          p_staff_id: testStaffId,
          p_period_start: periodStartString,
          p_period_end: periodEndString
        });
      
      if (testError) {
        console.error('   ❌ Function test failed:', testError);
      } else {
        console.log('   ✅ Function test succeeded:');
        console.log('   ', result);
      }
    }
    
    console.log('\n=== Debug Complete ===');
    
  } catch (error) {
    console.error('Error in debugStaffPerformance:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  debugStaffPerformance()
    .then(() => {
      console.log('\nDebug script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nDebug script failed:', error);
      process.exit(1);
    });
}

export default debugStaffPerformance;