import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface MarketPrice {
  id: string;
  product: string;
  region: string;
  price: number;
  previous_price: number;
  change: number;
  change_percent: number;
  updated_at: string;
  created_at: string;
}

// Validation interface
export interface MarketPriceValidation {
  isValid: boolean;
  errors: string[];
}

// Response types for better error handling
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  loading?: boolean;
}

class MarketPriceService {
  private static instance: MarketPriceService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): MarketPriceService {
    if (!MarketPriceService.instance) {
      MarketPriceService.instance = new MarketPriceService();
    }
    return MarketPriceService.instance;
  }

  /**
   * Validate market price data
   */
  validateMarketPrice(priceData: Partial<MarketPrice>): MarketPriceValidation {
    const errors: string[] = [];

    // Validate required fields
    if (!priceData.product || priceData.product.trim() === '') {
      errors.push('Product name is required');
    }

    if (!priceData.region || priceData.region.trim() === '') {
      errors.push('Region is required');
    }

    // Validate numeric fields
    if (priceData.price === undefined || priceData.price < 0) {
      errors.push('Price must be a positive number');
    }

    if (priceData.previous_price !== undefined && priceData.previous_price < 0) {
      errors.push('Previous price must be a positive number');
    }

    // Validate product name length
    if (priceData.product && priceData.product.length > 100) {
      errors.push('Product name must be less than 100 characters');
    }

    // Validate region name length
    if (priceData.region && priceData.region.length > 100) {
      errors.push('Region name must be less than 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Fetch all market prices with proper error handling
   */
  async getAllPrices(): Promise<ServiceResponse<MarketPrice[]>> {
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        logger.errorWithContext('MarketPriceService - getAllPrices', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      logger.errorWithContext('MarketPriceService - getAllPrices exception', error);
      return { success: false, error: error.message || 'Failed to fetch market prices' };
    }
  }

  /**
   * Fetch market prices by product
   */
  async getPricesByProduct(product: string): Promise<ServiceResponse<MarketPrice[]>> {
    try {
      // Validate input
      if (!product || product.trim() === '') {
        return { success: false, error: 'Product name is required' };
      }

      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .eq('product', product)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.errorWithContext('MarketPriceService - getPricesByProduct', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      logger.errorWithContext('MarketPriceService - getPricesByProduct exception', error);
      return { success: false, error: error.message || 'Failed to fetch market prices by product' };
    }
  }

  /**
   * Fetch market prices by region
   */
  async getPricesByRegion(region: string): Promise<ServiceResponse<MarketPrice[]>> {
    try {
      // Validate input
      if (!region || region.trim() === '') {
        return { success: false, error: 'Region is required' };
      }

      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .eq('region', region)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.errorWithContext('MarketPriceService - getPricesByRegion', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      logger.errorWithContext('MarketPriceService - getPricesByRegion exception', error);
      return { success: false, error: error.message || 'Failed to fetch market prices by region' };
    }
  }

  /**
   * Fetch the latest market price for a specific product and region
   */
  async getLatestMarketPrice(product: string = 'Fresh Milk', region: string = 'Nairobi'): Promise<ServiceResponse<MarketPrice>> {
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .eq('product', product)
        .eq('region', region)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('MarketPriceService - getLatestMarketPrice', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No market price found for the specified product and region' };
      }

      return { success: true, data };
    } catch (error: any) {
      logger.errorWithContext('MarketPriceService - getLatestMarketPrice exception', error);
      return { success: false, error: error.message || 'Failed to fetch latest market price' };
    }
  }

  /**
   * Add or update a market price
   */
  async upsertPrice(priceData: Omit<MarketPrice, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<ServiceResponse<boolean>> {
    try {
      // Validate data
      const validation = this.validateMarketPrice(priceData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const { error } = priceData.id 
        ? await supabase.from('market_prices').update(priceData).eq('id', priceData.id)
        : await supabase.from('market_prices').insert(priceData);

      if (error) {
        logger.errorWithContext('MarketPriceService - upsertPrice', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: true };
    } catch (error: any) {
      logger.errorWithContext('MarketPriceService - upsertPrice exception', error);
      return { success: false, error: error.message || 'Failed to upsert market price' };
    }
  }

  /**
   * Delete a market price
   */
  async deletePrice(id: string): Promise<ServiceResponse<boolean>> {
    try {
      // Validate input
      if (!id) {
        return { success: false, error: 'Price ID is required' };
      }

      const { error } = await supabase
        .from('market_prices')
        .delete()
        .eq('id', id);

      if (error) {
        logger.errorWithContext('MarketPriceService - deletePrice', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: true };
    } catch (error: any) {
      logger.errorWithContext('MarketPriceService - deletePrice exception', error);
      return { success: false, error: error.message || 'Failed to delete market price' };
    }
  }
}

// Export singleton instance
export const marketPriceService = MarketPriceService.getInstance();