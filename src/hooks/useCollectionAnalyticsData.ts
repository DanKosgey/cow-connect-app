import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trendService } from '@/services/trend-service';
import { useMemo } from 'react';

// Define interfaces for our data structures
interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  farmers: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
  staff: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface DailyStats {
  date: string;
  collections: number;
  liters: number;
  amount: number;
  avgQuality: number;
}

interface QualityDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface FarmerStats {
  id: string;
  name: string;
  collections: number;
  liters: number;
  amount: number;
  avgQuality: number;
}

interface StaffStats {
  id: string;
  name: string;
  collections: number;
  liters: number;
  farmers: number;
}

interface Trends {
  totalCollections: number;
  totalLiters: number;
  totalRevenue: number;
  avgQuality: number;
  collectionsTrend: { value: number; isPositive: boolean };
  litersTrend: { value: number; isPositive: boolean };
  revenueTrend: { value: number; isPositive: boolean };
  qualityTrend: { value: number; isPositive: boolean };
}

// Cache keys for different data types
export const COLLECTION_ANALYTICS_CACHE_KEYS = {
  COLLECTIONS: 'collection-analytics-collections',
  TRENDS: 'collection-analytics-trends',
  FILTERED_COLLECTIONS: 'filtered-collections'
};

// Main hook for Collection Analytics Dashboard data
export const useCollectionAnalyticsData = () => {
  const queryClient = useQueryClient();

  // Get collections data
  const useCollections = (dateFilter: string) => {
    return useQuery<Collection[]>({
      queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.COLLECTIONS, dateFilter],
      queryFn: async () => {
        // First get collections with farmers data
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select(`
            *,
            farmers (
              id,
              user_id,
              profiles (full_name, phone)
            )
          `)
          .eq('approved_for_company', true) // Only fetch approved collections
          .gte('collection_date', dateFilter)
          .order('collection_date', { ascending: false })
          .limit(1000);

        if (collectionsError) {
          console.error('Error fetching collections:', collectionsError);
          throw collectionsError;
        }
        
        // If no collections, return early
        if (!collectionsData || collectionsData.length === 0) return [];
        
        // Extract unique staff IDs
        const staffIds = [...new Set(collectionsData
          .map(c => c.staff_id)
          .filter(Boolean))] as string[];
        
        // If no staff IDs, return collections with empty staff objects
        if (staffIds.length === 0) {
          return collectionsData.map(collection => ({
            ...collection,
            staff: {
              id: '',
              user_id: '',
              profiles: {
                full_name: 'N/A'
              }
            }
          }));
        }
        
        // Fetch staff data separately
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select(`
            id,
            user_id,
            profiles (full_name)
          `)
          .in('id', staffIds);
        
        if (staffError) {
          console.warn('Failed to fetch staff data:', staffError);
          // Return collections with placeholder staff data
          return collectionsData.map(collection => ({
            ...collection,
            staff: {
              id: collection.staff_id || '',
              user_id: '',
              profiles: {
                full_name: collection.staff_id ? 'Unknown Staff' : 'N/A'
              }
            }
          }));
        }
        
        // Create a map of staff data for quick lookup
        const staffMap = staffData?.reduce((acc, staff) => {
          acc[staff.id] = staff;
          return acc;
        }, {} as Record<string, any>) || {};
        
        // Merge collections with staff data
        return collectionsData.map(collection => ({
          ...collection,
          staff: collection.staff_id && staffMap[collection.staff_id] 
            ? staffMap[collection.staff_id]
            : {
                id: collection.staff_id || '',
                user_id: '',
                profiles: {
                  full_name: collection.staff_id ? 'Unknown Staff' : 'N/A'
                }
              }
        }));
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get trends data
  const useTrends = (dateRange: string) => {
    return useQuery<Trends>({
      queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.TRENDS, dateRange],
      queryFn: async () => {
        try {
          return await trendService.calculateCollectionsTrends(dateRange);
        } catch (error) {
          console.error('Error calculating trends:', error);
          return {
            totalCollections: 0,
            totalLiters: 0,
            totalRevenue: 0,
            avgQuality: 0,
            collectionsTrend: { value: 0, isPositive: true },
            litersTrend: { value: 0, isPositive: true },
            revenueTrend: { value: 0, isPositive: true },
            qualityTrend: { value: 0, isPositive: true }
          };
        }
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get filtered collections data
  const useFilteredCollections = (filters: { searchTerm: string; status: string; dateRange: string }) => {
    // Memoize the filters object to prevent unnecessary re-renders
    const memoizedFilters = useMemo(() => filters, [
      filters.searchTerm,
      filters.status,
      filters.dateRange
    ]);
    
    return useQuery<Collection[]>({
      queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.FILTERED_COLLECTIONS, memoizedFilters],
      queryFn: async () => {
        // First get collections with farmers data
        let query = supabase
          .from('collections')
          .select(`
            *,
            farmers (
              id,
              user_id,
              profiles (full_name, phone)
            )
          `)
          .eq('approved_for_company', true) // Only fetch approved collections
          .gte('collection_date', memoizedFilters.dateRange)
          .order('collection_date', { ascending: false })
          .limit(1000);

        // Apply status filter
        if (memoizedFilters.status !== 'all') {
          query = query.eq('status', memoizedFilters.status);
        }

        const { data: collectionsData, error: collectionsError } = await query;

        if (collectionsError) throw collectionsError;

        // If no collections, return early
        let filtered = collectionsData || [];
        if (filtered.length === 0) return [];
        
        // Apply search filter on client side
        if (memoizedFilters.searchTerm) {
          const term = memoizedFilters.searchTerm.toLowerCase();
          filtered = filtered.filter(c => 
            c.farmers?.profiles?.full_name?.toLowerCase().includes(term) ||
            c.collection_id?.toLowerCase().includes(term)
          );
        }
        
        // Extract unique staff IDs
        const staffIds = [...new Set(filtered
          .map(c => c.staff_id)
          .filter(Boolean))] as string[];
        
        // If no staff IDs, return collections with empty staff objects
        if (staffIds.length === 0) {
          return filtered.map(collection => ({
            ...collection,
            staff: {
              id: '',
              user_id: '',
              profiles: {
                full_name: 'N/A'
              }
            }
          }));
        }
        
        // Fetch staff data separately
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select(`
            id,
            user_id,
            profiles (full_name)
          `)
          .in('id', staffIds);
        
        if (staffError) {
          console.warn('Failed to fetch staff data:', staffError);
          // Return collections with placeholder staff data
          return filtered.map(collection => ({
            ...collection,
            staff: {
              id: collection.staff_id || '',
              user_id: '',
              profiles: {
                full_name: collection.staff_id ? 'Unknown Staff' : 'N/A'
              }
            }
          }));
        }
        
        // Create a map of staff data for quick lookup
        const staffMap = staffData?.reduce((acc, staff) => {
          acc[staff.id] = staff;
          return acc;
        }, {} as Record<string, any>) || {};
        
        // Merge collections with staff data
        return filtered.map(collection => ({
          ...collection,
          staff: collection.staff_id && staffMap[collection.staff_id] 
            ? staffMap[collection.staff_id]
            : {
                id: collection.staff_id || '',
                user_id: '',
                profiles: {
                  full_name: collection.staff_id ? 'Unknown Staff' : 'N/A'
                }
              }
        }));
      },
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Refresh collections data
  const refreshCollectionsMutation = useMutation({
    mutationFn: async () => {
      // Invalidate all collection analytics caches to force a refresh
      queryClient.invalidateQueries({ queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.COLLECTIONS] });
      queryClient.invalidateQueries({ queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.TRENDS] });
      queryClient.invalidateQueries({ queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.FILTERED_COLLECTIONS] });
      return true;
    }
  });

  // Export to CSV
  const exportToCSVMutation = useMutation({
    mutationFn: async (collections: Collection[]) => {
      if (collections.length === 0) {
        throw new Error('No data to export');
      }

      const csvData = collections.map(c => [
        c.collection_id,
        new Date(c.collection_date).toLocaleDateString(),
        c.farmers?.profiles?.full_name || 'N/A',
        c.staff?.profiles?.full_name || 'N/A',
        c.liters,
        c.rate_per_liter,
        c.total_amount,
        c.status,
        c.gps_latitude || 'N/A',
        c.gps_longitude || 'N/A'
      ]);

      const headers = ['Collection ID', 'Date', 'Farmer', 'Staff', 'Liters', 
                       'Rate per Liter', 'Total Amount', 'Status', 'GPS Latitude', 'GPS Longitude'];
      const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collections_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      return true;
    }
  });

  // Mutation to invalidate all collection analytics caches
  const invalidateCollectionAnalyticsCache = () => {
    queryClient.invalidateQueries({ queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.COLLECTIONS] });
    queryClient.invalidateQueries({ queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.TRENDS] });
    queryClient.invalidateQueries({ queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.FILTERED_COLLECTIONS] });
  };

  return {
    useCollections,
    useTrends,
    useFilteredCollections,
    refreshCollections: refreshCollectionsMutation,
    exportToCSV: exportToCSVMutation,
    invalidateCollectionAnalyticsCache
  };
};