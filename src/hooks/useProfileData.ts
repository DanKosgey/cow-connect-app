import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define interfaces for our data structures
interface FarmerProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  address: string;
  farm_location: string;
  national_id: string;
  kyc_status: string;
  registration_number: string;
}

// Cache keys for different data types
export const PROFILE_CACHE_KEYS = {
  FARMER_PROFILE: 'farmer-profile'
};

// Main hook for Profile data
export const useProfileData = () => {
  const queryClient = useQueryClient();

  // Get farmer profile
  const useFarmerProfile = () => {
    return useQuery<FarmerProfile | null>({
      queryKey: [PROFILE_CACHE_KEYS.FARMER_PROFILE],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return null;

        // Fetch farmer profile
        const { data: farmerData, error } = await supabase
          .from('farmers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        return farmerData || null;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Update farmer profile
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<FarmerProfile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      // Fetch farmer profile to get the ID
      const { data: farmerData, error: fetchError } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!farmerData) throw new Error('Farmer profile not found');

      // Update farmer profile
      const { error: updateError } = await supabase
        .from('farmers')
        .update(profileData)
        .eq('id', farmerData.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      // Invalidate profile cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [PROFILE_CACHE_KEYS.FARMER_PROFILE] });
    }
  });

  // Mutation to invalidate profile cache
  const invalidateProfileCache = () => {
    queryClient.invalidateQueries({ queryKey: [PROFILE_CACHE_KEYS.FARMER_PROFILE] });
  };

  return {
    useFarmerProfile,
    updateProfile: updateProfileMutation,
    invalidateProfileCache
  };
};