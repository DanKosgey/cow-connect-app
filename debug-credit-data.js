import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCreditData() {
  console.log('Debugging credit data...');
  
  // First, let's check credit profiles
  console.log('\n1. Checking credit profiles:');
  const { data: creditProfiles, error: profilesError } = await supabase
    .from('farmer_credit_profiles')
    .select('*')
    .eq('is_frozen', false)
    .limit(5);
  
  console.log('Credit profiles error:', profilesError);
  console.log('Credit profiles count:', creditProfiles?.length);
  console.log('First credit profile:', creditProfiles?.[0]);
  
  // Check farmers
  console.log('\n2. Checking farmers:');
  const { data: farmers, error: farmersError } = await supabase
    .from('farmers')
    .select('*')
    .limit(5);
  
  console.log('Farmers error:', farmersError);
  console.log('Farmers count:', farmers?.length);
  console.log('First farmer:', farmers?.[0]);
  
  // Try the join query
  console.log('\n3. Trying join query:');
  const { data: joinedData, error: joinError } = await supabase
    .from('farmer_credit_profiles')
    .select(`
      *,
      farmers (*)
    `)
    .eq('is_frozen', false)
    .limit(5);
  
  console.log('Join error:', joinError);
  console.log('Joined data count:', joinedData?.length);
  console.log('First joined item:', joinedData?.[0]);
}

debugCreditData().catch(console.error);