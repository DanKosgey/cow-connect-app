// Script to create test collections
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

async function createTestCollections() {
  console.log('Creating test collections...');

  // First, let's get some farmers and staff to associate with collections
  const { data: farmers, error: farmersError } = await supabase
    .from('farmers')
    .select('id');

  if (farmersError) {
    console.error('Error fetching farmers:', farmersError);
    return;
  }

  console.log('Found farmers:', farmers ? farmers.length : 0);
  if (farmers && farmers.length > 0) {
    console.log('First farmer ID:', farmers[0].id);
  }

  if (!farmers || farmers.length === 0) {
    console.log('No farmers found. Please create some farmers first.');
    return;
  }

  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id');

  if (staffError) {
    console.error('Error fetching staff:', staffError);
    return;
  }

  console.log('Found staff:', staff ? staff.length : 0);
  if (staff && staff.length > 0) {
    console.log('First staff ID:', staff[0].id);
  }

  if (!staff || staff.length === 0) {
    console.log('No staff found. Please create some staff first.');
    return;
  }

  // Get warehouses
  const { data: warehouses, error: warehousesError } = await supabase
    .from('warehouses')
    .select('id');

  if (warehousesError) {
    console.error('Error fetching warehouses:', warehousesError);
    return;
  }

  console.log('Found warehouses:', warehouses ? warehouses.length : 0);
  if (warehouses && warehouses.length > 0) {
    console.log('First warehouse ID:', warehouses[0].id);
  }

  if (!warehouses || warehouses.length === 0) {
    console.log('No warehouses found. Please create some warehouses first.');
    return;
  }

  // Create test collections
  const collections = [];
  for (let i = 0; i < 20; i++) {
    const farmer = farmers[Math.floor(Math.random() * farmers.length)];
    const staffMember = staff[Math.floor(Math.random() * staff.length)];
    
    collections.push({
      farmer_id: farmer.id,
      staff_id: staffMember.id,
      liters: Math.floor(Math.random() * 100) + 10, // 10-110 liters
      quality_grade: ['A+', 'A', 'B', 'C'][Math.floor(Math.random() * 4)],
      collection_date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString() // Random date in last 30 days
    });
  }

  console.log('Creating', collections.length, 'collections...');

  // Insert collections
  const { data: collectionsData, error: collectionsError } = await supabase
    .from('collections')
    .insert(collections)
    .select();

  if (collectionsError) {
    console.error('Error creating collections:', collectionsError);
    return;
  }

  console.log(`Created ${collectionsData.length} collections.`);

  // Assign some collections to warehouses
  const warehouseCollections = collectionsData.map(collection => {
    // 70% chance of assignment
    if (Math.random() > 0.3) {
      const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
      return {
        warehouse_id: warehouse.id,
        collection_id: collection.id
      };
    }
    return null;
  }).filter(Boolean);

  if (warehouseCollections.length > 0) {
    const { error: assignError } = await supabase
      .from('warehouse_collections')
      .insert(warehouseCollections);

    if (assignError) {
      console.error('Error assigning collections to warehouses:', assignError);
    } else {
      console.log(`Assigned ${warehouseCollections.length} collections to warehouses`);
    }
  }
}

createTestCollections().catch(console.error);