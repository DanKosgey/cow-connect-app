import { supabase } from '../src/integrations/supabase/client';

/**
 * Script to test fixed staff performance functions
 * This script tests the calculate_staff_performance and update_staff_performance functions
 * with proper date handling
 */

async function testStaffPerformanceFixed() {
  try {
    console.log('Testing fixed staff performance functions...');
    
    // Get a sample staff member
    const { data: sampleStaff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .limit(1);

    if (staffError) throw staffError;
    
    if (!sampleStaff || sampleStaff.length === 0) {
      console.log('No staff members found in the database');
      return;
    }
    
    const staffId = sampleStaff[0].id;
    console.log(`Testing with staff ID: ${staffId}`);
    
    // Test calculate_staff_performance function with proper date formatting
    console.log('Testing calculate_staff_performance function...');
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);
    
    // Format dates as YYYY-MM-DD strings
    const periodStartString = periodStart.toISOString().split('T')[0];
    const periodEndString = periodEnd.toISOString().split('T')[0];
    
    console.log(`Period: ${periodStartString} to ${periodEndString}`);
    
    const { data: metrics, error: calcError } = await supabase
      .rpc('calculate_staff_performance', {
        p_staff_id: staffId,
        p_period_start: periodStartString,
        p_period_end: periodEndString
      });
      
    if (calcError) {
      console.error('Error calculating staff performance:', calcError);
    } else {
      console.log('Calculated performance metrics:', metrics);
    }
    
    // Test update_staff_performance function
    console.log('Testing update_staff_performance function...');
    const { error: updateError } = await supabase
      .rpc('update_staff_performance', {
        p_staff_id: staffId,
        p_period_start: periodStartString,
        p_period_end: periodEndString
      });
      
    if (updateError) {
      console.error('Error updating staff performance:', updateError);
    } else {
      console.log('Successfully updated staff performance record');
    }
    
    // Check if the record was created/updated
    const { data: performanceRecord, error: fetchError } = await supabase
      .from('staff_performance')
      .select('*')
      .eq('staff_id', staffId)
      .gte('period_start', periodStartString)
      .limit(1);
      
    if (fetchError) {
      console.error('Error fetching performance record:', fetchError);
    } else {
      console.log('Performance record:', performanceRecord);
    }
    
    console.log('Fixed staff performance function tests completed');
  } catch (error) {
    console.error('Error in testStaffPerformanceFixed:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  testStaffPerformanceFixed()
    .then(() => {
      console.log('Tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tests failed:', error);
      process.exit(1);
    });
}

export default testStaffPerformanceFixed;