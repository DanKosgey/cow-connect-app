import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface MilkRate {
  id: number;
  rate_per_liter: number;
  is_active: boolean;
  effective_from: string;
  created_at: string;
}

class MilkRateService {
  private static instance: MilkRateService;
  private currentRate: number | null = null;
  private listeners: Array<(rate: number) => void> = [];
  private lastFetchTime: number | null = null;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes cache

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): MilkRateService {
    if (!MilkRateService.instance) {
      MilkRateService.instance = new MilkRateService();
    }
    return MilkRateService.instance;
  }

  /**
   * Fetch the current active milk rate
   */
  async getCurrentRate(): Promise<number> {
    try {
      // Check if we have a cached rate that's still valid
      const now = Date.now();
      if (this.currentRate !== null && this.lastFetchTime && (now - this.lastFetchTime) < this.cacheDuration) {
        return this.currentRate;
      }

      const { data, error } = await supabase
        .from('milk_rates')
        .select('rate_per_liter')
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1);

      if (error) {
        logger.errorWithContext('MilkRateService - getCurrentRate', error);
        throw error;
      }

      if (data && data.length > 0) {
        const rate = data[0].rate_per_liter;
        this.currentRate = rate;
        this.lastFetchTime = now;
        this.notifyListeners(rate);
        return rate;
      }

      // Return a default rate if no active rate is found
      return 0;
    } catch (error) {
      logger.errorWithContext('MilkRateService - getCurrentRate exception', error);
      // Return a default rate if there's an error
      return 0;
    }
  }

  /**
   * Subscribe to rate changes
   */
  subscribe(callback: (rate: number) => void): () => void {
    this.listeners.push(callback);
    
    // If we already have a current rate, notify immediately
    if (this.currentRate !== null) {
      callback(this.currentRate);
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of a rate change
   */
  private notifyListeners(rate: number): void {
    this.listeners.forEach(callback => {
      try {
        callback(rate);
      } catch (error) {
        logger.errorWithContext('MilkRateService - notifyListeners exception', error);
      }
    });
  }

  /**
   * Update the milk rate
   */
  async updateRate(newRate: number, effectiveFrom: string): Promise<boolean> {
    try {
      // Start a transaction-like operation by deactivating old rates first
      const { error: updateError } = await supabase
        .from('milk_rates')
        .update({ is_active: false })
        .eq('is_active', true);

      if (updateError) {
        logger.errorWithContext('MilkRateService - updateRate deactivate', updateError);
        throw updateError;
      }

      // Insert new rate without specifying ID to let the database auto-generate it
      // The milk_rates table uses bigserial for ID which should auto-increment
      const { error: insertError } = await supabase
        .from('milk_rates')
        .insert({
          rate_per_liter: newRate,
          effective_from: effectiveFrom,
          is_active: true
          // ID is intentionally omitted to allow auto-generation
        });

      if (insertError) {
        logger.errorWithContext('MilkRateService - updateRate insert', insertError);
        throw insertError;
      }

      // Update the current rate and notify listeners
      this.currentRate = newRate;
      this.lastFetchTime = Date.now();
      this.notifyListeners(newRate);

      return true;
    } catch (error) {
      logger.errorWithContext('MilkRateService - updateRate exception', error);
      return false;
    }
  }

  /**
   * Clear the cache to force a fresh fetch
   */
  clearCache(): void {
    this.currentRate = null;
    this.lastFetchTime = null;
  }
}

// Export singleton instance
export const milkRateService = MilkRateService.getInstance();