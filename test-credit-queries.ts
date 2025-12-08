import { supabase } from './src/integrations/supabase/client';

async function testCreditQueries() {
  console.log('Testing credit queries...');
  
  try {
    // Test 1: Check if credit_requests table exists and has data
    const { data: creditRequests, error: creditRequestsError } = await supabase
      .from('credit_requests')
      .select('*')
      .limit(5);
    
    if (creditRequestsError) {
      console.error('Error fetching credit requests:', creditRequestsError);
    } else {
      console.log('Credit requests sample:', creditRequests);
    }
    
    // Test 2: Check approved credit requests with pending settlement
    const { data: approvedRequests, error: approvedError } = await supabase
      .from('credit_requests')
      .select('farmer_id, total_amount, status, settlement_status')
      .eq('status', 'approved')
      .eq('settlement_status', 'pending')
      .limit(5);
    
    if (approvedError) {
      console.error('Error fetching approved credit requests:', approvedError);
    } else {
      console.log('Approved credit requests with pending settlement:', approvedRequests);
    }
    
    // Test 3: Check the structure of a specific farmer's credit requests
    // Replace 'farmer-id-here' with an actual farmer ID from your database
    const testFarmerId = 'farmer-id-here'; // This would be replaced with a real farmer ID
    
    const { data: farmerRequests, error: farmerError } = await supabase
      .from('credit_requests')
      .select('farmer_id, total_amount, status, settlement_status, created_at')
      .eq('farmer_id', testFarmerId);
    
    if (farmerError) {
      console.error(`Error fetching credit requests for farmer ${testFarmerId}:`, farmerError);
    } else {
      console.log(`Credit requests for farmer ${testFarmerId}:`, farmerRequests);
    }
    
    console.log('Test completed.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testCreditQueries();