import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-supabase-url.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

/**
 * Script to fix collections that are missing staff information
 * This script identifies collections without proper staff_id and attempts to fix them
 */
async function fixMissingStaffCollections() {
  try {
    console.log('🔍 Searching for collections with missing staff information...');
    
    // Find collections with missing or invalid staff_id
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        collection_id,
        staff_id,
        created_at
      `)
      .or('staff_id.is.null,staff_id.eq.')
      .limit(100);

    if (collectionsError) {
      console.error('❌ Error fetching collections:', collectionsError);
      return;
    }

    if (!collections || collections.length === 0) {
      console.log('✅ No collections with missing staff information found');
      return;
    }

    console.log(`Found ${collections.length} collections with missing staff information`);
    
    // For each collection, try to find the staff member who created it
    for (const collection of collections) {
      console.log(`\nProcessing collection: ${collection.collection_id}`);
      
      // Try to find the staff member by looking at who created the collection
      // This is a simplified approach - in a real scenario, you might need to:
      // 1. Check audit logs
      // 2. Check the user who was authenticated when the collection was created
      // 3. Assign to a default staff member
      // 4. Contact the administrator
      
      console.log(`  ⚠️  Collection ${collection.collection_id} needs manual assignment`);
      console.log(`     Created at: ${collection.created_at}`);
      console.log(`     Current staff_id: ${collection.staff_id}`);
    }
    
    console.log('\n📋 Manual steps required:');
    console.log('1. Identify the correct staff member for each collection');
    console.log('2. Update the staff_id field in the collections table');
    console.log('3. Example SQL command:');
    console.log("   UPDATE collections SET staff_id = 'correct-staff-uuid' WHERE id = 'collection-uuid';");
    
  } catch (error) {
    console.error('❌ Error in fixMissingStaffCollections:', error);
  }
}

// Run the script
if (require.main === module) {
  fixMissingStaffCollections()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default fixMissingStaffCollections;