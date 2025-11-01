import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database.types';
import { CACHE_KEYS } from '@/services/cache-utils';

type Farmer = Database['public']['Tables']['farmers']['Row'] & {
  profiles?: {
    email?: string | null;
    full_name?: string | null;
    phone?: string | null;
  } | null;
};

type KYCDocument = Database['public']['Tables']['kyc_documents']['Row'];

interface KYCAdminData {
  farmers: Farmer[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export const useKYCAdminData = (searchTerm: string, statusFilter: string) => {
  return useQuery<KYCAdminData>({
    queryKey: [CACHE_KEYS.ADMIN_KYC, searchTerm, statusFilter],
    queryFn: async () => {
      // Fetch farmers with their profiles
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          *,
          profiles:user_id(id, email, full_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const farmersData = data || [];
      
      // Calculate stats
      const stats = {
        total: farmersData.length,
        pending: farmersData.filter(f => f.kyc_status === 'pending').length,
        approved: farmersData.filter(f => f.kyc_status === 'approved').length,
        rejected: farmersData.filter(f => f.kyc_status === 'rejected').length
      };

      // Apply filters
      let filtered = [...farmersData];

      if (statusFilter !== 'all') {
        filtered = filtered.filter(f => f.kyc_status === statusFilter);
      }

      if (searchTerm) {
        filtered = filtered.filter(f =>
          f.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.national_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return {
        farmers: filtered,
        stats
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};