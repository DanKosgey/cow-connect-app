// Script to create a collector account directly
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

async function createCollector() {
  console.log('Creating collector account...\n');

  try {
    const userId = uuidv4();
    
    // Create collector profile
    const profileData = {
      id: userId,
      full_name: 'Test Collector',
      email: 'collector@' + (process.env.VITE_APP_NAME?.toLowerCase() || 'dairychain') + '.com',
      role: 'collector',
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([profileData]);

    if (profileError) {
      console.error('❌ Error creating collector profile:', profileError.message);
      return;
    }

    console.log('✅ Successfully created collector profile');

    // Create staff record
    const staffData = {
      user_id: userId,
      employee_id: 'COLLECTOR' + Math.floor(Math.random() * 10000),
    };

    const { data: staffResult, error: staffError } = await supabase
      .from('staff')
      .insert([staffData])
      .select();

    if (staffError) {
      console.error('❌ Error creating staff record:', staffError.message);
      return;
    }

    console.log('✅ Successfully created staff record:', staffResult?.[0]);

    // Assign collector role
    const userRoleData = {
      user_id: userId,
      role: 'collector',
      active: true,
    };

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([userRoleData]);

    if (roleError) {
      console.error('❌ Error assigning collector role:', roleError.message);
      return;
    }

    console.log('✅ Successfully assigned collector role');
    
    console.log('\n📋 Collector account details:');
    console.log('  Email: collector@' + (process.env.VITE_APP_NAME?.toLowerCase() || 'dairychain') + '.com');
    console.log('  Password: Test1234!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createCollector();