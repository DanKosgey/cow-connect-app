// Script to diagnose users/profiles in the system
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
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.log('Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Found' : '✗ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Found' : '✗ Missing');
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseUsers() {
  console.log('🔍 Diagnosing users in the system...\n');

  try {
    // Check 1: Count all profiles
    const { count: totalProfiles, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting profiles:', countError.message);
      return;
    }

    console.log(`👥 Total profiles in system: ${totalProfiles}`);

    // Check 2: Get all profiles with their details
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      return;
    }

    console.log('\n📋 All profiles:');
    allProfiles.forEach(profile => {
      console.log(`  - ID: ${profile.id}`);
      console.log(`    Name: ${profile.full_name || 'N/A'}`);
      console.log(`    Email: ${profile.email || 'N/A'}`);
      console.log(`    Role: ${profile.role || 'N/A'}`);
      console.log(`    Created: ${profile.created_at || 'N/A'}\n`);
    });

    // Check 3: Check user roles table
    console.log('🔑 Checking user roles...');
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        active
      `);

    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError.message);
      return;
    }

    console.log('\n📋 User roles:');
    userRoles.forEach(role => {
      console.log(`  - User ID: ${role.user_id}`);
      console.log(`    Role: ${role.role}`);
      console.log(`    Active: ${role.active}\n`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnosis
diagnoseUsers();