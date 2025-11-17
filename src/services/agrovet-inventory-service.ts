import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface AgrovetProduct {
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

export interface ProductPricing {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number;
  price_per_unit: number;
  is_credit_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export class AgrovetInventoryService {
  // Get all agrovet inventory items
  static async getInventory(): Promise<AgrovetProduct[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - fetching inventory', error);
        throw error;
      }

      return data as AgrovetProduct[];
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getInventory', error);
      throw error;
    }
  }

  // Get inventory item by ID
  static async getInventoryItem(id: string): Promise<AgrovetProduct | null> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - fetching inventory item', error);
        throw error;
      }

      return data as AgrovetProduct | null;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getInventoryItem', error);
      throw error;
    }
  }

  // Create a new inventory item
  static async createInventoryItem(item: Omit<AgrovetProduct, 'id' | 'created_at' | 'updated_at'>): Promise<AgrovetProduct> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .insert({
          name: item.name,
          description: item.description,
          category: item.category,
          unit: item.unit,
          current_stock: item.current_stock,
          reorder_level: item.reorder_level,
          supplier: item.supplier,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
          is_credit_eligible: item.is_credit_eligible
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - creating inventory item', error);
        throw error;
      }

      return data as AgrovetProduct;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - createInventoryItem', error);
      throw error;
    }
  }

  // Update an inventory item
  static async updateInventoryItem(id: string, item: Partial<Omit<AgrovetProduct, 'id' | 'created_at'>>): Promise<AgrovetProduct> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .update({
          ...item,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - updating inventory item', error);
        throw error;
      }

      return data as AgrovetProduct;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - updateInventoryItem', error);
      throw error;
    }
  }

  // Delete an inventory item
  static async deleteInventoryItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agrovet_inventory')
        .delete()
        .eq('id', id);

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - deleting inventory item', error);
        throw error;
      }
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - deleteInventoryItem', error);
      throw error;
    }
  }

  // Get credit-eligible products only
  static async getCreditEligibleProducts(): Promise<AgrovetProduct[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('is_credit_eligible', true)
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - fetching credit eligible products', error);
        throw error;
      }

      return data as AgrovetProduct[];
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getCreditEligibleProducts', error);
      throw error;
    }
  }

  // Get active products only
  static async getActiveProducts(): Promise<AgrovetProduct[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - fetching active products', error);
        throw error;
      }

      return data as AgrovetProduct[];
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getActiveProducts', error);
      throw error;
    }
  }

  // Product pricing methods
  static async getProductPricing(productId: string): Promise<ProductPricing[]> {
    try {
      const { data, error } = await supabase
        .from('product_pricing')
        .select('*')
        .eq('product_id', productId)
        .order('min_quantity', { ascending: true });

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - fetching product pricing', error);
        throw error;
      }

      return data as ProductPricing[];
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getProductPricing', error);
      throw error;
    }
  }

  static async createProductPricing(pricing: Omit<ProductPricing, 'id' | 'created_at' | 'updated_at'>): Promise<ProductPricing> {
    try {
      const { data, error } = await supabase
        .from('product_pricing')
        .insert({
          product_id: pricing.product_id,
          min_quantity: pricing.min_quantity,
          max_quantity: pricing.max_quantity,
          price_per_unit: pricing.price_per_unit,
          is_credit_eligible: pricing.is_credit_eligible
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - creating product pricing', error);
        throw error;
      }

      return data as ProductPricing;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - createProductPricing', error);
      throw error;
    }
  }

  static async updateProductPricing(id: string, pricing: Partial<Omit<ProductPricing, 'id' | 'created_at'>>): Promise<ProductPricing> {
    try {
      const { data, error } = await supabase
        .from('product_pricing')
        .update({
          ...pricing,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - updating product pricing', error);
        throw error;
      }

      return data as ProductPricing;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - updateProductPricing', error);
      throw error;
    }
  }

  static async deleteProductPricing(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_pricing')
        .delete()
        .eq('id', id);

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - deleting product pricing', error);
        throw error;
      }
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - deleteProductPricing', error);
      throw error;
    }
  }
}