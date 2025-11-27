import { supabase } from '../src/integrations/supabase/client';

/**
 * Script to test staff performance functions
 * This script tests the calculate_staff_performance and update_staff_performance functions
 */

async function testStaffPerformance() {
  try {
    console.log('Testing staff performance functions...');
    
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
    
    // Test calculate_staff_performance function
    console.log('Testing calculate_staff_performance function...');
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);
    
    const { data: metrics, error: calcError } = await supabase
      .rpc('calculate_staff_performance', {
        p_staff_id: staffId,
        p_period_start: periodStart.toISOString().split('T')[0],
        p_period_end: periodEnd.toISOString().split('T')[0]
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
        p_period_start: periodStart.toISOString().split('T')[0],
        p_period_end: periodEnd.toISOString().split('T')[0]
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
      .gte('period_start', periodStart.toISOString().split('T')[0])
      .limit(1);
      
    if (fetchError) {
      console.error('Error fetching performance record:', fetchError);
    } else {
      console.log('Performance record:', performanceRecord);
    }
    
    console.log('Staff performance function tests completed');
  } catch (error) {
    console.error('Error in testStaffPerformance:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  testStaffPerformance()
    .then(() => {
      console.log('Tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tests failed:', error);
      process.exit(1);
    });
}

export default testStaffPerformance;