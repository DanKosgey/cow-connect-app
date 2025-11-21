import { supabase } from '@/integrations/supabase/client';

export const diagnoseCollectionsWithStaff = async () => {
  try {
    // Fetch collections with staff information
    const { data: collections, error } = await supabase
      .from('collections')
      .select(`
        id,
        collection_id,
        collection_date,
        staff_id,
        staff!collections_staff_id_fkey (
          id,
          user_id,
          profiles (
            full_name
          )
        )
      `)
      .eq('status', 'Collected')
      .eq('approved_for_company', false)
      .limit(10)
      .order('collection_date', { ascending: false });

    if (error) {
      console.error('Error fetching collections:', error);
      return { success: false, error };
    }

    console.log('Collections diagnostic data:', collections);

    // Check for collections with missing staff information
    const collectionsWithMissingStaff = collections?.filter(collection => 
      !collection.staff || !collection.staff.profiles || !collection.staff.profiles.full_name
    );

    console.log('Collections with missing staff info:', collectionsWithMissingStaff);

    // Check for collections with invalid staff_id
    const collectionsWithInvalidStaffId = collections?.filter(collection => 
      !collection.staff_id || collection.staff_id === ''
    );

    console.log('Collections with invalid staff_id:', collectionsWithInvalidStaffId);

    return { 
      success: true, 
      data: {
        totalCollections: collections?.length || 0,
        collectionsWithMissingStaff: collectionsWithMissingStaff?.length || 0,
        collectionsWithInvalidStaffId: collectionsWithInvalidStaffId?.length || 0,
        sampleCollections: collections
      }
    };
  } catch (error) {
    console.error('Error in diagnoseCollectionsWithStaff:', error);
    return { success: false, error };
  }
};