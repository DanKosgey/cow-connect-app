import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { CreditService } from '@/services/credit-service';
import { CollectionNotificationService } from '@/services/collection-notification-service';
import { deductionService } from '@/services/deduction-service';
import { collectorRateService } from '@/services/collector-rate-service';

const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached data
function getCachedData(key: string) {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

// Helper function to set cached data
function setCachedData(key: string, data: any) {
  dataCache.set(key, { data, timestamp: Date.now() });
}

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

// Add performance monitoring utilities at the top of the file
const performanceMetrics = new Map<string, { totalTime: number; callCount: number; startTime?: number }>();

// Helper function to start timing an operation
function startTiming(operation: string) {
  const key = `${operation}_${Date.now()}_${Math.random()}`;
  performanceMetrics.set(key, { totalTime: 0, callCount: 0, startTime: Date.now() });
  return key;
}

// Helper function to end timing an operation
function endTiming(key: string) {
  const metric = performanceMetrics.get(key);
  if (metric && metric.startTime) {
    const elapsed = Date.now() - metric.startTime;
    performanceMetrics.set(key, { 
      totalTime: elapsed, 
      callCount: 1 
    });
    return elapsed;
  }
  return 0;
}

// Helper function to log performance metrics
function logPerformanceMetrics() {
  const metrics: any[] = [];
  performanceMetrics.forEach((value, key) => {
    metrics.push({ operation: key, totalTime: value.totalTime, callCount: value.callCount });
  });
  
  // Sort by totalTime descending
  metrics.sort((a, b) => b.totalTime - a.totalTime);
  
  logger.info('Performance Metrics:', metrics.slice(0, 10)); // Log top 10 slowest operations
}

export class PaymentService {
  // Direct payment method for admin (marks collection as paid immediately)
  // Optimized version that reduces redundant database calls
  static async markCollectionAsPaid(
    collectionId: string, 
    farmerId: string, 
    collection: Collection,
    sharedData?: {
      batchId?: string | null;
      collectorRate?: number;
      farmerDeductions?: number;
      farmerCreditInfo?: any;
      systemDeductions?: any[];
      farmerSpecificDeductions?: any[];
    }
  ) {
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

      // Use shared batchId or create a new one
      let batchId = sharedData?.batchId || null;
      if (!batchId) {
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
          const batchName = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          const displayName = `Payment Batch ${new Date().toISOString().slice(0, 10)}`;
          
          const { data: batchData, error: createBatchError } = await supabase
            .from('payment_batches')
            .insert([{
              batch_id: batchName.toString(),
              batch_name: displayName,
              period_start: new Date().toISOString().slice(0, 10),
              period_end: new Date().toISOString().slice(0, 10),
              status: 'Generated'
            }])
            .select()
            .single();

          if (createBatchError) {
            logger.errorWithContext('PaymentService - creating new batch', createBatchError);
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
              const defaultBatchName = `DEFAULT-BATCH-${Date.now()}`;
              const { data: defaultBatch, error: defaultBatchError } = await supabase
                .from('payment_batches')
                .insert([{
                  batch_id: defaultBatchName.toString(),
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
      }

      // Ensure we have a valid batchId before proceeding
      if (!batchId) {
        throw new Error('Unable to obtain valid batch ID for payment processing');
      }

      // Use shared data or fetch individually (with caching)
      const collectorRate = sharedData?.collectorRate ?? await this.getCachedCollectorRate();
      const creditInfo = sharedData?.farmerCreditInfo ?? await this.getCachedFarmerCreditInfo(farmerId);
      const totalDeductions = sharedData?.farmerDeductions ?? await this.getCachedFarmerDeductions(farmerId);
      
      const creditUsed = Math.min(creditInfo.availableCredit, collection.total_amount);
      const collectorFee = (collectionData.liters || 0) * collectorRate;
      const netPayment = collection.total_amount - creditUsed - totalDeductions - collectorFee;

      // Create deduction records for this payment if there are deductions
      if (totalDeductions > 0) {
        try {
          // Get the current admin user's ID
          const { data: { user } } = await supabase.auth.getUser();
          const appliedById = user?.id || null;

          // Use shared deduction data or fetch individually
          let systemDeductionsData;
          if (sharedData?.systemDeductions) {
            systemDeductionsData = sharedData.systemDeductions;
          } else {
            const result = await supabase
              .from('deduction_records')
              .select('*')
              .is('farmer_id', null);
            systemDeductionsData = result.data || [];
          }

          // Create deduction records for system-wide deductions in batch
          if (systemDeductionsData.length > 0) {
            const systemDeductionRecords = systemDeductionsData.map(deduction => ({
              deduction_type_id: deduction.deduction_type_id,
              farmer_id: farmerId,
              amount: deduction.amount,
              reason: `System deduction applied to collection ${collectionId}`,
              applied_by: appliedById
            }));

            const { error: createError } = await supabase
              .from('deduction_records')
              .insert(systemDeductionRecords);

            if (createError) {
              logger.warn('Warning: Failed to create system deduction records', createError);
            }
          }

          // Use shared farmer-specific deductions or fetch individually
          let farmerDeductionsData;
          if (sharedData?.farmerSpecificDeductions) {
            farmerDeductionsData = sharedData.farmerSpecificDeductions;
          } else {
            const result = await supabase
              .from('farmer_deductions')
              .select('*')
              .eq('farmer_id', farmerId)
              .eq('is_active', true);
            farmerDeductionsData = result.data || [];
          }

          // Create deduction records for farmer-specific deductions in batch
          if (farmerDeductionsData.length > 0) {
            const farmerDeductionRecords = farmerDeductionsData.map(deduction => ({
              deduction_type_id: deduction.deduction_type_id,
              farmer_id: farmerId,
              amount: deduction.amount,
              reason: `Farmer deduction applied to collection ${collectionId}`,
              applied_by: appliedById
            }));

            const { error: createError } = await supabase
              .from('deduction_records')
              .insert(farmerDeductionRecords);

            if (createError) {
              logger.warn('Warning: Failed to create farmer deduction records', createError);
            }
          }
        } catch (deductionCreationError) {
          logger.warn('Warning: Error creating deduction records', deductionCreationError);
        }
      }

      // Create payment record in the collection_payments table
      const { data: paymentData, error: paymentError } = await supabase
        .from('collection_payments')
        .insert([{
          collection_id: collectionId,
          amount: collection.total_amount,
          rate_applied: collection.rate_per_liter,
          batch_id: batchId,
          credit_used: creditUsed,
          net_payment: netPayment,
          collector_fee: collectorFee
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

      // Update credit requests settlement status to 'paid' for this farmer
      try {
        const { error: updateCreditRequestsError } = await supabase
          .from('credit_requests')
          .update({ 
            settlement_status: 'processed',
            updated_at: new Date().toISOString()
          })
          .eq('farmer_id', farmerId)
          .eq('status', 'approved')
          .eq('settlement_status', 'pending');

        if (updateCreditRequestsError) {
          logger.warn('Warning: Failed to update credit requests settlement status', updateCreditRequestsError);
        } else {
          logger.info(`Updated credit requests settlement status to 'processed' for farmer ${farmerId}`);
        }
      } catch (creditUpdateError) {
        logger.warn('Warning: Error updating credit requests settlement status', creditUpdateError);
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

      // If credit was used, update the farmer's credit profile
      if (creditUsed > 0) {
        // Get current credit profile record
        const { data: creditProfileData, error: creditProfileError } = await supabase
          .from('farmer_credit_profiles')
          .select('*')
          .eq('farmer_id', farmerId)
          .eq('is_frozen', false)
          .maybeSingle();

        if (creditProfileError) {
          logger.errorWithContext('PaymentService - fetching credit profile for deduction', creditProfileError);
          throw creditProfileError;
        }

        if (creditProfileData) {
          const creditProfileRecord = creditProfileData as any;
          
          logger.info(`PaymentService - updating credit profile for farmer`, {
            farmerId,
            collectionId,
            creditUsed,
            oldBalance: creditProfileRecord.current_credit_balance,
            oldPendingDeductions: creditProfileRecord.pending_deductions
          });

          // When a payment is made, we reduce the pending deductions
          const newPendingDeductions = Math.max(0, creditProfileRecord.pending_deductions - creditUsed);

          // Update credit profile
          const { error: updateError } = await supabase
            .from('farmer_credit_profiles')
            .update({
              pending_deductions: newPendingDeductions,
              updated_at: new Date().toISOString()
            })
            .eq('id', creditProfileRecord.id);

          if (updateError) {
            logger.errorWithContext('PaymentService - updating credit profile for deduction', updateError);
            throw updateError;
          }

          logger.info(`PaymentService - credit profile updated`, {
            farmerId,
            collectionId,
            creditUsed,
            newPendingDeductions
          });

          // Create credit transaction record for the deduction
          const { error: transactionError } = await supabase
            .from('credit_transactions')
            .insert([{
              farmer_id: farmerId,
              transaction_type: 'credit_repaid',
              amount: creditUsed,
              balance_before: creditProfileRecord.pending_deductions,
              balance_after: newPendingDeductions,
              reference_id: collectionId,
              description: `Credit deduction from payment of KES ${collection.total_amount.toFixed(2)}`
            }]);

          if (transactionError) {
            logger.warn('Warning: Failed to create credit deduction transaction', transactionError);
          }
        }
      }

      // Find and update any related farmer_payments records
      const { data: relatedPayments, error: findPaymentsError } = await supabase
        .from('farmer_payments')
        .select('id, collection_ids, approval_status')
        .contains('collection_ids', [collectionId]);

      if (findPaymentsError) {
        logger.warn('Warning: Error finding related farmer payments', findPaymentsError);
      } else if (relatedPayments && relatedPayments.length > 0) {
        // Prepare batch update for related farmer_payments
        const paymentsToUpdate = relatedPayments
          .filter(payment => payment.approval_status !== 'paid')
          .map(payment => payment.id);

        if (paymentsToUpdate.length > 0) {
          const { error: updatePaymentError } = await supabase
            .from('farmer_payments')
            .update({ 
              approval_status: 'paid',
              paid_at: new Date().toISOString(),
              credit_used: creditUsed,
              net_payment: netPayment,
              collector_fee: collectorFee
            })
            .in('id', paymentsToUpdate);

          if (updatePaymentError) {
            logger.warn('Warning: Error updating farmer payment statuses', updatePaymentError);
          }
        }
      }

      return { success: true, data: paymentData, batchId };
    } catch (error) {
      logger.errorWithContext('PaymentService - markCollectionAsPaid', error);
      return { success: false, error };
    }
  }

  // Create payment for approval (admin function to approve payments) - optimized version
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

      // First, get the profile ID from the profiles table using the user ID (admins are in profiles, not staff)
      let profileId = null;
      if (approvedBy) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', approvedBy)
          .maybeSingle();
          
        if (profileError) {
          logger.errorWithContext('PaymentService - fetching profile data', profileError);
          throw profileError;
        }
        
        profileId = profileData?.id || null;
      }

      // Perform all operations in parallel for better performance
      const [
        updateResult,
        collectorRateResult,
        creditInfoResult,
        farmerDeductionsResult
      ] = await Promise.all([
        // FIRST: Update collections to mark them as approved for payment
        supabase.from('collections').update({ 
          approved_for_payment: true,
          approved_by: profileId
        }).in('id', collectionIds),
        
        // SECOND: Get collector rate
        this.getCachedCollectorRate(),
        
        // THIRD: Get credit info
        this.getCachedFarmerCreditInfo(farmerId),
        
        // FOURTH: Get farmer deductions
        this.getCachedFarmerDeductions(farmerId)
      ]);

      // Check for errors in the update operation
      if (updateResult.error) {
        logger.errorWithContext('PaymentService - updating collections for approval', updateResult.error);
        throw updateResult.error;
      }

      // Calculate values using the results
      const collectorRate = collectorRateResult;
      const totalLiters = collectionsData?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
      const totalCollectorFee = totalLiters * collectorRate;
      
      const creditInfo = creditInfoResult;
      const creditUsed = Math.min(creditInfo.availableCredit, totalAmount);
      
      const totalDeductions = farmerDeductionsResult;
      const netPayment = totalAmount - creditUsed - totalDeductions - totalCollectorFee;

      // Create payment record in the farmer_payments table
      const { data, error } = await supabase
        .from('farmer_payments')
        .insert({
          farmer_id: farmerId,
          collection_ids: collectionIds,
          total_amount: totalAmount,
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profileId,
          notes: notes || null,
          credit_used: creditUsed,
          net_payment: netPayment,
          collector_fee: totalCollectorFee
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

  // Mark payment as paid (for admins to finalize approved payments) - optimized version
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
        .select('id, approved_for_payment, status, liters')
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

      // First, get the profile ID from the profiles table using the user ID (admins are in profiles, not staff)
      let profileId = null;
      if (paidBy) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', paidBy)
          .maybeSingle();
          
        if (profileError) {
          logger.errorWithContext('PaymentService - fetching profile data for markPaymentAsPaid', profileError);
          throw profileError;
        }
        
        profileId = profileData?.id || null;
      }

      // Fetch all required data in parallel (with caching)
      const [
        creditInfoResult,
        collectorRateResult,
        farmerDeductionsResult,
        systemDeductionsResult,
        farmerSpecificDeductionsResult
      ] = await Promise.all([
        this.getCachedFarmerCreditInfo(farmerId),
        this.getCachedCollectorRate(),
        this.getCachedFarmerDeductions(farmerId),
        supabase.from('deduction_records').select('*').is('farmer_id', null),
        supabase.from('farmer_deductions').select('*').eq('farmer_id', farmerId).eq('is_active', true)
      ]);

      // Calculate values using the results
      const creditInfo = creditInfoResult;
      const creditUsed = Math.min(creditInfo.availableCredit, totalAmount);
      
      const collectorRate = collectorRateResult;
      const totalLiters = collectionsData?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
      const totalCollectorFee = totalLiters * collectorRate;
      
      const totalDeductions = farmerDeductionsResult;
      const netPayment = totalAmount - creditUsed - totalDeductions - totalCollectorFee;

      // Get the current admin user's ID
      const { data: { user } } = await supabase.auth.getUser();
      const appliedById = user?.id || null;

      // Prepare all deduction records
      const deductionRecords = [];
      
      // Add system deduction records
      const systemDeductions = systemDeductionsResult.data || [];
      deductionRecords.push(...systemDeductions.map(deduction => ({
        deduction_type_id: deduction.deduction_type_id,
        farmer_id: farmerId,
        amount: deduction.amount,
        reason: `System deduction applied to payment ${paymentId}`,
        applied_by: profileId || appliedById
      })));

      // Add farmer-specific deduction records
      const farmerDeductions = farmerSpecificDeductionsResult.data || [];
      deductionRecords.push(...farmerDeductions.map(deduction => ({
        deduction_type_id: deduction.deduction_type_id,
        farmer_id: farmerId,
        amount: deduction.amount,
        reason: `Farmer deduction applied to payment ${paymentId}`,
        applied_by: profileId || appliedById
      })));

      // Perform all database operations in parallel
      const [
        updatePaymentResult,
        insertDeductionsResult,
        updateCollectionsResult,
        updateCreditRequestsResult,
        updateCreditProfileResult,
        insertCreditTransactionResult
      ] = await Promise.all([
        // Update payment record
        supabase.from('farmer_payments').update({
          approval_status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: profileId,
          credit_used: creditUsed,
          deductions_used: totalDeductions,
          collector_fee: totalCollectorFee,
          net_payment: netPayment
        }).eq('id', paymentId).select().limit(1),
        
        // Insert deduction records (if any)
        deductionRecords.length > 0 
          ? supabase.from('deduction_records').insert(deductionRecords)
          : Promise.resolve({ data: [], error: null }),
        
        // Update collections to mark them as paid
        supabase.from('collections').update({ 
          status: 'Paid',
          updated_at: new Date().toISOString()
        }).in('id', paymentData.collection_ids),
        
        // Update credit requests settlement status
        supabase.from('credit_requests').update({ 
          settlement_status: 'processed',
          updated_at: new Date().toISOString()
        }).eq('farmer_id', farmerId).eq('status', 'approved').eq('settlement_status', 'pending'),
        
        // Update credit profile if credit was used
        creditUsed > 0
          ? (async () => {
              const { data: creditProfileData, error: creditProfileError } = await supabase
                .from('farmer_credit_profiles')
                .select('*')
                .eq('farmer_id', farmerId)
                .eq('is_frozen', false)
                .maybeSingle();

              if (creditProfileError) {
                logger.errorWithContext('PaymentService - fetching credit profile for deduction', creditProfileError);
                throw creditProfileError;
              }

              if (creditProfileData) {
                const creditProfileRecord = creditProfileData as any;
                const newPendingDeductions = Math.max(0, creditProfileRecord.pending_deductions - creditUsed);

                const { error: updateError } = await supabase
                  .from('farmer_credit_profiles')
                  .update({
                    pending_deductions: newPendingDeductions,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', creditProfileRecord.id);

                return { error: updateError };
              }
              return { error: null };
            })()
          : Promise.resolve({ error: null }),
        
        // Insert credit transaction if credit was used
        creditUsed > 0
          ? supabase.from('credit_transactions').insert([{
              farmer_id: farmerId,
              transaction_type: 'credit_repaid',
              amount: creditUsed,
              balance_before: creditInfo.availableCredit,
              balance_after: Math.max(0, creditInfo.availableCredit - creditUsed),
              reference_id: paymentId,
              description: `Credit deduction from bulk payment of KES ${totalAmount.toFixed(2)}`
            }])
          : Promise.resolve({ data: [], error: null })
      ]);

      // Check for critical errors
      if (updatePaymentResult.error) {
        logger.errorWithContext('PaymentService - marking payment as paid', updatePaymentResult.error);
        throw updatePaymentResult.error;
      }

      if (updateCollectionsResult.error) {
        logger.errorWithContext('PaymentService - updating collections to paid', updateCollectionsResult.error);
        throw updateCollectionsResult.error;
      }

      // Handle non-critical errors
      if (insertDeductionsResult.error) {
        logger.warn('Warning: Failed to create deduction records', insertDeductionsResult.error);
      }

      if (updateCreditRequestsResult.error) {
        logger.warn('Warning: Failed to update credit requests settlement status', updateCreditRequestsResult.error);
      }

      if (updateCreditProfileResult.error) {
        logger.warn('Warning: Failed to update credit profile', updateCreditProfileResult.error);
      }

      if (insertCreditTransactionResult.error) {
        logger.warn('Warning: Failed to create credit transaction', insertCreditTransactionResult.error);
      }

      // Send notifications to farmer for each collection in parallel
      try {
        await Promise.allSettled(
          paymentData.collection_ids.map(collectionId =>
            CollectionNotificationService.sendCollectionPaidNotification(
              collectionId,
              farmerId,
              paidBy
            )
          )
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send payment notifications', notificationError);
      }

      return { success: true, data: updatePaymentResult.data };
    } catch (error) {
      logger.errorWithContext('PaymentService - markPaymentAsPaid', error);
      return { success: false, error };
    }
  }

  // Mark all payments for a farmer as paid
  static async markAllFarmerPaymentsAsPaid(farmerId: string, collections: Collection[]) {
    const perfKey = startTiming(`markAllFarmerPaymentsAsPaid_${farmerId}`);
    
    try {
      // Filter out collections that are not approved for payment
      const approvedCollections = collections.filter(c => c.approved_for_payment);
      
      if (approvedCollections.length === 0) {
        return { success: true, data: [], message: 'No approved collections to process' };
      }

      // Use batch processing for maximum efficiency
      const result = await this.batchProcessFarmerPayments(farmerId, collections);
      return result;
    } catch (error) {
      logger.errorWithContext('PaymentService - markAllFarmerPaymentsAsPaid', error);
      return { success: false, error };
    } finally {
      const elapsed = endTiming(perfKey);
      logger.info(`markAllFarmerPaymentsAsPaid for ${farmerId} took ${elapsed}ms for ${collections.length} collections`);
      logPerformanceMetrics();
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

  // Get credit limit for a farmer
  static async getCreditLimitForFarmer(farmerId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_frozen', false) // Using is_frozen = false instead of is_active = true
        .maybeSingle();

      if (error) {
        logger.errorWithContext('PaymentService - fetching credit limit for farmer', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.errorWithContext('PaymentService - getCreditLimitForFarmer', error);
      return null;
    }
  }

  // Update credit limit after payment
  static async updateCreditLimitAfterPayment(farmerId: string, creditUsed: number): Promise<boolean> {
    try {
      // Get current credit limit record
      const creditLimitRecord = await this.getCreditLimitForFarmer(farmerId);
      
      if (!creditLimitRecord) {
        logger.warn('No credit limit found for farmer', { farmerId });
        return false;
      }

      // Calculate new balance
      const newBalance = Math.max(0, creditLimitRecord.current_credit_balance - creditUsed);
      const newTotalUsed = creditLimitRecord.total_credit_used + creditUsed;

      // Update credit limit
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .update({
          current_credit_balance: newBalance,
          total_credit_used: newTotalUsed,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditLimitRecord.id);

      if (updateError) {
        logger.errorWithContext('PaymentService - updating credit limit after payment', updateError);
        return false;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('PaymentService - updateCreditLimitAfterPayment', error);
      return false;
    }
  }

  // Batch process all payments for a farmer - most efficient version
  static async batchProcessFarmerPayments(farmerId: string, collections: Collection[]) {
    try {
      // Filter out collections that are not approved for payment
      const approvedCollections = collections.filter(c => c.approved_for_payment);
      
      if (approvedCollections.length === 0) {
        return { success: true, data: [], message: 'No approved collections to process' };
      }

      // Pre-fetch all shared data in parallel (with caching)
      const [
        collectorRateResult, 
        farmerDeductionsResult, 
        farmerCreditInfoResult, 
        systemDeductionsResult, 
        farmerSpecificDeductionsResult,
        existingBatchResult
      ] = await Promise.all([
        this.getCachedCollectorRate(),
        this.getCachedFarmerDeductions(farmerId),
        this.getCachedFarmerCreditInfo(farmerId),
        supabase.from('deduction_records').select('*').is('farmer_id', null),
        supabase.from('farmer_deductions').select('*').eq('farmer_id', farmerId).eq('is_active', true),
        supabase.from('payment_batches').select('batch_id').eq('status', 'Generated').limit(1).maybeSingle()
      ]);

      const collectorRate = collectorRateResult;
      const totalDeductions = farmerDeductionsResult;
      const creditInfo = farmerCreditInfoResult;
      const systemDeductions = systemDeductionsResult.data || [];
      const farmerDeductions = farmerSpecificDeductionsResult.data || [];
      
      // Handle batch creation/retrieval
      let batchId: string | null = null;
      if (!existingBatchResult.error && existingBatchResult.data) {
        batchId = existingBatchResult.data.batch_id;
      } else {
        // Create a new payment batch
        const batchName = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const displayName = `Payment Batch ${new Date().toISOString().slice(0, 10)}`;
        
        const { data: batchData, error: createBatchError } = await supabase
          .from('payment_batches')
          .insert([{
            batch_id: batchName.toString(),
            batch_name: displayName,
            period_start: new Date().toISOString().slice(0, 10),
            period_end: new Date().toISOString().slice(0, 10),
            status: 'Generated'
          }])
          .select()
          .single();

        if (!createBatchError && batchData) {
          batchId = batchData.batch_id;
        }
      }

      if (!batchId) {
        throw new Error('Unable to obtain valid batch ID for payment processing');
      }

      // Get current admin user's ID
      const { data: { user } } = await supabase.auth.getUser();
      const appliedById = user?.id || null;

      // Prepare all data for batch operations
      const paymentRecords = [];
      const collectionUpdates = [];
      const creditTransactions = [];
      const farmerPaymentUpdates = [];
      
      // Calculate all values in advance
      const processedCollections = approvedCollections.map(collection => {
        const { data: collectionData } = collection as any;
        const creditUsed = Math.min(creditInfo.availableCredit, collection.total_amount);
        const collectorFee = (collectionData?.liters || 0) * collectorRate;
        const netPayment = collection.total_amount - creditUsed - totalDeductions - collectorFee;
        
        return {
          collection,
          collectionData,
          creditUsed,
          collectorFee,
          netPayment
        };
      });

      // Prepare batch data for all operations
      for (const processed of processedCollections) {
        const { collection, collectionData, creditUsed, collectorFee, netPayment } = processed;
        
        // Payment records
        paymentRecords.push({
          collection_id: collection.id,
          amount: collection.total_amount,
          rate_applied: collection.rate_per_liter,
          batch_id: batchId,
          credit_used: creditUsed,
          net_payment: netPayment,
          collector_fee: collectorFee
        });
        
        // Collection updates
        collectionUpdates.push({
          id: collection.id,
          status: 'Paid',
          updated_at: new Date().toISOString()
        });
        
        // Credit transactions (if credit was used)
        if (creditUsed > 0) {
          creditTransactions.push({
            farmer_id: farmerId,
            transaction_type: 'credit_repaid',
            amount: creditUsed,
            balance_before: creditInfo.availableCredit,
            balance_after: Math.max(0, creditInfo.availableCredit - creditUsed),
            reference_id: collection.id,
            description: `Credit deduction from payment of KES ${collection.total_amount.toFixed(2)}`
          });
        }
      }

      // Execute all batch operations in parallel
      const batchResults = await Promise.allSettled([
        // Insert all payment records
        supabase.from('collection_payments').insert(paymentRecords),
        
        // Update all collections
        supabase.from('collections').upsert(collectionUpdates, { onConflict: 'id' }),
        
        // Insert all credit transactions (if any)
        creditTransactions.length > 0 
          ? supabase.from('credit_transactions').insert(creditTransactions)
          : Promise.resolve({ data: [], error: null }),
        
        // Update credit requests settlement status
        supabase.from('credit_requests')
          .update({ 
            settlement_status: 'processed',
            updated_at: new Date().toISOString()
          })
          .eq('farmer_id', farmerId)
          .eq('status', 'approved')
          .eq('settlement_status', 'pending'),
        
        // Create system deduction records (if any)
        systemDeductions.length > 0
          ? supabase.from('deduction_records').insert(
              systemDeductions.map(deduction => ({
                deduction_type_id: deduction.deduction_type_id,
                farmer_id: farmerId,
                amount: deduction.amount,
                reason: `System deduction applied to batch payment`,
                applied_by: appliedById
              }))
            )
          : Promise.resolve({ data: [], error: null }),
          
        // Create farmer-specific deduction records (if any)
        farmerDeductions.length > 0
          ? supabase.from('deduction_records').insert(
              farmerDeductions.map(deduction => ({
                deduction_type_id: deduction.deduction_type_id,
                farmer_id: farmerId,
                amount: deduction.amount,
                reason: `Farmer deduction applied to batch payment`,
                applied_by: appliedById
              }))
            )
          : Promise.resolve({ data: [], error: null })
      ]);

      // Handle any errors from batch operations
      const errors = batchResults
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.status === 'fulfilled' && result.value.error)
        .map(({ result, index }) => ({
          operation: ['payment_records', 'collection_updates', 'credit_transactions', 'credit_requests', 'system_deductions', 'farmer_deductions'][index],
          error: (result as PromiseFulfilledResult<any>).value.error
        }));

      if (errors.length > 0) {
        logger.warn('Some batch operations failed', { errors });
      }

      // Send notifications in parallel
      try {
        await Promise.allSettled(
          approvedCollections.map(collection => 
            CollectionNotificationService.sendCollectionPaidNotification(
              collection.id,
              farmerId
            )
          )
        );
      } catch (notificationError) {
        logger.warn('Warning: Some payment notifications failed', notificationError);
      }

      return { 
        success: true, 
        data: processedCollections,
        message: `Processed ${approvedCollections.length} payments successfully`
      };
    } catch (error) {
      logger.errorWithContext('PaymentService - batchProcessFarmerPayments', error);
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
            collection,
            undefined // Pass undefined for sharedData parameter
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

  // Cached version of collector rate getter
  static async getCachedCollectorRate() {
    const cacheKey = 'collector_rate';
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    
    const rate = await collectorRateService.getCurrentRate();
    setCachedData(cacheKey, rate);
    return rate;
  }

  // Cached version of farmer credit info getter
  static async getCachedFarmerCreditInfo(farmerId: string) {
    const cacheKey = `farmer_credit_${farmerId}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    
    const creditInfo = await CreditService.calculateAvailableCredit(farmerId);
    setCachedData(cacheKey, creditInfo);
    return creditInfo;
  }

  // Cached version of farmer deductions getter
  static async getCachedFarmerDeductions(farmerId: string) {
    const cacheKey = `farmer_deductions_${farmerId}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    
    const deductions = await deductionService.calculateTotalDeductionsForFarmer(farmerId);
    setCachedData(cacheKey, deductions);
    return deductions;
  }

}
