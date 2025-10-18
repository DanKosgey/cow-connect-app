import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

interface Collection {
  id: string;
  farmer_id: string;
  total_amount: number;
  rate_per_liter: number;
  status: string;
}

interface FarmerPayment {
  id: string;
  farmer_id: string;
  collection_ids: string[];
  total_amount: number;
  approval_status: string;
  notes?: string;
}

export class PaymentService {
  // Direct payment method for admin (marks collection as paid immediately)
  static async markCollectionAsPaid(collectionId: string, farmerId: string, collection: Collection) {
    try {
      // First, check if there's an existing active payment batch or create one
      let batchId: string | null = null;
      const { data: existingBatch, error: batchError } = await supabase
        .from('payment_batches')
        .select('batch_id')
        .eq('status', 'Generated')
        .limit(1)
        .maybeSingle();

      if (batchError) {
        logger.errorWithContext('PaymentService - checking for existing batch', batchError);
      } else if (existingBatch) {
        batchId = existingBatch.batch_id;
      } else {
        // Create a new payment batch if none exists
        // Generate a human-readable batch identifier
        const batchName = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const displayName = `Payment Batch ${new Date().toISOString().slice(0, 10)}`;
        
        const { data: batchData, error: createBatchError } = await supabase
          .from('payment_batches')
          .insert({
            batch_id: batchName, // Use human-readable batch ID as text
            batch_name: displayName,
            period_start: new Date().toISOString().slice(0, 10),
            period_end: new Date().toISOString().slice(0, 10),
            status: 'Generated'
          })
          .select()
          .single();

        if (createBatchError) {
          logger.errorWithContext('PaymentService - creating new batch', createBatchError);
          // If there's a constraint violation, try to get an existing batch again
          const { data: fallbackBatch, error: fallbackError } = await supabase
            .from('payment_batches')
            .select('batch_id')
            .eq('status', 'Generated')
            .limit(1)
            .maybeSingle();
            
          if (fallbackError) {
            logger.errorWithContext('PaymentService - getting fallback batch', fallbackError);
          } else if (fallbackBatch) {
            batchId = fallbackBatch.batch_id;
          } else {
            // If we still can't get a batch, create a default one
            const defaultBatchName = `DEFAULT-BATCH-${Date.now()}`;
            const { data: defaultBatch, error: defaultBatchError } = await supabase
              .from('payment_batches')
              .insert({
                batch_id: defaultBatchName,
                batch_name: `Default Batch ${new Date().toISOString().slice(0, 10)}`,
                period_start: new Date().toISOString().slice(0, 10),
                period_end: new Date().toISOString().slice(0, 10),
                status: 'Generated'
              })
              .select()
              .single();
              
            if (defaultBatchError) {
              logger.errorWithContext('PaymentService - creating default batch', defaultBatchError);
              throw new Error('Unable to create or retrieve payment batch');
            } else {
              batchId = defaultBatch.batch_id;
            }
          }
        } else {
          batchId = batchData.batch_id;
        }
      }

      // Ensure we have a valid batchId before proceeding
      if (!batchId) {
        throw new Error('Unable to obtain valid batch ID for payment processing');
      }

      // Create payment record in the collection_payments table
      const { data: paymentData, error: paymentError } = await supabase
        .from('collection_payments')
        .insert({
          collection_id: collectionId,
          amount: collection.total_amount,
          rate_applied: collection.rate_per_liter,
          batch_id: batchId // Include the batch_id
        })
        .select()
        .limit(1);

      if (paymentError) {
        logger.errorWithContext('PaymentService - creating payment record', paymentError);
        throw paymentError;
      }
      
      // Update collection status to 'Paid'
      const { error: collectionError } = await supabase
        .from('collections')
        .update({ 
          status: 'Paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (collectionError) {
        logger.errorWithContext('PaymentService - updating collection status', collectionError);
        throw collectionError;
      }

      // Find and update any related farmer_payments records
      // First, find farmer_payments that include this collection
      const { data: relatedPayments, error: findPaymentsError } = await supabase
        .from('farmer_payments')
        .select('id, collection_ids, approval_status')
        .contains('collection_ids', [collectionId]);

      if (findPaymentsError) {
        logger.warn('Warning: Error finding related farmer payments', findPaymentsError);
      } else if (relatedPayments && relatedPayments.length > 0) {
        // Update all related farmer_payments to mark as approved (since 'paid' is not a valid enum value)
        for (const payment of relatedPayments) {
          // Only update if the payment is not already approved/paid
          if (payment.approval_status !== 'approved') {
            const { error: updatePaymentError } = await supabase
              .from('farmer_payments')
              .update({ 
                approval_status: 'approved',
                paid_at: new Date().toISOString()
              })
              .eq('id', payment.id);

            if (updatePaymentError) {
              logger.warn('Warning: Error updating farmer payment status', updatePaymentError);
            }
          }
        }
      }

      // Send notification
      if (farmerId) {
        try {
          // Get the user_id from the farmers table
          const { data: farmerData, error: farmerError } = await supabase
            .from('farmers')
            .select('user_id')
            .eq('id', farmerId)
            .maybeSingle();

          if (farmerError) {
            logger.warn('Warning: Failed to fetch farmer user_id', farmerError);
          } else if (farmerData && farmerData.user_id) {
            // Make the notification more unique by including timestamp
            const timestamp = new Date().toISOString();
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: farmerData.user_id, // Use the correct user_id from profiles table
                title: 'Payment Received',
                message: `Your payment of KES ${parseFloat(collection.total_amount?.toString() || '0').toFixed(2)} has been processed for collection ${collectionId.substring(0, 8)} at ${new Date().toLocaleTimeString()}`,
                type: 'payment',
                category: 'payment'
              });

            // Log notification error but don't fail the entire operation
            if (notificationError) {
              logger.warn('Warning: Failed to send payment notification', notificationError);
            }
          } else {
            logger.warn('Warning: Farmer user_id not found for farmerId', farmerId);
          }
        } catch (notificationException) {
          // Handle any exceptions during notification sending
          logger.warn('Warning: Exception while sending payment notification', notificationException);
        }
      }

      return { success: true, data: paymentData };
    } catch (error) {
      logger.errorWithContext('PaymentService - markCollectionAsPaid', error);
      return { success: false, error };
    }
  }

  // Approval workflow method for admins (creates payment record for approval)
  static async createPaymentForApproval(farmerId: string, collectionIds: string[], totalAmount: number, notes?: string, approvedBy?: string) {
    try {
      // First, get the staff ID from the staff table using the user ID
      let staffId = null;
      if (approvedBy) {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', approvedBy)
          .maybeSingle();
          
        if (staffError) {
          logger.errorWithContext('PaymentService - fetching staff data', staffError);
          throw staffError;
        }
        
        staffId = staffData?.id || null;
      }

      const { data, error } = await supabase
        .from('farmer_payments')
        .insert({
          farmer_id: farmerId,
          collection_ids: collectionIds,
          total_amount: totalAmount,
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: staffId, // Use the staff ID instead of user ID
          notes: notes || null
        })
        .select()
        .limit(1);

      if (error) {
        logger.errorWithContext('PaymentService - creating payment for approval', error);
        throw error;
      }
      
      // Update collections to mark them as approved for payment
      const { error: updateError } = await supabase
        .from('collections')
        .update({ 
          approved_for_payment: true,
          approved_at: new Date().toISOString(),
          approved_by: staffId // Use the staff ID instead of user ID
        })
        .in('id', collectionIds);

      if (updateError) {
        logger.errorWithContext('PaymentService - updating collections for approval', updateError);
        throw updateError;
      }

      return { success: true, data };
    } catch (error) {
      logger.errorWithContext('PaymentService - createPaymentForApproval', error);
      return { success: false, error };
    }
  }

  // Mark payment as paid (for admins to finalize approved payments)
  static async markPaymentAsPaid(paymentId: string, paidBy?: string) {
    try {
      // First, get the staff ID from the staff table using the user ID
      let staffId = null;
      if (paidBy) {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', paidBy)
          .maybeSingle();
          
        if (staffError) {
          logger.errorWithContext('PaymentService - fetching staff data for markPaymentAsPaid', staffError);
          throw staffError;
        }
        
        staffId = staffData?.id || null;
      }

      const { data, error } = await supabase
        .from('farmer_payments')
        .update({
          approval_status: 'approved', // Changed from 'paid' to 'approved' since 'paid' is not a valid enum value
          paid_at: new Date().toISOString(),
          paid_by: staffId // Use the staff ID instead of user ID
        })
        .eq('id', paymentId)
        .select()
        .limit(1);

      if (error) {
        logger.errorWithContext('PaymentService - marking payment as paid', error);
        throw error;
      }
      return { success: true, data };
    } catch (error) {
      logger.errorWithContext('PaymentService - markPaymentAsPaid', error);
      return { success: false, error };
    }
  }

  // Mark all payments for a farmer as paid
  static async markAllFarmerPaymentsAsPaid(farmerId: string, collections: Collection[]) {
    try {
      // Mark each collection as paid
      const results = await Promise.all(
        collections.map(collection => 
          this.markCollectionAsPaid(collection.id, farmerId, collection)
        )
      );
      
      // Check if all operations were successful
      const failedOperations = results.filter(result => !result.success);
      if (failedOperations.length > 0) {
        const error = new Error(`Failed to mark ${failedOperations.length} payments as paid`);
        logger.errorWithContext('PaymentService - markAllFarmerPaymentsAsPaid', error);
        throw error;
      }
      
      return { success: true, data: results };
    } catch (error) {
      logger.errorWithContext('PaymentService - markAllFarmerPaymentsAsPaid', error);
      return { success: false, error };
    }
  }

  // Get payment history for a farmer
  static async getFarmerPaymentHistory(farmerId: string) {
    try {
      const { data, error } = await supabase
        .from('farmer_payments')
        .select(`
          id,
          farmer_id,
          collection_ids,
          total_amount,
          approval_status,
          approved_at,
          paid_at,
          notes,
          created_at,
          farmers!farmer_payments_farmer_id_fkey (
            full_name,
            id,
            phone_number
          )
        `)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('PaymentService - fetching farmer payment history', error);
        throw error;
      }
      return { success: true, data };
    } catch (error) {
      logger.errorWithContext('PaymentService - getFarmerPaymentHistory', error);
      return { success: false, error };
    }
  }

  // Get all payments with status filter
  static async getAllPayments(status?: string) {
    try {
      let query = supabase
        .from('farmer_payments')
        .select(`
          id,
          farmer_id,
          collection_ids,
          total_amount,
          approval_status,
          approved_at,
          paid_at,
          notes,
          created_at,
          farmers!farmer_payments_farmer_id_fkey (
            full_name,
            id,
            phone_number
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('approval_status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.errorWithContext('PaymentService - fetching all payments', error);
        throw error;
      }
      return { success: true, data };
    } catch (error) {
      logger.errorWithContext('PaymentService - getAllPayments', error);
      return { success: false, error };
    }
  }
}