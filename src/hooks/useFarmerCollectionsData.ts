import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';
import { subDays, subWeeks, subMonths, subYears } from 'date-fns';

interface Collection {
  id: string;
  collection_date: string;
  liters: number;
  total_amount: number;
  status: string;
  rate_per_liter: number;
}

interface FarmerCollectionsData {
  collections: Collection[];
  totalLiters: number;
  totalAmount: number;
  recentCollection?: Collection;
}

export const useFarmerCollectionsData = (farmerId: string | null, timeframe: string = 'month') => {
  return useQuery<FarmerCollectionsData>({
    queryKey: [CACHE_KEYS.FARMER_COLLECTIONS, farmerId, timeframe],
    queryFn: async () => {
      if (!farmerId) {
        throw new Error('Farmer ID is required');
      }

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'day':
          startDate = subDays(now, 1);
          break;
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = subDays(now, 30);
          break;
        case 'quarter':
          startDate = subDays(now, 90);
          break;
        case 'year':
          startDate = subDays(now, 365);
          break;
        default:
          startDate = subDays(now, 30);
      }

      // Fetch collections with date filtering - only show approved collections
      const { data: collectionsData, error } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmerId)
        .eq('approved_for_company', true)
        .gte('collection_date', startDate.toISOString())
        .order('collection_date', { ascending: false });

      if (error) {
        throw error;
      }

      const collections = collectionsData || [];
      
      // Calculate totals
      const totalLiters = collections.reduce((sum, collection) => sum + collection.liters, 0);
      const totalAmount = collections.reduce((sum, collection) => sum + collection.total_amount, 0);
      
      // Get recent collection (first in the sorted list)
      const recentCollection = collections.length > 0 ? collections[0] : undefined;

      return {
        collections,
        totalLiters,
        totalAmount,
        recentCollection
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    enabled: !!farmerId
  });
};