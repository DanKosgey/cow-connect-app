#!/usr/bin/env ts-node

import { supabase } from '../src/integrations/supabase/client.ts';

async function testBatchFunction() {
  console.log('Testing batch approval function directly...');
  
  try {
    // First, let's get a real user and staff record to test with
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('Auth error:', authError.message);
      return;
    }
    
    if (!user) {
      console.log('No authenticated user');
      return;
    }
    
    console.log('Current user:', user.id);
    
    // Get staff record for this user
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (staffError) {
      console.log('Staff error:', staffError.message);
      return;
    }
    
    if (!staffData) {
      console.log('No staff record found for user');
      return;
    }
    
    console.log('Staff ID:', staffData.id);
    
    // Get a collector to test with
    const { data: collectors, error: collectorsError } = await supabase
      .from('staff')
      .select('id')
      .limit(1);
      
    if (collectorsError) {
      console.log('Collectors error:', collectorsError.message);
      return;
    }
    
    if (!collectors || collectors.length === 0) {
      console.log('No collectors found');
      return;
    }
    
    const collectorId = collectors[0].id;
    console.log('Using collector ID:', collectorId);
    
    // Test the batch approval function
    console.log('Calling batch approval function...');
    const { data, error } = await supabase.rpc('batch_approve_collector_collections', {
      p_staff_id: staffData.id,
      p_collector_id: collectorId,
      p_collection_date: '2025-11-21',
      p_default_received_liters: 100
    });
    
    if (error) {
      console.log('Function error:', error.message);
      console.log('Error details:', error);
    } else {
      console.log('Function success:', data);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testBatchFunction();