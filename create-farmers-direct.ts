// Script to create farmer records directly in the database
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('Expected VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Found' : '✗ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Found' : '✗ Missing');
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);

// Create Supabase client with service role key (needed for bypassing RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createFarmersDirect() {
  console.log('Creating farmer records directly...\n');

  try {
    // Create 3 farmer user profiles first
    const farmerProfiles = [
      {
        id: uuidv4(),
        full_name: 'John Dairy Farmer',
        email: 'john.dairy@' + (process.env.VITE_APP_NAME?.toLowerCase() || 'dairychain') + '.com',
        role: 'farmer',
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        full_name: 'Mary Milk Producer',
        email: 'mary.milk@' + (process.env.VITE_APP_NAME?.toLowerCase() || 'dairychain') + '.com',
        role: 'farmer',
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        full_name: 'Peter Cattle Farmer',
        email: 'peter.cattle@' + (process.env.VITE_APP_NAME?.toLowerCase() || 'dairychain') + '.com',
        role: 'farmer',
        updated_at: new Date().toISOString(),
      }
    ];

    // Insert profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(farmerProfiles);

    if (profileError) {
      console.error('❌ Error creating farmer profiles:', profileError.message);
      return;
    }

    console.log('✅ Successfully created farmer profiles');

    // Create farmer records
    const farmersData = [
      {
        id: uuidv4(),
        user_id: farmerProfiles[0].id,
        full_name: 'John Dairy Farmer',
        registration_number: 'FARM001',
        phone_number: '+254712345678',
        kyc_status: 'approved',
        registration_completed: true,
      },
      {
        id: uuidv4(),
        user_id: farmerProfiles[1].id,
        full_name: 'Mary Milk Producer',
        registration_number: 'FARM002',
        phone_number: '+254723456789',
        kyc_status: 'approved',
        registration_completed: true,
      },
      {
        id: uuidv4(),
        user_id: farmerProfiles[2].id,
        full_name: 'Peter Cattle Farmer',
        registration_number: 'FARM003',
        phone_number: '+254734567890',
        kyc_status: 'approved',
        registration_completed: true,
      }
    ];

    const { data, error } = await supabase
      .from('farmers')
      .insert(farmersData)
      .select();

    if (error) {
      console.error('❌ Error creating farmers:', error.message);
      return;
    }

    console.log('✅ Successfully created farmers:');
    data.forEach(farmer => {
      console.log(`  - ${farmer.full_name} (ID: ${farmer.id})`);
    });

    // Assign farmer roles in user_roles table
    const userRoles = farmerProfiles.map(profile => ({
      user_id: profile.id,
      role: 'farmer',
      active: true,
    }));

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert(userRoles);

    if (roleError) {
      console.error('❌ Error assigning farmer roles:', roleError.message);
      return;
    }

    console.log('✅ Successfully assigned farmer roles');

    // Verify the farmers were created
    console.log('\n🔍 Verifying farmers table...');
    const { count, error: countError } = await supabase
      .from('farmers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting farmers:', countError.message);
      return;
    }

    console.log(`📊 Total farmers in table after creation: ${count}`);

    // Check approved farmers specifically
    const { count: approvedCount, error: approvedCountError } = await supabase
      .from('farmers')
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', 'approved');

    if (approvedCountError) {
      console.error('❌ Error counting approved farmers:', approvedCountError.message);
      return;
    }

    console.log(`✅ Approved farmers: ${approvedCount}`);

    // List all farmers with details
    const { data: allFarmers, error: farmersError } = await supabase
      .from('farmers')
      .select(`
        id,
        full_name,
        kyc_status,
        registration_number
      `)
      .order('full_name');

    if (farmersError) {
      console.error('❌ Error fetching farmers:', farmersError.message);
      return;
    }

    console.log('\n📋 All farmers in the system:');
    allFarmers.forEach(farmer => {
      console.log(`  - ${farmer.full_name} (${farmer.registration_number}) - Status: ${farmer.kyc_status}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createFarmersDirect();