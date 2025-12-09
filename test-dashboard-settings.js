import { createClient } from '@supabase/supabase-js';

// Configuration - replace with your actual values
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oUWG1O5_sYRC2AnB9ajyww_1XV19LZR';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDashboardSettings() {
  console.log('Testing dashboard settings table...');
  
  try {
    // Test 1: Check if we can connect and query the table
    console.log('\n1. Testing connection and basic query...');
    const { data: allData, error: allError } = await supabase
      .from('dashboard_settings')
      .select('*');
    
    if (allError) {
      console.error('Error querying dashboard_settings table:', allError);
    } else {
      console.log(`Found ${allData.length} total records in dashboard_settings table`);
      console.log('Sample records:', allData.slice(0, 3));
    }
    
    // Test 2: Check specifically for targets
    console.log('\n2. Testing targets query...');
    const { data: targetsData, error: targetsError } = await supabase
      .from('dashboard_settings')
      .select('*')
      .eq('is_active', true)
      .eq('category', 'targets');
    
    if (targetsError) {
      console.error('Error querying dashboard targets:', targetsError);
    } else {
      console.log(`Found ${targetsData.length} target records`);
      console.log('Target records:', targetsData);
    }
    
    // Test 3: Check for any records at all
    console.log('\n3. Testing count of all records...');
    const { count, error: countError } = await supabase
      .from('dashboard_settings')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting records:', countError);
    } else {
      console.log(`Total records in table: ${count}`);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testDashboardSettings();