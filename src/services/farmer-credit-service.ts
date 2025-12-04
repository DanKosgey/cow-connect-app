import { supabase } from '@/integrations/supabase/client';
import { AgrovetInventoryService, AgrovetProduct, ProductPackaging } from './agrovet-inventory-service';
import { logger } from '@/utils/logger';

export interface FarmerCreditProfile {
  id: string;
  farmer_id: string;
  current_credit_balance: number;
  max_credit_amount: number;
  total_credit_used: number;
  pending_deductions: number;
  credit_tier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  farmer_id: string;
  transaction_type: 'credit_used' | 'credit_granted' | 'credit_repaid';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  approved_by: string;
  created_at: string;
}

export interface AgrovetPurchase {
  id: string;
  farmer_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  status: string;
  purchased_by: string;
  created_at: string;
}

export class FarmerCreditService {
  // Get farmer credit profile
  static async getFarmerCreditProfile(farmerId: string): Promise<FarmerCreditProfile | null> {
    try {
      const { data, error } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('FarmerCreditService - fetching credit profile', error);
        throw error;
      }

      return data as FarmerCreditProfile | null;
    } catch (error) {
      logger.errorWithContext('FarmerCreditService - getFarmerCreditProfile', error);
      throw error;
    }
  }

  // Get credit-eligible products with their packaging options
  static async getCreditEligibleProductsWithPackaging(): Promise<(AgrovetProduct & { packaging_options: ProductPackaging[] })[]> {
    try {
      // First get all credit-eligible products
      const products = await AgrovetInventoryService.getCreditEligibleProducts();
      
      // Then fetch packaging options for each product
      const productsWithPackaging = await Promise.all(
        products.map(async (product) => {
          try {
            const packagingOptions = await AgrovetInventoryService.getProductPackaging(product.id);
            return {
              ...product,
              packaging_options: packagingOptions?.filter(p => p.is_credit_eligible) || []
            };
          } catch (error) {
            // If there's an error fetching packaging, return empty array
            console.warn(`Failed to fetch packaging for product ${product.id}:`, error);
            return {
              ...product,
              packaging_options: []
            };
          }
        })
      );

      return productsWithPackaging;
    } catch (error) {
      logger.errorWithContext('FarmerCreditService - getCreditEligibleProductsWithPackaging', error);
      throw error;
    }
  }

  // Get farmer's credit transactions
  static async getFarmerCreditTransactions(farmerId: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.errorWithContext('FarmerCreditService - fetching credit transactions', error);
        throw error;
      }

      return data as CreditTransaction[];
    } catch (error) {
      logger.errorWithContext('FarmerCreditService - getFarmerCreditTransactions', error);
      throw error;
    }
  }

  // Get farmer's purchases
  static async getFarmerPurchases(farmerId: string, limit: number = 50): Promise<AgrovetPurchase[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory (
            name,
            category,
            unit
          )
        `)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.errorWithContext('FarmerCreditService - fetching purchases', error);
        throw error;
      }

      return data as AgrovetPurchase[];
    } catch (error) {
      logger.errorWithContext('FarmerCreditService - getFarmerPurchases', error);
      throw error;
    }
  }

  // Create a purchase with packaging option
  static async createPurchaseWithPackaging(
    farmerId: string,
    productId: string,
    packagingId: string,
    quantity: number
  ): Promise<{ purchase: AgrovetPurchase; transaction: CreditTransaction }> {
    try {
      // Get the packaging option details
      const packagingOptions = await AgrovetInventoryService.getProductPackaging(productId);
      const selectedPackaging = packagingOptions.find(p => p.id === packagingId);
      
      if (!selectedPackaging) {
        throw new Error('Selected packaging option not found');
      }

      // Calculate total amount
      const totalAmount = selectedPackaging.price * quantity;

      // Get farmer's current credit balance
      const creditProfile = await this.getFarmerCreditProfile(farmerId);
      if (!creditProfile) {
        throw new Error('Farmer credit profile not found');
      }

      if (totalAmount > creditProfile.current_credit_balance) {
        throw new Error('Insufficient credit balance');
      }

      // Start a transaction-like operation
      // Note: Supabase doesn't support true transactions, so we'll handle errors carefully
      
      // Create the purchase record
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('agrovet_purchases')
        .insert({
          farmer_id: farmerId,
          item_id: productId,
          quantity: quantity,
          unit_price: selectedPackaging.price,
          total_amount: totalAmount,
          payment_method: 'credit',
          status: 'completed',
          purchased_by: farmerId
        })
        .select()
        .single();

      if (purchaseError) {
        logger.errorWithContext('FarmerCreditService - creating purchase', purchaseError);
        throw purchaseError;
      }

      // Update inventory stock (simplified - in a real app you might want to track stock per packaging option)
      const { error: inventoryError } = await supabase
        .from('agrovet_inventory')
        .update({ 
          current_stock: (await AgrovetInventoryService.getInventoryItem(productId))?.current_stock - (selectedPackaging.weight * quantity)
        })
        .eq('id', productId);

      if (inventoryError) {
        logger.errorWithContext('FarmerCreditService - updating inventory', inventoryError);
        // Note: In a real app, you might want to rollback the purchase or handle this differently
      }

      // Create credit transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_used',
          amount: -totalAmount,
          balance_before: creditProfile.current_credit_balance,
          balance_after: creditProfile.current_credit_balance - totalAmount,
          description: `Purchase of ${quantity} x ${selectedPackaging.name}`,
          approved_by: farmerId
        })
        .select()
        .single();

      if (transactionError) {
        logger.errorWithContext('FarmerCreditService - creating credit transaction', transactionError);
        throw transactionError;
      }

      // Update credit profile
      const { error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          current_credit_balance: creditProfile.current_credit_balance - totalAmount,
          total_credit_used: creditProfile.total_credit_used + totalAmount
        })
        .eq('farmer_id', farmerId);

      if (profileError) {
        logger.errorWithContext('FarmerCreditService - updating credit profile', profileError);
        // Note: In a real app, you might want to handle this differently
      }

      return {
        purchase: purchaseData as AgrovetPurchase,
        transaction: transactionData as CreditTransaction
      };
    } catch (error) {
      logger.errorWithContext('FarmerCreditService - createPurchaseWithPackaging', error);
      throw error;
    }
  }
}