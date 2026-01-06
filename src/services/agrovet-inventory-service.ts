import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { ProductCategoryService, ProductCategory } from './product-category-service';

// Define the category interface for the join
interface ProductCategoryJoin {
  name: string;
}

export interface AgrovetProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  category_id?: string | null; // Make this nullable
  unit: string;
  current_stock: number;
  reorder_level: number;
  supplier: string;
  cost_price: number;
  selling_price: number; // Add selling_price property
  is_credit_eligible: boolean;
  image_url?: string;
  image_alt_text?: string;
  created_at: string;
  updated_at: string;
  packaging_options?: ProductPackaging[]; // Add this line to include packaging options
  product_categories?: ProductCategoryJoin; // Add this for the join
}

export interface ProductPricing {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  price_per_unit: number;
  is_credit_eligible: boolean;
  packaging_size?: number;
  packaging_unit?: string;
  display_name?: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

// New interface for packaging options
export interface ProductPackaging {
  id: string;
  product_id: string;
  name: string; // e.g., "100kg bag", "20kg bag"
  weight: number; // e.g., 100, 20
  unit: string; // e.g., "kg"
  price: number; // price for this package
  is_credit_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export class AgrovetInventoryService {
  // Get all agrovet inventory items with category details
  static async getInventory(): Promise<AgrovetProduct[]> {
    try {
      console.log('AgrovetInventoryService: Attempting to fetch inventory');
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select(`
          *,
          product_categories(name)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('AgrovetInventoryService: Error fetching inventory:', error);

        // Check if this is a permissions error
        if (error.code === '42501' || (error.message && error.message.includes('permission denied'))) {
          console.error('AgrovetInventoryService: Permission denied error detected');
          logger.errorWithContext('AgrovetInventoryService - permission denied', error);
          throw new Error('You do not have permission to view the product inventory. Please contact an administrator.');
        }

        logger.errorWithContext('AgrovetInventoryService - fetching inventory', error);
        throw error;
      }

      // Map the data to include category name from the join and ensure proper type conversion
      const products = data?.map(item => ({
        ...item,
        cost_price: typeof item.cost_price === 'string' ? parseFloat(item.cost_price) : item.cost_price,
        current_stock: typeof item.current_stock === 'string' ? parseFloat(item.current_stock) : item.current_stock,
        reorder_level: typeof item.reorder_level === 'string' ? parseFloat(item.reorder_level) : item.reorder_level,
        category: item.product_categories?.name || item.category || 'Uncategorized'
      })) || [];

      console.log('AgrovetInventoryService: Successfully fetched inventory, count:', products?.length || 0);
      return products as AgrovetProduct[];
    } catch (error) {
      console.error('AgrovetInventoryService: Exception in getInventory:', error);
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

      // Ensure proper type conversion for numeric fields
      if (data) {
        return {
          ...data,
          cost_price: typeof data.cost_price === 'string' ? parseFloat(data.cost_price) : data.cost_price,
          current_stock: typeof data.current_stock === 'string' ? parseFloat(data.current_stock) : data.current_stock,
          reorder_level: typeof data.reorder_level === 'string' ? parseFloat(data.reorder_level) : data.reorder_level
        } as AgrovetProduct;
      }

      return null;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getInventoryItem', error);
      throw error;
    }
  }

  // Create a new inventory item with category support
  static async createInventoryItem(item: Omit<AgrovetProduct, 'id' | 'created_at' | 'updated_at'>): Promise<AgrovetProduct> {
    try {
      // If category_id is provided, use it; otherwise, use the category name field
      const insertData: any = {
        name: item.name,
        description: item.description,
        unit: item.unit,
        current_stock: item.current_stock,
        reorder_level: item.reorder_level,
        supplier: item.supplier,
        cost_price: item.cost_price,
        is_credit_eligible: item.is_credit_eligible
      };

      // Add category_id if provided
      if (item.category_id) {
        insertData.category_id = item.category_id;
      }

      // Always include the category name for backward compatibility
      if (item.category) {
        insertData.category = item.category;
      }

      const { data, error } = await supabase
        .from('agrovet_inventory')
        .insert(insertData)
        .select(`
          *,
          product_categories(name)
        `)
        .single();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - creating inventory item', error);
        throw error;
      }

      // Return the product with the proper category name
      return {
        ...data,
        category: data.product_categories?.name || data.category || 'Uncategorized'
      } as AgrovetProduct;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - createInventoryItem', error);
      throw error;
    }
  }

  // Update an inventory item with category support
  static async updateInventoryItem(id: string, item: Partial<Omit<AgrovetProduct, 'id' | 'created_at'>>): Promise<AgrovetProduct> {
    try {
      // Prepare update data
      const updateData: any = {
        ...item,
        updated_at: new Date().toISOString()
      };

      // Handle category updates
      if (item.category_id !== undefined) {
        updateData.category_id = item.category_id;
        // If category_id is set to null, also clear the text category field
        if (item.category_id === null) {
          updateData.category = '';
        }
      }

      // If category name is provided but category_id is not, we still update the text field
      if (item.category !== undefined && item.category_id === undefined) {
        updateData.category = item.category;
      }

      const { data, error } = await supabase
        .from('agrovet_inventory')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          product_categories(name)
        `)
        .single();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - updating inventory item', error);
        throw error;
      }

      // Return the product with the proper category name
      return {
        ...data,
        category: data.product_categories?.name || data.category || 'Uncategorized'
      } as AgrovetProduct;
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

      // Ensure proper type conversion for numeric fields
      const convertedData = data?.map(item => ({
        ...item,
        cost_price: typeof item.cost_price === 'string' ? parseFloat(item.cost_price) : item.cost_price,
        current_stock: typeof item.current_stock === 'string' ? parseFloat(item.current_stock) : item.current_stock,
        reorder_level: typeof item.reorder_level === 'string' ? parseFloat(item.reorder_level) : item.reorder_level
      })) || [];

      return convertedData as AgrovetProduct[];
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

      // Ensure proper type conversion for numeric fields
      const convertedData = data?.map(item => ({
        ...item,
        cost_price: typeof item.cost_price === 'string' ? parseFloat(item.cost_price) : item.cost_price,
        current_stock: typeof item.current_stock === 'string' ? parseFloat(item.current_stock) : item.current_stock,
        reorder_level: typeof item.reorder_level === 'string' ? parseFloat(item.reorder_level) : item.reorder_level
      })) || [];

      return convertedData as AgrovetProduct[];
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getActiveProducts', error);
      throw error;
    }
  }

