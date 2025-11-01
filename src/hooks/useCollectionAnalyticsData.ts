import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trendService } from '@/services/trend-service';

// Define interfaces for our data structures
interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  quality_grade: string;
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
        const { data, error } = await supabase
          .from('collections')
          .select(`
            *,
            farmers!fk_collections_farmer_id (
              id,
              user_id,
              profiles!user_id (full_name, phone)
            ),
            staff!collections_staff_id_fkey (
              id,
              user_id,
              profiles!user_id (full_name)
            )
          `)
          .gte('collection_date', dateFilter)
          .order('collection_date', { ascending: false })
          .limit(1000);

        if (error) throw error;
        return data || [];
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
    return useQuery<Collection[]>({
      queryKey: [COLLECTION_ANALYTICS_CACHE_KEYS.FILTERED_COLLECTIONS, filters],
      queryFn: async () => {
        let query = supabase
          .from('collections')
          .select(`
            *,
            farmers!fk_collections_farmer_id (
              id,
              user_id,
              profiles!user_id (full_name, phone)
            ),
            staff!collections_staff_id_fkey (
              id,
              user_id,
              profiles!user_id (full_name)
            )
          `)
          .gte('collection_date', filters.dateRange)
          .order('collection_date', { ascending: false })
          .limit(1000);

        // Apply status filter
        if (filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Apply search filter on client side (as in the original component)
        let filtered = data || [];
        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          filtered = filtered.filter(c => 
            c.farmers?.profiles?.full_name?.toLowerCase().includes(term) ||
            c.collection_id?.toLowerCase().includes(term) ||
            c.staff?.profiles?.full_name?.toLowerCase().includes(term)
          );
        }

        return filtered;
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
        c.quality_grade,
        c.rate_per_liter,
        c.total_amount,
        c.status,
        c.gps_latitude || 'N/A',
        c.gps_longitude || 'N/A'
      ]);

      const headers = ['Collection ID', 'Date', 'Farmer', 'Staff', 'Liters', 'Quality Grade', 
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