import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { formatCurrency } from '@/utils/formatters';
import { ProductPackaging } from '@/services/agrovet-inventory-service';

// Improved request deduplication with timeout
let fetchAgrovetInventoryPromise: Promise<AgrovetInventory[]> | null = null;
let fetchAgrovetInventoryTimestamp: number | null = null;
const FETCH_CACHE_TIMEOUT = 30000; // 30 seconds cache timeout

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
  product_packaging?: ProductPackaging[];
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
        try {
          profile = await this.createDefaultCreditProfile(farmerId);
        } catch (creationError) {
          console.warn("Failed to create default credit profile:", creationError);
          // Return default values if profile creation fails
          return {
            isEligible: false,
            creditLimit: 0,
            availableCredit: 0,
            pendingPayments: 0
          };
        }
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
      // Return safe defaults in case of error
      return {
        isEligible: false,
        creditLimit: 0,
        availableCredit: 0,
        pendingPayments: 0
      };
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
    packagingOptionId: string | null,
    usedBy?: string
  ): Promise<{ success: boolean; transactionId?: string; errorMessage?: string }> {
    return this.processCreditTransaction(farmerId, productId, quantity, packagingOptionId, usedBy);
  }

  // Enhanced credit limit enforcement with multiple validation layers
  static async enforceCreditLimit(
    farmerId: string, 
    requestedAmount: number,
    transactionType: string = 'credit_used'
  ): Promise<{ 
    isAllowed: boolean; 
    reason: string;
    availableCredit: number;
    creditLimit: number;
    utilizationPercentage: number;
  }> {
    try {
      // Get farmer's credit profile
      const creditProfile = await this.getCreditProfile(farmerId);
      
      if (!creditProfile) {
        return {
          isAllowed: false,
          reason: 'No credit profile found for farmer',
          availableCredit: 0,
          creditLimit: 0,
          utilizationPercentage: 0
        };
      }

      // Check if credit is frozen
      if (creditProfile.is_frozen) {
        return {
          isAllowed: false,
          reason: creditProfile.freeze_reason || 'Credit account is frozen',
          availableCredit: 0,
          creditLimit: creditProfile.max_credit_amount,
          utilizationPercentage: 100
        };
      }

      // Check if requested amount exceeds available credit
      if (requestedAmount > creditProfile.current_credit_balance) {
        return {
          isAllowed: false,
          reason: `Requested amount (${formatCurrency(requestedAmount)}) exceeds available credit (${formatCurrency(creditProfile.current_credit_balance)})`,
          availableCredit: creditProfile.current_credit_balance,
          creditLimit: creditProfile.max_credit_amount,
          utilizationPercentage: creditProfile.max_credit_amount > 0 
            ? ((creditProfile.max_credit_amount - creditProfile.current_credit_balance) / creditProfile.max_credit_amount) * 100 
            : 100
        };
      }

      // Check if this transaction would exceed the credit limit
      const newBalance = creditProfile.current_credit_balance - requestedAmount;
      const utilizationPercentage = creditProfile.max_credit_amount > 0 
        ? ((creditProfile.max_credit_amount - newBalance) / creditProfile.max_credit_amount) * 100 
        : 100;

      // Warning thresholds
      const warningThreshold = 80;
      const criticalThreshold = 95;

      if (utilizationPercentage > criticalThreshold) {
        return {
          isAllowed: false,
          reason: `Transaction would result in critical credit utilization (${utilizationPercentage.toFixed(1)}%). Maximum allowed is ${criticalThreshold}%.`,
          availableCredit: creditProfile.current_credit_balance,
          creditLimit: creditProfile.max_credit_amount,
          utilizationPercentage
        };
      }

      // Additional checks for specific transaction types
      if (transactionType === 'credit_used') {
        // For credit usage, check if farmer has any pending settlements that might affect this
        if (creditProfile.pending_deductions > 0) {
          const totalObligations = creditProfile.pending_deductions + requestedAmount;
          const obligationsToLimitRatio = creditProfile.max_credit_amount > 0 
            ? (totalObligations / creditProfile.max_credit_amount) * 100 
            : 100;
            
          if (obligationsToLimitRatio > 100) {
            return {
              isAllowed: false,
              reason: `Total obligations (${formatCurrency(totalObligations)}) would exceed credit limit (${formatCurrency(creditProfile.max_credit_amount)})`,
              availableCredit: creditProfile.current_credit_balance,
              creditLimit: creditProfile.max_credit_amount,
              utilizationPercentage
            };
          }
        }
      }

      return {
        isAllowed: true,
        reason: 'Credit limit enforcement passed',
        availableCredit: creditProfile.current_credit_balance,
        creditLimit: creditProfile.max_credit_amount,
        utilizationPercentage
      };
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - enforceCreditLimit', error);
      throw error;
    }
  }

  // Process credit transaction with enhanced enforcement
  static async processCreditTransaction(
    farmerId: string,
    productId: string,
    quantity: number,
    packagingOptionId: string | null,
    usedBy?: string
  ): Promise<{ success: boolean; transactionId?: string; errorMessage?: string; enforcementDetails?: any }> {
    try {
      // Validate inputs
      if (!farmerId) {
        return { success: false, errorMessage: 'Farmer ID is required' };
      }
      
      if (!productId) {
        return { success: false, errorMessage: 'Product ID is required' };
      }
      
      if (!quantity || quantity <= 0) {
        return { success: false, errorMessage: 'Valid quantity is required' };
      }

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
        return { success: false, errorMessage: 'Product not found or no longer available' };
      }

      const product = productData as AgrovetInventory;

      // Check if product is credit eligible
      if (!product.is_credit_eligible) {
        return { success: false, errorMessage: 'This product is not eligible for credit purchase' };
      }

      // Get packaging option if specified
      let packagingOption = null;
      let unitPrice = product.cost_price; // fallback to cost_price
      
      if (packagingOptionId) {
        // Fetch the specific packaging option
        const { data: packagingData, error: packagingError } = await supabase
          .from('product_packaging')
          .select('*')
          .eq('id', packagingOptionId)
          .eq('product_id', productId)
          .maybeSingle();
          
        if (packagingError) {
          logger.errorWithContext('CreditServiceEssentials - fetching packaging option', packagingError);
          throw packagingError;
        }
        
        if (packagingData) {
          packagingOption = packagingData as ProductPackaging;
          unitPrice = packagingOption.price;
        }
      } else {
        // If no packaging option specified, try to get the first available packaging option
        const { data: packagingOptions, error: packagingOptionsError } = await supabase
          .from('product_packaging')
          .select('*')
          .eq('product_id', productId)
          .eq('is_credit_eligible', true)
          .order('price', { ascending: true })
          .limit(1);
          
        if (!packagingOptionsError && packagingOptions && packagingOptions.length > 0) {
          packagingOption = packagingOptions[0] as ProductPackaging;
          unitPrice = packagingOption.price;
        }
      }

      // Calculate total amount
      const totalAmount = quantity * unitPrice;

      // Enhanced credit limit enforcement
      const enforcementResult = await this.enforceCreditLimit(farmerId, totalAmount, 'credit_used');
      
      if (!enforcementResult.isAllowed) {
        return { 
          success: false, 
          errorMessage: enforcementResult.reason,
          enforcementDetails: enforcementResult
        };
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

      // Double-check balance before processing (race condition protection)
      if (totalAmount > profile.current_credit_balance) {
        return { 
          success: false, 
          errorMessage: `Insufficient credit balance. Available: ${formatCurrency(profile.current_credit_balance)}, Required: ${formatCurrency(totalAmount)}` 
        };
      }

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
          unit_price: unitPrice,
          reference_id: packagingOption?.id || null,
          description: packagingOption 
            ? `Credit used for ${product.name} (${quantity} × ${packagingOption.name} @ ${formatCurrency(unitPrice)} each). Utilization: ${enforcementResult.utilizationPercentage.toFixed(1)}%`
            : `Credit used for ${product.name} (${quantity} ${product.unit} @ ${formatCurrency(unitPrice)} each). Utilization: ${enforcementResult.utilizationPercentage.toFixed(1)}%`,
          approved_by: usedBy,
          approval_status: 'approved'
        })
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('CreditServiceEssentials - creating credit transaction for purchase', transactionError);
        throw transactionError;
      }

      return { 
        success: true, 
        transactionId: (transactionData as CreditTransaction).id,
        enforcementDetails: enforcementResult
      };
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

  // Get agrovet inventory items with improved deduplication and timeout
  static async getAgrovetInventory(): Promise<AgrovetInventory[]> {
    const now = Date.now();
    
    // Check if we have a recent cached result (within timeout)
    if (fetchAgrovetInventoryPromise && fetchAgrovetInventoryTimestamp) {
      const age = now - fetchAgrovetInventoryTimestamp;
      if (age < FETCH_CACHE_TIMEOUT) {
        console.log(`CreditServiceEssentials: Using cached fetch promise (age: ${age}ms)`);
        return fetchAgrovetInventoryPromise;
      } else {
        console.log(`CreditServiceEssentials: Cache expired (age: ${age}ms), fetching fresh data`);
        // Clear expired cache
        fetchAgrovetInventoryPromise = null;
        fetchAgrovetInventoryTimestamp = null;
      }
    }

    // Return existing promise if fetch is already in progress
    if (fetchAgrovetInventoryPromise) {
      console.log('CreditServiceEssentials: Using existing fetch promise');
      return fetchAgrovetInventoryPromise;
    }

    console.log('CreditServiceEssentials: Fetching agrovet inventory');
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    fetchAgrovetInventoryTimestamp = now; // Set timestamp when we start the fetch
    
    fetchAgrovetInventoryPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('agrovet_inventory')
          .select(`
            *,
            product_packaging(*)
          `)
          .eq('is_credit_eligible', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('CreditServiceEssentials: Error fetching agrovet inventory:', error);
          logger.errorWithContext('CreditServiceEssentials - fetching agrovet inventory', error);
          // Clear the promise on error so we can retry
          fetchAgrovetInventoryPromise = null;
          // Return empty array instead of throwing to prevent hanging
          return [];
        }

        // Ensure proper type conversion for numeric fields in both inventory items and packaging options
        const convertedData = data?.map(item => ({
          ...item,
          cost_price: typeof item.cost_price === 'string' ? parseFloat(item.cost_price) : item.cost_price,
          current_stock: typeof item.current_stock === 'string' ? parseFloat(item.current_stock) : item.current_stock,
          reorder_level: typeof item.reorder_level === 'string' ? parseFloat(item.reorder_level) : item.reorder_level,
          product_packaging: item.product_packaging?.map(packaging => ({
            ...packaging,
            price: typeof packaging.price === 'string' ? parseFloat(packaging.price) : packaging.price,
            weight: typeof packaging.weight === 'string' ? parseFloat(packaging.weight) : packaging.weight
          })) || []
        })) || [];

        const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        console.log(`CreditServiceEssentials: Successfully fetched agrovet inventory in ${(endTime - startTime).toFixed(2)}ms, count:`, convertedData?.length || 0);
        return convertedData as AgrovetInventory[];
      } catch (error) {
        console.error('CreditServiceEssentials: Exception in getAgrovetInventory:', error);
        logger.errorWithContext('CreditServiceEssentials - getAgrovetInventory', error);
        // Clear the promise on error so we can retry
        fetchAgrovetInventoryPromise = null;
        // Return empty array instead of throwing to prevent hanging
        return [];
      }
    })();

    return fetchAgrovetInventoryPromise;
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

  // Clear agrovet inventory cache
  static clearAgrovetInventoryCache(): void {
    fetchAgrovetInventoryPromise = null;
    fetchAgrovetInventoryTimestamp = null;
  }
}