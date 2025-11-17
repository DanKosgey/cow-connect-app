// Script to diagnose auth users in Supabase
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

// Create Supabase client with service role key (needed for auth.users access)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseAuthUsers() {
  console.log('🔍 Diagnosing auth users...\n');

  try {
    // Check auth.users table (requires service role key)
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        created_at,
        last_sign_in_at
      `)
      .order('created_at', { ascending: false });

    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      console.log('This might be because we need proper permissions or the table structure is different.');
      return;
    }

    console.log(`🔐 Total auth users: ${authUsers?.length || 0}`);
    
    if (authUsers && authUsers.length > 0) {
      console.log('\n📋 Auth users:');
      authUsers.forEach(user => {
        console.log(`  - ID: ${user.id}`);
        console.log(`    Email: ${user.email || 'N/A'}`);
        console.log(`    Created: ${user.created_at || 'N/A'}`);
        console.log(`    Last Sign In: ${user.last_sign_in_at || 'Never'}\n`);
      });
    } else {
      console.log('\nNo auth users found.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnosis
diagnoseAuthUsers();