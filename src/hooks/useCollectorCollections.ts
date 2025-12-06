import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';

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
  farmers?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
}

export const useCollectorCollections = (staffId: string) => {
  return useQuery<Collection[]>({
    queryKey: [CACHE_KEYS.COLLECTOR_COLLECTIONS, staffId],
    queryFn: async () => {
      if (!staffId) {
        return [];
      }

      // Fetch collections for this specific collector
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          staff_id,
          liters,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          gps_latitude,
          gps_longitude,
          farmers!inner (
            id,
            user_id,
            profiles (
              full_name,
              phone
            )
          )
        `)
        .eq('staff_id', staffId)
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }

      return collectionsData || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    enabled: !!staffId
  });
};