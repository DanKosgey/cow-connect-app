// Test script to verify the fixed batch approval function works correctly
// This script tests the proportional distribution of total received liters

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedBatchApproval() {
  console.log('Testing fixed batch approval function...');
  
  try {
    // Test parameters - replace with actual IDs from your database
    const testStaffId = 'f695826b-c5f1-4d12-b338-95e34a3165ea'; // Replace with actual staff ID
    const testCollectorId = 'TEST_COLLECTOR_ID'; // Replace with actual collector ID
    const testCollectionDate = '2025-11-20'; // Replace with actual date with collections
    const testTotalReceivedLiters = 1000; // Total liters to be distributed
    
    console.log('Calling batch approval function with:');
    console.log('- Staff ID:', testStaffId);
    console.log('- Collector ID:', testCollectorId);
    console.log('- Collection Date:', testCollectionDate);
    console.log('- Total Received Liters:', testTotalReceivedLiters);
    
    // Call the fixed batch approval function
    const { data, error } = await supabase
      .rpc('batch_approve_collector_collections', {
        p_staff_id: testStaffId,
        p_collector_id: testCollectorId,
        p_collection_date: testCollectionDate,
        p_total_received_liters: testTotalReceivedLiters
      });
    
    if (error) {
      console.error('Error calling batch approval function:', error);
      return;
    }
    
    console.log('Batch approval result:');
    console.log(JSON.stringify(data, null, 2));
    
    // Verify the results
    if (data && data.length > 0) {
      const result = data[0];
      console.log('\\nSummary:');
      console.log('- Approved collections:', result.approved_count);
      console.log('- Total collected liters:', result.total_liters_collected);
      console.log('- Total received liters:', result.total_liters_received);
      console.log('- Total variance:', result.total_variance);
      console.log('- Total penalty amount:', result.total_penalty_amount);
      
      // Check if the total received liters matches what we provided
      if (result.total_liters_received === testTotalReceivedLiters) {
        console.log('✅ SUCCESS: Total received liters matches input');
      } else {
        console.log('❌ FAILURE: Total received liters does not match input');
        console.log('Expected:', testTotalReceivedLiters, 'Got:', result.total_liters_received);
      }
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testFixedBatchApproval();