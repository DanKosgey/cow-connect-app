// Script to check for existing collector accounts
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

// Create Supabase client with service role key (needed for bypassing RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCollectors() {
  console.log('🔍 Checking for collector accounts...\n');

  try {
    // Check for users with collector role
    const { data: collectorRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        active
      `)
      .eq('role', 'collector');

    if (rolesError) {
      console.error('❌ Error fetching collector roles:', rolesError.message);
      return;
    }

    console.log(`👥 Found ${collectorRoles.length} collector accounts:`);
    if (collectorRoles.length === 0) {
      console.log('  No collector accounts found');
    } else {
      // Get profile information for each collector
      for (const role of collectorRoles) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', role.user_id)
          .single();

        if (profileError) {
          console.log(`  - Unknown (User ID: ${role.user_id})`);
        } else {
          console.log(`  - ${profile.full_name || 'Unknown'} (${profile.email || 'No email'})`);
        }
        console.log(`    User ID: ${role.user_id}`);
        console.log(`    Active: ${role.active}\n`);
      }
    }

    // Check for staff records that might be collectors
    const { data: staffRecords, error: staffError } = await supabase
      .from('staff')
      .select(`
        user_id,
        employee_id
      `);

    if (staffError) {
      console.error('❌ Error fetching staff records:', staffError.message);
      return;
    }

    console.log(`📋 Found ${staffRecords.length} staff records:`);
    for (const staff of staffRecords) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', staff.user_id)
        .single();

      if (profileError) {
        console.log(`  - Unknown (User ID: ${staff.user_id})`);
      } else {
        console.log(`  - ${profile.full_name || 'Unknown'} (${profile.email || 'No email'})`);
      }
      console.log(`    Employee ID: ${staff.employee_id}`);
      console.log(`    User ID: ${staff.user_id}\n`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
checkCollectors();