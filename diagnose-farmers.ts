// Script to diagnose farmers table data
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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

// Create Supabase client with service role key (to bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseFarmersTable() {
  console.log('🔍 Diagnosing farmers table...\n');

  try {
    // Check 1: Count all farmers
    const { count: totalCount, error: countError } = await supabase
      .from('farmers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting farmers:', countError.message);
      return;
    }

    console.log(`📊 Total farmers in table: ${totalCount}`);

    // Check 2: Get all farmers with their details
    const { data: allFarmers, error: allFarmersError } = await supabase
      .from('farmers')
      .select(`
        id,
        user_id,
        full_name,
        kyc_status,
        registration_number,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (allFarmersError) {
      console.error('❌ Error fetching farmers:', allFarmersError.message);
      return;
    }

    console.log(`\n📋 All farmers (${allFarmers.length} found):`);
    allFarmers.forEach(farmer => {
      console.log(`  - ID: ${farmer.id}`);
      console.log(`    User ID: ${farmer.user_id || 'N/A'}`);
      console.log(`    Name: ${farmer.full_name || 'N/A'}`);
      console.log(`    Registration #: ${farmer.registration_number || 'N/A'}`);
      console.log(`    KYC Status: ${farmer.kyc_status || 'N/A'}`);
      console.log(`    Created: ${farmer.created_at || 'N/A'}\n`);
    });

    // Check 3: Count approved farmers specifically
    const { count: approvedCount, error: approvedCountError } = await supabase
      .from('farmers')
      .select('*', { count: 'exact', head: true })
      .eq('kyc_status', 'approved');

    if (approvedCountError) {
      console.error('❌ Error counting approved farmers:', approvedCountError.message);
      return;
    }

    console.log(`✅ Approved farmers: ${approvedCount}`);

    // Check 4: Get only approved farmers
    const { data: approvedFarmers, error: approvedFarmersError } = await supabase
      .from('farmers')
      .select(`
        id,
        user_id,
        full_name,
        kyc_status,
        registration_number,
        created_at
      `)
      .eq('kyc_status', 'approved')
      .order('full_name', { ascending: true });

    if (approvedFarmersError) {
      console.error('❌ Error fetching approved farmers:', approvedFarmersError.message);
      return;
    }

    console.log('\n🟢 Approved farmers (these should show in collector portal):');
    if (approvedFarmers.length === 0) {
      console.log('  No approved farmers found');
    } else {
      approvedFarmers.forEach(farmer => {
        console.log(`  - ${farmer.full_name} (${farmer.registration_number || 'No Reg #'}) - ID: ${farmer.id}`);
      });
    }

    // Check 5: Look for any data inconsistencies
    console.log('\n🔍 Checking for data inconsistencies...');
    
    const statuses = [...new Set(allFarmers.map(f => f.kyc_status))];
    console.log(`  Unique KYC statuses found: ${statuses.join(', ') || 'None'}`);
    
    const nullNames = allFarmers.filter(f => !f.full_name);
    if (nullNames.length > 0) {
      console.log(`  ⚠️  Farmers with missing names: ${nullNames.length}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnosis
diagnoseFarmersTable();