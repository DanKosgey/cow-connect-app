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
  status?: 'pending' | 'active' | 'paid' | 'cancelled' | 'disputed';
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
  payment_status?: 'pending' | 'processing' | 'paid' | 'overdue' | 'cancelled';
  purchased_by?: string;
  created_at: string;
}

export interface CreditRequestParams {
  farmerId: string;
  itemId: string;
  quantity: number;
  totalAmount: number;
  requestedBy?: string;
}

export class CreditService {
  // Request credit for a purchase (Farmer initiates)
  static async requestCreditPurchase(params: CreditRequestParams): Promise<any> {
    try {
      // 1. Check Auto-Approval Setting (Application level check for reliability)
      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'credit_config')
        .single();

      const autoApprove = settings?.value?.auto_approve === true;

      // 2. Check Credit Limit (Fail early if insufficient)
      const creditInfo = await this.calculateAvailableCredit(params.farmerId);
      if (creditInfo.availableCredit < params.totalAmount) {
        throw new Error(`Insufficient credit limit. Available: ${formatCurrency(creditInfo.availableCredit)}`);
      }

      // 3. Create Credit Request
      // We explicitly set status based on app check. 
      // If autoApprove is true, we insert 'approved'. Trigger condition (NEW.status='pending') will be false, so trigger acts as no-op.
      // This ensures reliability regardless of trigger presence.
      const { data: requestData, error: requestError } = await supabase
        .from('credit_requests')
        .insert({
          farmer_id: params.farmerId,
          product_id: params.itemId,
          quantity: params.quantity,
          total_amount: params.totalAmount,
          status: autoApprove ? 'approved' : 'pending',
          request_date: new Date().toISOString(),
          processed_at: autoApprove ? new Date().toISOString() : null,
          processed_by: autoApprove ? 'SYSTEM_AUTO_APPROVE' : null
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // 4. If Auto-Approve, IMMEDIATELY create Purchase & Transaction
      if (autoApprove) {
        // Fetch product price since we need unit price for purchase record
        const { data: product } = await supabase
          .from('agrovet_inventory')
          .select('selling_price')
          .eq('id', params.itemId)
          .single();

        // Create Purchase
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('agrovet_purchases')
          .insert({
            farmer_id: params.farmerId,
            item_id: params.itemId,
            quantity: params.quantity,
            unit_price: product?.selling_price || 0,
            total_amount: params.totalAmount,
            payment_method: 'credit',
            status: 'pending_collection', // Send to Creditor
            purchased_by: params.requestedBy
          })
          .select()
          .single();

        if (purchaseError) throw purchaseError;

        // Use Credit (Transaction)
        await this.useCreditForPurchase(
          params.farmerId,
          purchaseData.id,
          params.totalAmount,
          'SYSTEM_AUTO_APPROVE'
        );

        return { request: requestData, purchase: purchaseData, autoApproved: true };
      }

      return { request: requestData, autoApproved: false };

    } catch (error) {
      logger.errorWithContext('CreditService - requestCreditPurchase', error);
      throw error;
    }
  }
  // Approve a credit request
  static async approveCreditRequest(requestId: string, approvedBy?: string): Promise<void> {
    try {
      // Input validation
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      // Get the credit request details
      const { data: request, error: requestError } = await supabase
        .from('credit_requests')
        .select(`
          *,
          farmers:farmer_id (id, full_name),
          agrovet_products:product_id (id, name, unit_price, selling_price)
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

      // Check credit limit before approving
      const creditInfo = await this.calculateAvailableCredit(request.farmer_id);
      if (creditInfo.availableCredit < request.total_amount) {
        throw new Error(`Insufficient credit. Available: ${formatCurrency(creditInfo.availableCredit)}, Requested: ${formatCurrency(request.total_amount)}`);
      }

      // Create Agrovet Purchase record (So Creditor checks it)
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('agrovet_purchases')
        .insert({
          farmer_id: request.farmer_id,
          item_id: request.product_id,
          quantity: request.quantity || 1, // Default to 1 if not specified (legacy requests)
          unit_price: request.agrovet_products?.unit_price || request.agrovet_products?.selling_price || 0,
          total_amount: request.total_amount,
          payment_method: 'credit',
          status: 'pending_collection',
          purchased_by: approvedBy
        })
        .select()
        .single();

      if (purchaseError) {
        logger.errorWithContext('CreditService - creating agrovet purchase on approval', purchaseError);
        throw purchaseError;
      }

      // Update the credit request status
      const { error: updateError } = await supabase
        .from('credit_requests')
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

      // Create credit transaction (Deduct from Limit)
      // We use the purchase ID as reference
      await this.useCreditForPurchase(
        request.farmer_id,
        purchaseData.id,
        request.total_amount,
        approvedBy
      );

      // Update purchase with credit transaction ID (Best effort)
      // Note: useCreditForPurchase returns the transaction, we could link it if needed.
      // However, useCreditForPurchase logic might differ slightly if we want to separate "Purchase" from "Request Approval".
      // Actually `useCreditForPurchase` creates the transaction. 

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
        .from('credit_requests')
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
        .from('credit_requests')
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

  // Get dashboard statistics for credit management
  static async getDashboardStats(): Promise<{
    pendingApplications: number;
    totalCreditIssued: number;
    activeFarmers: number;
    creditRepaymentRate: number;
  }> {
    try {
      // Get pending credit applications
      const { data: pendingData, error: pendingError } = await supabase
        .from('credit_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;
      const pendingApplications = pendingData?.length || 0;

      // Get total credit issued
      const { data: totalCreditData, error: totalCreditError } = await supabase
        .from('credit_requests')
        .select('total_amount')
        .eq('status', 'approved');

      if (totalCreditError) throw totalCreditError;

      const totalCreditIssued = totalCreditData?.reduce((sum, request) => sum + (request.total_amount || 0), 0) || 0;

      // Get active farmers with credit (using the correct table name)
      const { count: activeFarmers, error: farmersError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select('*', { count: 'exact', head: true })
        .eq('is_frozen', false); // Using is_frozen = false instead of is_active = true

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
      // Get farmer's credit limit configuration (using the correct table name)
      const { data: creditLimitData, error: creditLimitError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_frozen', false) // Using is_frozen = false instead of is_active = true
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

  // Create default credit limit for a farmer (using the correct table name)
  static async createDefaultCreditLimit(farmerId: string): Promise<FarmerCreditLimit> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .insert({
          farmer_id: farmerId,
          credit_limit_percentage: 70.00,
          max_credit_amount: 100000.00,
          current_credit_balance: 0.00,
          total_credit_used: 0.00,
          is_frozen: false // Using is_frozen = false instead of is_active = true
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

      // Get current credit limit record (using the correct table name)
      const { data: creditLimitData, error: creditLimitError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_frozen', false) // Using is_frozen = false instead of is_active = true
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
        logger.errorWithContext('CreditService - updating credit limit for purchase', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_used',
          amount: amount,
          balance_before: creditLimitRecord.current_credit_balance,
          balance_after: newBalance,
          reference_type: 'agrovet_purchase',
          reference_id: purchaseId,
          description: `Credit used for agrovet purchase`,
          created_by: usedBy
        })
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('CreditService - creating credit transaction', transactionError);
        throw transactionError;
      }

      return transactionData as FarmerCreditTransaction;
    } catch (error) {
      logger.errorWithContext('CreditService - useCreditForPurchase', error);
      throw error;
    }
  }

  // Grant credit to a farmer (using the correct table name)
  static async grantCreditToFarmer(farmerId: string, grantedBy?: string): Promise<void> {
    try {
      // Get farmer's pending payments
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('total_amount')
        .eq('farmer_id', farmerId)
        .neq('status', 'Paid');

      if (collectionsError) {
        logger.errorWithContext('CreditService - fetching pending collections for grant', collectionsError);
        throw collectionsError;
      }

      const pendingPayments = pendingCollections?.reduce((sum, collection) =>
        sum + (collection.total_amount || 0), 0) || 0;

      // Calculate credit amount (70% of pending payments, max 100,000)
      const creditAmount = Math.min(pendingPayments * 0.7, 100000);

      // Check if farmer already has a credit profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) {
        logger.errorWithContext('CreditService - checking existing credit profile', profileError);
        throw profileError;
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
          .update({
            current_credit_balance: creditAmount,
            total_credit_used: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id);

        if (updateError) {
          logger.errorWithContext('CreditService - updating existing credit profile', updateError);
          throw updateError;
        }
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
          .insert({
            farmer_id: farmerId,
            credit_limit_percentage: 70.00,
            max_credit_amount: 100000.00,
            current_credit_balance: creditAmount,
            total_credit_used: 0,
            is_frozen: false // Using is_frozen = false instead of is_active = true
          });

        if (insertError) {
          logger.errorWithContext('CreditService - creating new credit profile', insertError);
          throw insertError;
        }
      }

      // Create credit transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_granted',
          amount: creditAmount,
          balance_before: existingProfile?.current_credit_balance || 0,
          balance_after: creditAmount,
          reference_type: 'credit_grant',
          description: `Credit granted by admin`,
          created_by: grantedBy
        });

      if (transactionError) {
        logger.errorWithContext('CreditService - creating credit grant transaction', transactionError);
        throw transactionError;
      }
    } catch (error) {
      logger.errorWithContext('CreditService - grantCreditToFarmer', error);
      throw error;
    }
  }

  // Adjust credit limit for a farmer (using the correct table name)
  static async adjustCreditLimit(
    farmerId: string,
    newPercentage: number,
    newMaxAmount: number
  ): Promise<void> {
    try {
      // Get existing credit profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) {
        logger.errorWithContext('CreditService - fetching credit profile for adjustment', profileError);
        throw profileError;
      }

      if (!existingProfile) {
        throw new Error('Credit profile not found for farmer');
      }

      // Update credit profile with new max amount and percentage
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .update({
          credit_limit_percentage: newPercentage,
          max_credit_amount: newMaxAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        logger.errorWithContext('CreditService - updating credit profile', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_adjusted',
          amount: newMaxAmount,
          balance_before: existingProfile.current_credit_balance,
          balance_after: existingProfile.current_credit_balance,
          reference_type: 'credit_adjustment',
          description: `Credit limit adjusted to ${newPercentage}% of pending payments, max amount: ${newMaxAmount}`,
          created_by: null
        });

      if (transactionError) {
        logger.errorWithContext('CreditService - creating credit adjustment transaction', transactionError);
        throw transactionError;
      }
    } catch (error) {
      logger.errorWithContext('CreditService - adjustCreditLimit', error);
      throw error;
    }
  }

  // Get farmer's credit history
  static async getCreditHistory(farmerId: string): Promise<FarmerCreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
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
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_frozen', false)
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
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_frozen', false)
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
        .from('farmer_credit_profiles')
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
          farmers:farmer_id (profiles(full_name, phone))
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

  // Get credit transactions with status filtering
  static async getCreditTransactionsByStatus(farmerId: string, status?: string): Promise<FarmerCreditTransaction[]> {
    try {
      let query = supabase
        .from('credit_transactions')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.errorWithContext('CreditService - fetching credit transactions by status', error);
        throw error;
      }

      return data as FarmerCreditTransaction[];
    } catch (error) {
      logger.errorWithContext('CreditService - getCreditTransactionsByStatus', error);
      throw error;
    }
  }

  // Update credit transaction status
  static async updateCreditTransactionStatus(transactionId: string, status: 'pending' | 'active' | 'paid' | 'cancelled' | 'disputed'): Promise<void> {
    try {
      const { error } = await supabase
        .from('credit_transactions')
        .update({ status: status })
        .eq('id', transactionId);

      if (error) {
        logger.errorWithContext('CreditService - updating credit transaction status', error);
        throw error;
      }
    } catch (error) {
      logger.errorWithContext('CreditService - updateCreditTransactionStatus', error);
      throw error;
    }
  }

  // Get agrovet purchases with payment status filtering
  static async getAgrovetPurchasesByPaymentStatus(farmerId: string, paymentStatus?: string): Promise<AgrovetPurchase[]> {
    try {
      let query = supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory(name, category)
        `)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }

      const { data, error } = await query;

      if (error) {
        logger.errorWithContext('CreditService - fetching agrovet purchases by payment status', error);
        throw error;
      }

      return data as AgrovetPurchase[];
    } catch (error) {
      logger.errorWithContext('CreditService - getAgrovetPurchasesByPaymentStatus', error);
      throw error;
    }
  }

