import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class ProductCategoryService {
  // Get all active product categories
  static async getActiveCategories(): Promise<ProductCategory[]> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('ProductCategoryService - fetching active categories', error);
        throw error;
      }

      return data as ProductCategory[];
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - getActiveCategories', error);
      throw error;
    }
  }

  // Get all product categories (for admin/creditor management)
  static async getAllCategories(): Promise<ProductCategory[]> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('is_active', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('ProductCategoryService - fetching all categories', error);
        throw error;
      }

      return data as ProductCategory[];
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - getAllCategories', error);
      throw error;
    }
  }

  // Get category by ID
  static async getCategoryById(id: string): Promise<ProductCategory | null> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('ProductCategoryService - fetching category by ID', error);
        throw error;
      }

      return data as ProductCategory | null;
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - getCategoryById', error);
      throw error;
    }
  }

  // Create a new category
  static async createCategory(category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ProductCategory> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          name: category.name,
          description: category.description,
          is_active: category.is_active,
          sort_order: category.sort_order
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('ProductCategoryService - creating category', error);
        throw error;
      }

      return data as ProductCategory;
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - createCategory', error);
      throw error;
    }
  }

  // Update a category
  static async updateCategory(id: string, category: Partial<Omit<ProductCategory, 'id' | 'created_at'>>): Promise<ProductCategory> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .update({
          ...category,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.errorWithContext('ProductCategoryService - updating category', error);
        throw error;
      }

      return data as ProductCategory;
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - updateCategory', error);
      throw error;
    }
  }

  // Delete a category (soft delete by setting is_active to false)
  static async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_categories')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        logger.errorWithContext('ProductCategoryService - deleting category', error);
        throw error;
      }
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - deleteCategory', error);
      throw error;
    }
  }

  // Restore a category (set is_active to true)
  static async restoreCategory(id: string): Promise<ProductCategory> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.errorWithContext('ProductCategoryService - restoring category', error);
        throw error;
      }

      return data as ProductCategory;
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - restoreCategory', error);
      throw error;
    }
  }

  // Permanently delete a category (use with caution)
  static async permanentlyDeleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);

      if (error) {
        logger.errorWithContext('ProductCategoryService - permanently deleting category', error);
        throw error;
      }
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - permanentlyDeleteCategory', error);
      throw error;
    }
  }

  // Reorder categories
  static async reorderCategories(categoryIds: string[]): Promise<void> {
    try {
      // Update sort_order for each category based on its position in the array
      const updates = categoryIds.map((id, index) => 
        supabase
          .from('product_categories')
          .update({ sort_order: index })
          .eq('id', id)
      );

      // Execute all updates
      const results = await Promise.all(updates);
      
      // Check for errors
      for (const result of results) {
        if (result.error) {
          logger.errorWithContext('ProductCategoryService - reordering categories', result.error);
          throw result.error;
        }
      }
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - reorderCategories', error);
      throw error;
    }
  }

  // Get products by category ID
  static async getProductsByCategoryId(categoryId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .eq('category_id', categoryId)
        .order('name', { ascending: true });

      if (error) {
        logger.errorWithContext('ProductCategoryService - fetching products by category ID', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.errorWithContext('ProductCategoryService - getProductsByCategoryId', error);
      throw error;
    }
  }
}