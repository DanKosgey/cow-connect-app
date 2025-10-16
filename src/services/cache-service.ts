interface CacheConfig {
  ttl: number;
  maxSize?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  priority?: number;
}

export class EnhancedCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private configs: Map<string, CacheConfig> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_MAX_SIZE = 1000;

  constructor() {
    // Set up cache cleanup interval
    setInterval(() => this.cleanup(), 60 * 1000); // Run cleanup every minute
  }

  setConfig(prefix: string, config: CacheConfig) {
    this.configs.set(prefix, {
      ttl: config.ttl || this.DEFAULT_TTL,
      maxSize: config.maxSize || this.DEFAULT_MAX_SIZE
    });
  }

  private getConfig(key: string): CacheConfig {
    // Find matching prefix
    const prefix = Array.from(this.configs.keys())
      .find(p => key.startsWith(p));
    
    return prefix ? this.configs.get(prefix)! : {
      ttl: this.DEFAULT_TTL,
      maxSize: this.DEFAULT_MAX_SIZE
    };
  }

  set<T>(key: string, data: T, priority: number = 1) {
    // Ensure we don't exceed max size
    const config = this.getConfig(key);
    if (this.cache.size >= config.maxSize!) {
      this.evictLeastValuable(config.maxSize!);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      priority
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const config = this.getConfig(key);
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > config.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const config = this.getConfig(key);
      if (now - entry.timestamp > config.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private evictLeastValuable(targetSize: number) {
    // Sort entries by priority and age
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        // Higher priority and newer entries are more valuable
        const priorityDiff = (a[1].priority || 1) - (b[1].priority || 1);
        if (priorityDiff !== 0) return priorityDiff;
        return a[1].timestamp - b[1].timestamp;
      });

    // Remove oldest, lowest priority entries until we reach target size
    while (this.cache.size > targetSize) {
      const [key] = entries.shift()!;
      this.cache.delete(key);
    }
  }

  clear() {
    this.cache.clear();
  }

  clearPrefix(prefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clearKey(key: string) {
    this.cache.delete(key);
  }
}

// Create singleton instance
export const enhancedCache = new EnhancedCache();

// Configure cache TTLs for different data types
enhancedCache.setConfig('staffInfo_', { ttl: 30 * 60 * 1000 }); // 30 minutes for staff info
enhancedCache.setConfig('collections_', { ttl: 2 * 60 * 1000 }); // 2 minutes for collections
enhancedCache.setConfig('payments_', { ttl: 5 * 60 * 1000 }); // 5 minutes for payments
enhancedCache.setConfig('qualityTests_', { ttl: 10 * 60 * 1000 }); // 10 minutes for quality tests
enhancedCache.setConfig('inventoryItems_', { ttl: 15 * 60 * 1000 }); // 15 minutes for inventory