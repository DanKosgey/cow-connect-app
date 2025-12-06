// Diagnostic script for collections table
import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseCollectionsTable() {
  console.log('🔍 Diagnosing collections table...\n');

  try {
    // 1. Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('⚠️  Not authenticated. Some tests may fail.');
    } else {
      console.log('✅ User authenticated:', user?.email || user?.id);
    }

    // 2. Check collections table structure
    console.log('\n1. Checking collections table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('collections')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('❌ Failed to query collections table:', columnsError.message);
      return;
    }

    console.log('✅ Successfully queried collections table');
    console.log('Sample row:', columns[0] || 'No data found');

    // 3. Count total collections
    console.log('\n2. Counting total collections...');
    const { count, error: countError } = await supabase
      .from('collections')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Failed to count collections:', countError.message);
    } else {
      console.log('✅ Total collections:', count);
    }

    // 4. Check recent collections
    console.log('\n3. Checking recent collections...');
    const { data: recent, error: recentError } = await supabase
      .from('collections')
      .select('id, collection_id, liters, total_amount, collection_date, status, farmer_id')
      .order('collection_date', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Failed to fetch recent collections:', recentError.message);
    } else {
      console.log('✅ Recent collections found:', recent.length);
      recent.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.collection_id} - ${collection.liters}L - ${collection.status}`);
      });
    }

    // 5. Check farmers table
    console.log('\n4. Checking farmers table...');
    const { data: farmers, error: farmersError } = await supabase
      .from('farmers')
      .select('id, full_name')
      .limit(3);

    if (farmersError) {
      console.error('❌ Failed to query farmers table:', farmersError.message);
    } else {
      console.log('✅ Farmers table accessible');
      farmers.forEach(farmer => {
        console.log(`  - ${farmer.full_name} (${farmer.id})`);
      });
    }

    // 6. Test join between collections and farmers
    console.log('\n5. Testing collections-farmers join...');
    const { data: joined, error: joinError } = await supabase
      .from('collections')
      .select(`
        id,
        collection_id,
        liters,
        total_amount,
        collection_date,
        status,
        farmers (full_name)
      `)
      .order('collection_date', { ascending: false })
      .limit(3);

    if (joinError) {
      console.error('❌ Join failed:', joinError.message);
    } else {
      console.log('✅ Join successful');
      joined.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.farmers?.full_name || 'Unknown'} - ${collection.collection_id} - ${collection.liters}L`);
      });
    }

    console.log('\n🎉 Diagnostics completed successfully!');

  } catch (error) {
    console.error('❌ Diagnostics failed with unexpected error:', error.message);
  }
}

// Run the diagnostics
diagnoseCollectionsTable();