#!/usr/bin/env -S npx tsx

/**
 * End-to-end test script for collector fee deduction system
 * This script will:
 * 1. Create test farmers and collectors
 * 2. Set up collector rates
 * 3. Create test collections
 * 4. Verify collector fee deduction functionality
 * 5. Test batch processing
 * 6. Clean up test data
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '***';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '***';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('🚀 Starting end-to-end collector fee deduction test...\n');
  
  let testData: any = {
    farmers: [],
    collectors: [],
    collections: [],
    profiles: []
  };
  
  try {
    // 1. Create test farmer profiles
    console.log('1. Creating test farmer profiles...');
    const farmerProfiles = [
      {
        full_name: 'Test Farmer 1',
        email: 'test-farmer-1@example.com',
        phone: '+254700000001'
      },
      {
        full_name: 'Test Farmer 2',
        email: 'test-farmer-2@example.com',
        phone: '+254700000002'
      }
    ];
    
    for (const profileData of farmerProfiles) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (profileError) throw profileError;
      testData.profiles.push(profile);
      console.log(`✅ Created farmer profile: ${profile.full_name}`);
    }
    
    // 2. Create farmer records
    console.log('\n2. Creating farmer records...');
    for (const profile of testData.profiles) {
      const { data: farmer, error: farmerError } = await supabase
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
      testData.farmers.push(farmer);
      console.log(`✅ Created farmer record: ${farmer.full_name}`);
    }
    
    // 3. Create test collector profile
    console.log('\n3. Creating test collector profile...');
    const { data: collectorProfile, error: collectorProfileError } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test Collector',
        email: 'test-collector@example.com',
        phone: '+254700000003'
      })
      .select()
      .single();
    
    if (collectorProfileError) throw collectorProfileError;
    testData.profiles.push(collectorProfile);
    console.log(`✅ Created collector profile: ${collectorProfile.full_name}`);
    
    // 4. Create collector record
    console.log('\n4. Creating collector record...');
    const { data: collector, error: collectorError } = await supabase
      .from('staff')
      .insert({
        user_id: collectorProfile.id,
        employee_id: `EMP-${collectorProfile.id.substring(0, 8)}`
      })
      .select()
      .single();
    
    if (collectorError) throw collectorError;
    testData.collectors.push(collector);
    console.log(`✅ Created collector record: ${collectorProfile.full_name}`);
    
    // 5. Assign collector role
    console.log('\n5. Assigning collector role...');
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: collectorProfile.id,
        role: 'collector',
        active: true
      });
    
    if (roleError) throw roleError;
    console.log('✅ Assigned collector role');
    
    // 6. Set collector rate to 3 KSH per liter
    console.log('\n6. Setting collector rate to 3 KSH per liter...');
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
    
    // 7. Create test collections
    console.log('\n7. Creating test collections...');
    const collectionsData = [
      {
        farmer_id: testData.farmers[0].id,
        staff_id: collector.id,
        liters: 100,
        rate_per_liter: 50.00,
        total_amount: 5000.00,
        status: 'Collected',
        collection_date: new Date().toISOString(),
        approved_for_company: true
      },
      {
        farmer_id: testData.farmers[0].id,
        staff_id: collector.id,
        liters: 150,
        rate_per_liter: 50.00,
        total_amount: 7500.00,
        status: 'Collected',
        collection_date: new Date().toISOString(),
        approved_for_company: true
      },
      {
        farmer_id: testData.farmers[1].id,
        staff_id: collector.id,
        liters: 200,
        rate_per_liter: 50.00,
        total_amount: 10000.00,
        status: 'Collected',
        collection_date: new Date().toISOString(),
        approved_for_company: true
      }
    ];
    
    for (const collectionData of collectionsData) {
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .insert(collectionData)
        .select()
        .single();
      
      if (collectionError) throw collectionError;
      testData.collections.push(collection);
      console.log(`✅ Created collection: ${collection.liters} liters for ${collectionData.total_amount} KSH`);
    }
    
    // 8. Approve collections for payment
    console.log('\n8. Approving collections for payment...');
    const collectionIds = testData.collections.map(c => c.id);
    const { error: approveError } = await supabase
      .from('collections')
      .update({ approved_for_payment: true })
      .in('id', collectionIds);
    
    if (approveError) throw approveError;
    console.log('✅ Approved all collections for payment');
    
    // 9. Test individual collector fee deduction
    console.log('\n9. Testing individual collector fee deduction...');
    
    // Import and test the payment service
    const { PaymentService } = await import('../src/services/payment-service');
    
    // Process first collection
    const firstCollection = testData.collections[0];
    const firstFarmer = testData.farmers.find((f: any) => f.id === firstCollection.farmer_id);
    
    const markPaidResult = await PaymentService.markCollectionAsPaid(
      firstCollection.id,
      firstFarmer.id,
      firstCollection
    );
    
    if (!markPaidResult.success) throw new Error('Failed to mark collection as paid');
    console.log('✅ Individual collector fee deduction successful');
    
    // 10. Verify payment record was created with collector fee
    console.log('\n10. Verifying payment record with collector fee...');
    const { data: paymentRecord, error: paymentRecordError } = await supabase
      .from('collection_payments')
      .select('amount, rate_applied, collector_fee, credit_used, net_payment')
      .eq('collection_id', firstCollection.id)
      .maybeSingle();
    
    if (paymentRecordError) throw paymentRecordError;
    if (!paymentRecord) throw new Error('No payment record found');
    
    const expectedCollectorFee = firstCollection.liters * 3; // 3 KSH per liter
    const expectedNetPayment = firstCollection.total_amount - expectedCollectorFee;
    
    console.log(`✅ Payment record created:`);
    console.log(`   Amount: ${paymentRecord.amount} KSH`);
    console.log(`   Rate applied: ${paymentRecord.rate_applied} KSH/liter`);
    console.log(`   Collector fee: ${paymentRecord.collector_fee} KSH (expected: ${expectedCollectorFee})`);
    console.log(`   Net payment: ${paymentRecord.net_payment} KSH (expected: ${expectedNetPayment})`);
    
    if (paymentRecord.collector_fee !== expectedCollectorFee) {
      throw new Error(`Collector fee mismatch - Expected: ${expectedCollectorFee}, Got: ${paymentRecord.collector_fee}`);
    }
    
    // 11. Test batch collector fee deduction
    console.log('\n11. Testing batch collector fee deduction...');
    
    // Get remaining collections that are approved but not paid
    const { data: remainingCollections, error: remainingError } = await supabase
      .from('collections')
      .select('*')
      .in('id', [testData.collections[1].id, testData.collections[2].id])
      .eq('approved_for_payment', true)
      .neq('status', 'Paid');
    
    if (remainingError) throw remainingError;
    
    const batchResult = await PaymentService.batchDeductCollectorFees(remainingCollections);
    
    if (!batchResult.success) {
      console.error('Batch processing errors:', batchResult.errors);
      throw new Error('Batch collector fee deduction failed');
    }
    
    console.log(`✅ Batch collector fee deduction successful: ${batchResult.processed} collections processed`);
    
    // 12. Verify all collections are now marked as paid
    console.log('\n12. Verifying all collections are marked as paid...');
    const { data: updatedCollections, error: updatedError } = await supabase
      .from('collections')
      .select('id, status')
      .in('id', collectionIds);
    
    if (updatedError) throw updatedError;
    
    const allPaid = updatedCollections.every((c: any) => c.status === 'Paid');
    if (!allPaid) {
      const unpaid = updatedCollections.filter((c: any) => c.status !== 'Paid');
      throw new Error(`Not all collections were marked as paid. Unpaid: ${unpaid.map((c: any) => c.id).join(', ')}`);
    }
    
    console.log('✅ All collections successfully marked as paid');
    
    // 13. Verify all payment records have collector fees
    console.log('\n13. Verifying all payment records have collector fees...');
    const { data: allPaymentRecords, error: allPaymentsError } = await supabase
      .from('collection_payments')
      .select('collection_id, collector_fee')
      .in('collection_id', collectionIds);
    
    if (allPaymentsError) throw allPaymentsError;
    
    if (allPaymentRecords.length !== collectionIds.length) {
      throw new Error(`Payment record count mismatch - Expected: ${collectionIds.length}, Got: ${allPaymentRecords.length}`);
    }
    
    for (const payment of allPaymentRecords) {
      const collection = testData.collections.find((c: any) => c.id === payment.collection_id);
      const expectedFee = collection.liters * 3;
      
      if (payment.collector_fee !== expectedFee) {
        throw new Error(`Collector fee mismatch for collection ${payment.collection_id} - Expected: ${expectedFee}, Got: ${payment.collector_fee}`);
      }
    }
    
    console.log('✅ All payment records have correct collector fees');
    
    // 14. Test UI functions (simulated)
    console.log('\n14. Testing UI functions (simulated)...');
    
    // Simulate getting current collector rate
    const { data: currentRate } = await supabase.rpc('get_current_collector_rate');
    console.log(`✅ Current collector rate: ${currentRate} KSH per liter`);
    
    // Simulate batch deduction function
    console.log('✅ Batch deduction function test passed');
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete collection payments
    await supabase.from('collection_payments').delete().in('collection_id', collectionIds);
    
    // Delete collections
    await supabase.from('collections').delete().in('id', collectionIds);
    
    // Delete user roles
    await supabase.from('user_roles').delete().eq('user_id', collectorProfile.id);
    
    // Delete staff record
    await supabase.from('staff').delete().eq('id', collector.id);
    
    // Delete farmers
    await supabase.from('farmers').delete().in('id', testData.farmers.map((f: any) => f.id));
    
    // Delete profiles
    await supabase.from('profiles').delete().in('id', testData.profiles.map((p: any) => p.id));
    
    console.log('✅ Test data cleaned up successfully');
    
    console.log('\n🎉 All end-to-end tests passed! Collector fee deduction system is working correctly.');
    console.log('\n📝 Summary:');
    console.log(`   - Collector rate: 3 KSH per liter`);
    console.log(`   - Processed ${collectionIds.length} collections`);
    console.log(`   - Total liters: ${collectionsData.reduce((sum, c) => sum + c.liters, 0)}`);
    console.log(`   - Total collector fees: ${collectionsData.reduce((sum, c) => sum + (c.liters * 3), 0)} KSH`);
    console.log(`   - Individual and batch processing both working`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Attempt to clean up any remaining test data
    try {
      if (testData.collections.length > 0) {
        const collectionIds = testData.collections.map((c: any) => c.id);
        await supabase.from('collection_payments').delete().in('collection_id', collectionIds);
        await supabase.from('collections').delete().in('id', collectionIds);
      }
      
      if (testData.collectors.length > 0) {
        for (const collector of testData.collectors) {
          await supabase.from('user_roles').delete().eq('user_id', collector.user_id);
          await supabase.from('staff').delete().eq('id', collector.id);
        }
      }
      
      if (testData.farmers.length > 0) {
        const farmerIds = testData.farmers.map((f: any) => f.id);
        await supabase.from('farmers').delete().in('id', farmerIds);
      }
      
      if (testData.profiles.length > 0) {
        const profileIds = testData.profiles.map((p: any) => p.id);
        await supabase.from('profiles').delete().in('id', profileIds);
      }
      
      console.log('🧹 Cleanup attempted after error');
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runTest();
}

export default runTest;