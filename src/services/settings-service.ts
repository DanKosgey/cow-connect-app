import { supabase } from '@/integrations/supabase/client';

export interface SystemSettings {
  milk_rate_per_liter: number;
  collection_time_window: string;
  kyc_required: boolean;
  notifications_enabled: boolean;
  data_retention_days: number;
  system_message: string;
  default_role: string;
}

export interface Setting {
  key: string;
  value: any;
  updated_at?: string;
}

class SettingsService {
  private static instance: SettingsService;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  /**
   * Fetch all system settings with optimized caching
   */
  async getAllSettings(): Promise<SystemSettings> {
    // Check if we have a fresh cache of all settings
    const cacheKey = 'all_settings';
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;

      // Convert the data to our settings object
      const settingsObj: SystemSettings = {
        milk_rate_per_liter: 0,
        collection_time_window: '',
        kyc_required: true,
        notifications_enabled: true,
        data_retention_days: 365,
        system_message: '',
        default_role: 'farmer'
      };

      if (data) {
        data.forEach((setting: any) => {
          const key = setting.key as keyof SystemSettings;
          if (key in settingsObj) {
            // Type assertion to handle the assignment
            (settingsObj as any)[key] = setting.value;
            // Cache individual values as well
            this.cache.set(key, setting.value);
            this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
          }
        });
      }

      // Cache the complete settings object
      this.cache.set(cacheKey, settingsObj);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return settingsObj;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  /**
   * Get a specific setting value with optimized caching
   */
  async getSetting<T>(key: keyof SystemSettings): Promise<T | null> {
    // Check cache first
    if (this.isCacheValid(key)) {
      return this.cache.get(key) as T;
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) throw error;

      // Cache the value
      this.cache.set(key, data?.value);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);

      return data?.value as T;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Update a setting value with cache invalidation
   */
  async updateSetting(key: keyof SystemSettings, value: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;

      // Update cache
      this.cache.set(key, value);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
      
      // Invalidate the all_settings cache since we've updated a setting
      this.cache.delete('all_settings');
      this.cacheExpiry.delete('all_settings');
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple settings with batch operation and cache invalidation
   */
  async updateSettings(settings: Partial<SystemSettings>): Promise<void> {
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;

      // Update cache for each setting
      Object.entries(settings).forEach(([key, value]) => {
        this.cache.set(key, value);
        this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
      });
      
      // Invalidate the all_settings cache since we've updated settings
      this.cache.delete('all_settings');
      this.cacheExpiry.delete('all_settings');
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Check if cache is valid for a key
   */
  private isCacheValid(key: string | keyof SystemSettings): boolean {
    const expiry = this.cacheExpiry.get(key as string);
    if (!expiry) return false;
    return Date.now() < expiry;
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key?: keyof SystemSettings): void {
    if (key) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }
  
  /**
   * Preload commonly used settings to improve initial load performance
   */
  async preloadCommonSettings(): Promise<void> {
    try {
      // Preload the most commonly accessed settings
      const commonSettings: (keyof SystemSettings)[] = [
        'milk_rate_per_liter',
        'collection_time_window',
        'kyc_required',
        'notifications_enabled'
      ];
      
      // Fetch all common settings in a single query
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', commonSettings);
        
      if (error) throw error;
      
      // Cache the results
      if (data) {
        data.forEach((setting: any) => {
          this.cache.set(setting.key, setting.value);
          this.cacheExpiry.set(setting.key, Date.now() + this.CACHE_DURATION);
        });
      }
    } catch (error) {
      console.error('Error preloading common settings:', error);
    }
  }
}

export const settingsService = SettingsService.getInstance();