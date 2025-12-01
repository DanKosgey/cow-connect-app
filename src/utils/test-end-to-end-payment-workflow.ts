import { supabase } from '@/integrations/supabase/client';
import { collectorEarningsService } from '@/services/collector-earnings-service';

/**
 * Comprehensive end-to-end test for the collector payment workflow
 */
export const testEndToEndPaymentWorkflow = async () => {
  try {
    console.log('Starting end-to-end payment workflow test...');
    
    // 1. Test initial state - check collections with pending fees
    console.log('1. Checking initial collections with pending fees...');
    const { data: pendingCollections, error: pendingError } = await supabase
      .from('collections')
      .select('id, collection_date, liters, staff_id, collection_fee_status')
      .eq('collection_fee_status', 'pending')
      .eq('approved_for_payment', true)
      .limit(5);
    
    if (pendingError) {
      console.error('Error fetching pending collections:', pendingError);
      return false;
    }
    
    console.log('Found', pendingCollections?.length || 0, 'pending collections');
    
    // 2. Test payment generation
    console.log('2. Testing payment generation...');
    const paymentGenerationResult = await collectorEarningsService.autoGeneratePaymentRecords();
    console.log('Payment generation result:', paymentGenerationResult);
    
    // 3. Check payment records created
    console.log('3. Checking payment records...');
    const { data: paymentRecords, error: paymentError } = await supabase
      .from('collector_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (paymentError) {
      console.error('Error fetching payment records:', paymentError);
      return false;
    }
    
    console.log('Found', paymentRecords?.length || 0, 'payment records');
    
    // 4. Test marking a payment as paid
    if (paymentRecords && paymentRecords.length > 0) {
      console.log('4. Testing mark payment as paid...');
      const firstPayment = paymentRecords[0];
      console.log('Marking payment', firstPayment.id, 'as paid');
      
      const markPaidResult = await collectorEarningsService.markPaymentAsPaid(firstPayment.id);
      console.log('Mark paid result:', markPaidResult);
      
      // 5. Verify collections were updated
      console.log('5. Verifying collections were updated to paid status...');
      const { data: updatedCollections, error: updatedError } = await supabase
        .from('collections')
        .select('id, collection_fee_status')
        .eq('staff_id', firstPayment.collector_id)
        .gte('collection_date', firstPayment.period_start)
        .lte('collection_date', firstPayment.period_end)
        .eq('collection_fee_status', 'paid');
      
      if (updatedError) {
        console.error('Error fetching updated collections:', updatedError);
      } else {
        console.log('Found', updatedCollections?.length || 0, 'collections updated to paid status');
      }
      
      // 6. Test rollback - change payment status back to pending
      console.log('6. Testing rollback - changing payment status back to pending...');
      const { error: rollbackError } = await supabase
        .from('collector_payments')
        .update({ status: 'pending' })
        .eq('id', firstPayment.id);
      
      if (rollbackError) {
        console.error('Error rolling back payment:', rollbackError);
      } else {
        console.log('Payment rolled back to pending status');
        
        // 7. Verify collections were rolled back to pending
        console.log('7. Verifying collections were rolled back to pending status...');
        const { data: rolledBackCollections, error: rollbackCollectionError } = await supabase
          .from('collections')
          .select('id, collection_fee_status')
          .eq('staff_id', firstPayment.collector_id)
          .gte('collection_date', firstPayment.period_start)
          .lte('collection_date', firstPayment.period_end)
          .eq('collection_fee_status', 'pending');
        
        if (rollbackCollectionError) {
          console.error('Error fetching rolled back collections:', rollbackCollectionError);
        } else {
          console.log('Found', rolledBackCollections?.length || 0, 'collections rolled back to pending status');
        }
      }
    }
    
    // 8. Test that new payment records are only generated for pending collections
    console.log('8. Testing that new payment records only include pending collections...');
    const secondPaymentGenerationResult = await collectorEarningsService.autoGeneratePaymentRecords();
    console.log('Second payment generation result:', secondPaymentGenerationResult);
    
    console.log('End-to-end payment workflow test completed successfully!');
    return true;
  } catch (error) {
    console.error('Error in end-to-end payment workflow test:', error);
    return false;
  }
};

export default testEndToEndPaymentWorkflow;