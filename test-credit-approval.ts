import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCreditApproval() {
  try {
    console.log('Testing credit approval workflow...');
    
    // Test a sample credit request approval
    const testRequestId = 'c878827a-09b7-4f1b-82a5-d8bc5081a174'; // From your logs
    
    // Get the request details
    const { data: request, error: fetchError } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('id', testRequestId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching request:', fetchError);
      return;
    }

    if (!request) {
      console.log('Test request not found');
      return;
    }

    console.log('Request details:', JSON.stringify(request, null, 2));
    
    // Get farmer credit profile before approval
    const { data: profileBefore, error: profileError } = await supabase
      .from('farmer_credit_profiles')
      .select('*')
      .eq('farmer_id', request.farmer_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching credit profile:', profileError);
    } else {
      console.log('Credit profile before approval:', JSON.stringify(profileBefore, null, 2));
    }
    
    // Get pending collections before approval
    const { data: collectionsBefore, error: collectionsError } = await supabase
      .from('collections')
      .select('id, total_amount, status')
      .eq('farmer_id', request.farmer_id)
      .neq('status', 'Paid');

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
    } else {
      console.log('Pending collections before approval:', JSON.stringify(collectionsBefore, null, 2));
    }

  } catch (error) {
    console.error('Error in testCreditApproval:', error);
  }
}

testCreditApproval();