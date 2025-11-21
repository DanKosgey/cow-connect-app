// Comprehensive debug script for milk approval page
// Run this in the browser console after loading the milk approval page

(async function() {
  console.log('=== Comprehensive Debug for Milk Approval Page ===');
  
  // Wait for the page to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Check if we can access the Supabase client
    if (typeof supabase !== 'undefined') {
      console.log('✅ Supabase client available');
      
      // Try to fetch collections directly to see the data structure
      console.log('Fetching collections directly from Supabase...');
      
      const { data: collections, error } = await supabase
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
        .order('collection_date', { ascending: false })
        .limit(5);
        
      if (error) {
        console.error('❌ Error fetching collections:', error);
      } else {
        console.log('✅ Successfully fetched collections:', collections);
        
        // Analyze the collections
        collections.forEach((collection, index) => {
          console.log(`Collection ${index + 1}:`, {
            id: collection.id,
            collection_id: collection.collection_id,
            staff_id: collection.staff_id,
            hasStaffId: !!collection.staff_id,
            farmerName: collection.farmers?.profiles?.full_name || 'No farmer name'
          });
        });
        
        // Extract unique staff IDs
        const staffIds = new Set();
        collections.forEach(collection => {
          if (collection.staff_id) {
            staffIds.add(collection.staff_id);
          }
        });
        
        console.log('Unique staff IDs found:', Array.from(staffIds));
        
        // Try to fetch staff profiles
        if (staffIds.size > 0) {
          console.log('Fetching staff profiles...');
          
          const { data: staffProfiles, error: staffError } = await supabase
            .from('staff')
            .select(`
              id,
              user_id,
              profiles!inner (
                full_name
              )
            `)
            .in('id', Array.from(staffIds));
            
          if (staffError) {
            console.error('❌ Error fetching staff profiles:', staffError);
          } else {
            console.log('✅ Successfully fetched staff profiles:', staffProfiles);
            
            // Create a map of staff ID to profile
            const staffProfileMap = new Map();
            staffProfiles.forEach(staff => {
              staffProfileMap.set(staff.id, staff);
            });
            
            console.log('Staff profile map:', staffProfileMap);
            
            // Show how collections would be enriched
            collections.forEach((collection, index) => {
              if (collection.staff_id) {
                const staffData = staffProfileMap.get(collection.staff_id);
                console.log(`Collection ${index + 1} staff data:`, {
                  staffId: collection.staff_id,
                  foundInMap: !!staffData,
                  staffName: staffData?.profiles?.full_name || 'Not found'
                });
              }
            });
          }
        }
      }
    } else {
      console.log('⚠️ Supabase client not directly accessible');
    }
    
    // Check the UI elements
    console.log('\n=== UI Analysis ===');
    
    const collectionRows = document.querySelectorAll('table tbody tr');
    console.log(`Found ${collectionRows.length} collection rows in UI`);
    
    collectionRows.forEach((row, index) => {
      const collectorCell = row.querySelector('td:first-child');
      const dateCell = row.querySelector('td:nth-child(2)');
      const countCell = row.querySelector('td:nth-child(3)');
      
      if (collectorCell && dateCell && countCell) {
        const collectorName = collectorCell.textContent.trim();
        const date = dateCell.textContent.trim();
        const count = countCell.textContent.trim();
        
        console.log(`Row ${index + 1}:`);
        console.log(`  Collector: "${collectorName}"`);
        console.log(`  Date: ${date}`);
        console.log(`  Collections: ${count}`);
        
        // Check if collector name looks correct
        if (collectorName === 'Unassigned Collector') {
          console.warn(`  ⚠️  Collector is unassigned`);
        } else if (collectorName === 'Unknown Collector') {
          console.warn(`  ⚠️  Collector name is unknown`);
        } else if (collectorName.includes('-') && collectorName.length > 20) {
          console.warn(`  ⚠️  Collector name looks like an ID: "${collectorName}"`);
        } else {
          console.log(`  ✅ Collector name looks valid`);
        }
      }
    });
    
    console.log('\n=== Debug Complete ===');
    console.log('Check the detailed logs above to identify the issue.');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
})();