  // Update agrovet purchase payment status
  static async updateAgrovetPurchasePaymentStatus(purchaseId: string, paymentStatus: 'pending' | 'processing' | 'paid' | 'overdue' | 'cancelled'): Promise<void> {
    try {
      const { error } = await supabase
        .from('agrovet_purchases')
        .update({ payment_status: paymentStatus })
        .eq('id', purchaseId);

      if (error) {
        logger.errorWithContext('CreditService - updating agrovet purchase payment status', error);
        throw error;
      }
    } catch (error) {
      logger.errorWithContext('CreditService - updateAgrovetPurchasePaymentStatus', error);
      throw error;
    }
  }

  // Get credit limits for a specific farmer
  static async getCreditLimitsForFarmer(farmerId: string): Promise<FarmerCreditLimit | null> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('is_frozen', false) // Using is_frozen = false instead of is_active = true
        .maybeSingle();

      if (error) {
        logger.errorWithContext('CreditService - fetching credit limits for farmer', error);
        throw error;
      }

      return data as FarmerCreditLimit | null;
    } catch (error) {
      logger.errorWithContext('CreditService - getCreditLimitsForFarmer', error);
      throw error;
    }
  }

  // Get all credit limits
  static async getAllCreditLimits(): Promise<FarmerCreditLimit[]> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select('*')
        .eq('is_frozen', false); // Using is_frozen = false instead of is_active = true

      if (error) {
        logger.errorWithContext('CreditService - fetching all credit limits', error);
        throw error;
      }

      return data as FarmerCreditLimit[];
    } catch (error) {
      logger.errorWithContext('CreditService - getAllCreditLimits', error);
      throw error;
    }
  }
}