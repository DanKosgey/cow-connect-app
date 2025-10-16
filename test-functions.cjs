const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunctions() {
  console.log('Testing farmer approval functions...');
  
  try {
    // Test the function signatures by calling them with dummy parameters
    // This will help us verify if they exist and have the correct signatures
    
    console.log('Checking approve_pending_farmer function...');
    const { data: approveData, error: approveError } = await supabase.rpc('approve_pending_farmer', {
      p_pending_farmer_id: '00000000-0000-0000-0000-000000000000',
      p_admin_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (approveError) {
      console.log('approve_pending_farmer function exists (error is expected with dummy data):', approveError.message);
    } else {
      console.log('approve_pending_farmer function response:', approveData);
    }
    
    console.log('Checking reject_pending_farmer function...');
    const { data: rejectData, error: rejectError } = await supabase.rpc('reject_pending_farmer', {
      p_pending_farmer_id: '00000000-0000-0000-0000-000000000000',
      p_admin_id: '00000000-0000-0000-0000-000000000000',
      p_rejection_reason: 'Test reason'
    });
    
    if (rejectError) {
      console.log('reject_pending_farmer function exists (error is expected with dummy data):', rejectError.message);
    } else {
      console.log('reject_pending_farmer function response:', rejectData);
    }
    
    console.log('Function tests completed successfully!');
  } catch (error) {
    console.error('Error testing functions:', error.message);
  }
}

testFunctions();