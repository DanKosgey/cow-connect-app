import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CreditNotificationService } from './credit-notification-service';

export interface FarmerCreditLimit {
  id: string;
  farmer_id: string;
  credit_limit_percentage: number;
  max_credit_amount: number;
  current_credit_balance: number;
  total_credit_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FarmerCreditTransaction {
  id: string;
  farmer_id: string;
  transaction_type: 'credit_granted' | 'credit_used' | 'credit_repaid' | 'credit_adjusted';
  amount: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

export interface AgrovetInventory {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  supplier: string;
  cost_price: number;
  selling_price: number;
  is_credit_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgrovetPurchase {
  id: string;
  farmer_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'cash' | 'credit';
  credit_transaction_id?: string;
  status: 'pending' | 'completed' | 'cancelled';
  purchased_by?: string;
  created_at: string;
}

export class CreditService {
  // Calculate available credit for a farmer based on pending collections
  static async calculateAvailableCredit(farmerId: string): Promise<{ 
    availableCredit: number; 
    pendingPayments: number; 
    creditLimit: number;
    currentBalance: number;
  }> {
    try {
      // Get farmer's credit limit configuration
      const { data: creditLimitData, error: creditLimitError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_active', true)
        .maybeSingle();

      if (creditLimitError) {
        logger.errorWithContext('CreditService - fetching credit limit', creditLimitError);
        throw creditLimitError;
      }

      // If no credit limit exists, create a default one
      let creditLimitRecord: FarmerCreditLimit | null = creditLimitData as FarmerCreditLimit | null;
      if (!creditLimitRecord) {
        const defaultLimit = await this.createDefaultCreditLimit(farmerId);
        creditLimitRecord = defaultLimit;
      }

      // Get pending collections for the farmer
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('total_amount')
        .eq('farmer_id', farmerId)
        .neq('status', 'Paid');

      if (collectionsError) {
        logger.errorWithContext('CreditService - fetching pending collections', collectionsError);
        throw collectionsError;
      }

      const pendingPayments = pendingCollections?.reduce((sum, collection) => 
        sum + (collection.total_amount || 0), 0) || 0;

      // Calculate credit limit based on percentage
      const calculatedCreditLimit = pendingPayments * (creditLimitRecord.credit_limit_percentage / 100);
      
      // Apply maximum credit amount cap
      const finalCreditLimit = Math.min(calculatedCreditLimit, creditLimitRecord.max_credit_amount);
      
      // Available credit is the lesser of:
      // 1. Final credit limit
      // 2. Current credit balance (what they haven't used yet)
      const availableCredit = Math.min(finalCreditLimit, creditLimitRecord.current_credit_balance);

      return {
        availableCredit: parseFloat(availableCredit.toFixed(2)),
        pendingPayments: parseFloat(pendingPayments.toFixed(2)),
        creditLimit: parseFloat(finalCreditLimit.toFixed(2)),
        currentBalance: parseFloat(creditLimitRecord.current_credit_balance.toFixed(2))
      };
    } catch (error) {
      logger.errorWithContext('CreditService - calculateAvailableCredit', error);
      throw error;
    }
  }

  // Create default credit limit for a farmer
  static async createDefaultCreditLimit(farmerId: string): Promise<FarmerCreditLimit> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_limits')
        .insert({
          farmer_id: farmerId,
          credit_limit_percentage: 70.00,
          max_credit_amount: 100000.00,
          current_credit_balance: 0.00,
          total_credit_used: 0.00,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CreditService - creating default credit limit', error);
        throw error;
      }

      return data as FarmerCreditLimit;
    } catch (error) {
      logger.errorWithContext('CreditService - createDefaultCreditLimit', error);
      throw error;
    }
  }

  // Grant credit to a farmer based on their pending payments
  static async grantCreditToFarmer(farmerId: string, grantedBy?: string): Promise<FarmerCreditTransaction> {
    try {
      // Calculate available credit
      const creditInfo = await this.calculateAvailableCredit(farmerId);
      
      // Get current credit limit record
      const { data: creditLimitData, error: creditLimitError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_active', true)
        .maybeSingle();

      if (creditLimitError) {
        logger.errorWithContext('CreditService - fetching credit limit for granting', creditLimitError);
        throw creditLimitError;
      }

      if (!creditLimitData) {
        throw new Error('Credit limit not found for farmer');
      }

      const creditLimitRecord = creditLimitData as FarmerCreditLimit;
      
      // If credit has already been granted, don't grant again
      if (creditLimitRecord.current_credit_balance > 0) {
        throw new Error('Credit has already been granted to this farmer');
      }

      // Update credit limit with new balance
      const newBalance = creditInfo.creditLimit;
      const { error: updateError } = await supabase
        .from('farmer_credit_limits')
        .update({
          current_credit_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditLimitRecord.id);

      if (updateError) {
        logger.errorWithContext('CreditService - updating credit limit', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('farmer_credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_granted',
          amount: newBalance,
          balance_after: newBalance,
          reference_type: 'credit_grant',
          description: `Credit granted based on pending payments of KES ${creditInfo.pendingPayments.toFixed(2)}`,
          created_by: grantedBy
        })
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('CreditService - creating credit transaction', transactionError);
        throw transactionError;
      }

      // Send notification to farmer
      try {
        await CreditNotificationService.sendCreditGrantedNotification(
          farmerId,
          newBalance,
          creditInfo.pendingPayments
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send credit granted notification', notificationError);
      }

      return transactionData as FarmerCreditTransaction;
    } catch (error) {
      logger.errorWithContext('CreditService - grantCreditToFarmer', error);
      throw error;
    }
  }

  // Use credit for an agrovet purchase
  static async useCreditForPurchase(
    farmerId: string, 
    purchaseId: string, 
    amount: number,
    usedBy?: string
  ): Promise<FarmerCreditTransaction> {
    try {
      // Get current credit limit record
      const { data: creditLimitData, error: creditLimitError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_active', true)
        .maybeSingle();

      if (creditLimitError) {
        logger.errorWithContext('CreditService - fetching credit limit for purchase', creditLimitError);
        throw creditLimitError;
      }

      if (!creditLimitData) {
        throw new Error('Credit limit not found for farmer');
      }

      const creditLimitRecord = creditLimitData as FarmerCreditLimit;
      
      // Check if farmer has enough credit
      if (creditLimitRecord.current_credit_balance < amount) {
        throw new Error('Insufficient credit balance');
      }

      // Calculate new balance
      const newBalance = creditLimitRecord.current_credit_balance - amount;
      const newTotalUsed = creditLimitRecord.total_credit_used + amount;

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
        logger.errorWithContext('CreditService - updating credit limit for purchase', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('farmer_credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_used',
          amount: amount,
          balance_after: newBalance,
          reference_type: 'agrovet_purchase',
          reference_id: purchaseId,
          description: `Credit used for agrovet purchase of KES ${amount.toFixed(2)}`,
          created_by: usedBy
        })
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('CreditService - creating credit transaction for purchase', transactionError);
        throw transactionError;
      }

      // Send notification to farmer about credit usage
      try {
        // Get item name for notification
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('agrovet_purchases')
          .select('agrovet_inventory(name)')
          .eq('id', purchaseId)
          .maybeSingle();

        if (!purchaseError && purchaseData) {
          const itemName = (purchaseData as any).agrovet_inventory?.name || 'agrovet item';
          await CreditNotificationService.sendCreditUsedNotification(
            farmerId,
            amount,
            itemName,
            newBalance
          );
        }
      } catch (notificationError) {
        logger.warn('Warning: Failed to send credit used notification', notificationError);
      }

      // Check if credit is getting low and send warning
      try {
        const creditLimit = creditLimitRecord.max_credit_amount;
        const utilization = creditLimit > 0 ? ((creditLimit - newBalance) / creditLimit) * 100 : 0;
        
        if (utilization > 80 && utilization <= 90) {
          await CreditNotificationService.sendLowCreditWarning(
            farmerId,
            newBalance,
            creditLimit
          );
        } else if (utilization > 90) {
          await CreditNotificationService.sendOverLimitWarning(
            farmerId,
            creditLimitRecord.total_credit_used + amount,
            creditLimit
          );
        }
      } catch (warningError) {
        logger.warn('Warning: Failed to send credit utilization warning', warningError);
      }

      return transactionData as FarmerCreditTransaction;
    } catch (error) {
      logger.errorWithContext('CreditService - useCreditForPurchase', error);
      throw error;
    }
  }

  // Adjust credit limit for a farmer (admin function)
  static async adjustCreditLimit(
    farmerId: string, 
    newPercentage: number, 
    newMaxAmount: number,
    adjustedBy?: string
  ): Promise<FarmerCreditLimit> {
    try {
      // Get current credit limit record
      const { data: creditLimitData, error: creditLimitError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_active', true)
        .maybeSingle();

      if (creditLimitError) {
        logger.errorWithContext('CreditService - fetching credit limit for adjustment', creditLimitError);
        throw creditLimitError;
      }

      let creditLimitRecord: FarmerCreditLimit;
      const previousLimit = creditLimitData?.max_credit_amount || 0;
      
      if (!creditLimitData) {
        // Create new credit limit if none exists
        creditLimitRecord = await this.createDefaultCreditLimit(farmerId);
      } else {
        creditLimitRecord = creditLimitData as FarmerCreditLimit;
      }

      // Update credit limit
      const { data: updatedData, error: updateError } = await supabase
        .from('farmer_credit_limits')
        .update({
          credit_limit_percentage: newPercentage,
          max_credit_amount: newMaxAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditLimitRecord.id)
        .select()
        .single();

      if (updateError) {
        logger.errorWithContext('CreditService - updating credit limit', updateError);
        throw updateError;
      }

      // Create adjustment transaction
      const { error: transactionError } = await supabase
        .from('farmer_credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_adjusted',
          amount: 0, // No amount change, just adjustment
          balance_after: updatedData.current_credit_balance,
          reference_type: 'credit_limit_adjustment',
          description: `Credit limit adjusted to ${newPercentage}% with max KES ${newMaxAmount.toFixed(2)}`,
          created_by: adjustedBy
        });

      if (transactionError) {
        logger.warn('Warning: Failed to create credit adjustment transaction', transactionError);
      }

      // Send notification to farmer about credit limit adjustment
      try {
        const reason = newMaxAmount > previousLimit 
          ? 'This increase is based on your good payment history and increased pending collections.' 
          : 'This adjustment is to align with current company policy.';
          
        await CreditNotificationService.sendCreditLimitAdjustmentNotification(
          farmerId,
          newMaxAmount,
          previousLimit,
          reason
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send credit limit adjustment notification', notificationError);
      }

      return updatedData as FarmerCreditLimit;
    } catch (error) {
      logger.errorWithContext('CreditService - adjustCreditLimit', error);
      throw error;
    }
  }

  // Get farmer's credit history
  static async getCreditHistory(farmerId: string): Promise<FarmerCreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_transactions')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CreditService - fetching credit history', error);
        throw error;
      }

      return data as FarmerCreditTransaction[];
    } catch (error) {
      logger.errorWithContext('CreditService - getCreditHistory', error);
      throw error;
    }
  }

  // Get farmer's current credit status
  static async getCreditStatus(farmerId: string): Promise<FarmerCreditLimit | null> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('CreditService - fetching credit status', error);
        throw error;
      }

      return data as FarmerCreditLimit | null;
    } catch (error) {
      logger.errorWithContext('CreditService - getCreditStatus', error);
      throw error;
    }
  }

  // Get agrovet inventory items
  static async getAgrovetInventory(): Promise<AgrovetInventory[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('CreditService - fetching agrovet inventory', error);
        throw error;
      }

      return data as AgrovetInventory[];
    } catch (error) {
      logger.errorWithContext('CreditService - getAgrovetInventory', error);
      throw error;
    }
  }

  // Get farmer's agrovet purchase history
  static async getPurchaseHistory(farmerId: string): Promise<AgrovetPurchase[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory(name, category)
        `)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CreditService - fetching purchase history', error);
        throw error;
      }

      return data as AgrovetPurchase[];
    } catch (error) {
      logger.errorWithContext('CreditService - getPurchaseHistory', error);
      throw error;
    }
  }

  // Create a new agrovet purchase
  static async createAgrovetPurchase(
    farmerId: string,
    itemId: string,
    quantity: number,
    paymentMethod: 'cash' | 'credit',
    purchasedBy?: string
  ): Promise<{ purchase: AgrovetPurchase; transaction?: FarmerCreditTransaction }> {
    try {
      // Get item details
      const { data: itemData, error: itemError } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

      if (itemError) {
        logger.errorWithContext('CreditService - fetching item for purchase', itemError);
        throw itemError;
      }

      if (!itemData) {
        throw new Error('Item not found');
      }

      const item = itemData as AgrovetInventory;

      // Check if item is credit eligible
      if (paymentMethod === 'credit' && !item.is_credit_eligible) {
        throw new Error('This item is not eligible for credit purchase');
      }

      // Calculate total amount
      const totalAmount = quantity * item.selling_price;

      // If paying with credit, check availability and use credit
      if (paymentMethod === 'credit') {
        // Check available credit
        const creditInfo = await this.calculateAvailableCredit(farmerId);
        if (creditInfo.availableCredit < totalAmount) {
          throw new Error('Insufficient credit balance for this purchase');
        }

        // Create the purchase first
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('agrovet_purchases')
          .insert({
            farmer_id: farmerId,
            item_id: itemId,
            quantity: quantity,
            unit_price: item.selling_price,
            total_amount: totalAmount,
            payment_method: paymentMethod,
            status: 'completed',
            purchased_by: purchasedBy
          })
          .select()
          .single();

        if (purchaseError) {
          logger.errorWithContext('CreditService - creating agrovet purchase', purchaseError);
          throw purchaseError;
        }

        const purchase = purchaseData as AgrovetPurchase;

        // Use credit for the purchase
        const transaction = await this.useCreditForPurchase(
          farmerId, 
          purchase.id, 
          totalAmount, 
          purchasedBy
        );

        // Update purchase with credit transaction ID
        const { error: updateError } = await supabase
          .from('agrovet_purchases')
          .update({
            credit_transaction_id: transaction.id
          })
          .eq('id', purchase.id);

        if (updateError) {
          logger.warn('Warning: Failed to update purchase with credit transaction ID', updateError);
        }

        return { purchase, transaction };
      } else {
        // Cash purchase
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('agrovet_purchases')
          .insert({
            farmer_id: farmerId,
            item_id: itemId,
            quantity: quantity,
            unit_price: item.selling_price,
            total_amount: totalAmount,
            payment_method: paymentMethod,
            status: 'completed',
            purchased_by: purchasedBy
          })
          .select()
          .single();

        if (purchaseError) {
          logger.errorWithContext('CreditService - creating cash purchase', purchaseError);
          throw purchaseError;
        }

        return { purchase: purchaseData as AgrovetPurchase };
      }
    } catch (error) {
      logger.errorWithContext('CreditService - createAgrovetPurchase', error);
      throw error;
    }
  }
}