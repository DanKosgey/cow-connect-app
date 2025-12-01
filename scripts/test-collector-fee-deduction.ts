#!/usr/bin/env -S npx tsx

/**
 * Test script for collector fee deduction system
 * This script will:
 * 1. Create a test farmer and collection
 * 2. Set up collector rates
 * 3. Verify collector fee deduction functionality
 * 4. Clean up test data
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '***';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '***';
const supabase = createClient(supabaseUrl, supabaseKey);

interface FarmerPaymentSummary {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  total_collections: number;
  total_liters: number;
  total_gross_amount: number;
  total_collector_fees: number;
  total_net_amount: number;
  paid_amount: number;
  pending_gross_amount: number;
  pending_net_amount: number;
  bank_info: string;
}

async function runTest() {
  console.log('🚀 Starting collector fee deduction test...\n');
  
  let farmerProfile: any = null;
  let farmer: any = null;
  let collection: any = null;
  
  try {
    // 1. Create test farmer profile
    console.log('1. Creating test farmer profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test Farmer',
        email: 'test-farmer@example.com',
        phone: '+254700000000'
      })
      .select()
      .single();
    
    if (profileError) throw profileError;
    farmerProfile = profile;
    console.log(`✅ Created farmer profile: ${profile.full_name}`);
    
    // 2. Create farmer record
    console.log('\n2. Creating farmer record...');
    const { data: farmerRecord, error: farmerError } = await supabase
      .from('farmers')
      .insert({
        user_id: profile.id,
        registration_number: `TEST-${profile.id.substring(0, 8)}`,
        full_name: profile.full_name,
        phone_number: profile.phone
      })
      .select()
      .single();
    
    if (farmerError) throw farmerError;
    farmer = farmerRecord;
    console.log(`✅ Created farmer record: ${farmer.full_name}`);
    
    // 3. Set collector rate to 3 KSH per liter
    console.log('\n3. Setting collector rate to 3 KSH per liter...');
    // First deactivate existing rates
    await supabase
      .from('collector_rates')
      .update({ is_active: false })
      .eq('is_active', true);
    
    // Insert new rate
    const { data: rate, error: rateError } = await supabase
      .from('collector_rates')
      .insert({
        rate_per_liter: 3.00,
        is_active: true,
        effective_from: new Date().toISOString()
      })
      .select()
      .single();
    
    if (rateError) throw rateError;
    console.log(`✅ Set collector rate to: ${rate.rate_per_liter} KSH per liter`);
    
    // 4. Create test collection
    console.log('\n4. Creating test collection...');
    const { data: collectionRecord, error: collectionError } = await supabase
      .from('collections')
      .insert({
        farmer_id: farmer.id,
        liters: 100,
        rate_per_liter: 50.00,
        total_amount: 5000.00,
        status: 'Collected',
        collection_date: new Date().toISOString(),
        approved_for_company: true
      })
      .select()
      .single();
    
    if (collectionError) throw collectionError;
    collection = collectionRecord;
    console.log(`✅ Created collection: ${collection.liters} liters for ${collection.total_amount} KSH`);
    
    // 5. Approve collection for payment
    console.log('\n5. Approving collection for payment...');
    const { error: approveError } = await supabase
      .from('collections')
      .update({ approved_for_payment: true })
      .eq('id', collection.id);
    
    if (approveError) throw approveError;
    console.log('✅ Approved collection for payment');
    
    // 6. Test collector fee deduction
    console.log('\n6. Testing collector fee deduction...');
    
    // Import and test the payment service
    const { PaymentService } = await import('../src/services/payment-service');
    
    // Get farmer payment summaries using the usePaymentSystemData hook approach
    // Since we can't directly call the hook, we'll simulate the calculation
    
    // First, get all collections with farmer information
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        *,
        approved_for_payment,
        farmers (
          id,
          user_id,
          bank_account_name,
          bank_account_number,
          bank_name,
          profiles!user_id (
            full_name,
            phone
          )
        ),
        collection_payments!collection_payments_collection_id_fkey (
          credit_used,
          collector_fee
        )
      `)
      .eq('approved_for_company', true)
      .order('collection_date', { ascending: false });

    if (collectionsError) throw collectionsError;

    // Get current collector rate
    const { data: currentRate } = await supabase.rpc('get_current_collector_rate');
    const collectorRate = currentRate || 0;
    
    // Group by farmer and calculate summaries
    const groupedCollections: any = {};
    collectionsData?.forEach((collectionItem: any) => {
      const farmerId = collectionItem.farmer_id;
      if (!groupedCollections[farmerId]) {
        groupedCollections[farmerId] = [];
      }
      groupedCollections[farmerId].push(collectionItem);
    });
    
    // Calculate summaries for our test farmer
    const farmerCollections = groupedCollections[farmer.id] || [];
    const firstCollection = farmerCollections[0];
    
    const totalCollections = farmerCollections.length;
    const totalLiters = farmerCollections.reduce((sum: number, c: any) => sum + (c.liters || 0), 0);
    const totalGrossAmount = farmerCollections.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
    
    // Calculate collector fees and net amounts
    const totalCollectorFees = farmerCollections.reduce((sum: number, c: any) => sum + ((c.liters || 0) * collectorRate), 0);
    const totalNetAmount = totalGrossAmount - totalCollectorFees;
    
    const paidCollections = farmerCollections.filter((c: any) => c.status === 'Paid');
    const paidAmount = paidCollections.reduce((sum: number, c: any) => sum + ((c.total_amount || 0) - ((c.liters || 0) * collectorRate)), 0);
    
    const pendingCollections = farmerCollections.filter((c: any) => c.status !== 'Paid');
    const pendingGrossAmount = pendingCollections.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
    const pendingNetAmount = pendingCollections.reduce((sum: number, c: any) => sum + ((c.total_amount || 0) - ((c.liters || 0) * collectorRate)), 0);
    
    // Calculate credit used from collection payments
    let creditUsed = farmerCollections.reduce((sum: number, c: any) => {
      const collectionCredit = c.collection_payments?.[0]?.credit_used || 0;
      return sum + collectionCredit;
    }, 0);
    
    const testFarmerSummary = {
      farmer_id: farmer.id,
      farmer_name: firstCollection?.farmers?.profiles?.full_name || 'Unknown Farmer',
      farmer_phone: firstCollection?.farmers?.profiles?.phone || 'No phone',
      total_collections: totalCollections,
      total_liters: totalLiters,
      total_gross_amount: totalGrossAmount,
      total_collector_fees: totalCollectorFees,
      total_net_amount: totalNetAmount,
      paid_amount: paidAmount,
      pending_gross_amount: pendingGrossAmount,
      pending_net_amount: pendingNetAmount,
      bank_info: `${firstCollection?.farmers?.bank_name || 'N/A'} - ${firstCollection?.farmers?.bank_account_number || 'No account'}`,
      credit_used: creditUsed
    };
    
    console.log(`✅ Farmer payment summary:`);
    console.log(`   Total gross amount: ${testFarmerSummary.total_gross_amount} KSH`);
    console.log(`   Total collector fees: ${testFarmerSummary.total_collector_fees} KSH`);
    console.log(`   Total net amount: ${testFarmerSummary.total_net_amount} KSH`);
    console.log(`   Pending gross amount: ${testFarmerSummary.pending_gross_amount} KSH`);
    console.log(`   Pending net amount: ${testFarmerSummary.pending_net_amount} KSH\n`);
    
    // 7. Validate calculations
    console.log('7. Validating calculations...');
    
    const expectedGrossAmount = collection.liters * collection.rate_per_liter;
    const expectedCollectorFee = collection.liters * collectorRate;
    const expectedNetAmount = expectedGrossAmount - expectedCollectorFee;
    
    const grossAmountValid = testFarmerSummary.total_gross_amount === expectedGrossAmount;
    const collectorFeeValid = testFarmerSummary.total_collector_fees === expectedCollectorFee;
    const netAmountValid = testFarmerSummary.total_net_amount === expectedNetAmount;
    
    if (grossAmountValid && collectorFeeValid && netAmountValid) {
      console.log('✅ All calculations are correct!');
    } else {
      console.log('❌ Calculation mismatch:');
      console.log(`   Gross amount - Expected: ${expectedGrossAmount}, Got: ${testFarmerSummary.total_gross_amount}, Match: ${grossAmountValid}`);
      console.log(`   Collector fee - Expected: ${expectedCollectorFee}, Got: ${testFarmerSummary.total_collector_fees}, Match: ${collectorFeeValid}`);
      console.log(`   Net amount - Expected: ${expectedNetAmount}, Got: ${testFarmerSummary.total_net_amount}, Match: ${netAmountValid}`);
      throw new Error('Calculation validation failed');
    }
    
    // 8. Test marking collection as paid
    console.log('\n8. Testing marking collection as paid...');
    
    const markPaidResult = await PaymentService.markCollectionAsPaid(
      collection.id, 
      farmer.id, 
      {
        id: collection.id,
        farmer_id: farmer.id,
        total_amount: collection.total_amount,
        rate_per_liter: collection.rate_per_liter,
        status: collection.status,
        approved_for_payment: collection.approved_for_payment
        // Note: liters is fetched from the database by the service, not passed in
      }
    );
    
    if (!markPaidResult.success) throw new Error('Failed to mark collection as paid');
    console.log('✅ Collection marked as paid successfully');
    
    // 9. Verify collector fee was stored in collection_payments
    console.log('\n9. Verifying collector fee storage...');
    const { data: paymentRecord, error: paymentRecordError } = await supabase
      .from('collection_payments')
      .select('amount, rate_applied, collector_fee')
      .eq('collection_id', collection.id)
      .maybeSingle();
    
    if (paymentRecordError) throw paymentRecordError;
    if (!paymentRecord) throw new Error('No payment record found');
    
    console.log(`✅ Payment record created:`);
    console.log(`   Amount: ${paymentRecord.amount} KSH`);
    console.log(`   Rate applied: ${paymentRecord.rate_applied} KSH/liter`);
    console.log(`   Collector fee: ${paymentRecord.collector_fee} KSH`);
    
    const feeStoredCorrectly = paymentRecord.collector_fee === expectedCollectorFee;
    if (feeStoredCorrectly) {
      console.log('✅ Collector fee correctly stored in database');
    } else {
      console.log(`❌ Collector fee mismatch - Expected: ${expectedCollectorFee}, Got: ${paymentRecord.collector_fee}`);
      throw new Error('Collector fee storage validation failed');
    }
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('collection_payments').delete().eq('collection_id', collection.id);
    await supabase.from('collections').delete().eq('id', collection.id);
    await supabase.from('farmers').delete().eq('id', farmer.id);
    await supabase.from('profiles').delete().eq('id', farmerProfile.id);
    
    console.log('✅ Test data cleaned up successfully');
    
    console.log('\n🎉 All tests passed! Collector fee deduction is working correctly.');
    console.log('\n📝 Summary:');
    console.log(`   - Collector rate: ${collectorRate} KSH per liter`);
    console.log(`   - Collection size: ${collection.liters} liters`);
    console.log(`   - Gross payment: ${expectedGrossAmount} KSH`);
    console.log(`   - Collector fee: ${expectedCollectorFee} KSH`);
    console.log(`   - Net payment to farmer: ${expectedNetAmount} KSH`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runTest();
}

export default runTest;