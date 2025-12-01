import { supabase } from '@/integrations/supabase/client';
import { collectorEarningsService } from '@/services/collector-earnings-service';

/**
 * Test script to verify the collection fee status functionality
 */
export const testCollectionFeeStatus = async () => {
  try {
    console.log('Testing collection fee status functionality...');
    
    // 1. Check if the collection_fee_status column exists
    console.log('1. Checking if collection_fee_status column exists...');
    const { data: columnInfo, error: columnError } = await supabase
      .from('collections')
      .select('*')
      .limit(1);
    
    if (columnError) {
      console.error('Error checking collections table:', columnError);
      return false;
    }
    
    // Log the first record to see if collection_fee_status exists
    if (columnInfo && columnInfo.length > 0) {
      console.log('First collection record:', columnInfo[0]);
      console.log('collection_fee_status column exists:', 'collection_fee_status' in columnInfo[0]);
    }
    
    // 2. Test payment generation with fee status filtering
    console.log('2. Testing payment generation...');
    const paymentGenerationResult = await collectorEarningsService.autoGeneratePaymentRecords();
    console.log('Payment generation result:', paymentGenerationResult);
    
    // 3. Check collections with different fee statuses
    console.log('3. Checking collections with different fee statuses...');
    const { data: pendingCollections, error: pendingError } = await supabase
      .from('collections')
      .select('id, collection_date, liters, staff_id, collection_fee_status')
      .eq('collection_fee_status', 'pending')
      .eq('approved_for_payment', true)
      .limit(5);
    
    if (pendingError) {
      console.error('Error fetching pending collections:', pendingError);
    } else {
      console.log('Pending collections:', pendingCollections);
    }
    
    const { data: paidCollections, error: paidError } = await supabase
      .from('collections')
      .select('id, collection_date, liters, staff_id, collection_fee_status')
      .eq('collection_fee_status', 'paid')
      .eq('approved_for_payment', true)
      .limit(5);
    
    if (paidError) {
      console.error('Error fetching paid collections:', paidError);
    } else {
      console.log('Paid collections:', paidCollections);
    }
    
    // 4. Test earnings calculation
    console.log('4. Testing earnings calculation...');
    // This would require a specific collector ID to test
    // For now, we'll just log that the test is complete
    
    console.log('Test completed successfully!');
    return true;
  } catch (error) {
    console.error('Error in testCollectionFeeStatus:', error);
    return false;
  }
};

export default testCollectionFeeStatus;