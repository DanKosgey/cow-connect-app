// Script to seed warehouse data
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env or .env.local file.');
  console.error('Required variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedWarehouses() {
  console.log('Seeding warehouses...');

  // Warehouse data
  const warehouses = [
    { name: 'Main Warehouse', address: 'Nairobi' },
    { name: 'North Warehouse', address: 'Nakuru' },
    { name: 'South Warehouse', address: 'Mombasa' }
  ];

  // Insert warehouses
  const { data, error } = await supabase
    .from('warehouses')
    .insert(warehouses)
    .select();

  if (error) {
    console.error('Error seeding warehouses:', error);
    return;
  }

  console.log('Warehouses seeded successfully:', data);

  // If we have collections, randomly assign some to warehouses
  const { data: collections, error: collectionsError } = await supabase
    .from('collections')
    .select('id');

  if (collectionsError) {
    console.error('Error fetching collections:', collectionsError);
    return;
  }

  if (collections && collections.length > 0) {
    console.log(`Found ${collections.length} collections. Assigning to warehouses...`);
    
    // Randomly assign collections to warehouses
    const warehouseCollections = collections.map(collection => {
      // Randomly select a warehouse (or null for no assignment)
      const shouldAssign = Math.random() > 0.3; // 70% chance of assignment
      if (!shouldAssign) return null;
      
      const randomWarehouse = data[Math.floor(Math.random() * data.length)];
      return {
        warehouse_id: randomWarehouse.id,
        collection_id: collection.id
      };
    }).filter(Boolean); // Remove null values

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
  } else {
    console.log('No collections found to assign to warehouses.');
  }
}

seedWarehouses().catch(console.error);