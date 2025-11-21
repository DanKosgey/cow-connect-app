// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

// Fix for staff enrichment issue
export const fixStaffEnrichment = async () => {
  try {
    console.log('=== Fixing Staff Enrichment ===');
    
    // Create a Supabase client (you'll need to provide your URL and key)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 1: Fetch collections with basic data
    const { data: rawCollections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        collection_id,
        liters,
        collection_date,
        status,
        approved_for_company,
        staff_id,
        farmers!inner (
          id,
          user_id,
          profiles (
            full_name
          )
        )
      `)
      .eq('status', 'Collected')
      .eq('approved_for_company', false)
      .order('collection_date', { ascending: false });

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return;
    }

    console.log(`Found ${rawCollections?.length || 0} raw collections`);
    
    // Step 2: Extract unique staff IDs
    const staffIds = new Set<string>();
    const collectionsWithStaffId = rawCollections?.filter(collection => collection.staff_id) || [];
    collectionsWithStaffId.forEach(collection => {
      if (collection.staff_id) staffIds.add(collection.staff_id);
    });

    console.log(`Found ${staffIds.size} unique staff IDs:`, Array.from(staffIds));
    
    // Step 3: Fetch staff profiles
    let enrichedCollections = rawCollections || [];
    if (collectionsWithStaffId.length > 0 && staffIds.size > 0) {
      const { data: staffProfiles, error: profilesError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          profiles!inner (
            full_name
          )
        `)
        .in('id', Array.from(staffIds));

      if (!profilesError && staffProfiles) {
        console.log(`Found ${staffProfiles.length} staff profiles`);
        
        // Create a map of staff ID to profile
        const staffProfileMap = new Map<string, any>();
        staffProfiles.forEach(staff => {
          staffProfileMap.set(staff.id, staff);
        });

        // Enrich collections with staff names
        enrichedCollections = rawCollections.map(collection => {
          // If collection has no staff_id, leave staff as null (unassigned)
          if (!collection.staff_id) {
            return { ...collection, staff: null };
          }
          
          // If we have a profile for this staff_id, use it
          const staffData = staffProfileMap.get(collection.staff_id);
          if (staffData) {
            return { 
              ...collection, 
              staff: { 
                id: staffData.id,
                user_id: staffData.user_id,
                profiles: staffData.profiles
              } 
            };
          }
          
          // If staff_id exists but no profile found, staff record may be invalid
          console.warn('Staff profile not found for collection', {
            collectionId: collection.id,
            staffId: collection.staff_id
          });
          return { ...collection, staff: { id: collection.staff_id, user_id: null, profiles: null } };
        });
      } else if (profilesError) {
        console.error('Error fetching staff profiles:', profilesError);
        enrichedCollections = rawCollections;
      }
    }
    
    // Log results
    console.log('Enriched collections sample:');
    enrichedCollections.slice(0, 3).forEach((collection, index) => {
      console.log(`  Collection ${index + 1}:`, {
        id: collection.id,
        staff_id: collection.staff_id,
        hasStaffObject: !!collection.staff,
        staffName: collection.staff?.profiles?.full_name || 'No name'
      });
    });
    
    console.log('=== Fix Complete ===');
    
  } catch (error) {
    console.error('Error in fixStaffEnrichment:', error);
  }
};

// Run the fix if this file is executed directly
if (require.main === module) {
  fixStaffEnrichment();
}