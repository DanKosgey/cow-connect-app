import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { MarketPrice, marketPriceService } from './market-price-service';

export interface MarketPriceInput {
  product: string;
  region: string;
  price: number;
  previous_price?: number;
  change?: number;
  change_percent?: number;
}

// Response types for better error handling
export interface AdminServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processed?: number;
  errors?: string[];
}

class AdminMarketPriceService {
  private static instance: AdminMarketPriceService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): AdminMarketPriceService {
    if (!AdminMarketPriceService.instance) {
      AdminMarketPriceService.instance = new AdminMarketPriceService();
    }
    return AdminMarketPriceService.instance;
  }

  /**
   * Add a new market price
   */
  async addPrice(priceData: MarketPriceInput): Promise<AdminServiceResponse<MarketPrice>> {
    try {
      // Validate data using the main service
      const validation = marketPriceService.validateMarketPrice(priceData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Calculate change and change_percent if not provided
      let change = priceData.change;
      let change_percent = priceData.change_percent;
      
      if (priceData.previous_price !== undefined && change === undefined) {
        change = priceData.price - priceData.previous_price;
      }
      
      if (priceData.previous_price !== undefined && change !== undefined && change_percent === undefined) {
        change_percent = priceData.previous_price > 0 ? (change / priceData.previous_price) * 100 : 0;
      }

      const result = await marketPriceService.upsertPrice({
        product: priceData.product,
        region: priceData.region,
        price: priceData.price,
        previous_price: priceData.previous_price,
        change: change,
        change_percent: change_percent
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Fetch the created record to return it
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        logger.errorWithContext('AdminMarketPriceService - addPrice fetch created', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as MarketPrice };
    } catch (error: any) {
      logger.errorWithContext('AdminMarketPriceService - addPrice exception', error);
      return { success: false, error: error.message || 'Failed to add market price' };
    }
  }

  /**
   * Update an existing market price
   */
  async updatePrice(id: string, priceData: Partial<MarketPriceInput>): Promise<AdminServiceResponse<MarketPrice>> {
    try {
      // Validate input
      if (!id) {
        return { success: false, error: 'Price ID is required' };
      }

      // Validate data if provided
      if (Object.keys(priceData).length > 0) {
        const validation = marketPriceService.validateMarketPrice(priceData);
        if (!validation.isValid) {
          return { success: false, error: validation.errors.join(', ') };
        }
      }

      // Calculate change and change_percent if needed
      let updateData: any = { ...priceData };
      
      if (priceData.price !== undefined && priceData.previous_price !== undefined && updateData.change === undefined) {
        updateData.change = priceData.price - priceData.previous_price;
      }
      
      if (priceData.previous_price !== undefined && updateData.change !== undefined && updateData.change_percent === undefined) {
        updateData.change_percent = priceData.previous_price > 0 ? (updateData.change / priceData.previous_price) * 100 : 0;
      }

      const result = await marketPriceService.upsertPrice({
        id,
        ...updateData
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Fetch the updated record to return it
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.errorWithContext('AdminMarketPriceService - updatePrice fetch updated', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as MarketPrice };
    } catch (error: any) {
      logger.errorWithContext('AdminMarketPriceService - updatePrice exception', error);
      return { success: false, error: error.message || 'Failed to update market price' };
    }
  }

  /**
   * Delete a market price
   */
  async deletePrice(id: string): Promise<AdminServiceResponse<boolean>> {
    try {
      // Validate input
      if (!id) {
        return { success: false, error: 'Price ID is required' };
      }

      const result = await marketPriceService.deletePrice(id);
      return result as AdminServiceResponse<boolean>;
    } catch (error: any) {
      logger.errorWithContext('AdminMarketPriceService - deletePrice exception', error);
      return { success: false, error: error.message || 'Failed to delete market price' };
    }
  }

  /**
   * Bulk update market prices from a data source
   */
  async bulkUpdatePrices(prices: MarketPriceInput[]): Promise<AdminServiceResponse<boolean>> {
    try {
      const errors: string[] = [];
      let processed = 0;

      for (const priceData of prices) {
        try {
          // Check if a price already exists for this product/region combination
          const { data: existingData, error: fetchError } = await supabase
            .from('market_prices')
            .select('id, price, previous_price')
            .eq('product', priceData.product)
            .eq('region', priceData.region)
            .maybeSingle();

          if (fetchError) {
            errors.push(`Failed to check existing price for ${priceData.product} in ${priceData.region}: ${fetchError.message}`);
            continue;
          }

          let result;
          if (existingData) {
            // Update existing price
            const previous_price = existingData.price;
            const change = priceData.price - previous_price;
            const change_percent = previous_price > 0 ? (change / previous_price) * 100 : 0;
            
            result = await this.updatePrice(existingData.id, {
              ...priceData,
              previous_price,
              change,
              change_percent
            });
          } else {
            // Add new price
            result = await this.addPrice(priceData);
          }

          if (result.success) {
            processed++;
          } else {
            errors.push(`Failed to process ${priceData.product} in ${priceData.region}: ${result.error}`);
          }
        } catch (error: any) {
          errors.push(`Exception processing ${priceData.product} in ${priceData.region}: ${error.message || error}`);
        }
      }

      return { 
        success: errors.length === 0, 
        processed, 
        errors,
        data: errors.length === 0
      };
    } catch (error: any) {
      logger.errorWithContext('AdminMarketPriceService - bulkUpdatePrices exception', error);
      return { success: false, error: error.message || 'Failed to bulk update prices', processed: 0, errors: ['Failed to bulk update prices'] };
    }
  }

  /**
   * Import market prices from CSV data
   */
  async importFromCSV(csvData: string): Promise<AdminServiceResponse<boolean>> {
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['product', 'region', 'price'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      
      if (missingHeaders.length > 0) {
        return { 
          success: false, 
          error: `Missing required headers: ${missingHeaders.join(', ')}`,
          processed: 0,
          errors: [`Missing required headers: ${missingHeaders.join(', ')}`]
        };
      }

      const prices: MarketPriceInput[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) {
          errors.push(`Line ${i + 1}: Column count mismatch`);
          continue;
        }

        try {
          const priceData: any = {};
          headers.forEach((header, index) => {
            const value = values[index].trim();
            if (header === 'price' || header === 'previous_price' || header === 'change' || header === 'change_percent') {
              priceData[header] = parseFloat(value);
            } else {
              priceData[header] = value;
            }
          });

          prices.push(priceData as MarketPriceInput);
        } catch (error: any) {
          errors.push(`Line ${i + 1}: Failed to parse data - ${error.message || error}`);
        }
      }

      if (prices.length === 0) {
        return { 
          success: false, 
          error: 'No valid price data found in CSV',
          processed: 0,
          errors: ['No valid price data found in CSV']
        };
      }

      const result = await this.bulkUpdatePrices(prices);
      return {
        success: result.success,
        processed: result.processed,
        errors: [...errors, ...(result.errors || [])],
        data: result.success
      };
    } catch (error: any) {
      logger.errorWithContext('AdminMarketPriceService - importFromCSV exception', error);
      return { 
        success: false, 
        error: error.message || 'Failed to import from CSV',
        processed: 0,
        errors: [error.message || 'Failed to import from CSV']
      };
    }
  }
}

// Export singleton instance
export const adminMarketPriceService = AdminMarketPriceService.getInstance();