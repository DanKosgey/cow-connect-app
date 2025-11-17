// Simple test to check farmer data
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
  process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);

// Create Supabase client with service role key (needed for bypassing RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFarmerFetch() {
  console.log('Testing farmer fetch...');
  
  try {
    const { data, error } = await supabase
      .from('farmers')
      .select(`
        id,
        full_name,
        kyc_status
      `)
      .eq('kyc_status', 'approved')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching farmers:', error);
      return;
    }

    console.log('Farmers fetched:', data);
    console.log('Number of farmers:', data.length);
    
    if (data.length > 0) {
      console.log('First farmer:', data[0]);
    } else {
      console.log('No approved farmers found in the database');
    }
  } catch (error) {
    console.error('Error in testFarmerFetch:', error);
  }
}

testFarmerFetch();