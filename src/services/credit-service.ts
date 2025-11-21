import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CreditNotificationService } from './credit-notification-service';
import { formatCurrency } from '@/utils/formatters';

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
  status: 'pending' | 'completed' | 'cancelled' | 'pending_collection';
  purchased_by?: string;
  created_at: string;
}

export class CreditService {
  // Approve a credit request
  static async approveCreditRequest(requestId: string, approvedBy?: string): Promise<void> {
    try {
      // Input validation
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      // Get the credit request details
      const { data: request, error: requestError } = await supabase
        .from('agrovet_credit_requests')
        .select(`
          *,
          farmers:farmer_id (id, full_name),
          agrovet_products:product_id (id, name, unit_price)
        `)
        .eq('id', requestId)
        .maybeSingle();

      if (requestError) {
        logger.errorWithContext('CreditService - fetching credit request for approval', requestError);
        throw requestError;
      }

      if (!request) {
        throw new Error('Credit request not found');
      }

      // Update the credit request status
      const { error: updateError } = await supabase
        .from('agrovet_credit_requests')
        .update({
          status: 'approved',
          processed_by: approvedBy,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        logger.errorWithContext('CreditService - updating credit request for approval', updateError);
        throw updateError;
      }

      // Send notification to farmer
      try {
        await CreditNotificationService.sendCreditRequestApproved(
          request.farmer_id,
          requestId,
          request.total_amount,
          [request.agrovet_products?.name || 'agrovet product']
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send credit request approved notification', notificationError);
      }
    } catch (error) {
      logger.errorWithContext('CreditService - approveCreditRequest', error);
      throw error;
    }
  }

  // Reject a credit request
  static async rejectCreditRequest(requestId: string, rejectionReason: string, rejectedBy?: string): Promise<void> {
    try {
      // Input validation
      if (!requestId) {
        throw new Error('Request ID is required');
      }

      if (!rejectionReason) {
        throw new Error('Rejection reason is required');
      }
      const { error } = await supabase
        .from('agrovet_credit_requests')
        .update({
          status: 'rejected',
          notes: rejectionReason,
          processed_by: rejectedBy,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        logger.errorWithContext('CreditService - rejecting credit request', error);
        throw error;
      }

      // Get farmer ID for notification
      const { data: request, error: requestError } = await supabase
        .from('agrovet_credit_requests')
        .select('farmer_id, product_name, total_amount')
        .eq('id', requestId)
        .maybeSingle();

      if (requestError) {
        logger.warn('Warning: Failed to fetch request for rejection notification', requestError);
        return;
      }

      if (!request) {
        logger.warn('Warning: Request not found for rejection notification');
        return;
      }

      // Send notification to farmer
      try {
        await CreditNotificationService.sendCreditRequestRejected(
          request.farmer_id,
          requestId,
          request.total_amount,
          rejectionReason
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send credit request rejected notification', notificationError);
      }
    } catch (error) {
      logger.errorWithContext('CreditService - rejectCreditRequest', error);
      throw error;
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(): Promise<{
    pendingApplications: number;
    totalCreditIssued: number;
    activeFarmers: number;
    creditRepaymentRate: number;
  }> {
    try {
      // Get pending credit applications
      const { count: pendingApplications, error: pendingError } = await supabase
        .from('agrovet_credit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Get total credit issued
      const { data: totalCreditData, error: totalCreditError } = await supabase
        .from('agrovet_credit_requests')
        .select('total_amount')
        .eq('status', 'approved');

      if (totalCreditError) throw totalCreditError;

      const totalCreditIssued = totalCreditData?.reduce((sum, request) => sum + (request.total_amount || 0), 0) || 0;

      // Get active farmers with credit
      const { count: activeFarmers, error: farmersError } = await supabase
        .from('farmer_credit_limits')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (farmersError) throw farmersError;

      // Calculate repayment rate (simplified calculation)
      // In a real implementation, this would be based on actual repayment data
      const creditRepaymentRate = activeFarmers && activeFarmers > 0 ?
        Math.min(95, Math.max(75, 100 - (pendingApplications || 0) / (activeFarmers || 1) * 20)) : 0;

      return {
        pendingApplications: pendingApplications || 0,
        totalCreditIssued,
        activeFarmers: activeFarmers || 0,
        creditRepaymentRate: parseFloat(creditRepaymentRate.toFixed(1))
      };
    } catch (error) {
      logger.errorWithContext('CreditService - getDashboardStats', error);
      throw error;
    }
  }

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

  // Use credit for an agrovet purchase
  static async useCreditForPurchase(
    farmerId: string,
    purchaseId: string,
    amount: number,
    usedBy?: string
  ): Promise<FarmerCreditTransaction> {
    try {
      // Input validation
      if (!farmerId) {
        throw new Error('Farmer ID is required');
      }

      if (!purchaseId) {
        throw new Error('Purchase ID is required');
      }

      if (amount <= 0) {
        throw new Error('Purchase amount must be greater than zero');
      }

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

  // Adjust credit limit for a farmer
  static async adjustCreditLimit(
    farmerId: string,
    creditLimitPercentage: number,
    maxCreditAmount: number
  ): Promise<void> {
    try {
      // Input validation
      if (!farmerId) {
        throw new Error('Farmer ID is required');
      }

      if (creditLimitPercentage < 0 || creditLimitPercentage > 100) {
        throw new Error('Credit limit percentage must be between 0 and 100');
      }

      if (maxCreditAmount < 0) {
        throw new Error('Maximum credit amount cannot be negative');
      }

      // Check if farmer already has a credit limit record
      const { data: existingLimit, error: fetchError } = await supabase
        .from('farmer_credit_limits')
        .select('id, current_credit_balance')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('CreditService - fetching existing credit limit', fetchError);
        throw fetchError;
      }

      if (existingLimit) {
        // Update existing credit limit
        const { error: updateError } = await supabase
          .from('farmer_credit_limits')
          .update({
            credit_limit_percentage: creditLimitPercentage,
            max_credit_amount: maxCreditAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLimit.id);

        if (updateError) {
          logger.errorWithContext('CreditService - updating credit limit', updateError);
          throw updateError;
        }
      } else {
        // Create new credit limit record
        const { error: insertError } = await supabase
          .from('farmer_credit_limits')
          .insert({
            farmer_id: farmerId,
            credit_limit_percentage: creditLimitPercentage,
            max_credit_amount: maxCreditAmount,
            current_credit_balance: maxCreditAmount, // Start with full available credit
            total_credit_used: 0,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          logger.errorWithContext('CreditService - creating credit limit', insertError);
          throw insertError;
        }
      }

      // Log the credit limit adjustment
      const { error: logError } = await supabase
        .from('farmer_credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_adjusted',
          amount: maxCreditAmount,
          balance_after: existingLimit?.current_credit_balance || maxCreditAmount,
          description: `Credit limit adjusted to ${formatCurrency(maxCreditAmount)}`,
          created_at: new Date().toISOString()
        });

      if (logError) {
        logger.warn('Warning: Failed to log credit limit adjustment', logError);
      }
    } catch (error) {
      logger.errorWithContext('CreditService - adjustCreditLimit', error);
      throw error;
    }
  }

  // Grant credit to a farmer (initialize credit profile)
  static async grantCreditToFarmer(farmerId: string): Promise<void> {
    try {
      // Input validation
      if (!farmerId) {
        throw new Error('Farmer ID is required');
      }

      // Check if farmer already has a credit limit record
      const { data: existingLimit, error: fetchError } = await supabase
        .from('farmer_credit_limits')
        .select('id')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('CreditService - checking existing credit limit', fetchError);
        throw fetchError;
      }

      if (existingLimit) {
        throw new Error('Farmer already has a credit profile');
      }

      // Create initial credit limit record with default values
      const defaultCreditLimit = 50000; // Default credit limit of KES 50,000
      const defaultCreditPercentage = 70; // Default 70% credit limit

      const { error: insertError } = await supabase
        .from('farmer_credit_limits')
        .insert({
          farmer_id: farmerId,
          credit_limit_percentage: defaultCreditPercentage,
          max_credit_amount: defaultCreditLimit,
          current_credit_balance: defaultCreditLimit, // Start with full available credit
          total_credit_used: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        logger.errorWithContext('CreditService - granting credit to farmer', insertError);
        throw insertError;
      }

      // Log the credit grant
      const { error: logError } = await supabase
        .from('farmer_credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_granted',
          amount: defaultCreditLimit,
          balance_after: defaultCreditLimit,
          description: `Initial credit grant of ${formatCurrency(defaultCreditLimit)}`,
          created_at: new Date().toISOString()
        });

      if (logError) {
        logger.warn('Warning: Failed to log credit grant', logError);
      }

      // Send notification to farmer
      try {
        await CreditNotificationService.sendCreditGrantedNotification(
          farmerId,
          defaultCreditLimit,
          0 // pending payments
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send credit granted notification', notificationError);
      }
    } catch (error) {
      logger.errorWithContext('CreditService - grantCreditToFarmer', error);
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
      // Input validation
      if (!farmerId) {
        throw new Error('Farmer ID is required');
      }

      if (!itemId) {
        throw new Error('Item ID is required');
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than zero');
      }

      if (!paymentMethod) {
        throw new Error('Payment method is required');
      }
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
            status: 'pending_collection',
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

  // Confirm collection of purchased items
  static async confirmPurchaseCollection(purchaseId: string, confirmedBy?: string): Promise<void> {
    try {
      if (!purchaseId) {
        throw new Error('Purchase ID is required');
      }

      // Update the purchase status to 'completed'
      const { error: updateError } = await supabase
        .from('agrovet_purchases')
        .update({
          status: 'completed',
        })
        .eq('id', purchaseId);

      if (updateError) {
        logger.errorWithContext('CreditService - confirming purchase collection', updateError);
        throw updateError;
      }

      // Log the confirmation action
      logger.info(`Purchase ${purchaseId} confirmed collected by ${confirmedBy || 'system'}`);

    } catch (error) {
      logger.errorWithContext('CreditService - confirmPurchaseCollection', error);
      throw error;
    }
  }

  // Repay credit for a farmer
  static async repayCredit(
    farmerId: string,
    amount: number,
    repaymentMethod: string = 'cash',
    referenceId?: string,
    repaidBy?: string
  ): Promise<FarmerCreditTransaction> {
    try {
      // Input validation
      if (!farmerId) {
        throw new Error('Farmer ID is required');
      }

      if (amount <= 0) {
        throw new Error('Repayment amount must be greater than zero');
      }

      // Get current credit limit record
      const { data: creditLimitData, error: creditLimitError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_active', true)
        .maybeSingle();

      if (creditLimitError) {
        logger.errorWithContext('CreditService - fetching credit limit for repayment', creditLimitError);
        throw creditLimitError;
      }

      if (!creditLimitData) {
        throw new Error('Credit limit not found for farmer');
      }

      const creditLimitRecord = creditLimitData as FarmerCreditLimit;

      // Calculate new balance (increase credit balance when repaying)
      const newBalance = creditLimitRecord.current_credit_balance + amount;
      const newTotalUsed = Math.max(0, creditLimitRecord.total_credit_used - amount);

      // Ensure new balance doesn't exceed credit limit
      const finalBalance = Math.min(newBalance, creditLimitRecord.max_credit_amount);

      // Update credit limit
      const { error: updateError } = await supabase
        .from('farmer_credit_limits')
        .update({
          current_credit_balance: finalBalance,
          total_credit_used: newTotalUsed,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditLimitRecord.id);

      if (updateError) {
        logger.errorWithContext('CreditService - updating credit limit for repayment', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('farmer_credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_repaid',
          amount: amount,
          balance_after: finalBalance,
          reference_type: referenceId ? 'payment' : undefined,
          reference_id: referenceId,
          description: `Credit repaid via ${repaymentMethod} of KES ${amount.toFixed(2)}`,
          created_by: repaidBy
        })
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('CreditService - creating credit transaction for repayment', transactionError);
        throw transactionError;
      }

      // Send notification to farmer about credit repayment
      try {
        await CreditNotificationService.sendCreditUsedNotification(
          farmerId,
          amount,
          'credit repayment',
          finalBalance
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send credit repaid notification', notificationError);
      }

      return transactionData as FarmerCreditTransaction;
    } catch (error) {
      logger.errorWithContext('CreditService - repayCredit', error);
      throw error;
    }
  }

  // Get overdue payments for a farmer
  static async getOverduePayments(): Promise<any[]> {
    try {
      // This would fetch actual overdue payments from the database
      // For now, we'll return an empty array as a placeholder
      // In a real implementation, this would query for payments that are past due

      const { data, error } = await supabase
        .from('farmer_credit_transactions')
        .select(`
          *,
          farmers:farmer_id (profiles:profiles(full_name, phone))
        `)
        .eq('transaction_type', 'credit_used')
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 days ago
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CreditService - fetching overdue payments', error);
        throw error;
      }

      // Transform data to match expected format
      return (data || []).map((transaction: any) => ({
        farmer_id: transaction.farmer_id,
        farmer_name: transaction.farmers?.profiles?.full_name || 'Unknown Farmer',
        farmer_phone: transaction.farmers?.profiles?.phone || 'No phone',
        outstanding_amount: transaction.amount,
        days_overdue: Math.floor((Date.now() - new Date(transaction.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        last_payment_date: transaction.created_at
      }));
    } catch (error) {
      logger.errorWithContext('CreditService - getOverduePayments', error);
      throw error;
    }
  }

  // Get payment schedules for a farmer
  static async getPaymentSchedules(farmerId: string): Promise<any[]> {
    try {
      // This would fetch actual payment schedules from the database
      // For now, we'll return an empty array as a placeholder
      // In a real implementation, this would query for scheduled payments

      const { data, error } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('due_date', { ascending: true });

      if (error) {
        logger.errorWithContext('CreditService - fetching payment schedules', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('CreditService - getPaymentSchedules', error);
      throw error;
    }
  }
}