  // Get products by category ID
  static async getProductsByCategory(categoryId: string): Promise<AgrovetProduct[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_credit_eligible', true)
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - fetching products by category', error);
        throw error;
      }

      // Ensure proper type conversion for numeric fields
      const convertedData = data?.map(item => ({
        ...item,
        cost_price: typeof item.cost_price === 'string' ? parseFloat(item.cost_price) : item.cost_price,
        current_stock: typeof item.current_stock === 'string' ? parseFloat(item.current_stock) : item.current_stock,
        reorder_level: typeof item.reorder_level === 'string' ? parseFloat(item.reorder_level) : item.reorder_level
      })) || [];

      return convertedData as AgrovetProduct[];
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getProductsByCategory', error);
      throw error;
    }
  }

  // Product pricing methods (deprecated but kept for backward compatibility)
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
          is_credit_eligible: pricing.is_credit_eligible,
          packaging_size: pricing.packaging_size,
          packaging_unit: pricing.packaging_unit,
          display_name: pricing.display_name,
          sort_order: pricing.sort_order
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

  // New methods for product packaging
  static async getProductPackaging(productId: string): Promise<ProductPackaging[]> {
    try {
      const { data, error } = await supabase
        .from('product_packaging')
        .select('*')
        .eq('product_id', productId)
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - fetching product packaging', error);
        // Check if this is a permissions error
        if (error.code === '42501' || (error.message && error.message.includes('permission denied'))) {
          console.error('AgrovetInventoryService: Permission denied error detected for product_packaging table');
          logger.errorWithContext('AgrovetInventoryService - permission denied for product_packaging', error);
          throw new Error('You do not have permission to view product packaging options. Please contact an administrator.');
        }
        throw error;
      }

      // Ensure proper type conversion for numeric fields
      const convertedData = data?.map(item => ({
        ...item,
        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
        weight: typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight
      })) || [];

      return convertedData as ProductPackaging[];
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - getProductPackaging', error);
      // Provide a more user-friendly error message
      if (error instanceof Error && error.message.includes('permission')) {
        throw new Error('Unable to load product packaging information. Please contact administrator.');
      }
      throw error;
    }
  }

  static async createProductPackaging(packaging: Omit<ProductPackaging, 'id' | 'created_at' | 'updated_at'>): Promise<ProductPackaging> {
    try {
      const { data, error } = await supabase
        .from('product_packaging')
        .insert({
          product_id: packaging.product_id,
          name: packaging.name,
          weight: packaging.weight,
          unit: packaging.unit,
          price: packaging.price,
          is_credit_eligible: packaging.is_credit_eligible
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - creating product packaging', error);
        // Check if this is a permissions error
        if (error.code === '42501' || (error.message && error.message.includes('permission denied'))) {
          console.error('AgrovetInventoryService: Permission denied error detected for product_packaging table');
          logger.errorWithContext('AgrovetInventoryService - permission denied for product_packaging', error);
          throw new Error('You do not have permission to manage product packaging options. Please contact an administrator.');
        }
        throw error;
      }

      return data as ProductPackaging;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - createProductPackaging', error);
      throw error;
    }
  }

  static async updateProductPackaging(id: string, packaging: Partial<Omit<ProductPackaging, 'id' | 'created_at'>>): Promise<ProductPackaging> {
    try {
      const { data, error } = await supabase
        .from('product_packaging')
        .update({
          ...packaging,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - updating product packaging', error);
        // Check if this is a permissions error
        if (error.code === '42501' || (error.message && error.message.includes('permission denied'))) {
          console.error('AgrovetInventoryService: Permission denied error detected for product_packaging table');
          logger.errorWithContext('AgrovetInventoryService - permission denied for product_packaging', error);
          throw new Error('You do not have permission to manage product packaging options. Please contact an administrator.');
        }
        throw error;
      }

      return data as ProductPackaging;
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - updateProductPackaging', error);
      throw error;
    }
  }

  static async deleteProductPackaging(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_packaging')
        .delete()
        .eq('id', id);

      if (error) {
        logger.errorWithContext('AgrovetInventoryService - deleting product packaging', error);
        // Check if this is a permissions error
        if (error.code === '42501' || (error.message && error.message.includes('permission denied'))) {
          console.error('AgrovetInventoryService: Permission denied error detected for product_packaging table');
          logger.errorWithContext('AgrovetInventoryService - permission denied for product_packaging', error);
          throw new Error('You do not have permission to manage product packaging options. Please contact an administrator.');
        }
        throw error;
      }
    } catch (error) {
      logger.errorWithContext('AgrovetInventoryService - deleteProductPackaging', error);
      throw error;
    }
  }
}