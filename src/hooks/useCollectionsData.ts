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
  staff?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface CollectionsData {
  collections: Collection[];
  farmers: any[];
  staff: any[];
}

export const useCollectionsData = () => {
  return useQuery<CollectionsData>({
    queryKey: [CACHE_KEYS.ADMIN_COLLECTIONS],
    queryFn: async () => {
      // Fetch collections with farmer and staff data
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
          ),
          staff (
            id,
            user_id,
            profiles (
              full_name
            )
          )
        `)
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }

      // Fetch farmers for dropdown
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select('id, profiles!user_id(full_name)')
        .eq('kyc_status', 'approved');

      if (farmersError) {
        throw farmersError;
      }

      // Fetch staff for dropdown
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, profiles!user_id(full_name)');

      if (staffError) {
        throw staffError;
      }

      return {
        collections: collectionsData || [],
        farmers: farmersData || [],
        staff: staffData || []
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};