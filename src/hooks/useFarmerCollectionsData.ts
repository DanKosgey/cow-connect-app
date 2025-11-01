import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';

interface Collection {
  id: string;
  collection_date: string;
  liters: number;
  quality_grade: string;
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

export const useFarmerCollectionsData = (farmerId: string | null) => {
  return useQuery<FarmerCollectionsData>({
    queryKey: [CACHE_KEYS.FARMER_COLLECTIONS, farmerId],
    queryFn: async () => {
      if (!farmerId) {
        throw new Error('Farmer ID is required');
      }

      // Fetch collections
      const { data: collectionsData, error } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmerId)
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