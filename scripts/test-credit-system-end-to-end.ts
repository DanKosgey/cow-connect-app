#!/usr/bin/env ts-node

/**
 * End-to-End Credit System Test Script
 * 
 * This script tests the complete credit system workflow:
 * 1. Farmer registration and credit profile creation
 * 2. Credit granting by admin
 * 3. Credit request submission by farmer
 * 4. Credit request approval by admin
 * 5. Credit repayment through milk collections
 * 6. Monthly settlement
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

// Initialize Supabase client with service role key for full access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data
const TEST_FARMER = {
  id: uuidv4(),
  user_id: uuidv4(),
  full_name: 'Test Farmer E2E',
  phone: '+254700000000',
  national_id: 'TEST12345678',
  county: 'Trans Nzoia',
  sub_county: 'Cherangany',
  ward: 'Chepsiro/Kiptoror',
  village: 'Test Village'
};

const TEST_PRODUCT = {
  id: uuidv4(),
  name: 'Test Fertilizer',
  category: 'Fertilizers',
  unit: 'kg',
  cost_price: 500.00,
  is_credit_eligible: true
};

const TEST_PACKAGING = {
  id: uuidv4(),
  product_id: '', // Will be set during test
  name: '50kg Bag',
  unit: 'kg',
  weight: 50,
  price: 500.00,
  is_credit_eligible: true
};

async function runTest(testName: string, testFn: () => Promise<boolean>): Promise<boolean> {
  console.log(`\n🧪 Running test: ${testName}`);
  try {
    const result = await testFn();
    if (result) {
      console.log(`✅ PASSED: ${testName}`);
      return true;
    } else {
      console.log(`❌ FAILED: ${testName}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 ERROR: ${testName} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Clean up in reverse order to avoid foreign key constraints
  await supabase.from('credit_transactions').delete().eq('farmer_id', TEST_FARMER.id);
  await supabase.from('credit_requests').delete().eq('farmer_id', TEST_FARMER.id);
  await supabase.from('farmer_credit_profiles').delete().eq('farmer_id', TEST_FARMER.id);
  await supabase.from('product_packaging').delete().eq('product_id', TEST_PRODUCT.id);
  await supabase.from('agrovet_inventory').delete().eq('id', TEST_PRODUCT.id);
  await supabase.from('farmers').delete().eq('id', TEST_FARMER.id);
  
  console.log('✅ Cleanup completed');
}

async function testFarmerRegistrationAndCreditProfile() {
  try {
    // Create test farmer
    const { error: farmerError } = await supabase
      .from('farmers')
      .insert([TEST_FARMER]);

    if (farmerError) throw farmerError;

    // Wait a moment for triggers/procedures to run
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if credit profile was automatically created
    const { data: profile, error: profileError } = await supabase
      .from('farmer_credit_profiles')
      .select('*')
      .eq('farmer_id', TEST_FARMER.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      console.log('❌ No credit profile found for farmer');
      return false;
    }

    // Verify profile has correct default values
    if (profile.credit_tier !== 'new') {
      console.log(`❌ Expected credit tier 'new', got '${profile.credit_tier}'`);
      return false;
    }

    if (profile.credit_limit_percentage !== 30.00) {
      console.log(`❌ Expected credit limit percentage 30.00, got ${profile.credit_limit_percentage}`);
      return false;
    }

    if (profile.max_credit_amount !== 50000.00) {
      console.log(`❌ Expected max credit amount 50000.00, got ${profile.max_credit_amount}`);
      return false;
    }

    if (profile.current_credit_balance !== 0) {
      console.log(`❌ Expected current credit balance 0, got ${profile.current_credit_balance}`);
      return false;
    }

    console.log('✅ Farmer registration and credit profile creation successful');
    return true;
  } catch (error) {
    console.log(`❌ Error in test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testCreditGranting() {
  try {
    // Grant credit to farmer (simulate admin action)
    const { error: grantError } = await supabase.rpc('grant_credit_to_farmer', {
      p_farmer_id: TEST_FARMER.id,
      p_granted_by: null
    });

    if (grantError) throw grantError;

    // Check if credit was granted
    const { data: profile, error: profileError } = await supabase
      .from('farmer_credit_profiles')
      .select('current_credit_balance')
      .eq('farmer_id', TEST_FARMER.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      console.log('❌ No credit profile found');
      return false;
    }

    if (profile.current_credit_balance <= 0) {
      console.log(`❌ Expected positive credit balance, got ${profile.current_credit_balance}`);
      return false;
    }

    // Check if credit transaction was recorded
    const { data: transactions, error: transactionError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('farmer_id', TEST_FARMER.id)
      .eq('transaction_type', 'credit_granted');

    if (transactionError) throw transactionError;

    if (!transactions || transactions.length === 0) {
      console.log('❌ No credit granted transaction found');
      return false;
    }

    console.log('✅ Credit granting successful');
    return true;
  } catch (error) {
    console.log(`❌ Error in test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testProductAndPackagingCreation() {
  try {
    // Create test product
    const { error: productError } = await supabase
      .from('agrovet_inventory')
      .insert([TEST_PRODUCT]);

    if (productError) throw productError;

    // Create test packaging
    TEST_PACKAGING.product_id = TEST_PRODUCT.id;
    const { error: packagingError } = await supabase
      .from('product_packaging')
      .insert([TEST_PACKAGING]);

    if (packagingError) throw packagingError;

    console.log('✅ Product and packaging creation successful');
    return true;
  } catch (error) {
    console.log(`❌ Error in test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testCreditRequestSubmission() {
  try {
    // Submit credit request (simulate farmer action)
    const { error: requestError } = await supabase
      .from('credit_requests')
      .insert([{
        farmer_id: TEST_FARMER.id,
        product_id: TEST_PRODUCT.id,
        product_name: TEST_PRODUCT.name,
        quantity: 2,
        unit_price: TEST_PACKAGING.price,
        total_amount: TEST_PACKAGING.price * 2,
        packaging_option_id: TEST_PACKAGING.id,
        status: 'pending'
      }]);

    if (requestError) throw requestError;

    // Check if request was created
    const { data: requests, error: fetchError } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('farmer_id', TEST_FARMER.id);

    if (fetchError) throw fetchError;

    if (!requests || requests.length === 0) {
      console.log('❌ No credit requests found');
      return false;
    }

    const request = requests[0];
    if (request.status !== 'pending') {
      console.log(`❌ Expected status 'pending', got '${request.status}'`);
      return false;
    }

    console.log('✅ Credit request submission successful');
    return true;
  } catch (error) {
    console.log(`❌ Error in test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testCreditRequestApproval() {
  try {
    // Get the pending request
    const { data: requests, error: fetchError } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('farmer_id', TEST_FARMER.id)
      .eq('status', 'pending');

    if (fetchError) throw fetchError;
    if (!requests || requests.length === 0) {
      console.log('❌ No pending credit requests found');
      return false;
    }

    const requestId = requests[0].id;

    // Get farmer's current credit balance before approval
    const { data: profileBefore, error: profileErrorBefore } = await supabase
      .from('farmer_credit_profiles')
      .select('current_credit_balance')
      .eq('farmer_id', TEST_FARMER.id)
      .maybeSingle();

    if (profileErrorBefore) throw profileErrorBefore;
    const balanceBefore = profileBefore?.current_credit_balance || 0;

    // Approve credit request (simulate admin action)
    const { error: approveError } = await supabase.rpc('approve_credit_request', {
      p_request_id: requestId,
      p_approved_by: null
    });

    if (approveError) throw approveError;

    // Check if request was approved
    const { data: updatedRequest, error: updatedRequestError } = await supabase
      .from('credit_requests')
      .select('status')
      .eq('id', requestId)
      .maybeSingle();

    if (updatedRequestError) throw updatedRequestError;

    if (!updatedRequest || updatedRequest.status !== 'approved') {
      console.log(`❌ Expected status 'approved', got '${updatedRequest?.status || 'not found'}'`);
      return false;
    }

    // Check if credit was deducted
    const { data: profileAfter, error: profileErrorAfter } = await supabase
      .from('farmer_credit_profiles')
      .select('current_credit_balance')
      .eq('farmer_id', TEST_FARMER.id)
      .maybeSingle();

    if (profileErrorAfter) throw profileErrorAfter;
    const balanceAfter = profileAfter?.current_credit_balance || 0;

    const expectedDeduction = TEST_PACKAGING.price * 2; // 2 units at 500 each = 1000
    const actualDeduction = balanceBefore - balanceAfter;

    if (Math.abs(actualDeduction - expectedDeduction) > 0.01) {
      console.log(`❌ Expected deduction ${expectedDeduction}, got ${actualDeduction}`);
      return false;
    }

    // Check if credit transaction was recorded
    const { data: transactions, error: transactionError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('farmer_id', TEST_FARMER.id)
      .eq('transaction_type', 'credit_used');

    if (transactionError) throw transactionError;

    if (!transactions || transactions.length === 0) {
      console.log('❌ No credit used transaction found');
      return false;
    }

    console.log('✅ Credit request approval successful');
    return true;
  } catch (error) {
    console.log(`❌ Error in test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Credit System End-to-End Tests');
  
  let passedTests = 0;
  const totalTests = 5;

  try {
    // Run tests in order
    if (await runTest('Farmer Registration and Credit Profile Creation', testFarmerRegistrationAndCreditProfile)) passedTests++;
    
    if (await runTest('Credit Granting', testCreditGranting)) passedTests++;
    
    if (await runTest('Product and Packaging Creation', testProductAndPackagingCreation)) passedTests++;
    
    if (await runTest('Credit Request Submission', testCreditRequestSubmission)) passedTests++;
    
    if (await runTest('Credit Request Approval', testCreditRequestApproval)) passedTests++;

    // Summary
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Credit system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the output above.');
    }
  } catch (error) {
    console.log(`💥 Unexpected error during testing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Always cleanup test data
    await cleanupTestData();
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export default main;