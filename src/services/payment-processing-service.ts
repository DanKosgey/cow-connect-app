import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CreditServiceEssentials } from './credit-service-essentials';
import { FarmerCreditService } from './farmer-credit-service';

export class PaymentProcessingService {
  // Mark a credit transaction and associated purchase as paid
  static async markAsPaid(transactionId: string, purchaseId?: string): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      logger.info(`PaymentProcessingService - marking transaction as paid`, { transactionId, purchaseId });

      // Start by marking the credit transaction as paid
      const transactionUpdateSuccess = await CreditServiceEssentials.markCreditTransactionAsPaid(transactionId);
      
      if (!transactionUpdateSuccess) {
        return { success: false, errorMessage: 'Failed to update credit transaction status' };
      }

      // If we have a purchase ID, also update the purchase payment status
      if (purchaseId) {
        const { error: purchaseError } = await supabase
          .from('agrovet_purchases')
          .update({ payment_status: 'paid' })
          .eq('id', purchaseId);

        if (purchaseError) {
          logger.errorWithContext('PaymentProcessingService - updating purchase payment status', purchaseError);
          // We don't return failure here because the main transaction was successful
          // but we do log the error
        } else {
          logger.info(`PaymentProcessingService - purchase marked as paid successfully`, { purchaseId });
        }
      }

      logger.info(`PaymentProcessingService - marking as paid completed successfully`, { transactionId, purchaseId });
      return { success: true };
    } catch (error) {
      logger.errorWithContext('PaymentProcessingService - markAsPaid', error);
      return { success: false, errorMessage: (error as Error).message };
    }
  }

  // Mark multiple transactions as paid (for batch processing)
  static async markMultipleAsPaid(transactionIds: string[]): Promise<{ success: boolean; results: { id: string; success: boolean; errorMessage?: string }[] }> {
    try {
      logger.info(`PaymentProcessingService - marking multiple transactions as paid`, { count: transactionIds.length });

      const results = [];

      for (const transactionId of transactionIds) {
        try {
          const result = await this.markAsPaid(transactionId);
          results.push({
            id: transactionId,
            success: result.success,
            errorMessage: result.errorMessage
          });
        } catch (error) {
          results.push({
            id: transactionId,
            success: false,
            errorMessage: (error as Error).message
          });
        }
      }

      const overallSuccess = results.every(r => r.success);

      logger.info(`PaymentProcessingService - marking multiple as paid completed`, { 
        overallSuccess, 
        successCount: results.filter(r => r.success).length,
        totalCount: results.length
      });

      return { success: overallSuccess, results };
    } catch (error) {
      logger.errorWithContext('PaymentProcessingService - markMultipleAsPaid', error);
      return { 
        success: false, 
        results: transactionIds.map(id => ({
          id,
          success: false,
          errorMessage: (error as Error).message
        }))
      };
    }
  }

  // Get pending transactions for a farmer
  static async getPendingTransactions(farmerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          agrovet_purchases(
            id,
            payment_status
          )
        `)
        .eq('farmer_id', farmerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('PaymentProcessingService - fetching pending transactions', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('PaymentProcessingService - getPendingTransactions', error);
      throw error;
    }
  }

  // Get overdue purchases for a farmer
  static async getOverduePurchases(farmerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          credit_transactions(
            id,
            status
          )
        `)
        .eq('farmer_id', farmerId)
        .eq('payment_status', 'overdue')
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('PaymentProcessingService - fetching overdue purchases', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('PaymentProcessingService - getOverduePurchases', error);
      throw error;
    }
  }

  // Calculate and update pending deductions for a farmer
  static async updatePendingDeductions(farmerId: string): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      logger.info(`PaymentProcessingService - updating pending deductions for farmer`, { farmerId });

      // Get all active credit transactions for this farmer
      const { data: activeTransactions, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('farmer_id', farmerId)
        .eq('status', 'active');

      if (transactionsError) {
        logger.errorWithContext('PaymentProcessingService - fetching active transactions', transactionsError);
        return { success: false, errorMessage: 'Failed to fetch active transactions' };
      }

      // Calculate total pending deductions
      const totalPendingDeductions = activeTransactions?.reduce((sum, transaction) => 
        sum + (transaction.amount || 0), 0) || 0;

      // Update the farmer's credit profile
      const { error: profileUpdateError } = await supabase
        .from('farmer_credit_profiles')
        .update({ 
          pending_deductions: totalPendingDeductions,
          updated_at: new Date().toISOString()
        })
        .eq('farmer_id', farmerId);

      if (profileUpdateError) {
        logger.errorWithContext('PaymentProcessingService - updating farmer credit profile', profileUpdateError);
        return { success: false, errorMessage: 'Failed to update farmer credit profile' };
      }

      logger.info(`PaymentProcessingService - pending deductions updated successfully`, { 
        farmerId, 
        totalPendingDeductions 
      });

      return { success: true };
    } catch (error) {
      logger.errorWithContext('PaymentProcessingService - updatePendingDeductions', error);
      return { success: false, errorMessage: (error as Error).message };
    }
  }

  // Mark a credit transaction and associated purchase as paid, then update pending deductions
  static async markAsPaidAndUpdateDeductions(transactionId: string, purchaseId?: string): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      logger.info(`PaymentProcessingService - marking transaction as paid and updating deductions`, { transactionId, purchaseId });

      // First, mark as paid
      const markPaidResult = await this.markAsPaid(transactionId, purchaseId);
      
      if (!markPaidResult.success) {
        return markPaidResult;
      }

      // Get the transaction to find the farmer ID
      const { data: transaction, error: fetchError } = await supabase
        .from('credit_transactions')
        .select('farmer_id')
        .eq('id', transactionId)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('PaymentProcessingService - fetching transaction for farmer ID', fetchError);
        return { success: false, errorMessage: 'Failed to fetch transaction details' };
      }

      if (!transaction) {
        logger.warn(`PaymentProcessingService - transaction not found`, { transactionId });
        return { success: false, errorMessage: 'Transaction not found' };
      }

      // Update pending deductions for the farmer
      const deductionResult = await this.updatePendingDeductions(transaction.farmer_id);
      
      if (!deductionResult.success) {
        // Log the error but don't fail the entire operation since the payment was successful
        logger.warn(`PaymentProcessingService - failed to update pending deductions`, { 
          farmerId: transaction.farmer_id,
          errorMessage: deductionResult.errorMessage
        });
      }

      logger.info(`PaymentProcessingService - marking as paid and updating deductions completed`, { 
        transactionId, 
        purchaseId,
        farmerId: transaction.farmer_id
      });

      return { success: true };
    } catch (error) {
      logger.errorWithContext('PaymentProcessingService - markAsPaidAndUpdateDeductions', error);
      return { success: false, errorMessage: (error as Error).message };
    }
  }
}