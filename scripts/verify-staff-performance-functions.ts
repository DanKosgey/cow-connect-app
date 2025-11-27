import { supabase } from '../src/integrations/supabase/client.ts';

/**
 * Script to verify staff performance functions are working correctly
 */

async function verifyStaffPerformanceFunctions() {
  try {
    console.log('=== Verifying Staff Performance Functions ===\n');
    
    // 1. Check if functions exist
    console.log('1. Checking if required functions exist...');
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .ilike('routine_name', '%staff_performance%');
    
    if (funcError) {
      console.error('❌ Error checking functions:', funcError);
      return;
    }
    
    const requiredFunctions = [
      'calculate_staff_performance',
      'update_staff_performance',
      'trigger_update_staff_performance'
    ];
    
    requiredFunctions.forEach(func => {
      const exists = functions?.some(f => f.routine_name === func);
      console.log(`${exists ? '✅' : '❌'} ${func}: ${exists ? 'Exists' : 'Missing'}`);
    });
    console.log('');
    
    // 2. Test calculate_staff_performance function
    console.log('2. Testing calculate_staff_performance function...');
    
    // Get a sample staff member
    const { data: sampleStaff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .limit(1);
    
    if (staffError) {
      console.error('❌ Error fetching sample staff:', staffError);
      return;
    }
    
    if (!sampleStaff || sampleStaff.length === 0) {
      console.log('⚠️  No staff members found in database');
      return;
    }
    
    const staffId = sampleStaff[0].id;
    console.log(`   Testing with staff ID: ${staffId}`);
    
    // Test with a 30-day period
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);
    
    const periodStartString = periodStart.toISOString().split('T')[0];
    const periodEndString = periodEnd.toISOString().split('T')[0];
    
    console.log(`   Period: ${periodStartString} to ${periodEndString}`);
    
    const { data: result, error: calcError } = await supabase
      .rpc('calculate_staff_performance', {
        p_staff_id: staffId,
        p_period_start: periodStartString,
        p_period_end: periodEndString
      });
    
    if (calcError) {
      console.error('❌ Function test failed:', calcError);
    } else {
      console.log('✅ Function test succeeded');
      console.log('   Result:', result);
    }
    console.log('');
    
    // 3. Test update_staff_performance function
    console.log('3. Testing update_staff_performance function...');
    
    const { error: updateError } = await supabase
      .rpc('update_staff_performance', {
        p_staff_id: staffId,
        p_period_start: periodStartString,
        p_period_end: periodEndString
      });
    
    if (updateError) {
      console.error('❌ Update function test failed:', updateError);
    } else {
      console.log('✅ Update function test succeeded');
    }
    console.log('');
    
    // 4. Check if data was inserted/updated in staff_performance table
    console.log('4. Checking staff_performance table for data...');
    
    const { data: performanceData, error: perfError } = await supabase
      .from('staff_performance')
      .select('*')
      .eq('staff_id', staffId)
      .gte('period_start', periodStartString)
      .limit(1);
    
    if (perfError) {
      console.error('❌ Error fetching performance data:', perfError);
    } else if (!performanceData || performanceData.length === 0) {
      console.log('⚠️  No performance data found for staff member');
    } else {
      console.log('✅ Performance data found:');
      console.log('   ', performanceData[0]);
    }
    
    console.log('\n=== Verification Complete ===');
    
  } catch (error) {
    console.error('Error in verifyStaffPerformanceFunctions:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  verifyStaffPerformanceFunctions()
    .then(() => {
      console.log('\nVerification script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nVerification script failed:', error);
      process.exit(1);
    });
}

export default verifyStaffPerformanceFunctions;