import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { CreditService } from '@/services/credit-service';
import { CollectionNotificationService } from '@/services/collection-notification-service';
import { deductionService } from '@/services/deduction-service';
import { collectorRateService } from '@/services/collector-rate-service';

interface Collection {
  id: string;
  farmer_id: string;
  total_amount: number;
  rate_per_liter: number;
  status: string;
  approved_for_payment?: boolean; // Add this property
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
      // First, verify that the collection is approved for payment
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('id, approved_for_payment, status, liters, staff_id')
        .eq('id', collectionId)
        .maybeSingle();

      if (collectionError) {
        logger.errorWithContext('PaymentService - fetching collection for verification', collectionError);
        throw collectionError;
      }

      if (!collectionData) {
        throw new Error(`Collection ${collectionId} not found`);
      }

      // Check if collection is approved for payment
      if (!collectionData.approved_for_payment) {
        logger.errorWithContext('PaymentService - collection not approved for payment', { collectionId });
        throw new Error(`Collection ${collectionId} is not approved for payment`);
      }

      // Check if collection is already paid
      if (collectionData.status === 'Paid') {
        logger.errorWithContext('PaymentService - collection already paid', { collectionId });
        throw new Error(`Collection ${collectionId} is already marked as paid`);
      }

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
          .insert([{
            batch_id: batchName.toString(), // Explicitly cast to string
            batch_name: displayName,
            period_start: new Date().toISOString().slice(0, 10),
            period_end: new Date().toISOString().slice(0, 10),
            status: 'Generated'
          }])
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
              .insert([{
                batch_id: defaultBatchName.toString(), // Explicitly cast to string
                batch_name: `Default Batch ${new Date().toISOString().slice(0, 10)}`,
                period_start: new Date().toISOString().slice(0, 10),
                period_end: new Date().toISOString().slice(0, 10),
                status: 'Generated'
              }])
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

      // Calculate collector fee deduction for this payment
      const collectorRate = await collectorRateService.getCurrentRate();
      const collectorFee = (collectionData.liters || 0) * collectorRate;
      
      // Calculate credit deduction for this payment
      const creditInfo = await CreditService.calculateAvailableCredit(farmerId);
      const creditUsed = Math.min(creditInfo.availableCredit, collection.total_amount);
      const netPayment = collection.total_amount - creditUsed - collectorFee;

      // Create payment record in the collection_payments table
      const { data: paymentData, error: paymentError } = await supabase
        .from('collection_payments')
        .insert([{
          collection_id: collectionId,
          amount: collection.total_amount,
          rate_applied: collection.rate_per_liter,
          batch_id: batchId, // Include the batch_id
          credit_used: creditUsed,
          net_payment: netPayment,
          collector_fee: collectorFee // Add collector fee to the payment record
        }])
        .select()
        .limit(1);

      if (paymentError) {
        logger.errorWithContext('PaymentService - creating payment record', paymentError);
        throw paymentError;
      }
      
      // Update collection status to 'Paid'
      const { error: updateCollectionError } = await supabase
        .from('collections')
        .update({ 
          status: 'Paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (updateCollectionError) {
        logger.errorWithContext('PaymentService - updating collection status', updateCollectionError);
        throw updateCollectionError;
      }

      // Send notification to farmer
      try {
        await CollectionNotificationService.sendCollectionPaidNotification(
          collectionId,
          farmerId
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send payment notification', notificationError);
      }

      // If credit was used, deduct it from the farmer's credit balance
      if (creditUsed > 0) {
        // Get current credit limit record
        const { data: creditLimitData, error: creditLimitError } = await supabase
          .from('farmer_credit_limits')
          .select('*')
          .eq('farmer_id', farmerId)
          .eq('is_active', true)
          .maybeSingle();

        if (creditLimitError) {
          logger.errorWithContext('PaymentService - fetching credit limit for deduction', creditLimitError);
          throw creditLimitError;
        }

        if (creditLimitData) {
          const creditLimitRecord = creditLimitData as any;
          
          // Calculate new balance
          const newBalance = Math.max(0, creditLimitRecord.current_credit_balance - creditUsed);
          const newTotalUsed = creditLimitRecord.total_credit_used + creditUsed;

          // Update credit limit
          const { error: updateError } = await supabase
            .from('farmer_credit_limits')
            .update({
              current_credit_balance: newBalance,
              total_credit_used: newTotalUsed,
              updated_at: new Date().toISOString()
            })
            .eq('id', creditLimitRecord.id);

          if (updateError) {
            logger.errorWithContext('PaymentService - updating credit limit for deduction', updateError);
            throw updateError;
          }

          // Create credit transaction record for the deduction
          const { error: transactionError } = await supabase
            .from('farmer_credit_transactions')
            .insert([{
              farmer_id: farmerId,
              transaction_type: 'credit_repaid',
              amount: creditUsed,
              balance_after: newBalance,
              reference_type: 'payment_deduction',
              reference_id: collectionId,
              description: `Credit used to offset payment of KES ${collection.total_amount.toFixed(2)}`
            }]);

          if (transactionError) {
            logger.warn('Warning: Failed to create credit deduction transaction', transactionError);
          }
        }
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
        // Update all related farmer_payments to mark as paid
        for (const payment of relatedPayments) {
          // Only update if the payment is not already paid
          if (payment.approval_status !== 'paid') {
            const { error: updatePaymentError } = await supabase
              .from('farmer_payments')
              .update({ 
                approval_status: 'paid',
                paid_at: new Date().toISOString(),
                credit_used: creditUsed,
                net_payment: netPayment,
                collector_fee: collectorFee // Add collector fee to farmer payment record
              })
              .eq('id', payment.id);

            if (updatePaymentError) {
              logger.warn('Warning: Error updating farmer payment status', updatePaymentError);
            }
          }
        }
      }

      return { success: true, data: paymentData };
    } catch (error) {
      logger.errorWithContext('PaymentService - markCollectionAsPaid', error);
      return { success: false, error };
    }
  }

