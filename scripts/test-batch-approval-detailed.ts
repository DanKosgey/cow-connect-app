#!/usr/bin/env ts-node

import { supabase } from '../src/integrations/supabase/client';
import { logger } from '../src/utils/logger';

async function testBatchApprovalWithDetailedLogging() {
  console.log('Testing batch approval functionality with detailed logging...');
  
  try {
    // Test with invalid staff ID to see the detailed error message
    console.log('\n1. Testing with invalid staff ID...');
    const { data: data1, error: error1 } = await supabase.rpc('batch_approve_collector_collections', {
      p_staff_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
      p_collector_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      p_collection_date: '2025-11-18',
      p_default_received_liters: 199
    });
    
    if (error1) {
      console.log('Expected error with invalid staff ID:', error1.message);
    } else {
      console.log('Unexpected success with invalid staff ID:', data1);
    }
    
    // Test with invalid collector ID
    console.log('\n2. Testing with invalid collector ID...');
    
    // First, let's get a valid staff ID from the database
    const { data: validStaff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .limit(1);
      
    if (staffError) {
      console.log('Error fetching valid staff:', staffError.message);
      return;
    }
    
    if (!validStaff || validStaff.length === 0) {
      console.log('No valid staff found in database');
      return;
    }
    
    const validStaffId = validStaff[0].id;
    console.log('Using valid staff ID:', validStaffId);
    
    const { data: data2, error: error2 } = await supabase.rpc('batch_approve_collector_collections', {
      p_staff_id: validStaffId,
      p_collector_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
      p_collection_date: '2025-11-18',
      p_default_received_liters: 199
    });
    
    if (error2) {
      console.log('Expected error with invalid collector ID:', error2.message);
    } else {
      console.log('Unexpected success with invalid collector ID:', data2);
    }
    
    // Test with valid IDs but no permission
    console.log('\n3. Testing with valid IDs but potentially no permission...');
    
    // Get a farmer ID (who shouldn't have staff permissions)
    const { data: farmers, error: farmerError } = await supabase
      .from('farmers')
      .select('id')
      .limit(1);
      
    if (farmerError) {
      console.log('Error fetching farmer:', farmerError.message);
    } else if (farmers && farmers.length > 0) {
      const farmerId = farmers[0].id;
      console.log('Testing with farmer ID (should not have permission):', farmerId);
      
      const { data: data3, error: error3 } = await supabase.rpc('batch_approve_collector_collections', {
        p_staff_id: farmerId,
        p_collector_id: validStaffId,
        p_collection_date: '2025-11-18',
        p_default_received_liters: 199
      });
      
      if (error3) {
        console.log('Expected permission error:', error3.message);
      } else {
        console.log('Unexpected success with farmer as staff:', data3);
      }
    }
    
    console.log('\nTest completed. Check the error messages above to identify which ID is causing issues.');
    
  } catch (error) {
    console.error('Unexpected error during testing:', error);
  }
}

testBatchApprovalWithDetailedLogging();