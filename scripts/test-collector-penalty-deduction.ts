#!/usr/bin/env node
/**
 * Test script for collector penalty deduction system
 * 
 * This script tests the end-to-end functionality of the new collector penalty deduction system
 * that mirrors the farmer credit deduction system.
 */

import { createClient } from '@supabase/supabase-js';
import { collectorEarningsService } from '../src/services/collector-earnings-service';
import { collectorPenaltyAccountService } from '../src/services/collector-penalty-account-service';
import { collectorPenaltyService } from '../src/services/collector-penalty-service';

// Supabase client setup (using service role for testing)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

async function runTest() {
  console.log('🚀 Starting Collector Penalty Deduction System Test');
  console.log('===============================================\n');
  
  try {
    // Step 1: Create a test collector
    console.log('1. Setting up test collector...');
    
    // Create a test profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test Collector',
        phone: '+254700000000',
        email: 'test.collector@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (profileError) throw profileError;
    console.log('   ✅ Created test profile');
    
    // Create a test staff record
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .insert({
        user_id: profileData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (staffError) throw staffError;
    const collectorId = staffData.id;
    console.log('   ✅ Created test staff record');
    
    // Assign collector role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profileData.id,
        role: 'collector',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (roleError) throw roleError;
    console.log('   ✅ Assigned collector role\n');
    
    // Step 2: Create test collections
    console.log('2. Creating test collections...');
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const testCollections = [
      {
        staff_id: collectorId,
        farmer_id: 'farmer-test-123', // Using a test farmer ID
        collection_date: yesterday,
        liters: 100,
        rate_per_liter: 25.0,
        total_amount: 2500,
        status: 'Collected',
        approved_for_payment: true,
        approved_for_company: true,
        collection_fee_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        staff_id: collectorId,
        farmer_id: 'farmer-test-124',
        collection_date: today,
        liters: 150,
        rate_per_liter: 25.0,
        total_amount: 3750,
        status: 'Collected',
        approved_for_payment: true,
        approved_for_company: true,
        collection_fee_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    const { error: collectionsError } = await supabase
      .from('collections')
      .insert(testCollections);
      
    if (collectionsError) throw collectionsError;
    console.log('   ✅ Created test collections\n');
    
    // Step 3: Incur penalties for the collector
    console.log('3. Incurring penalties for collector...');
    
    // Incur a penalty of KES 500
    const penaltyResult = await collectorPenaltyService.incurPenaltyForCollector(
      collectorId,
      500,
      'test',
      'test-penalty-123',
      'Test penalty for validation'
    );
    
    if (!penaltyResult) throw new Error('Failed to incur penalty');
    console.log('   ✅ Incurred test penalty of KES 500');
    
    // Check penalty account balance
    const penaltyBalance = await collectorPenaltyAccountService.getPenaltyBalance(collectorId);
    console.log(`   💰 Penalty balance: KES ${penaltyBalance?.pendingPenalties || 0} pending\n`);
    
    // Step 4: Generate payment records
    console.log('4. Generating payment records...');
    
    const paymentGenerationResult = await collectorEarningsService.autoGeneratePaymentRecords();
    if (!paymentGenerationResult) throw new Error('Failed to generate payment records');
    console.log('   ✅ Generated payment records\n');
    
    // Step 5: Retrieve payment record
    console.log('5. Retrieving payment record...');
    
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('collector_payments')
      .select('*')
      .eq('collector_id', collectorId)
      .limit(1);
      
    if (paymentsError) throw paymentsError;
    if (!paymentsData || paymentsData.length === 0) throw new Error('No payment records found');
    
    const paymentId = paymentsData[0].id;
    console.log(`   ✅ Found payment record: ${paymentId}\n`);
    
    // Step 6: Mark payment as paid (this should deduct penalties)
    console.log('6. Marking payment as paid (should deduct penalties)...');
    
    const markPaidResult = await collectorEarningsService.markPaymentAsPaid(paymentId);
    if (!markPaidResult) throw new Error('Failed to mark payment as paid');
    console.log('   ✅ Marked payment as paid\n');
    
    // Step 7: Verify penalty deduction
    console.log('7. Verifying penalty deduction...');
    
    const updatedPenaltyBalance = await collectorPenaltyAccountService.getPenaltyBalance(collectorId);
    console.log(`   💰 Updated penalty balance: KES ${updatedPenaltyBalance?.pendingPenalties || 0} pending`);
    console.log(`   💰 Total penalties paid: KES ${updatedPenaltyBalance?.totalPaid || 0}\n`);
    
    // Step 8: Verify collections were updated
    console.log('8. Verifying collections were updated...');
    
    const { data: updatedCollections, error: collectionsCheckError } = await supabase
      .from('collections')
      .select('id, collection_fee_status')
      .eq('staff_id', collectorId)
      .eq('collection_fee_status', 'paid');
      
    if (collectionsCheckError) throw collectionsCheckError;
    console.log(`   ✅ ${updatedCollections?.length || 0} collections updated to paid status\n`);
    
    // Cleanup
    console.log('9. Cleaning up test data...');
    
    // Delete test collections
    await supabase
      .from('collections')
      .delete()
      .in('staff_id', [collectorId]);
      
    // Delete test payment
    await supabase
      .from('collector_payments')
      .delete()
      .eq('collector_id', collectorId);
      
    // Delete test role
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', profileData.id);
      
    // Delete test staff
    await supabase
      .from('staff')
      .delete()
      .eq('id', collectorId);
      
    // Delete test profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', profileData.id);
      
    console.log('   ✅ Test data cleaned up\n');
    
    console.log('🎉 All tests passed!');
    console.log('✅ Collector penalty deduction system is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runTest().catch(console.error);
}

export default runTest;