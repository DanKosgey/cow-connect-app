const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://oevxapmcmcaxpaluehyg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  try {
    console.log('Applying collector_performance table fix...');
    
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, 'fix_collector_performance_rls.sql'), 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('execute_sql', { sql });
    
    if (error) {
      console.error('Error applying fix:', error);
      return;
    }
    
    console.log('Fix applied successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

applyFix();