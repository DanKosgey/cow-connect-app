import { useState, useEffect, useCallback } from 'react';

interface TabCacheOptions {
  cacheKey: string;
  ttl?: number; // Time to live in milliseconds
}

interface TabCache<T> {
  data: T | null;
  timestamp: number;
}

export function useTabCache<T>(options: TabCacheOptions) {
  const { cacheKey, ttl = 5 * 60 * 1000 } = options; // Default 5 minutes
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data from cache
  const loadFromCache = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(`tab_cache_${cacheKey}`);
      if (!cached) return null;

      const parsed: TabCache<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - parsed.timestamp > ttl) {
        localStorage.removeItem(`tab_cache_${cacheKey}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to load from cache:', error);
      return null;
    }
  }, [cacheKey, ttl]);

  // Save data to cache
  const saveToCache = useCallback((data: T) => {
    try {
      const cacheItem: TabCache<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`tab_cache_${cacheKey}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  }, [cacheKey]);

  // Clear cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(`tab_cache_${cacheKey}`);
  }, [cacheKey]);

  // Initialize cache
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setCachedData(cached);
    }
    setLoading(false);
  }, [loadFromCache]);

  return {
    cachedData,
    loading,
    saveToCache,
    clearCache,
    loadFromCache
  };
}