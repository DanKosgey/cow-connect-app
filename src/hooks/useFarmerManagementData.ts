import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';

interface Farmer {
  id: string;
  user_id: string;
  national_id: string;
  address: string;
  kyc_status: string;
  created_at: string;
  profiles: {
    full_name: string;
    phone: string;
    email: string;
  } | null;
  farmer_analytics: {
    total_collections: number;
    total_liters: number;
    avg_quality_score: number;
    current_month_liters: number;
    current_month_earnings: number;
  } | null;
}

interface Communication {
  id: string;
  farmer_id: string;
  staff_id: string;
  message: string;
  direction: 'sent' | 'received';
  created_at: string;
  farmer: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

interface Note {
  id: string;
  farmer_id: string;
  staff_id: string;
  note: string;
  created_at: string;
}

interface FarmerManagementData {
  farmers: Farmer[];
  communications: Communication[];
  notes: Note[];
}

export const useFarmerManagementData = (staffId: string | null) => {
  return useQuery<FarmerManagementData>({
    queryKey: [CACHE_KEYS.ADMIN_FARMERS, staffId],
    queryFn: async () => {
      if (!staffId) {
        throw new Error('Staff ID is required');
      }

      // Fetch approved farmers
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          user_id,
          national_id,
          address,
          kyc_status,
          created_at,
          profiles (
            full_name,
            phone,
            email
          ),
          farmer_analytics!farmer_analytics_farmer_id_fkey (
            total_collections,
            total_liters,
            avg_quality_score,
            current_month_liters,
            current_month_earnings
          )
        `)
        .order('full_name', { referencedTable: 'profiles', ascending: true });

      if (farmersError) {
        throw farmersError;
      }

      // Fetch communications
      const { data: communicationsData, error: communicationsError } = await supabase
        .from('farmer_communications')
        .select(`
          id,
          farmer_id,
          staff_id,
          message,
          direction,
          created_at,
          farmer:farmer_id (
            profiles (
              full_name
            )
          )
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false });

      if (communicationsError) {
        throw communicationsError;
      }

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('farmer_notes')
        .select(`
          id,
          farmer_id,
          staff_id,
          note,
          created_at
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false });

      if (notesError) {
        throw notesError;
      }

      return {
        farmers: farmersData || [],
        communications: communicationsData || [],
        notes: notesData || []
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    enabled: !!staffId
  });
};