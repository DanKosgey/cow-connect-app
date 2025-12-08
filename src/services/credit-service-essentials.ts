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
  // Add status field
  status?: 'pending' | 'active' | 'paid' | 'cancelled' | 'disputed';
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
        creditLimit: parseFloat((finalCreditLimit || 0).toFixed(2)),
        availableCredit: parseFloat((availableCredit || 0).toFixed(2)),
        pendingPayments: parseFloat((pendingPayments || 0).toFixed(2))
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

      // Convert user ID to staff ID if provided
      // If the user is an admin, we'll set approved_by to NULL since admins don't have staff records
      let staffId = null;
      if (grantedBy) {
        try {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', grantedBy)
            .maybeSingle();
          
          if (!staffError && staffData) {
            staffId = staffData.id;
          } else {
            // If no staff record found, it might be an admin user
            // We'll leave staffId as null for admins
            logger.info(`CreditServiceEssentials - No staff record found for user (might be admin)`, {
              userId: grantedBy
            });
          }
        } catch (staffLookupError) {
          logger.errorWithContext('CreditServiceEssentials - fetching staff record for grant', staffLookupError);
          // Continue with staffId as null
        }
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
            ? `Credit granted based on pending payments of KES ${(creditInfo.pendingPayments || 0).toFixed(2)}`
            : `Credit granted based on farmer tier and profile`,
          approved_by: staffId, // Use staff ID or NULL for admins
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

      // Convert user ID to staff ID if provided
      // If the user is an admin, we'll set approved_by to NULL since admins don't have staff records
      let staffId = null;
      if (adjustedBy) {
        try {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', adjustedBy)
            .maybeSingle();
          
          if (!staffError && staffData) {
            staffId = staffData.id;
          } else {
            // If no staff record found, it might be an admin user
            // We'll leave staffId as null for admins
            logger.info(`CreditServiceEssentials - No staff record found for user (might be admin)`, {
              userId: adjustedBy
            });
          }
        } catch (staffLookupError) {
          logger.errorWithContext('CreditServiceEssentials - fetching staff record for adjustment', staffLookupError);
          // Continue with staffId as null
        }
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
          description: `Credit limit adjusted from KES ${(profile.max_credit_amount || 0).toFixed(2)} to KES ${(newLimit || 0).toFixed(2)}`,
          approved_by: staffId, // Use staff ID or NULL for admins
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

      // Convert user ID to staff ID if provided
      // If the user is an admin, we'll set approved_by to NULL since admins don't have staff records
      let staffId = null;
      if (actionedBy) {
        try {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', actionedBy)
            .maybeSingle();
          
          if (!staffError && staffData) {
            staffId = staffData.id;
          } else {
            // If no staff record found, it might be an admin user
            // We'll leave staffId as null for admins
            logger.info(`CreditServiceEssentials - No staff record found for user (might be admin)`, {
              userId: actionedBy
            });
          }
        } catch (staffLookupError) {
          logger.errorWithContext('CreditServiceEssentials - fetching staff record for freeze/unfreeze', staffLookupError);
          // Continue with staffId as null
        }
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
          approved_by: staffId, // Use staff ID or NULL for admins
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
    logger.info(`CreditServiceEssentials - useCreditForPurchase initiated`, {
      farmerId,
      productId,
      quantity,
      packagingOptionId,
      usedBy
    });
    
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
    logger.info(`CreditServiceEssentials - enforceCreditLimit checking`, {
      farmerId,
      requestedAmount,
      transactionType
    });
    
    try {
      // Get farmer's credit profile
      const creditProfile = await this.getCreditProfile(farmerId);
      
      if (!creditProfile) {
        logger.warn(`CreditServiceEssentials - enforceCreditLimit: No credit profile found for farmer`, { farmerId });
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
        logger.warn(`CreditServiceEssentials - enforceCreditLimit: Credit account is frozen`, { 
          farmerId, 
          freezeReason: creditProfile.freeze_reason 
        });
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
        logger.warn(`CreditServiceEssentials - enforceCreditLimit: Requested amount exceeds available credit`, {
          farmerId,
          requestedAmount,
          availableCredit: creditProfile.current_credit_balance
        });
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
        logger.warn(`CreditServiceEssentials - enforceCreditLimit: Critical credit utilization threshold exceeded`, {
          farmerId,
          utilizationPercentage,
          criticalThreshold
        });
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
            logger.warn(`CreditServiceEssentials - enforceCreditLimit: Total obligations would exceed credit limit`, {
              farmerId,
              totalObligations,
              creditLimit: creditProfile.max_credit_amount
            });
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

      logger.info(`CreditServiceEssentials - enforceCreditLimit passed`, {
        farmerId,
        requestedAmount,
        isAllowed: true,
        utilizationPercentage
      });
      
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

  // Process credit transaction with enhanced enforcement and status tracking
  static async processCreditTransaction(
    farmerId: string,
    productId: string,
    quantity: number,
    packagingOptionId: string | null,
    usedBy?: string,
    isExistingCreditRequest: boolean = false,
    storedUnitPrice?: number // Optional parameter for existing credit requests
  ): Promise<{ success: boolean; transactionId?: string; errorMessage?: string; enforcementDetails?: any }> {
    logger.info(`CreditServiceEssentials - processCreditTransaction initiated`, {
      farmerId,
      productId,
      quantity,
      packagingOptionId,
      usedBy,
      isExistingCreditRequest
    });

    try {
      // Validate inputs
      if (!farmerId) {
        return { success: false, errorMessage: 'Farmer ID is required' };
      }

      if (!productId) {
        return { success: false, errorMessage: 'Product ID is required' };
      }

      const validatedQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
      if (isNaN(validatedQuantity) || validatedQuantity <= 0) {
        return { success: false, errorMessage: 'Quantity must be a positive number' };
      }

      // Get product details
      const product = await this.getProductById(productId);
      if (!product) {
        return { success: false, errorMessage: 'Product not found' };
      }

      // Get packaging option if specified
      let packagingOption = null;
      let unitPrice = product.selling_price;
      
      if (packagingOptionId) {
        const { data: packagingData, error: packagingError } = await supabase
          .from('product_packaging')
          .select('*')
          .eq('id', packagingOptionId)
          .maybeSingle();

        if (packagingError) {
          logger.errorWithContext('CreditServiceEssentials - fetching packaging option', packagingError);
          return { success: false, errorMessage: 'Error fetching packaging option' };
        }
        
        if (packagingData) {
          packagingOption = packagingData as ProductPackaging;
          logger.info(`CreditServiceEssentials - packaging option found`, {
            packagingOptionId,
            rawPrice: packagingOption.price,
            priceType: typeof packagingOption.price
          });
          
          // Ensure proper type conversion for numeric fields
          const convertedPrice = typeof packagingOption.price === 'string' ? parseFloat(packagingOption.price) : packagingOption.price;
          unitPrice = convertedPrice && convertedPrice > 0 ? convertedPrice : unitPrice;
          
          logger.info(`CreditServiceEssentials - price conversion result`, {
            convertedPrice,
            finalUnitPrice: unitPrice
          });
        } else {
          logger.warn(`CreditServiceEssentials - packaging option not found`, {
            packagingOptionId,
            productId
          });
          
          // For existing credit requests, we can continue with the stored data
          if (isExistingCreditRequest) {
            logger.info(`CreditServiceEssentials - Continuing with stored data for existing credit request`, {
              packagingOptionId,
              productId
            });
            // Use the stored unit price if provided
            if (storedUnitPrice && storedUnitPrice > 0) {
              unitPrice = storedUnitPrice;
            }
          } else {
            return { success: false, errorMessage: 'Selected packaging option not found' };
          }
        }
      }

      // Calculate total amount
      const totalAmount = unitPrice * validatedQuantity;
      logger.info(`CreditServiceEssentials - calculated total amount`, {
        unitPrice,
        validatedQuantity,
        totalAmount
      });

      // Pre-approval check with enhanced enforcement
      const preApprovalCheck = await this.enforceCreditLimit(farmerId, totalAmount);
      logger.info(`CreditServiceEssentials - preApprovalCheck result`, preApprovalCheck);
      
      if (!preApprovalCheck.isAllowed) {
        logger.warn(`CreditServiceEssentials - processCreditTransaction: Pre-approval check failed`, {
          farmerId,
          totalAmount,
          reason: preApprovalCheck.reason
        });
        return { 
          success: false, 
          errorMessage: `Pre-approval check failed: ${preApprovalCheck.reason}`,
          enforcementDetails: preApprovalCheck
        };
      }

      // Get farmer's credit profile
      const creditProfile = await this.getCreditProfile(farmerId);
      if (!creditProfile) {
        return { success: false, errorMessage: 'Farmer credit profile not found' };
      }

      // Convert user ID to staff ID if provided
      // If the user is an admin, we'll set approved_by to NULL since admins don't have staff records
      let staffId = null;
      if (usedBy) {
        try {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', usedBy)
            .maybeSingle();
          
          if (!staffError && staffData) {
            staffId = staffData.id;
          } else {
            // If no staff record found, it might be an admin user
            // We'll leave staffId as null for admins
            logger.info(`CreditServiceEssentials - No staff record found for user (might be admin)`, {
              userId: usedBy
            });
          }
        } catch (staffLookupError) {
          logger.errorWithContext('CreditServiceEssentials - fetching staff record', staffLookupError);
          // Continue with staffId as null
        }
      }

      // Create credit transaction with initial status as 'active'
      const { data: insertedTransaction, error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_used',
          amount: totalAmount,
          balance_before: creditProfile.current_credit_balance,
          balance_after: creditProfile.current_credit_balance - totalAmount,
          product_id: productId,
          product_name: product.name,
          quantity: validatedQuantity,
          unit_price: unitPrice,
          description: packagingOptionId 
            ? `Credit used for ${product.name} (${packagingOption?.name || 'packaged item'})` 
            : `Credit used for ${product.name}`,
          approved_by: staffId, // Use staff ID or NULL for admins
          status: 'active' // Set initial status to active
        })
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('CreditServiceEssentials - creating credit transaction', transactionError);
        return { success: false, errorMessage: 'Failed to create credit transaction' };
      }

      // Create agrovet purchase record
      const purchaseData = {
        farmer_id: farmerId,
        item_id: productId,
        quantity: validatedQuantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        payment_method: 'credit',
        credit_transaction_id: (insertedTransaction as CreditTransaction).id,
        status: 'completed',
        payment_status: 'processing', // Set initial payment status to processing
        purchased_by: staffId // Use staff ID or NULL for admins
      };

      const { data: insertedPurchase, error: purchaseError } = await supabase
        .from('agrovet_purchases')
        .insert(purchaseData)
        .select()
        .single();

      if (purchaseError) {
        logger.errorWithContext('CreditServiceEssentials - creating agrovet purchase record', purchaseError);
        // Don't throw error here as the credit transaction was successful, but log it
        logger.warn(`CreditServiceEssentials - Warning: Failed to create agrovet purchase record`, purchaseError);
      } else {
        logger.info(`CreditServiceEssentials - agrovet purchase record created successfully`, {
          farmerId,
          purchaseId: (insertedPurchase as any).id,
          totalAmount
        });
      }

      logger.info(`CreditServiceEssentials - processCreditTransaction completed successfully`, {
        farmerId,
        transactionId: (insertedTransaction as CreditTransaction).id,
        totalAmount
      });

      return { 
        success: true, 
        transactionId: (insertedTransaction as CreditTransaction).id,
        enforcementDetails: preApprovalCheck
      };
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - processCreditTransaction', error);
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

  // Get product details by ID
  static async getProductById(productId: string): Promise<AgrovetInventory | null> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('CreditServiceEssentials - fetching product', error);
        throw error;
      }

      return data as AgrovetInventory | null;
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - getProductById', error);
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

      // Convert user ID to staff ID if provided
      // If the user is an admin, we'll set approved_by to NULL since admins don't have staff records
      let staffId = null;
      if (settledBy) {
        try {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', settledBy)
            .maybeSingle();
          
          if (!staffError && staffData) {
            staffId = staffData.id;
          } else {
            // If no staff record found, it might be an admin user
            // We'll leave staffId as null for admins
            logger.info(`CreditServiceEssentials - No staff record found for user (might be admin)`, {
              userId: settledBy
            });
          }
        } catch (staffLookupError) {
          logger.errorWithContext('CreditServiceEssentials - fetching staff record for settlement', staffLookupError);
          // Continue with staffId as null
        }
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
          description: `Monthly settlement completed. KES ${(profile.pending_deductions || 0).toFixed(2)} deducted from milk payments.`,
          approved_by: staffId, // Use staff ID or NULL for admins
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

  // Get credit transactions with status filtering
  static async getCreditTransactionsByStatus(farmerId: string, status?: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      let query = supabase
        .from('credit_transactions')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.errorWithContext('CreditServiceEssentials - fetching credit transactions by status', error);
        throw error;
      }

      return data as CreditTransaction[];
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - getCreditTransactionsByStatus', error);
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
        logger.errorWithContext('CreditServiceEssentials - updating credit transaction status', error);
        throw error;
      }
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - updateCreditTransactionStatus', error);
      throw error;
    }
  }

  // Get agrovet purchases with payment status filtering
  static async getAgrovetPurchasesByPaymentStatus(farmerId: string, paymentStatus?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory:name (name)
        `)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
      }

      const { data, error } = await query;

      if (error) {
        logger.errorWithContext('CreditServiceEssentials - fetching agrovet purchases by payment status', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - getAgrovetPurchasesByPaymentStatus', error);
      throw error;
    }
  }

  // Clear agrovet inventory cache
  static clearAgrovetInventoryCache(): void {
    fetchAgrovetInventoryPromise = null;
    fetchAgrovetInventoryTimestamp = null;
  }

  // Mark credit transaction as paid and update farmer credit profile
  static async markCreditTransactionAsPaid(transactionId: string): Promise<boolean> {
    try {
      logger.info(`CreditServiceEssentials - marking credit transaction as paid`, { transactionId });
      
      // First, get the transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('CreditServiceEssentials - fetching transaction details', fetchError);
        return false;
      }

      if (!transaction) {
        logger.warn(`CreditServiceEssentials - transaction not found`, { transactionId });
        return false;
      }

      // Update the credit transaction status to 'paid'
      const { error: updateError } = await supabase
        .from('credit_transactions')
        .update({ status: 'paid' })
        .eq('id', transactionId);

      if (updateError) {
        logger.errorWithContext('CreditServiceEssentials - marking credit transaction as paid', updateError);
        return false;
      }

      // Update the farmer's credit profile to reduce pending deductions
      // Only do this if the transaction was previously 'active'
      if (transaction.status === 'active') {
        const { data: creditProfile, error: profileError } = await supabase
          .from('farmer_credit_profiles')
          .select('*')
          .eq('farmer_id', transaction.farmer_id)
          .maybeSingle();

        if (profileError) {
          logger.errorWithContext('CreditServiceEssentials - fetching farmer credit profile', profileError);
          // We still consider this a success since the transaction was marked as paid
          return true;
        }

        if (creditProfile) {
          // Reduce pending deductions by the transaction amount
          const newPendingDeductions = Math.max(0, creditProfile.pending_deductions - transaction.amount);
          
          const { error: profileUpdateError } = await supabase
            .from('farmer_credit_profiles')
            .update({ 
              pending_deductions: newPendingDeductions,
              updated_at: new Date().toISOString()
            })
            .eq('id', creditProfile.id);

          if (profileUpdateError) {
            logger.errorWithContext('CreditServiceEssentials - updating farmer credit profile', profileUpdateError);
            // We still consider this a success since the transaction was marked as paid
            return true;
          }

          logger.info(`CreditServiceEssentials - farmer credit profile updated successfully`, {
            farmerId: transaction.farmer_id,
            oldPendingDeductions: creditProfile.pending_deductions,
            newPendingDeductions,
            transactionAmount: transaction.amount
          });
        }
      }

      logger.info(`CreditServiceEssentials - credit transaction marked as paid successfully`, { transactionId });
      return true;
    } catch (error) {
      logger.errorWithContext('CreditServiceEssentials - markCreditTransactionAsPaid', error);
      return false;
    }
  }
}