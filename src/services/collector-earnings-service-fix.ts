import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Mark a collector payment as paid
 * This function calls the database function that handles updating both the payment record
 * and the collection_fee_status for all collections in the payment period
 * 
 * @param paymentId - The ID of the collector payment to mark as paid
 * @returns boolean indicating success or failure
 */
export async function markPaymentAsPaid(paymentId: string): Promise<boolean> {
  try {
    // Call the database function that handles marking payments as paid
    const { data, error } = await supabase
      .rpc('robust_mark_payment_as_paid', {
        p_payment_id: paymentId
      });

    if (error) {
      logger.errorWithContext('CollectorEarningsService - markPaymentAsPaid RPC call failed', error);
      return false;
    }

    // The database function returns true/false for success
    return data === true;
  } catch (error) {
    logger.errorWithContext('CollectorEarningsService - markPaymentAsPaid exception', error);
    return false;
  }
}