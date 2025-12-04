import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oevxapmcmcaxpaluehyg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8'
);

async function testCreditorAccess() {
  console.log('Testing creditor access...');
  
  // First, let's check if we can see any data anonymously
  console.log('\n1. Anonymous access test:');
  const { data: anonData, error: anonError } = await supabase
    .from('farmer_credit_profiles')
    .select('id')
    .eq('is_frozen', false)
    .limit(1);
  
  console.log('Anonymous credit profiles accessible:', !!anonData?.length, anonError?.message);
  
  // Check farmers data anonymously
  const { data: anonFarmers, error: anonFarmersError } = await supabase
    .from('farmers')
    .select('id')
    .limit(1);
  
  console.log('Anonymous farmers accessible:', !!anonFarmers?.length, anonFarmersError?.message);
  
  console.log('\n2. Service role access test:');
  // Now let's try with service role to see what data exists
  const serviceSupabase = createClient(
    'https://oevxapmcmcaxpaluehyg.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU'
  );
  
  const { data: serviceData, error: serviceError } = await serviceSupabase
    .from('farmer_credit_profiles')
    .select('id')
    .eq('is_frozen', false)
    .limit(1);
  
  console.log('Service role credit profiles accessible:', !!serviceData?.length, serviceError?.message);
  
  // Check farmers data with service role
  const { data: serviceFarmers, error: serviceFarmersError } = await serviceSupabase
    .from('farmers')
    .select('id')
    .limit(1);
  
  console.log('Service role farmers accessible:', !!serviceFarmers?.length, serviceFarmersError?.message);
  
  console.log('\nConclusion:');
  console.log('- If service role can see data but anonymous cannot, it\'s definitely an RLS issue');
  console.log('- If neither can see data, there might be a different issue');
}

testCreditorAccess().catch(console.error);