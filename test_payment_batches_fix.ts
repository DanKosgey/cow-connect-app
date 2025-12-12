import { supabase } from '@/integrations/supabase/client';

async function testPaymentBatchesTable() {
  console.log('Testing payment_batches table creation...');
  
  try {
    // Test 1: Check if payment_batches table exists by querying it
    const { data, error } = await supabase
      .from('payment_batches')
      .select('count()')
      .limit(1);
      
    if (error) {
      console.error('Error accessing payment_batches table:', error);
      return false;
    }
    
    console.log('✓ Successfully accessed payment_batches table');
    
    // Test 2: Try to insert a test record
    const testBatchId = `TEST-BATCH-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('payment_batches')
      .insert([{
        batch_id: testBatchId,
        batch_name: 'Test Batch',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        status: 'Generated'
      }])
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting into payment_batches table:', insertError);
      return false;
    }
    
    console.log('✓ Successfully inserted test record into payment_batches table');
    
    // Test 3: Clean up the test record
    const { error: deleteError } = await supabase
      .from('payment_batches')
      .delete()
      .eq('batch_id', testBatchId);
      
    if (deleteError) {
      console.warn('Warning: Could not clean up test record:', deleteError);
    } else {
      console.log('✓ Successfully cleaned up test record');
    }
    
    console.log('✅ All tests passed! payment_batches table is working correctly.');
    return true;
    
  } catch (err) {
    console.error('Unexpected error during testing:', err);
    return false;
  }
}

// Run the test
testPaymentBatchesTable().then(success => {
  if (success) {
    console.log('🎉 Payment batches fix verification completed successfully!');
  } else {
    console.log('❌ Payment batches fix verification failed.');
  }
});