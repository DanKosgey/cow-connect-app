import { supabase } from '@/integrations/supabase/client';
import { CreditServiceEssentials } from './credit-service-essentials';
import { logger } from '@/utils/logger';

export interface AgrovetProduct {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  unit: string;
  current_stock: number;
  selling_price: number;
  is_credit_eligible: boolean;
}

export class AgrovetServiceEssentials {
  // Get all credit-eligible agrovet products
  static async getCreditEligibleProducts(): Promise<AgrovetProduct[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('is_credit_eligible', true)
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('AgrovetServiceEssentials - fetching credit eligible products', error);
        throw error;
      }

      return data as AgrovetProduct[];
    } catch (error) {
      logger.errorWithContext('AgrovetServiceEssentials - getCreditEligibleProducts', error);
      throw error;
    }
  }

  // Get product by ID
  static async getProductById(id: string): Promise<AgrovetProduct | null> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('AgrovetServiceEssentials - fetching product by ID', error);
        throw error;
      }

      return data as AgrovetProduct | null;
    } catch (error) {
      logger.errorWithContext('AgrovetServiceEssentials - getProductById', error);
      throw error;
    }
  }

  // Purchase product using credit
  static async purchaseWithCredit(
    farmerId: string,
    productId: string,
    quantity: number,
    purchasedBy?: string
  ): Promise<{ success: boolean; transactionId?: string; errorMessage?: string }> {
    try {
      // Check if farmer is eligible for credit
      const creditEligibility = await CreditServiceEssentials.calculateCreditEligibility(farmerId);
      if (!creditEligibility.isEligible) {
        return { success: false, errorMessage: 'Farmer is not eligible for credit purchases' };
      }

      // Use credit for the purchase
      const result = await CreditServiceEssentials.useCreditForPurchase(
        farmerId,
        productId,
        quantity,
        purchasedBy
      );

      if (!result.success) {
        return result;
      }

      // Update inventory stock
      const product = await this.getProductById(productId);
      if (product) {
        const newStock = product.current_stock - quantity;
        const { error: updateError } = await supabase
          .from('agrovet_inventory')
          .update({
            current_stock: Math.max(0, newStock),
            updated_at: new Date().toISOString()
          })
          .eq('id', productId);

        if (updateError) {
          logger.warn('Warning: Failed to update inventory stock', updateError);
        }
      }

      return {
        success: true,
        transactionId: result.transactionId
      };
    } catch (error) {
      logger.errorWithContext('AgrovetServiceEssentials - purchaseWithCredit', error);
      return { success: false, errorMessage: (error as Error).message };
    }
  }

  // Get farmer's purchase history
  static async getPurchaseHistory(farmerId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          agrovet_inventory:name (name)
        `)
        .eq('farmer_id', farmerId)
        .eq('transaction_type', 'credit_used')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.errorWithContext('AgrovetServiceEssentials - fetching purchase history', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('AgrovetServiceEssentials - getPurchaseHistory', error);
      throw error;
    }
  }
}