#!/usr/bin/env ts-node

import { supabase } from '../src/integrations/supabase/client';

async function testBatchApproval() {
  console.log('Testing batch approval functionality...');
  
  try {
    // Test the batch approval function
    const { data, error } = await supabase.rpc('batch_approve_collector_collections', {
      p_staff_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      p_collector_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      p_collection_date: '2025-11-18',
      p_default_received_liters: 199
    });
    
    if (error) {
      console.log('Error calling batch approval function:', error);
    } else {
      console.log('Batch approval function result:', data);
    }
    
    // Test the daily collector summary function
    const { data: dailyData, error: dailyError } = await supabase.rpc('get_daily_collector_summary', {
      p_staff_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      p_collection_date: '2025-11-18'
    });
    
    if (dailyError) {
      console.log('Error calling daily collector summary function:', dailyError);
    } else {
      console.log('Daily collector summary function result:', dailyData);
    }
    
    // Test the all collectors summary function
    const { data: allData, error: allError } = await supabase.rpc('get_all_collectors_summary', {
      p_collection_date: '2025-11-18'
    });
    
    if (allError) {
      console.log('Error calling all collectors summary function:', allError);
    } else {
      console.log('All collectors summary function result:', allData);
    }
    
  } catch (error) {
    console.error('Unexpected error during testing:', error);
  }
}

testBatchApproval();