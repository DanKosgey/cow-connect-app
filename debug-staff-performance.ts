import { supabase } from './src/integrations/supabase/client';

async function debugStaffPerformance() {
  try {
    console.log('Debugging staff performance data...');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    
    // Get staff record for current user
    const { data: staffRecords } = await supabase
      .from('staff')
      .select('id, user_id')
      .eq('user_id', user?.id);
    
    console.log('Staff records:', staffRecords);
    
    if (staffRecords && staffRecords.length > 0) {
      const staffId = staffRecords[0].id;
      
      // Get performance data for this staff member
      const { data: performanceData, error } = await supabase
        .from('staff_performance')
        .select(`
          *,
          staff (
            profiles (
              full_name
            )
          )
        `)
        .eq('staff_id', staffId)
        .limit(5);
      
      console.log('Performance data:', performanceData);
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugStaffPerformance();