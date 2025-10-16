/**
 * Simple in-memory cache for dashboard data to improve performance
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number; // in milliseconds
}

class DataCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Set up periodic cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.clean();
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Get data from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if item has expired
    if (Date.now() - item.timestamp > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * Set data in cache with expiry time
   */
  set<T>(key: string, data: T, expiry: number = 5 * 60 * 1000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  /**
   * Remove item from cache
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired items from cache
   */
  clean(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired cache items`);
    }
  }

  /**
   * Dispose of the cache and clean up resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

export const dataCache = new DataCache();