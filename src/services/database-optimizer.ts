import { supabase } from '@/integrations/supabase/client';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { logger } from '@/utils/logger';

interface QueryCacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private queryCache: Map<string, QueryCacheEntry> = new Map();
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  /**
   * Execute a query with caching
   */
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    cacheDuration: number = this.DEFAULT_CACHE_DURATION
  ): Promise<T> {
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      logger.debug(`Cache hit for query: ${cacheKey}`);
      return cached.data as T;
    }

    // Execute query with performance monitoring
    const id = performanceMonitor.startTiming(`cachedQuery-${cacheKey}`);
    try {
      const result = await queryFn();
      
      // Cache the result
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        expiry: Date.now() + cacheDuration
      });
      
      return result;
    } catch (error) {
      logger.errorWithContext(`cachedQuery-${cacheKey}`, error);
      throw error;
    } finally {
      performanceMonitor.endTiming(id, `cachedQuery-${cacheKey}`);
    }
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.queryCache.delete(cacheKey);
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; expiredEntries: number } {
    const now = Date.now();
    let expiredEntries = 0;
    
    for (const entry of this.queryCache.values()) {
      if (now > entry.expiry) {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.queryCache.size,
      expiredEntries
    };
  }

  /**
   * Optimize user data fetching with caching
   */
  async fetchUsersWithRoles(limit: number = 50, offset: number = 0): Promise<any[]> {
    const cacheKey = `users-with-roles-${limit}-${offset}`;
    
    return this.cachedQuery(cacheKey, async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          user_roles (
            role,
            active
          ),
          created_at
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Optimize farmer data fetching with caching
   */
  async fetchFarmersWithDetails(limit: number = 50, offset: number = 0): Promise<any[]> {
    const cacheKey = `farmers-with-details-${limit}-${offset}`;
    
    return this.cachedQuery(cacheKey, async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          user_id,
          registration_number,
          full_name,
          phone_number,
          kyc_status,
          created_at,
          profiles (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Optimize staff data fetching with caching
   */
  async fetchStaffWithDetails(limit: number = 50, offset: number = 0): Promise<any[]> {
    const cacheKey = `staff-with-details-${limit}-${offset}`;
    
    return this.cachedQuery(cacheKey, async () => {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          user_id,
          employee_id,
          created_at,
          profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Optimize payment data fetching with caching
   */
  async fetchPaymentsWithDetails(limit: number = 50, offset: number = 0): Promise<any[]> {
    const cacheKey = `payments-with-details-${limit}-${offset}`;
    
    return this.cachedQuery(cacheKey, async () => {
      const { data, error } = await supabase
        .from('farmer_payments')
        .select(`
          id,
          farmer_id,
          amount,
          payment_date,
          payment_method,
          status,
          approved_by,
          approved_at,
          created_at,
          farmers (
            full_name,
            registration_number
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Optimize collection data fetching with caching
   */
  async fetchCollectionsWithDetails(limit: number = 50, offset: number = 0): Promise<any[]> {
    const cacheKey = `collections-with-details-${limit}-${offset}`;
    
    return this.cachedQuery(cacheKey, async () => {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          farmer_id,
          staff_id,
          quantity,
          fat_content,
          snf_content,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          created_at,
          farmers (
            full_name,
            registration_number
          ),
          staff (
            employee_id
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Invalidate related caches when data changes
   */
  invalidateRelatedCaches(tableName: string): void {
    const patternsToInvalidate: Record<string, string[]> = {
      'profiles': ['users-with-roles'],
      'user_roles': ['users-with-roles'],
      'farmers': ['farmers-with-details', 'collections-with-details', 'payments-with-details'],
      'staff': ['staff-with-details', 'collections-with-details'],
      'collections': ['collections-with-details'],
      'farmer_payments': ['payments-with-details']
    };

    const patterns = patternsToInvalidate[tableName] || [];
    
    for (const pattern of patterns) {
      for (const key of this.queryCache.keys()) {
        if (key.startsWith(pattern)) {
          this.queryCache.delete(key);
          logger.debug(`Invalidated cache: ${key}`);
        }
      }
    }
  }
}

export const databaseOptimizer = DatabaseOptimizer.getInstance();