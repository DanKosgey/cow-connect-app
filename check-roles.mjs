import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oevxapmcmcaxpaluehyg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8'
);

async function checkRoles() {
  console.log('Checking user roles...');
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('*');
  
  console.log('User roles error:', error);
  console.log('User roles data:', data);
  
  // Also check profiles
  console.log('\nChecking profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');
  
  console.log('Profiles error:', profilesError);
  console.log('Profiles data:', profiles);
}

checkRoles().catch(console.error);