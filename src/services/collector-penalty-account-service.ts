import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CollectorPenaltyAccount {
  id: string;
  collector_id: string;
  pending_penalties: number;
  total_penalties_incurred: number;
  total_penalties_paid: number;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectorPenaltyTransaction {
  id: string;
  collector_id: string;
  transaction_type: 'penalty_incurred' | 'penalty_paid' | 'penalty_adjusted';
  amount: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

export class CollectorPenaltyAccountService {
  private static instance: CollectorPenaltyAccountService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): CollectorPenaltyAccountService {
    if (!CollectorPenaltyAccountService.instance) {
      CollectorPenaltyAccountService.instance = new CollectorPenaltyAccountService();
    }
    return CollectorPenaltyAccountService.instance;
  }

  /**
   * Get or create a penalty account for a collector
   */
  async getOrCreatePenaltyAccount(collectorId: string): Promise<CollectorPenaltyAccount | null> {
    try {
      // First try to get existing account
      const { data: existingAccount, error: fetchError } = await supabase
        .from('collector_penalty_accounts')
        .select('*')
        .eq('collector_id', collectorId)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('CollectorPenaltyAccountService - fetching penalty account', fetchError);
        return null;
      }

      // If account exists, return it
      if (existingAccount) {
        return existingAccount as CollectorPenaltyAccount;
      }

      // If no account exists, create one
      const { data: newAccount, error: insertError } = await supabase
        .from('collector_penalty_accounts')
        .insert([
          {
            collector_id: collectorId,
            pending_penalties: 0,
            total_penalties_incurred: 0,
            total_penalties_paid: 0,
            is_frozen: false
          }
        ])
        .select()
        .single();

      if (insertError) {
        logger.errorWithContext('CollectorPenaltyAccountService - creating penalty account', insertError);
        return null;
      }

      return newAccount as CollectorPenaltyAccount;
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyAccountService - getOrCreatePenaltyAccount exception', error);
      return null;
    }
  }

  /**
   * Add penalty to collector's account (when penalty is incurred)
   */
  async incurPenalty(
    collectorId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    createdBy?: string
  ): Promise<boolean> {
    try {
      // Get or create penalty account
      const account = await this.getOrCreatePenaltyAccount(collectorId);
      if (!account) {
        throw new Error('Failed to get or create penalty account');
      }

      // Update account balances
      const newPendingPenalties = account.pending_penalties + amount;
      const newTotalIncurred = account.total_penalties_incurred + amount;

      const { error: updateError } = await supabase
        .from('collector_penalty_accounts')
        .update({
          pending_penalties: newPendingPenalties,
          total_penalties_incurred: newTotalIncurred,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) {
        logger.errorWithContext('CollectorPenaltyAccountService - updating penalty account for incurred penalty', updateError);
        throw updateError;
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('collector_penalty_transactions')
        .insert([
          {
            collector_id: collectorId,
            transaction_type: 'penalty_incurred',
            amount: amount,
            balance_after: newPendingPenalties,
            reference_type: referenceType,
            reference_id: referenceId,
            description: description || `Penalty of ${amount} incurred`,
            created_by: createdBy
          }
        ]);

      if (transactionError) {
        logger.errorWithContext('CollectorPenaltyAccountService - creating penalty transaction', transactionError);
        // We don't throw here because the account was successfully updated
        // but we log the error for debugging
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyAccountService - incurPenalty exception', error);
      return false;
    }
  }

  /**
   * Deduct penalty from collector's account (when payment is made)
   */
  async deductPenalty(
    collectorId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    createdBy?: string
  ): Promise<{ success: boolean; deductedAmount: number }> {
    try {
      // Get penalty account
      const account = await this.getOrCreatePenaltyAccount(collectorId);
      if (!account) {
        throw new Error('Failed to get penalty account');
      }

      // Calculate how much we can actually deduct (limited by pending penalties)
      const deductibleAmount = Math.min(amount, account.pending_penalties);
      
      if (deductibleAmount <= 0) {
        return { success: true, deductedAmount: 0 };
      }

      // Update account balances
      const newPendingPenalties = account.pending_penalties - deductibleAmount;
      const newTotalPaid = account.total_penalties_paid + deductibleAmount;

      const { error: updateError } = await supabase
        .from('collector_penalty_accounts')
        .update({
          pending_penalties: newPendingPenalties,
          total_penalties_paid: newTotalPaid,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) {
        logger.errorWithContext('CollectorPenaltyAccountService - updating penalty account for deducted penalty', updateError);
        throw updateError;
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('collector_penalty_transactions')
        .insert([
          {
            collector_id: collectorId,
            transaction_type: 'penalty_paid',
            amount: deductibleAmount,
            balance_after: newPendingPenalties,
            reference_type: referenceType,
            reference_id: referenceId,
            description: description || `Penalty of ${deductibleAmount} paid`,
            created_by: createdBy
          }
        ]);

      if (transactionError) {
        logger.errorWithContext('CollectorPenaltyAccountService - creating penalty deduction transaction', transactionError);
        // We don't throw here because the account was successfully updated
        // but we log the error for debugging
      }

      return { success: true, deductedAmount: deductibleAmount };
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyAccountService - deductPenalty exception', error);
      return { success: false, deductedAmount: 0 };
    }
  }

  /**
   * Get penalty account balance for a collector
   */
  async getPenaltyBalance(collectorId: string): Promise<{
    pendingPenalties: number;
    totalIncurred: number;
    totalPaid: number;
    availableBalance: number;
  } | null> {
    try {
      const account = await this.getOrCreatePenaltyAccount(collectorId);
      if (!account) {
        return null;
      }

      return {
        pendingPenalties: account.pending_penalties,
        totalIncurred: account.total_penalties_incurred,
        totalPaid: account.total_penalties_paid,
        availableBalance: account.pending_penalties
      };
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyAccountService - getPenaltyBalance exception', error);
      return null;
    }
  }

  /**
   * Get penalty transaction history for a collector
   */
  async getTransactionHistory(collectorId: string, limit = 50): Promise<CollectorPenaltyTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('collector_penalty_transactions')
        .select('*')
        .eq('collector_id', collectorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.errorWithContext('CollectorPenaltyAccountService - fetching transaction history', error);
        return [];
      }

      return (data || []) as CollectorPenaltyTransaction[];
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyAccountService - getTransactionHistory exception', error);
      return [];
    }
  }

  /**
   * Freeze/unfreeze a collector's penalty account
   */
  async setAccountFrozenStatus(collectorId: string, isFrozen: boolean, reason?: string): Promise<boolean> {
    try {
      const account = await this.getOrCreatePenaltyAccount(collectorId);
      if (!account) {
        throw new Error('Failed to get penalty account');
      }

      const { error: updateError } = await supabase
        .from('collector_penalty_accounts')
        .update({
          is_frozen: isFrozen,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateError) {
        logger.errorWithContext('CollectorPenaltyAccountService - updating frozen status', updateError);
        return false;
      }

      // Create transaction record for the status change
      const { error: transactionError } = await supabase
        .from('collector_penalty_transactions')
        .insert([
          {
            collector_id: collectorId,
            transaction_type: 'penalty_adjusted',
            amount: 0,
            balance_after: account.pending_penalties,
            description: `Account ${isFrozen ? 'frozen' : 'unfrozen'}${reason ? `: ${reason}` : ''}`,
            created_at: new Date().toISOString()
          }
        ]);

      if (transactionError) {
        logger.warn('Warning: Failed to create account status transaction', transactionError);
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyAccountService - setAccountFrozenStatus exception', error);
      return false;
    }
  }
}

// Export singleton instance
export const collectorPenaltyAccountService = CollectorPenaltyAccountService.getInstance();