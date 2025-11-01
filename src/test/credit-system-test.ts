import { supabase } from '@/integrations/supabase/client';

async function testCreditSystem() {
  console.log('Testing credit system integration...');
  
  // Test 1: Check if farmer_credit_profiles table exists
  try {
    const { data, error } = await supabase
      .from('farmer_credit_profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error accessing farmer_credit_profiles table:', error);
    } else {
      console.log('farmer_credit_profiles table is accessible');
    }
  } catch (err) {
    console.error('Error testing farmer_credit_profiles table:', err);
  }
  
  // Test 2: Check if credit_transactions table exists
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error accessing credit_transactions table:', error);
    } else {
      console.log('credit_transactions table is accessible');
    }
  } catch (err) {
    console.error('Error testing credit_transactions table:', err);
  }
  
  // Test 3: Check if agrovet_inventory table exists
  try {
    const { data, error } = await supabase
      .from('agrovet_inventory')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error accessing agrovet_inventory table:', error);
    } else {
      console.log('agrovet_inventory table is accessible');
    }
  } catch (err) {
    console.error('Error testing agrovet_inventory table:', err);
  }
  
  console.log('Credit system test completed');
}

// Run the test
testCreditSystem();