import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreditService } from '@/services/credit-service';
import { logger } from '@/utils/logger';

// Define interfaces for our data structures
interface PaymentBatch {
  batch_id: string;
  batch_name: string;
  period_start: string;
  period_end: string;
  total_farmers: number;
  total_collections: number;
  total_amount: number;
  status: string;
  created_at: string;
  processed_at: string;
  completed_at: string;
  total_credit_used?: number;
  total_net_payment?: number;
}

interface BatchCollection {
  id: string;
  collection_id: string;
  farmer_name: string;
  farmer_phone: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  status: string;
  credit_used?: number;
  net_payment?: number;
}

// Cache keys for different data types
export const PAYMENT_BATCH_CACHE_KEYS = {
  BATCHES: 'payment-batches',
  BATCH_COLLECTIONS: 'batch-collections'
};

// Main hook for Payment Batch Management data
export const usePaymentBatchData = () => {
  const queryClient = useQueryClient();

  // Get all payment batches
  const usePaymentBatches = () => {
    return useQuery<PaymentBatch[]>({
      queryKey: [PAYMENT_BATCH_CACHE_KEYS.BATCHES],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payment_batches')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get collections for a specific batch
  const useBatchCollections = (batchId: string) => {
    return useQuery<BatchCollection[]>({
      queryKey: [PAYMENT_BATCH_CACHE_KEYS.BATCH_COLLECTIONS, batchId],
      queryFn: async () => {
        if (!batchId) return [];

        const { data, error } = await supabase
          .from('collection_payments')
          .select(`
            id,
            collection_id,
            amount,
            rate_applied,
            credit_used,
            net_payment,
            collections (
              id,
              collection_id,
              liters,
              rate_per_liter,
              total_amount,
              status,
              collection_date,
              farmers (
                profiles (
                  full_name,
                  phone
                )
              )
            )
          `)
          .eq('batch_id', batchId);

        if (error) throw error;

        const collections = data?.map(item => ({
          id: item.id,
          collection_id: item.collections?.collection_id || '',
          farmer_name: item.collections?.farmers?.profiles?.full_name || 'Unknown Farmer',
          farmer_phone: item.collections?.farmers?.profiles?.phone || 'No phone',
          liters: item.collections?.liters || 0,
          rate_per_liter: item.collections?.rate_per_liter || 0,
          total_amount: item.collections?.total_amount || 0,
          status: item.collections?.status || 'Unknown',
          credit_used: item.credit_used || 0,
          net_payment: item.net_payment || (item.collections?.total_amount || 0)
        })) || [];

        return collections;
      },
      enabled: !!batchId,
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Create new payment batch
  const createPaymentBatchMutation = useMutation({
    mutationFn: async ({ start, end }: { start: string; end: string }) => {
      // Generate a human-readable batch identifier
      const batchName = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const displayName = `Payment Batch ${new Date().toISOString().slice(0, 10)}`;
      
      const { data, error } = await supabase
        .from('payment_batches')
        .insert([{
          batch_id: batchName.toString(), // Explicitly cast to string
          batch_name: displayName,
          period_start: start,
          period_end: end,
          status: 'Generated'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate batches cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [PAYMENT_BATCH_CACHE_KEYS.BATCHES] });
    }
  });

  // Process payment batch
  const processPaymentBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      // Update batch status to Processing
      const { error: updateError } = await supabase
        .from('payment_batches')
        .update({ 
          status: 'Processing',
          processed_at: new Date().toISOString()
        })
        .eq('batch_id', batchId);

      if (updateError) throw updateError;

      // Fetch all collections in this batch
      const { data: batchCollections, error: collectionsError } = await supabase
        .from('collection_payments')
        .select(`
          id,
          collection_id,
          amount,
          rate_applied,
          collections (
            id,
            farmer_id,
            total_amount,
            status
          )
        `)
        .eq('batch_id', batchId);

      if (collectionsError) throw collectionsError;

      // Group collections by farmer
      const farmerCollections: Record<string, any[]> = {};
      batchCollections?.forEach((item: any) => {
        const farmerId = item.collections?.farmer_id;
        if (farmerId) {
          if (!farmerCollections[farmerId]) {
            farmerCollections[farmerId] = [];
          }
          farmerCollections[farmerId].push(item);
        }
      });

      // Process each farmer's collections with credit deduction
      let totalCreditUsedInBatch = 0;
      let totalNetPaymentInBatch = 0;

      for (const [farmerId, collections] of Object.entries(farmerCollections)) {
        try {
          // Calculate available credit for this farmer
          const creditInfo = await CreditService.calculateAvailableCredit(farmerId);
          let farmerCreditUsed = 0;
          let farmerNetPayment = 0;
          
          // Process each collection for this farmer
          for (const collectionItem of collections) {
            const collection = collectionItem.collections;
            const collectionAmount = collection.total_amount || 0;
            
            // Calculate credit to use for this collection (minimum of available credit and collection amount)
            const creditUsed = Math.min(creditInfo.availableCredit - farmerCreditUsed, collectionAmount);
            const netPayment = collectionAmount - creditUsed;
            
            // Update the collection payment record with credit information
            const { error: updatePaymentError } = await supabase
              .from('collection_payments')
              .update({
                credit_used: creditUsed,
                net_payment: netPayment
              })
              .eq('id', collectionItem.id);

            if (updatePaymentError) {
              logger.warn('Warning: Failed to update collection payment with credit info', updatePaymentError);
            }

            // Update collection status to Paid
            const { error: updateCollectionError } = await supabase
              .from('collections')
              .update({ 
                status: 'Paid',
                updated_at: new Date().toISOString()
              })
              .eq('id', collection.id);

            if (updateCollectionError) {
              logger.warn('Warning: Failed to update collection status', updateCollectionError);
            }

            // Track credit used and net payment
            farmerCreditUsed += creditUsed;
            farmerNetPayment += netPayment;
            totalCreditUsedInBatch += creditUsed;
            totalNetPaymentInBatch += netPayment;

            // If credit was used, deduct it from the farmer's credit balance and record transaction
            if (creditUsed > 0) {
              // Get current credit limit record (using the correct table name)
              const { data: creditLimitData, error: creditLimitError } = await supabase
                .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
                .select('*')
                .eq('farmer_id', farmerId)
                .eq('is_frozen', false) // Using is_frozen = false instead of is_active = true
                .maybeSingle();

              if (creditLimitError) {
                logger.warn('Warning: Error fetching credit limit', creditLimitError);
              } else if (creditLimitData) {
                const creditLimitRecord = creditLimitData as any;
                
                // Calculate new balance
                const newBalance = Math.max(0, creditLimitRecord.current_credit_balance - creditUsed);
                const newTotalUsed = creditLimitRecord.total_credit_used + creditUsed;

                // Update credit limit (using the correct table name)
                const { error: updateError } = await supabase
                  .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
                  .update({
                    current_credit_balance: newBalance,
                    total_credit_used: newTotalUsed,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', creditLimitRecord.id);

                if (updateError) {
                  logger.warn('Warning: Failed to update credit limit', updateError);
                }

                // Create credit transaction record for the deduction
                const { error: transactionError } = await supabase
                  .from('credit_transactions')
                  .insert({
                    farmer_id: farmerId,
                    transaction_type: 'credit_repaid',
                    amount: creditUsed,
                    balance_before: creditLimitRecord.current_credit_balance,
                    balance_after: newBalance,
                    reference_type: 'batch_payment_deduction',
                    reference_id: collection.id,
                    description: `Credit used to offset batch payment of KES ${collectionAmount.toFixed(2)}`
                  });

                if (transactionError) {
                  logger.warn('Warning: Failed to create credit deduction transaction', transactionError);
                }
              }
            }
          }

          // Update farmer_payments records for this farmer
          // Find farmer_payments that include any of these collections
          const collectionIds = collections.map((item: any) => item.collection_id);
          const { data: relatedPayments, error: findPaymentsError } = await supabase
            .from('farmer_payments')
            .select('id, collection_ids, total_amount')
            .contains('collection_ids', collectionIds)
            .eq('farmer_id', farmerId);

          if (findPaymentsError) {
            logger.warn('Warning: Error finding related farmer payments', findPaymentsError);
          } else if (relatedPayments && relatedPayments.length > 0) {
            // Update all related farmer_payments with credit information
            for (const payment of relatedPayments) {
              const { error: updatePaymentError } = await supabase
                .from('farmer_payments')
                .update({ 
                  approval_status: 'approved',
                  paid_at: new Date().toISOString(),
                  credit_used: farmerCreditUsed,
                  net_payment: farmerNetPayment
                })
                .eq('id', payment.id);

              if (updatePaymentError) {
                logger.warn('Warning: Error updating farmer payment with credit info', updatePaymentError);
              }
            }
          }
        } catch (farmerError) {
          logger.error('Error processing farmer collections', farmerError);
          // Continue processing other farmers even if one fails
        }
      }

      // Update batch with credit summary
      const { error: updateBatchError } = await supabase
        .from('payment_batches')
        .update({
          total_credit_used: totalCreditUsedInBatch,
          total_net_payment: totalNetPaymentInBatch,
          status: 'Completed',
          completed_at: new Date().toISOString()
        })
        .eq('batch_id', batchId);

      if (updateBatchError) throw updateBatchError;

      return batchId;
    },
    onSuccess: (batchId) => {
      // Invalidate batches cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [PAYMENT_BATCH_CACHE_KEYS.BATCHES] });
      // Invalidate specific batch collections cache
      queryClient.invalidateQueries({ queryKey: [PAYMENT_BATCH_CACHE_KEYS.BATCH_COLLECTIONS, batchId] });
    }
  });

  // Export batch data (placeholder for now)
  const exportBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      // In a real implementation, you would generate a CSV file
      // For now, we'll just return the batch ID
      return batchId;
    },
    onSuccess: (batchId) => {
      // Invalidate specific batch collections cache to ensure fresh data for export
      queryClient.invalidateQueries({ queryKey: [PAYMENT_BATCH_CACHE_KEYS.BATCH_COLLECTIONS, batchId] });
    }
  });

  // Mutation to invalidate all payment batch caches
  const invalidatePaymentBatchCache = () => {
    queryClient.invalidateQueries({ queryKey: [PAYMENT_BATCH_CACHE_KEYS.BATCHES] });
    queryClient.invalidateQueries({ queryKey: [PAYMENT_BATCH_CACHE_KEYS.BATCH_COLLECTIONS] });
  };

  return {
    usePaymentBatches,
    useBatchCollections,
    createPaymentBatch: createPaymentBatchMutation,
    processPaymentBatch: processPaymentBatchMutation,
    exportBatch: exportBatchMutation,
    invalidatePaymentBatchCache
  };
};