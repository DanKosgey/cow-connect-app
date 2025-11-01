import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface FarmerCreditProfile {
  id: string;
  farmer_id: string;
  credit_tier: 'new' | 'established' | 'premium';
  credit_limit_percentage: number;
  max_credit_amount: number;
  current_credit_balance: number;
  total_credit_used: number;
  pending_deductions: number;
  last_settlement_date: string | null;
  next_settlement_date: string | null;
  is_frozen: boolean;
  freeze_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  farmer_id: string;
  transaction_type: 'credit_granted' | 'credit_used' | 'credit_repaid' | 'credit_adjusted' | 'settlement';
  amount: number;
  balance_before: number;
  balance_after: number;
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  reference_id: string | null;
  description: string | null;
  approved_by: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface AgrovetInventory {
  id: string;
  name: string;
  sku: string;
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

export class CreditServiceEssentials {
  // Calculate credit eligibility based on farmer tier and pending payments
  static async calculateCreditEligibility(farmerId: string): Promise<{
    isEligible: boolean;
    creditLimit: number;
    availableCredit: number;
    pendingPayments: number;
  }> {
    try {
      // Get farmer's credit profile
      const { data: creditProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit profile', profileError);
        throw profileError;
      }

      // If no credit profile exists, create a default one
      let profile: FarmerCreditProfile | null = creditProfile as FarmerCreditProfile | null;
      if (!profile) {
        profile = await this.createDefaultCreditProfile(farmerId);
      }

      // Check if credit is frozen
      if (profile.is_frozen) {
        return {
          isEligible: false,
          creditLimit: 0,
          availableCredit: 0,
          pendingPayments: 0
        };
      }

      // Get pending collections for the farmer
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('total_amount')
        .eq('farmer_id', farmerId)
        .neq('status', 'Paid');

      if (collectionsError) {
        logger.errorWithContext('CreditServiceEssentials - fetching pending collections', collectionsError);
        throw collectionsError;
      }

      const pendingPayments = pendingCollections?.reduce((sum, collection) => 
        sum + (collection.total_amount || 0), 0) || 0;

      // Calculate credit limit based on tier
      const creditLimit = pendingPayments * (profile.credit_limit_percentage / 100);
      
      // Apply maximum credit amount cap
      const finalCreditLimit = Math.min(creditLimit, profile.max_credit_amount);
      
      // Available credit is the current credit balance (what they haven't used yet)
      // If they have no credit balance but are eligible, they can request credit
      const availableCredit = profile.current_credit_balance;

      // Farmers are eligible for credit if they have a profile and it's not frozen
      // They can request credit even if they don't have pending payments yet
      return {
        isEligible: !profile.is_frozen,
        creditLimit: parseFloat(finalCreditLimit.toFixed(2)),
        availableCredit: parseFloat(availableCredit.toFixed(2)),
        pendingPayments: parseFloat(pendingPayments.toFixed(2))
      };
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - calculateCreditEligibility', error);
      throw error;
    }
  }

  // Create default credit profile for a farmer
  static async createDefaultCreditProfile(farmerId: string): Promise<FarmerCreditProfile> {
    try {
      // Determine farmer tier based on registration date
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('created_at')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CreditServiceEssentials - fetching farmer data', farmerError);
        throw farmerError;
      }

      let creditTier: 'new' | 'established' | 'premium' = 'new';
      let creditPercentage = 30.00;
      let maxAmount = 50000.00;

      if (farmerData) {
        const registrationDate = new Date(farmerData.created_at);
        const today = new Date();
        const monthsSinceRegistration = 
          (today.getFullYear() - registrationDate.getFullYear()) * 12 + 
          (today.getMonth() - registrationDate.getMonth());

        if (monthsSinceRegistration > 12) {
          creditTier = 'premium';
          creditPercentage = 70.00;
          maxAmount = 100000.00;
        } else if (monthsSinceRegistration > 3) {
          creditTier = 'established';
          creditPercentage = 60.00;
          maxAmount = 75000.00;
        }
      }

      const { data, error } = await supabase
        .from('farmer_credit_profiles')
        .insert({
          farmer_id: farmerId,
          credit_tier: creditTier,
          credit_limit_percentage: creditPercentage,
          max_credit_amount: maxAmount,
          current_credit_balance: 0.00,
          total_credit_used: 0.00,
          pending_deductions: 0.00,
          is_frozen: false
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CreditServiceEssentials - creating default credit profile', error);
        throw error;
      }

      return data as FarmerCreditProfile;
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - createDefaultCreditProfile', error);
      throw error;
    }
  }

  // Grant credit to a farmer based on their pending payments
  static async grantCreditToFarmer(farmerId: string, grantedBy?: string): Promise<boolean> {
    try {
      // Calculate credit eligibility
      const creditInfo = await this.calculateCreditEligibility(farmerId);
      
      if (!creditInfo.isEligible) {
        throw new Error('Farmer is not eligible for credit');
      }

      // Get current credit profile
      const { data: creditProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit profile for granting', profileError);
        throw profileError;
      }

      if (!creditProfile) {
        throw new Error('Credit profile not found for farmer');
      }

      const profile = creditProfile as FarmerCreditProfile;
      
      // If farmer has no pending payments, we can still grant a default amount based on their tier
      if (creditInfo.pendingPayments <= 0) {
        // Use a default calculation based on their credit tier
        const defaultAmount = profile.max_credit_amount * 0.1; // 10% of their max credit limit
        creditInfo.creditLimit = Math.min(defaultAmount, profile.max_credit_amount);
      }
      
      // If credit has already been granted, don't grant again
      if (profile.current_credit_balance > 0) {
        throw new Error('Credit has already been granted to this farmer');
      }

      // Update credit profile with new balance
      const newBalance = creditInfo.creditLimit;
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          current_credit_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        logger.errorWithContext('CreditServiceEssentials - updating credit profile', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_granted',
          amount: newBalance,
          balance_before: 0,
          balance_after: newBalance,
          description: creditInfo.pendingPayments > 0 
            ? `Credit granted based on pending payments of KES ${creditInfo.pendingPayments.toFixed(2)}`
            : `Credit granted based on farmer tier and profile`,
          approved_by: grantedBy,
          approval_status: 'approved'
        })
        .select();

      if (transactionError) {
        logger.errorWithContext('CreditServiceEssentials - creating credit transaction', transactionError);
        throw transactionError;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - grantCreditToFarmer', error);
      throw error;
    }
  }

  // Adjust credit limit for a farmer
  static async adjustCreditLimit(farmerId: string, newLimit: number, adjustedBy?: string): Promise<boolean> {
    try {
      // Get current credit profile
      const { data: creditProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit profile for adjustment', profileError);
        throw profileError;
      }

      if (!creditProfile) {
        throw new Error('Credit profile not found for farmer');
      }

      const profile = creditProfile as FarmerCreditProfile;
      
      // Update credit profile with new limit
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          max_credit_amount: newLimit,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        logger.errorWithContext('CreditServiceEssentials - updating credit profile limit', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_adjusted',
          amount: newLimit - profile.max_credit_amount,
          balance_before: profile.current_credit_balance,
          balance_after: profile.current_credit_balance,
          description: `Credit limit adjusted from KES ${profile.max_credit_amount.toFixed(2)} to KES ${newLimit.toFixed(2)}`,
          approved_by: adjustedBy,
          approval_status: 'approved'
        })
        .select();

      if (transactionError) {
        logger.errorWithContext('CreditServiceEssentials - creating credit adjustment transaction', transactionError);
        throw transactionError;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - adjustCreditLimit', error);
      throw error;
    }
  }

  // Freeze/unfreeze credit for a farmer
  static async freezeUnfreezeCredit(farmerId: string, freeze: boolean, reason: string, actionedBy?: string): Promise<boolean> {
    try {
      // Get current credit profile
      const { data: creditProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit profile for freeze/unfreeze', profileError);
        throw profileError;
      }

      if (!creditProfile) {
        throw new Error('Credit profile not found for farmer');
      }

      const profile = creditProfile as FarmerCreditProfile;
      
      // Update credit profile freeze status
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          is_frozen: freeze,
          freeze_reason: freeze ? reason : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        logger.errorWithContext('CreditServiceEssentials - updating credit profile freeze status', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_adjusted',
          amount: 0,
          balance_before: profile.current_credit_balance,
          balance_after: profile.current_credit_balance,
          description: freeze ? `Credit line frozen: ${reason}` : 'Credit line unfrozen',
          approved_by: actionedBy,
          approval_status: 'approved'
        })
        .select();

      if (transactionError) {
        logger.errorWithContext('CreditServiceEssentials - creating credit freeze/unfreeze transaction', transactionError);
        throw transactionError;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - freezeUnfreezeCredit', error);
      throw error;
    }
  }

  // Use credit for an agrovet purchase
  static async useCreditForPurchase(
    farmerId: string,
    productId: string,
    quantity: number,
    usedBy?: string
  ): Promise<{ success: boolean; transactionId?: string; errorMessage?: string }> {
    return this.processCreditTransaction(farmerId, productId, quantity, usedBy);
  }

  // Process credit transaction for approved requests
  static async processCreditTransaction(
    farmerId: string,
    productId: string,
    quantity: number,
    usedBy?: string
  ): Promise<{ success: boolean; transactionId?: string; errorMessage?: string }> {
    try {
      // Get product details
      const { data: productData, error: productError } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (productError) {
        logger.errorWithContext('CreditServiceEssentials - fetching product', productError);
        throw productError;
      }

      if (!productData) {
        return { success: false, errorMessage: 'Product not found' };
      }

      const product = productData as AgrovetInventory;

      // Check if product is credit eligible
      if (!product.is_credit_eligible) {
        return { success: false, errorMessage: 'This product is not eligible for credit purchase' };
      }

      // Check available credit
      const creditInfo = await this.calculateCreditEligibility(farmerId);
      if (!creditInfo.isEligible) {
        return { success: false, errorMessage: 'Farmer is not eligible for credit' };
      }

      // Calculate total amount
      const totalAmount = quantity * product.selling_price;

      // Check if farmer has enough credit
      if (creditInfo.availableCredit < totalAmount) {
        return { success: false, errorMessage: 'Insufficient credit balance' };
      }

      // Get current credit profile
      const { data: creditProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit profile for purchase', profileError);
        throw profileError;
      }

      if (!creditProfile) {
        return { success: false, errorMessage: 'Credit profile not found' };
      }

      const profile = creditProfile as FarmerCreditProfile;

      // Calculate new balance
      const newBalance = profile.current_credit_balance - totalAmount;
      const newTotalUsed = profile.total_credit_used + totalAmount;

      // Update credit profile
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          current_credit_balance: newBalance,
          total_credit_used: newTotalUsed,
          pending_deductions: profile.pending_deductions + totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        logger.errorWithContext('CreditServiceEssentials - updating credit profile for purchase', updateError);
        throw updateError;
      }

      // Create credit transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_used',
          amount: totalAmount,
          balance_before: profile.current_credit_balance,
          balance_after: newBalance,
          product_id: productId,
          product_name: product.name,
          quantity: quantity,
          unit_price: product.selling_price,
          description: `Credit used for ${product.name} (${quantity} ${product.unit})`,
          approved_by: usedBy,
          approval_status: 'approved'
        })
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('CreditServiceEssentials - creating credit transaction for purchase', transactionError);
        throw transactionError;
      }

      return { success: true, transactionId: (transactionData as CreditTransaction).id };
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - useCreditForPurchase', error);
      return { success: false, errorMessage: (error as Error).message };
    }
  }

  // Get farmer's credit profile
  static async getCreditProfile(farmerId: string): Promise<FarmerCreditProfile | null> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit profile', error);
        throw error;
      }

      return data as FarmerCreditProfile | null;
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - getCreditProfile', error);
      throw error;
    }
  }

  // Get farmer's credit transactions
  static async getCreditTransactions(farmerId: string, limit: number = 10): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit transactions', error);
        throw error;
      }

      return data as CreditTransaction[];
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - getCreditTransactions', error);
      throw error;
    }
  }

  // Get agrovet inventory items
  static async getAgrovetInventory(): Promise<AgrovetInventory[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('is_credit_eligible', true)
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('CreditServiceEssentials - fetching agrovet inventory', error);
        throw error;
      }

      return data as AgrovetInventory[];
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - getAgrovetInventory', error);
      throw error;
    }
  }

  // Perform monthly settlement
  static async performMonthlySettlement(farmerId: string, settledBy?: string): Promise<boolean> {
    try {
      // Get farmer's credit profile
      const { data: creditProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit profile for settlement', profileError);
        throw profileError;
      }

      if (!creditProfile) {
        throw new Error('Credit profile not found for farmer');
      }

      const profile = creditProfile as FarmerCreditProfile;

      // Reset credit balance for next period
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          current_credit_balance: profile.max_credit_amount,
          pending_deductions: 0,
          last_settlement_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        logger.errorWithContext('CreditServiceEssentials - updating credit profile for settlement', updateError);
        throw updateError;
      }

      // Create settlement transaction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'settlement',
          amount: profile.pending_deductions,
          balance_before: profile.current_credit_balance,
          balance_after: profile.max_credit_amount,
          description: `Monthly settlement completed. KES ${profile.pending_deductions.toFixed(2)} deducted from milk payments.`,
          approved_by: settledBy,
          approval_status: 'approved'
        })
        .select();

      if (transactionError) {
        logger.errorWithContext('CreditServiceEssentials - creating settlement transaction', transactionError);
        throw transactionError;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - performMonthlySettlement', error);
      throw error;
    }
  }
}