  // Create payment for approval (admin function to approve payments)
  static async createPaymentForApproval(
    farmerId: string, 
    collectionIds: string[], 
    totalAmount: number, 
    notes?: string,
    approvedBy?: string
  ) {
    try {
      // First, verify that all collections exist and get their current status
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('id, approved_for_payment, status, liters')
        .in('id', collectionIds);

      if (collectionsError) {
        logger.errorWithContext('PaymentService - fetching collections for verification', collectionsError);
        throw collectionsError;
      }

      // Check if any collections are already paid
      const paidCollections = collectionsData?.filter(c => c.status === 'Paid') || [];
      if (paidCollections.length > 0) {
        const paidIds = paidCollections.map(c => c.id).join(', ');
        logger.errorWithContext('PaymentService - paid collections found', { paidIds });
        throw new Error(`Collections ${paidIds} are already marked as paid`);
      }

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

      // FIRST: Update collections to mark them as approved for payment
      // This must be done before creating payment records due to database constraints
      const { error: updateError } = await supabase
        .from('collections')
        .update({ 
          approved_for_payment: true,
          approved_by: staffId // Use the staff ID instead of user ID
        })
        .in('id', collectionIds);

      if (updateError) {
        logger.errorWithContext('PaymentService - updating collections for approval', updateError);
        throw updateError;
      }

      // SECOND: Calculate collector fee deduction for these payments
      const collectorRate = await collectorRateService.getCurrentRate();
      const totalLiters = collectionsData?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
      const totalCollectorFee = totalLiters * collectorRate;
      
      // THIRD: Calculate credit deduction for this payment
      const creditInfo = await CreditService.calculateAvailableCredit(farmerId);
      const creditUsed = Math.min(creditInfo.availableCredit, totalAmount);
      const netPayment = totalAmount - creditUsed - totalCollectorFee;

      // FOURTH: Create payment record in the farmer_payments table
      const { data, error } = await supabase
        .from('farmer_payments')
        .insert({
          farmer_id: farmerId,
          collection_ids: collectionIds,
          total_amount: totalAmount,
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: staffId, // Use the staff ID instead of user ID
          notes: notes || null,
          credit_used: creditUsed,
          net_payment: netPayment,
          collector_fee: totalCollectorFee // Add collector fee to the payment record
        })
        .select()
        .limit(1);

      if (error) {
        logger.errorWithContext('PaymentService - creating payment for approval', error);
        throw error;
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
      // Get the payment details to calculate credit deduction
      const { data: paymentData, error: fetchError } = await supabase
        .from('farmer_payments')
        .select('farmer_id, total_amount, collection_ids')
        .eq('id', paymentId)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('PaymentService - fetching payment data', fetchError);
        throw fetchError;
      }

      if (!paymentData) {
        throw new Error('Payment not found');
      }

      // Verify that all collections associated with this payment are approved for payment
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('id, approved_for_payment, status')
        .in('id', paymentData.collection_ids);

      if (collectionsError) {
        logger.errorWithContext('PaymentService - fetching collections for verification', collectionsError);
        throw collectionsError;
      }

      // Check if all collections are approved for payment
      const unapprovedCollections = collectionsData?.filter(c => !c.approved_for_payment) || [];
      if (unapprovedCollections.length > 0) {
        const unapprovedIds = unapprovedCollections.map(c => c.id).join(', ');
        logger.errorWithContext('PaymentService - unapproved collections found', { unapprovedIds });
        throw new Error(`Collections ${unapprovedIds} are not approved for payment`);
      }

      // Check if any collections are already paid
      const paidCollections = collectionsData?.filter(c => c.status === 'Paid') || [];
      if (paidCollections.length > 0) {
        const paidIds = paidCollections.map(c => c.id).join(', ');
        logger.warn('PaymentService - collections already paid', { paidIds });
        // This is just a warning, not an error, as we might be reprocessing
      }

      const farmerId = paymentData.farmer_id;
      const totalAmount = paymentData.total_amount;

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

      // Calculate credit deduction for this payment
      const creditInfo = await CreditService.calculateAvailableCredit(farmerId);
      const creditUsed = Math.min(creditInfo.availableCredit, totalAmount);
      
      // Calculate deduction amounts for this farmer
      const totalDeductions = await deductionService.calculateTotalDeductionsForFarmer(farmerId);
      const netPayment = totalAmount - creditUsed - totalDeductions;

      const { data, error } = await supabase
        .from('farmer_payments')
        .update({
          approval_status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: staffId, // Use the staff ID instead of user ID
          credit_used: creditUsed,
          deductions_used: totalDeductions,
          net_payment: netPayment
        })
        .eq('id', paymentId)
        .select()
        .limit(1);

      if (error) {
        logger.errorWithContext('PaymentService - marking payment as paid', error);
        throw error;
      }

      // If credit was used, deduct it from the farmer's credit balance
      if (creditUsed > 0) {
        // Get current credit limit record
        const { data: creditLimitData, error: creditLimitError } = await supabase
          .from('farmer_credit_limits')
          .select('*')
          .eq('farmer_id', farmerId)
          .eq('is_active', true)
          .maybeSingle();

        if (creditLimitError) {
          logger.errorWithContext('PaymentService - fetching credit limit for deduction', creditLimitError);
          throw creditLimitError;
        }

        if (creditLimitData) {
          const creditLimitRecord = creditLimitData as any;
          
          // Calculate new balance
          const newBalance = Math.max(0, creditLimitRecord.current_credit_balance - creditUsed);
          const newTotalUsed = creditLimitRecord.total_credit_used + creditUsed;

          // Update credit limit
          const { error: updateError } = await supabase
            .from('farmer_credit_limits')
            .update({
              current_credit_balance: newBalance,
              total_credit_used: newTotalUsed,
              updated_at: new Date().toISOString()
            })
            .eq('id', creditLimitRecord.id);

          if (updateError) {
            logger.errorWithContext('PaymentService - updating credit limit for deduction', updateError);
            throw updateError;
          }

          // Create credit transaction record for the deduction
          const { error: transactionError } = await supabase
            .from('farmer_credit_transactions')
            .insert({
              farmer_id: farmerId,
              transaction_type: 'credit_repaid',
              amount: creditUsed,
              balance_after: newBalance,
              reference_type: 'payment_deduction',
              reference_id: paymentId,
              description: `Credit used to offset bulk payment of KES ${totalAmount.toFixed(2)}`
            });

          if (transactionError) {
            logger.warn('Warning: Failed to create credit deduction transaction', transactionError);
          }
        }
      }

      // Update collections to mark them as paid
      const { error: updateCollectionsError } = await supabase
        .from('collections')
        .update({ 
          status: 'Paid',
          updated_at: new Date().toISOString()
        })
        .in('id', paymentData.collection_ids);

      if (updateCollectionsError) {
        logger.errorWithContext('PaymentService - updating collections to paid', updateCollectionsError);
        throw updateCollectionsError;
      }

      // Send notifications to farmer for each collection
      try {
        for (const collectionId of paymentData.collection_ids) {
          await CollectionNotificationService.sendCollectionPaidNotification(
            collectionId,
            farmerId,
            paidBy
          );
        }
      } catch (notificationError) {
        logger.warn('Warning: Failed to send payment notifications', notificationError);
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
      // Filter out collections that are not approved for payment
      const approvedCollections = collections.filter(c => c.approved_for_payment);
      
      if (approvedCollections.length === 0) {
        return { success: true, data: [], message: 'No approved collections to process' };
      }

      // Process each approved collection with better error handling
      const results = await Promise.allSettled(
        approvedCollections.map(collection => 
          this.markCollectionAsPaid(collection.id, farmerId, collection)
        )
      );
      
      // Separate successful and failed operations
      const successfulOperations = results
        .map((result, index) => ({ result, collection: approvedCollections[index] }))
        .filter(({ result }) => result.status === 'fulfilled')
        .map(({ collection }) => collection);
        
      const failedOperations = results
        .map((result, index) => ({ result, collection: approvedCollections[index] }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ collection, result }) => ({
          collectionId: collection.id,
          error: result.status === 'rejected' ? result.reason : null
        }));

      // Log warnings for failed operations
      if (failedOperations.length > 0) {
        logger.warn('Some collections failed to be marked as paid', { 
          failedCount: failedOperations.length,
          totalCount: approvedCollections.length,
          failedOperations
        });
      }

      return { 
        success: true, 
        data: successfulOperations,
        failedOperations,
        message: `${successfulOperations.length} payments processed successfully, ${failedOperations.length} failed`
      };
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
          credit_used,
          net_payment,
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
          credit_used,
          net_payment,
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

  // Calculate net payment including credit deductions
  static async calculateNetPayment(farmerId: string, collections: any[]) {
    try {
      // Calculate total pending payments from collections
      const totalPending = collections.reduce((sum, collection) => 
        sum + (collection.total_amount || 0), 0);

      // Get credit information for the farmer
      const creditInfo = await CreditService.calculateAvailableCredit(farmerId);
      const creditUsed = Math.min(creditInfo.availableCredit, totalPending);

      // Calculate net payment (total pending - credit used)
      const netPayment = totalPending - creditUsed;

      return {
        totalPending: parseFloat(totalPending.toFixed(2)),
        creditUsed: parseFloat(creditUsed.toFixed(2)),
        netPayment: parseFloat(netPayment.toFixed(2)),
        creditInfo
      };
    } catch (error) {
      logger.errorWithContext('PaymentService - calculateNetPayment', error);
      return { 
        totalPending: 0, 
        creditUsed: 0, 
        netPayment: 0,
        creditInfo: null,
        error 
      };
    }
  }

  // Get detailed payment statement for a farmer
  static async getFarmerPaymentStatement(farmerId: string) {
    try {
      // Get pending collections
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmerId)
        .neq('status', 'Paid');

      if (collectionsError) {
        logger.errorWithContext('PaymentService - fetching pending collections', collectionsError);
        throw collectionsError;
      }

      // Calculate payment details
      const paymentDetails = await this.calculateNetPayment(farmerId, pendingCollections || []);

      // Get credit history
      const creditHistory = await CreditService.getCreditHistory(farmerId);

      // Get agrovet purchase history
      const purchaseHistory = await CreditService.getPurchaseHistory(farmerId);

      return {
        success: true,
        data: {
          collections: pendingCollections,
          paymentDetails,
          creditHistory,
          purchaseHistory
        }
      };
    } catch (error) {
      logger.errorWithContext('PaymentService - getFarmerPaymentStatement', error);
      return { success: false, error };
    }
  }

  // Batch deduct collector fees from multiple collections
  static async batchDeductCollectorFees(collections: Collection[]) {
    try {
      if (collections.length === 0) {
        return { success: true, processed: 0, skipped: 0, errors: [] };
      }

      // Get current collector rate
      const collectorRate = await collectorRateService.getCurrentRate();
      
      if (collectorRate <= 0) {
        throw new Error('Invalid collector rate. Please set a valid collector rate first.');
      }

      // Process each collection
      let processed = 0;
      let skipped = 0;
      const errors: { collectionId: string; error: string }[] = [];
      
      for (const collection of collections) {
        try {
          // Skip collections that are not approved for payment or already paid
          if (!collection.approved_for_payment || collection.status === 'Paid') {
            skipped++;
            continue;
          }
          
          const result = await this.markCollectionAsPaid(
            collection.id, 
            collection.farmer_id, 
            collection
          );
          
          if (result.success) {
            processed++;
          } else {
            errors.push({ 
              collectionId: collection.id, 
              error: result.error?.message || 'Unknown error' 
            });
          }
        } catch (error: any) {
          errors.push({ 
            collectionId: collection.id, 
            error: error.message || 'Unknown error' 
          });
        }
      }
      
      return { 
        success: errors.length === 0, 
        processed, 
        skipped, 
        errors,
        total: collections.length
      };
    } catch (error) {
      logger.errorWithContext('PaymentService - batchDeductCollectorFees', error);
      return { 
        success: false, 
        processed: 0, 
        skipped: 0, 
        errors: [{ collectionId: 'N/A', error: error?.message || 'Unknown error' }],
        total: collections.length
      };
    }
  }

}
