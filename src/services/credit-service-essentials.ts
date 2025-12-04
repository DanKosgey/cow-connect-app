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
          description: `Credit limit adjusted from KES ${(profile.max_credit_amount || 0).toFixed(2)} to KES ${(newLimit || 0).toFixed(2)}`,
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

  // Process credit transaction with enhanced enforcement
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
      isExistingCreditRequest,
      storedUnitPrice
    });
    
    try {
      // Validate inputs
      if (!farmerId) {
        logger.error(`CreditServiceEssentials - processCreditTransaction: Farmer ID is required`);
        return { success: false, errorMessage: 'Farmer ID is required' };
      }
      
      if (!productId) {
        logger.error(`CreditServiceEssentials - processCreditTransaction: Product ID is required`);
        return { success: false, errorMessage: 'Product ID is required' };
      }
      
      if (!quantity || quantity <= 0) {
        logger.error(`CreditServiceEssentials - processCreditTransaction: Valid quantity is required`, { quantity });
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
        logger.error(`CreditServiceEssentials - processCreditTransaction: Product not found or no longer available`, { productId });
        return { success: false, errorMessage: 'Product not found or no longer available' };
      }

      const product = productData as AgrovetInventory;

      // Check if product is credit eligible
      if (!product.is_credit_eligible) {
        logger.warn(`CreditServiceEssentials - processCreditTransaction: Product is not eligible for credit purchase`, { productId });
        return { success: false, errorMessage: 'This product is not eligible for credit purchase' };
      }

      // Get packaging option if specified
      let packagingOption = null;
      let unitPrice = product.cost_price || 0; // fallback to cost_price with default 0
      
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
              logger.info(`CreditServiceEssentials - Using stored unit price for existing credit request`, {
                storedUnitPrice,
                finalUnitPrice: unitPrice
              });
            }
          } else {
            // Return a more specific error when packaging option is not found
            return { 
              success: false, 
              errorMessage: `The selected packaging option is no longer available. Please contact administrator.` 
            };
          }
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
          logger.info(`CreditServiceEssentials - default packaging option found`, {
            productId,
            rawPrice: packagingOption.price,
            priceType: typeof packagingOption.price
          });
          
          // Ensure proper type conversion for numeric fields
          const convertedPrice = typeof packagingOption.price === 'string' ? parseFloat(packagingOption.price) : packagingOption.price;
          unitPrice = convertedPrice && convertedPrice > 0 ? convertedPrice : unitPrice;
          
          logger.info(`CreditServiceEssentials - default price conversion result`, {
            convertedPrice,
            finalUnitPrice: unitPrice
          });
        } else {
          logger.warn(`CreditServiceEssentials - no default packaging option found`, {
            productId
          });
        }
      }

      // Calculate total amount with proper validation
      const validatedQuantity = typeof quantity === 'number' && !isNaN(quantity) ? quantity : 0;
      const validatedUnitPrice = typeof unitPrice === 'number' && !isNaN(unitPrice) ? unitPrice : 0;
      const totalAmount = validatedQuantity * validatedUnitPrice;

      // Validate that we have a valid total amount
      if (totalAmount <= 0) {
        logger.error(`CreditServiceEssentials - processCreditTransaction: Invalid transaction amount`, {
          quantity: validatedQuantity,
          unitPrice: validatedUnitPrice,
          totalAmount,
          packagingOptionId,
          productId
        });
        
        // Provide more specific error messages
        if (validatedQuantity <= 0) {
          return { 
            success: false, 
            errorMessage: 'Invalid quantity. Quantity must be greater than zero.' 
          };
        }
        
        if (validatedUnitPrice <= 0) {
          if (packagingOptionId && !packagingOption) {
            return { 
              success: false, 
              errorMessage: `The selected packaging option is no longer available. Please contact administrator.` 
            };
          }
          
          if (packagingOption) {
            return { 
              success: false, 
              errorMessage: `Invalid unit price (${validatedUnitPrice}) for selected packaging option "${packagingOption.name}". Please check the packaging option configuration.` 
            };
          } else {
            return { 
              success: false, 
              errorMessage: `Invalid unit price (${validatedUnitPrice}). Product price must be greater than zero.` 
            };
          }
        }
        
        return { 
          success: false, 
          errorMessage: 'Invalid transaction amount. Quantity and price must be greater than zero.' 
        };
      }

      // Enhanced credit limit enforcement
      const enforcementResult = await this.enforceCreditLimit(farmerId, totalAmount, 'credit_used');
      
      if (!enforcementResult.isAllowed) {
        logger.warn(`CreditServiceEssentials - processCreditTransaction: Credit limit enforcement failed`, {
          farmerId,
          totalAmount,
          reason: enforcementResult.reason
        });
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
        logger.error(`CreditServiceEssentials - processCreditTransaction: Credit profile not found`, { farmerId });
        return { success: false, errorMessage: 'Credit profile not found' };
      }

      const profile = creditProfile as FarmerCreditProfile;

      // Double-check balance before processing (race condition protection)
      if (totalAmount > profile.current_credit_balance) {
        logger.warn(`CreditServiceEssentials - processCreditTransaction: Insufficient credit balance`, {
          farmerId,
          required: totalAmount,
          available: profile.current_credit_balance
        });
        return { 
          success: false, 
          errorMessage: `Insufficient credit balance. Available: ${formatCurrency(profile.current_credit_balance)}, Required: ${formatCurrency(totalAmount)}` 
        };
      }

      // Calculate new balance
      const newBalance = profile.current_credit_balance - totalAmount;
      const newTotalUsed = profile.total_credit_used + totalAmount;
      // When credit is used, we should deduct from pending deductions (payments that will be collected)
      const newPendingDeductions = Math.max(0, profile.pending_deductions - totalAmount);

      logger.info(`CreditServiceEssentials - processCreditTransaction updating profile`, {
        farmerId,
        oldBalance: profile.current_credit_balance,
        newBalance,
        totalAmount,
        oldPendingDeductions: profile.pending_deductions,
        newPendingDeductions
      });

      // Update credit profile
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          current_credit_balance: newBalance,
          total_credit_used: newTotalUsed,
          pending_deductions: newPendingDeductions,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        logger.errorWithContext('CreditServiceEssentials - updating credit profile for purchase', updateError);
        throw updateError;
      }

      // Deduct the amount from farmer's pending collections/payments
      // Get all pending collections for this farmer
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('id, total_amount')
        .eq('farmer_id', farmerId)
        .neq('status', 'Paid');

      if (collectionsError) {
        logger.errorWithContext('CreditServiceEssentials - fetching pending collections', collectionsError);
        // Don't throw error here as this is supplementary, but log it
      } else if (pendingCollections && pendingCollections.length > 0) {
        let remainingAmountToDeduct = totalAmount;
        
        // Process collections in order until we've deducted the full amount
        for (const collection of pendingCollections) {
          if (remainingAmountToDeduct <= 0) break;
          
          const collectionAmount = collection.total_amount || 0;
          const amountToDeductFromCollection = Math.min(remainingAmountToDeduct, collectionAmount);
          
          if (amountToDeductFromCollection > 0) {
            // Update the collection to reduce its amount
            const newCollectionAmount = collectionAmount - amountToDeductFromCollection;
            
            const { error: updateCollectionError } = await supabase
              .from('collections')
              .update({
                total_amount: newCollectionAmount,
                updated_at: new Date().toISOString()
              })
              .eq('id', collection.id);
              
            if (updateCollectionError) {
              logger.errorWithContext('CreditServiceEssentials - updating collection amount', updateCollectionError);
              // Continue with other collections even if one fails
            } else {
              logger.info(`CreditServiceEssentials - deducted ${amountToDeductFromCollection} from collection ${collection.id}`, {
                collectionId: collection.id,
                oldAmount: collectionAmount,
                newAmount: newCollectionAmount
              });
              
              remainingAmountToDeduct -= amountToDeductFromCollection;
            }
          }
        }
        
        if (remainingAmountToDeduct > 0) {
          logger.warn(`CreditServiceEssentials - Could not deduct full amount from pending collections`, {
            farmerId,
            requestedAmount: totalAmount,
            undeductedAmount: remainingAmountToDeduct
          });
        }
      }

      // Convert user ID to staff ID if the user is a staff member
      // If the user is an admin, we'll set approved_by to NULL since admins don't have staff records
      let staffIdForTransaction = null;
      if (usedBy) {
        try {
          // Try to get the staff ID for this user
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', usedBy)
            .maybeSingle();
          
          if (!staffError && staffData) {
            staffIdForTransaction = staffData.id;
            logger.info(`CreditServiceEssentials - Found staff ID for user`, {
              userId: usedBy,
              staffId: staffIdForTransaction
            });
          } else {
            // If no staff record found, it might be an admin user
            // We'll leave staffIdForTransaction as null for admins
            logger.info(`CreditServiceEssentials - No staff record found for user (might be admin)`, {
              userId: usedBy
            });
          }
        } catch (staffLookupError) {
          logger.errorWithContext('CreditServiceEssentials - Error looking up staff record', staffLookupError);
          // Continue with staffIdForTransaction as null
        }
      }

      // Create credit transaction record
      const transactionData = {
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
          ? `Credit used for ${product.name} (${quantity} × ${packagingOption.name} @ ${formatCurrency(unitPrice)} each). Utilization: ${(enforcementResult.utilizationPercentage || 0).toFixed(1)}%`
          : `Credit used for ${product.name} (${quantity} ${product.unit} @ ${formatCurrency(unitPrice)} each). Utilization: ${(enforcementResult.utilizationPercentage || 0).toFixed(1)}%`,
        approved_by: staffIdForTransaction, // Use the staff ID or NULL for admins
        approval_status: 'approved'
      };
      
      logger.info(`CreditServiceEssentials - processCreditTransaction creating transaction record`, {
        farmerId,
        transactionData
      });

      const { data: insertedTransaction, error: transactionError } = await supabase
        .from('credit_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('CreditServiceEssentials - creating credit transaction for purchase', transactionError);
        throw transactionError;
      }

      // Create agrovet purchase record
      const purchaseData = {
        farmer_id: farmerId,
        item_id: productId,
        quantity: quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        payment_method: 'credit',
        credit_transaction_id: (insertedTransaction as CreditTransaction).id,
        status: 'completed',
        purchased_by: usedBy
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
          description: `Monthly settlement completed. KES ${(profile.pending_deductions || 0).toFixed(2)} deducted from milk payments.`,
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