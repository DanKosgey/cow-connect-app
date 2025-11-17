import { createClient } from '@supabase/supabase-js';

// Use the same configuration as in your app
const supabaseUrl = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  try {
    // Test basic connection by querying a simple table that should exist
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .ilike('table_name', 'staff')
      .limit(5);
    
    if (tableError) {
      console.log('Error fetching staff table:', tableError);
    } else {
      console.log('Staff table found:', tables);
    }
    
    // Test if collector_performance table exists by trying a simple count query
    const { count, error } = await supabase
      .from('collector_performance')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('collector_performance table error (might not exist):', error.message);
    } else {
      console.log('collector_performance table exists, record count:', count);
    }
    
    // Test if milk_approvals table exists
    const { count: milkCount, error: milkError } = await supabase
      .from('milk_approvals')
      .select('*', { count: 'exact', head: true });
    
    if (milkError) {
      console.log('milk_approvals table error (might not exist):', milkError.message);
    } else {
      console.log('milk_approvals table exists, record count:', milkCount);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testDatabaseConnection();