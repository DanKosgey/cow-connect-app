import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CreditService } from './credit-service';

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
  agrovet_inventory?: AgrovetInventory;
}

export class AgrovetService {
  // Get all agrovet inventory items
  static async getInventory(): Promise<AgrovetInventory[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('AgrovetService - fetching inventory', error);
        throw error;
      }

      return data as AgrovetInventory[];
    } catch (error) {
      logger.errorWithContext('AgrovetService - getInventory', error);
      throw error;
    }
  }

  // Get inventory item by ID
  static async getInventoryItem(id: string): Promise<AgrovetInventory | null> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('AgrovetService - fetching inventory item', error);
        throw error;
      }

      return data as AgrovetInventory | null;
    } catch (error) {
      logger.errorWithContext('AgrovetService - getInventoryItem', error);
      throw error;
    }
  }

  // Create a new agrovet purchase
  static async createPurchase(
    farmerId: string,
    itemId: string,
    quantity: number,
    paymentMethod: 'cash' | 'credit',
    purchasedBy?: string
  ): Promise<{ purchase: AgrovetPurchase; transaction?: any }> {
    try {
      // Get item details
      const item = await this.getInventoryItem(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Check if item is credit eligible
      if (paymentMethod === 'credit' && !item.is_credit_eligible) {
        throw new Error('This item is not eligible for credit purchase');
      }

      // Calculate total amount
      const totalAmount = quantity * item.selling_price;

      // If paying with credit, check availability and use credit
      if (paymentMethod === 'credit') {
        // Check available credit
        const creditInfo = await CreditService.calculateAvailableCredit(farmerId);
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
          logger.errorWithContext('AgrovetService - creating agrovet purchase', purchaseError);
          throw purchaseError;
        }

        const purchase = purchaseData as AgrovetPurchase;

        // Use credit for the purchase
        const transaction = await CreditService.useCreditForPurchase(
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
          logger.errorWithContext('AgrovetService - creating cash purchase', purchaseError);
          throw purchaseError;
        }

        return { purchase: purchaseData as AgrovetPurchase };
      }
    } catch (error) {
      logger.errorWithContext('AgrovetService - createPurchase', error);
      throw error;
    }
  }

  // Get purchase history for a farmer
  static async getPurchaseHistory(farmerId: string): Promise<AgrovetPurchase[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory(name, category, selling_price)
        `)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('AgrovetService - fetching purchase history', error);
        throw error;
      }

      return data as AgrovetPurchase[];
    } catch (error) {
      logger.errorWithContext('AgrovetService - getPurchaseHistory', error);
      throw error;
    }
  }

  // Get all purchases (for admin)
  static async getAllPurchases(): Promise<AgrovetPurchase[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory(name, category, selling_price),
          farmers(profiles(full_name, phone))
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('AgrovetService - fetching all purchases', error);
        throw error;
      }

      return data as AgrovetPurchase[];
    } catch (error) {
      logger.errorWithContext('AgrovetService - getAllPurchases', error);
      throw error;
    }
  }

  // Get purchase by ID
  static async getPurchaseById(id: string): Promise<AgrovetPurchase | null> {
    try {
      const { data, error } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory(*),
          farmers(profiles(full_name, phone))
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('AgrovetService - fetching purchase by ID', error);
        throw error;
      }

      return data as AgrovetPurchase | null;
    } catch (error) {
      logger.errorWithContext('AgrovetService - getPurchaseById', error);
      throw error;
    }
  }

  // Get purchase statistics
  static async getPurchaseStatistics(): Promise<{
    totalPurchases: number;
    totalAmount: number;
    creditPurchases: number;
    cashPurchases: number;
    topItems: { name: string; count: number; total_amount: number }[];
  }> {
    try {
      // Get all purchases with item details
      const { data: purchases, error: purchasesError } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory(name)
        `);

      if (purchasesError) {
        logger.errorWithContext('AgrovetService - fetching purchases for statistics', purchasesError);
        throw purchasesError;
      }

      // Calculate statistics
      const totalPurchases = purchases?.length || 0;
      const totalAmount = purchases?.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0) || 0;
      const creditPurchases = purchases?.filter(p => p.payment_method === 'credit').length || 0;
      const cashPurchases = purchases?.filter(p => p.payment_method === 'cash').length || 0;

      // Calculate top items
      const itemStats: Record<string, { count: number; total_amount: number }> = {};
      purchases?.forEach(purchase => {
        const itemName = (purchase.agrovet_inventory as any)?.name || 'Unknown Item';
        if (!itemStats[itemName]) {
          itemStats[itemName] = { count: 0, total_amount: 0 };
        }
        itemStats[itemName].count += 1;
        itemStats[itemName].total_amount += purchase.total_amount || 0;
      });

      const topItems = Object.entries(itemStats)
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          total_amount: stats.total_amount
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalPurchases,
        totalAmount,
        creditPurchases,
        cashPurchases,
        topItems
      };
    } catch (error) {
      logger.errorWithContext('AgrovetService - getPurchaseStatistics', error);
      throw error;
    }
  }

  // Get farmer purchase summary
  static async getFarmerPurchaseSummary(farmerId: string): Promise<{
    totalPurchases: number;
    totalAmount: number;
    creditPurchases: number;
    cashPurchases: number;
    creditAmount: number;
    itemsPurchased: { name: string; count: number; total_amount: number }[];
  }> {
    try {
      // Get farmer's purchases with item details
      const { data: purchases, error: purchasesError } = await supabase
        .from('agrovet_purchases')
        .select(`
          *,
          agrovet_inventory(name)
        `)
        .eq('farmer_id', farmerId);

      if (purchasesError) {
        logger.errorWithContext('AgrovetService - fetching farmer purchases for summary', purchasesError);
        throw purchasesError;
      }

      // Calculate statistics
      const totalPurchases = purchases?.length || 0;
      const totalAmount = purchases?.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0) || 0;
      const creditPurchases = purchases?.filter(p => p.payment_method === 'credit').length || 0;
      const cashPurchases = purchases?.filter(p => p.payment_method === 'cash').length || 0;
      const creditAmount = purchases?.filter(p => p.payment_method === 'credit')
        .reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0) || 0;

      // Calculate items purchased
      const itemStats: Record<string, { count: number; total_amount: number }> = {};
      purchases?.forEach(purchase => {
        const itemName = (purchase.agrovet_inventory as any)?.name || 'Unknown Item';
        if (!itemStats[itemName]) {
          itemStats[itemName] = { count: 0, total_amount: 0 };
        }
        itemStats[itemName].count += 1;
        itemStats[itemName].total_amount += purchase.total_amount || 0;
      });

      const itemsPurchased = Object.entries(itemStats)
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          total_amount: stats.total_amount
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      return {
        totalPurchases,
        totalAmount,
        creditPurchases,
        cashPurchases,
        creditAmount,
        itemsPurchased
      };
    } catch (error) {
      logger.errorWithContext('AgrovetService - getFarmerPurchaseSummary', error);
      throw error;
    }
  }
}