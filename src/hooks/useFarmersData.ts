import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';

interface Farmer {
  id: string;
  registration_number: string;
  full_name: string;
  phone_number: string;
  kyc_status: string;
}

interface FarmersData {
  farmers: Farmer[];
  totalCount: number;
}

export const useFarmersData = (currentPage: number, pageSize: number) => {
  return useQuery<FarmersData>({
    queryKey: [CACHE_KEYS.ADMIN_FARMERS, currentPage, pageSize],
    queryFn: async () => {
      console.log('Fetching farmers data from cache or API...');
      
      // For pagination, we need to get the total count first
      const { count, error: countError } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      // Then fetch the paginated data
      const { data, error } = await supabase
        .from('farmers')
        .select('id, registration_number, full_name, phone_number, kyc_status')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
        
      if (error) {
        throw error;
      }
      
      return {
        farmers: data as Farmer[],
        totalCount: count || 0
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};

// Simplified hook for cases where we just need all farmers without pagination
export const useAllFarmers = () => {
  return useQuery<Farmer[]>({
    queryKey: [CACHE_KEYS.ADMIN_FARMERS, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, registration_number, full_name, phone_number, kyc_status')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      return data as Farmer[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};

// Hook for approved farmers only (used in collector portal)
export const useApprovedFarmersData = () => {
  return useQuery<Farmer[]>({
    queryKey: [CACHE_KEYS.ADMIN_FARMERS, 'approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, registration_number, full_name, phone_number, kyc_status')
        .eq('kyc_status', 'approved')
        .order('full_name', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      return data as Farmer[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};