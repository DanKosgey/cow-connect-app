import { QueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import CacheInvalidationService from './cache-invalidation-service';

// Create a singleton query client for caching
export const cacheClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    }
  },
});

// Create cache invalidation service instance
export const cacheInvalidationService = new CacheInvalidationService(cacheClient);

// Cache keys for different data types
export const CACHE_KEYS = {
  // Admin cache keys
  ADMIN_DASHBOARD: 'admin-dashboard',
  ADMIN_ANALYTICS: 'admin-analytics',
  ADMIN_COLLECTIONS: 'admin-collections',
  ADMIN_PAYMENTS: 'admin-payments',
  ADMIN_FARMERS: 'admin-farmers',
  ADMIN_STAFF: 'admin-staff',
  ADMIN_KYC: 'admin-kyc',
  ADMIN_CREDIT: 'admin-credit',
  ADMIN_REPORTS: 'admin-reports',
  ADMIN_SETTINGS: 'admin-settings',
  
  // Farmer cache keys
  FARMER_DASHBOARD: 'farmer-dashboard',
  FARMER_COLLECTIONS: 'farmer-collections',
  FARMER_PAYMENTS: 'farmer-payments',
  FARMER_CREDIT: 'farmer-credit',
  FARMER_PROFILE: 'farmer-profile',
  FARMER_QUALITY: 'farmer-quality',
  
  // Staff cache keys
  STAFF_DASHBOARD: 'staff-dashboard',
  STAFF_COLLECTIONS: 'staff-collections',
  STAFF_PAYMENTS: 'staff-payments',
  STAFF_FARMERS: 'staff-farmers',
  
  // Shared cache keys
  USER_PROFILE: 'user-profile',
  USER_ROLE: 'user-role',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  INVENTORY: 'inventory',
};

// Utility functions for common caching patterns
export const cacheUtils = {
  // Invalidate specific cache keys
  invalidateCache: (queryClient: QueryClient, cacheKeys: string | string[]) => {
    const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  },
  
  // Prefetch data for specific cache keys
  prefetchData: async (queryClient: QueryClient, cacheKey: string, fetchFn: () => Promise<any>) => {
    try {
      await queryClient.prefetchQuery({
        queryKey: [cacheKey],
        queryFn: fetchFn,
      });
    } catch (error) {
      logger.errorWithContext(`prefetchData-${cacheKey}`, error);
    }
  },
  
  // Clear specific cache entries
  clearCache: (queryClient: QueryClient, cacheKeys: string | string[]) => {
    const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
    keys.forEach(key => {
      queryClient.removeQueries({ queryKey: [key] });
    });
  },
  
  // Clear all cache
  clearAllCache: (queryClient: QueryClient) => {
    queryClient.clear();
  },
  
  // Get cache statistics
  getCacheStats: (queryClient: QueryClient) => {
    return {
      queryCount: queryClient.getQueryCache().getAll().length,
      mutationCount: queryClient.getMutationCache().getAll().length,
    };
  },
  
  // Get cache invalidation service
  getInvalidationService: (queryClient: QueryClient) => {
    return new CacheInvalidationService(queryClient);
  },
};

// Common data fetching functions with caching
export const cachedDataFetchers = {
  // Fetch user profile with caching
  fetchUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  },
  
  // Fetch user role with caching
  fetchUserRole: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    return data;
  },
  
  // Fetch notifications with caching
  fetchNotifications: async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) throw error;
    return data;
  },
  
  // Fetch system settings with caching
  fetchSystemSettings: async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');
      
    if (error) throw error;
    return data;
  },
};

export default cacheUtils;