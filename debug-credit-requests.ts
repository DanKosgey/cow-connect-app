import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCreditRequests() {
  try {
    console.log('Testing credit requests query...');
    
    // Test the join query
    const { data, error } = await supabase
      .from('credit_requests')
      .select(`
        *,
        farmers!inner(
          full_name,
          phone_number,
          profiles(
            full_name,
            phone
          )
        )
      `)
      .limit(5);

    if (error) {
      console.error('Query error:', error);
      return;
    }

    console.log('Query successful. Data:', JSON.stringify(data, null, 2));
    
    // Also test a simpler query to see the structure
    const { data: simpleData, error: simpleError } = await supabase
      .from('credit_requests')
      .select(`
        id,
        farmer_id,
        product_name,
        quantity,
        unit_price,
        total_amount,
        status,
        created_at
      `)
      .limit(5);

    if (simpleError) {
      console.error('Simple query error:', simpleError);
    } else {
      console.log('Simple query data:', JSON.stringify(simpleData, null, 2));
    }
    
    // Test farmer data separately
    const { data: farmerData, error: farmerError } = await supabase
      .from('farmers')
      .select(`
        id,
        full_name,
        phone_number,
        profiles(
          full_name,
          phone
        )
      `)
      .limit(5);

    if (farmerError) {
      console.error('Farmer query error:', farmerError);
    } else {
      console.log('Farmer data:', JSON.stringify(farmerData, null, 2));
    }

  } catch (error) {
    console.error('Error in debugCreditRequests:', error);
  }
}

debugCreditRequests();