import { logger } from '@/utils/logger';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class OfflineCacheService {
  private static readonly CACHE_PREFIX = 'dairy_app_cache_';
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  // Save data to cache
  static async save<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      };

      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      logger.warn('Failed to save to cache', error);
    }
  }

  // Load data from cache
  static async load<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        // Remove expired entry
        localStorage.removeItem(cacheKey);
        return null;
      }

      return entry.data;
    } catch (error) {
      logger.warn('Failed to load from cache', error);
      return null;
    }
  }

  // Check if data exists in cache and is valid
  static async exists(key: string): Promise<boolean> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        return false;
      }

      const entry: CacheEntry<any> = JSON.parse(cached);
      return Date.now() <= entry.expiresAt;
    } catch (error) {
      logger.warn('Failed to check cache existence', error);
      return false;
    }
  }

  // Remove data from cache
  static async remove(key: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      logger.warn('Failed to remove from cache', error);
    }
  }

  // Clear all cache entries
  static async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      logger.warn('Failed to clear cache', error);
    }
  }

  // Get cache statistics
  static async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    expiredEntries: number;
  }> {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let expiredEntries = 0;

      cacheKeys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
          
          try {
            const entry: CacheEntry<any> = JSON.parse(item);
            if (Date.now() > entry.expiresAt) {
              expiredEntries++;
            }
          } catch (error) {
            // Invalid entry
          }
        }
      });

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        expiredEntries
      };
    } catch (error) {
      logger.warn('Failed to get cache stats', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0
      };
    }
  }
}