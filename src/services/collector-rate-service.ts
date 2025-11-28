import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CollectorRate {
  id: number;
  rate_per_liter: number;
  is_active: boolean;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

class CollectorRateService {
  private static instance: CollectorRateService;
  private currentRate: number | null = null;
  private listeners: Array<(rate: number) => void> = [];
  private lastFetchTime: number | null = null;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes cache

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): CollectorRateService {
    if (!CollectorRateService.instance) {
      CollectorRateService.instance = new CollectorRateService();
    }
    return CollectorRateService.instance;
  }

  /**
   * Fetch the current active collector rate
   */
  async getCurrentRate(): Promise<number> {
    try {
      // Check if we have a cached rate that's still valid
      const now = Date.now();
      if (this.currentRate !== null && this.lastFetchTime && (now - this.lastFetchTime) < this.cacheDuration) {
        return this.currentRate;
      }

      const { data, error } = await supabase
        .rpc('get_current_collector_rate');

      if (error) {
        logger.errorWithContext('CollectorRateService - getCurrentRate', error);
        throw error;
      }

      const rate = data || 0;
      this.currentRate = rate;
      this.lastFetchTime = now;
      this.notifyListeners(rate);
      return rate;
    } catch (error) {
      logger.errorWithContext('CollectorRateService - getCurrentRate exception', error);
      return 0;
    }
  }

  /**
   * Update the collector rate
   */
  async updateRate(newRate: number, effectiveFrom: string): Promise<boolean> {
    try {
      // First, deactivate all existing active rates
      const { error: updateError } = await supabase
        .from('collector_rates')
        .update({ is_active: false })
        .eq('is_active', true);

      if (updateError) {
        logger.errorWithContext('CollectorRateService - updateRate deactivate', updateError);
        throw updateError;
      }

      // Insert new rate
      const { error: insertError } = await supabase
        .from('collector_rates')
        .insert({
          rate_per_liter: newRate,
          effective_from: effectiveFrom,
          is_active: true
        });

      if (insertError) {
        logger.errorWithContext('CollectorRateService - updateRate insert', insertError);
        throw insertError;
      }

      // Update the current rate and notify listeners
      this.currentRate = newRate;
      this.lastFetchTime = Date.now();
      this.notifyListeners(newRate);

      return true;
    } catch (error) {
      logger.errorWithContext('CollectorRateService - updateRate exception', error);
      return false;
    }
  }

  /**
   * Subscribe to rate changes
   */
  subscribe(callback: (rate: number) => void): () => void {
    this.listeners.push(callback);
    
    // If we have a current rate, notify immediately
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
   * Notify all subscribers of a rate change
   */
  private notifyListeners(rate: number): void {
    this.listeners.forEach(callback => callback(rate));
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
export const collectorRateService = CollectorRateService.getInstance();