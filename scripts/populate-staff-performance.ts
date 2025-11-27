import { supabase } from '../src/integrations/supabase/client';
import { logger } from '../src/utils/logger';

/**
 * Script to populate initial staff performance data
 * This script calculates performance metrics for all staff members
 * who have made milk approvals in the system
 */

async function populateStaffPerformance() {
  try {
    console.log('Starting staff performance data population...');
    
    // Get all staff members with the 'staff' role
    const { data: staffRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'staff')
      .eq('active', true);

    if (rolesError) throw rolesError;
    
    const staffUserIds = staffRoles?.map(role => role.user_id) || [];
    
    if (staffUserIds.length === 0) {
      console.log('No staff members found with the staff role');
      return;
    }
    
    console.log(`Found ${staffUserIds.length} staff members with the staff role`);
    
    // Get staff records for these user IDs
    const { data: staffRecords, error: staffError } = await supabase
      .from('staff')
      .select('id, user_id')
      .in('user_id', staffUserIds);

    if (staffError) throw staffError;
    
    const staffIds = staffRecords?.map(staff => staff.id) || [];
    
    if (staffIds.length === 0) {
      console.log('No staff records found');
      return;
    }
    
    console.log(`Processing performance data for ${staffIds.length} staff members`);
    
    // For each staff member, calculate and update their performance
    for (const staffId of staffIds) {
      try {
        console.log(`Processing staff ID: ${staffId}`);
        
        // Calculate performance for the last 30 days
        const periodEnd = new Date();
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 30);
        
        // Call the database function to update performance
        const { error: updateError } = await supabase
          .rpc('update_staff_performance', {
            p_staff_id: staffId,
            p_period_start: periodStart.toISOString().split('T')[0],
            p_period_end: periodEnd.toISOString().split('T')[0]
          });
          
        if (updateError) {
          console.error(`Error updating performance for staff ${staffId}:`, updateError);
        } else {
          console.log(`Successfully updated performance for staff ${staffId}`);
        }
      } catch (staffError) {
        console.error(`Error processing staff ${staffId}:`, staffError);
      }
    }
    
    console.log('Staff performance data population completed');
  } catch (error) {
    console.error('Error in populateStaffPerformance:', error);
    logger.errorWithContext('populateStaffPerformance', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  populateStaffPerformance()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export default populateStaffPerformance;