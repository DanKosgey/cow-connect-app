// Script to test the analytics service
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Initialize Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env or .env.local file.');
  console.error('Required variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWarehouseData() {
  console.log('Testing warehouse data...');

  // Get warehouses
  const { data: warehouses, error: warehousesError } = await supabase
    .from('warehouses')
    .select(`
      id,
      name,
      address
    `);

  if (warehousesError) {
    console.error('Error fetching warehouses:', warehousesError);
    return;
  }

  console.log('Warehouses:', warehouses);

  // Get collection counts for each warehouse
  for (const warehouse of warehouses) {
    const { count, error: countError } = await supabase
      .from('warehouse_collections')
      .select('*', { count: 'exact', head: true })
      .eq('warehouse_id', warehouse.id);

    if (countError) {
      console.error(`Error fetching collection count for warehouse ${warehouse.id}:`, countError);
    } else {
      console.log(`${warehouse.name}: ${count || 0} collections`);
    }
  }
}

testWarehouseData().catch(console.error);