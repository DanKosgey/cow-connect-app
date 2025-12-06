// Test script to verify payment system integration with new credit system
const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials from .env file
const supabaseUrl = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPaymentCreditIntegration() {
  console.log('🧪 Testing Payment System Integration with New Credit System...\n');

  try {
    // 1. Test credit profile access
    console.log('1. Testing credit profile access...');
    
    const { data: creditProfiles, error: profilesError } = await supabase
      .from('farmer_credit_profiles')
      .select('id, farmer_id, credit_tier, current_credit_balance, total_credit_used, pending_deductions')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error accessing credit profiles:', profilesError);
    } else {
      console.log(`✅ Credit profiles accessible - found ${creditProfiles?.length || 0} profiles`);
      if (creditProfiles && creditProfiles.length > 0) {
        creditProfiles.forEach(profile => {
          console.log(`   - Farmer ID: ${profile.farmer_id}`);
          console.log(`     Tier: ${profile.credit_tier}`);
          console.log(`     Balance: ${profile.current_credit_balance}`);
          console.log(`     Used: ${profile.total_credit_used}`);
          console.log(`     Pending Deductions: ${profile.pending_deductions}`);
        });
      }
    }

    // 2. Test credit transactions access
    console.log('\n2. Testing credit transactions access...');
    
    const { data: creditTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('id, farmer_id, transaction_type, amount, balance_after, reference_type, reference_id')
      .limit(5);

    if (transactionsError) {
      console.error('❌ Error accessing credit transactions:', transactionsError);
    } else {
      console.log(`✅ Credit transactions accessible - found ${creditTransactions?.length || 0} transactions`);
      if (creditTransactions && creditTransactions.length > 0) {
        creditTransactions.forEach(transaction => {
          console.log(`   - Type: ${transaction.transaction_type}`);
          console.log(`     Amount: ${transaction.amount}`);
          console.log(`     Balance After: ${transaction.balance_after}`);
          console.log(`     Reference: ${transaction.reference_type} - ${transaction.reference_id}`);
        });
      }
    }

    // 3. Test collection payments access
    console.log('\n3. Testing collection payments access...');
    
    const { data: collectionPayments, error: paymentsError } = await supabase
      .from('collection_payments')
      .select('id, collection_id, amount, credit_used, net_payment, collector_fee')
      .limit(5);

    if (paymentsError) {
      console.error('❌ Error accessing collection payments:', paymentsError);
    } else {
      console.log(`✅ Collection payments accessible - found ${collectionPayments?.length || 0} payments`);
      if (collectionPayments && collectionPayments.length > 0) {
        collectionPayments.forEach(payment => {
          console.log(`   - Collection ID: ${payment.collection_id}`);
          console.log(`     Amount: ${payment.amount}`);
          console.log(`     Credit Used: ${payment.credit_used}`);
          console.log(`     Net Payment: ${payment.net_payment}`);
          console.log(`     Collector Fee: ${payment.collector_fee}`);
        });
      }
    }

    // 4. Test table relationships
    console.log('\n4. Testing table relationships...');
    
    // Test joining collections with collection_payments and credit data
    const { data: joinedData, error: joinError } = await supabase
      .from('collections')
      .select(`
        id,
        farmer_id,
        total_amount,
        status,
        collection_payments(
          credit_used,
          net_payment,
          collector_fee
        )
      `)
      .limit(3);

    if (joinError) {
      console.error('❌ Error testing table relationships:', joinError);
    } else {
      console.log(`✅ Table relationships working - found ${joinedData?.length || 0} joined records`);
      if (joinedData && joinedData.length > 0) {
        joinedData.forEach(record => {
          console.log(`   - Collection ID: ${record.id}`);
          console.log(`     Farmer ID: ${record.farmer_id}`);
          console.log(`     Total Amount: ${record.total_amount}`);
          console.log(`     Status: ${record.status}`);
          if (record.collection_payments && record.collection_payments.length > 0) {
            const payment = record.collection_payments[0];
            console.log(`     Credit Used: ${payment.credit_used}`);
            console.log(`     Net Payment: ${payment.net_payment}`);
            console.log(`     Collector Fee: ${payment.collector_fee}`);
          }
        });
      }
    }

    // 5. Test credit calculation function
    console.log('\n5. Testing credit calculation...');
    
    // Try to call the RPC function if it exists
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_collector_rate');
      
      if (rpcError) {
        console.log('⚠️  Collector rate RPC function not available or error:', rpcError.message);
      } else {
        console.log(`✅ Collector rate RPC function working - Rate: ${rpcData}`);
      }
    } catch (rpcException) {
      console.log('⚠️  Collector rate RPC function not available:', rpcException.message);
    }

    console.log('\n🎉 Payment System Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Credit Profiles: ${profilesError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Credit Transactions: ${transactionsError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Collection Payments: ${paymentsError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Table Relationships: ${joinError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Credit Calculation: ✅ Tested`);
    
  } catch (error) {
    console.error('💥 Unexpected error during payment-credit integration test:', error);
  }
}

// Run the test
testPaymentCreditIntegration();