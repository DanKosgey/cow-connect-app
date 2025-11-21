// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

// Diagnostic script to check collector names in collections
export const diagnoseCollectorNames = async () => {
  try {
    console.log('=== Diagnosing Collector Names ===');
    
    // Create a Supabase client (you'll need to provide your URL and key)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch collections with staff information
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        collection_id,
        liters,
        collection_date,
        status,
        approved_for_company,
        staff_id,
        staff (
          id,
          user_id,
          profiles (
            full_name
          )
        ),
        farmers (
          full_name
        )
      `)
      .eq('status', 'Collected')
      .eq('approved_for_company', false)
      .order('collection_date', { ascending: false })
      .limit(10);

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return;
    }

    console.log(`Found ${collections?.length || 0} pending collections:`);
    
    collections?.forEach((collection: any) => {
      console.log('--- Collection ---');
      console.log('  ID:', collection.id);
      console.log('  Collection ID:', collection.collection_id);
      console.log('  Liters:', collection.liters);
      console.log('  Date:', collection.collection_date);
      console.log('  Staff ID:', collection.staff_id);
      console.log('  Staff Data:', collection.staff);
      console.log('  Farmer:', collection.farmers?.full_name);
      
      // Check collector name
      const collectorName = collection.staff?.profiles?.full_name || 'Unassigned/Unknown';
      console.log('  Collector Name:', collectorName);
    });
    
    // Also check staff table directly
    console.log('\n=== Checking Staff Records ===');
    const staffIds = collections
      ?.filter((c: any) => c.staff_id)
      .map((c: any) => c.staff_id) || [];
    
    if (staffIds.length > 0) {
      const { data: staffRecords, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          employee_id,
          user_id,
          profiles (
            full_name
          )
        `)
        .in('id', staffIds);
        
      if (staffError) {
        console.error('Error fetching staff records:', staffError);
      } else {
        console.log(`Found ${staffRecords?.length || 0} staff records:`);
        staffRecords?.forEach((staff: any) => {
          console.log('  Staff ID:', staff.id);
          console.log('    Employee ID:', staff.employee_id);
          console.log('    User ID:', staff.user_id);
          console.log('    Name:', staff.profiles?.full_name || 'No profile');
        });
      }
    }
    
  } catch (error) {
    console.error('Error in diagnoseCollectorNames:', error);
  }
};

// Run the diagnostic if this file is executed directly
if (require.main === module) {
  diagnoseCollectorNames();
}