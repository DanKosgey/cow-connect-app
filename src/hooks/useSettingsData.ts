import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { settingsService, SystemSettings } from '@/services/settings-service';
import { supabase } from '@/integrations/supabase/client';

// Define interfaces for our data structures
interface CompanyLocation {
  id: string;
  name: string;
  address: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  created_at: string;
}

interface UserRole {
  role: string;
  active: boolean;
}

interface User {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  user_roles: UserRole[] | null;
}

// Cache keys for different data types
export const SETTINGS_CACHE_KEYS = {
  SYSTEM_SETTINGS: 'system-settings',
  USERS: 'users',
  LOCATIONS: 'company-locations'
};

// Main hook for Settings data
export const useSettingsData = () => {
  const queryClient = useQueryClient();

  // Get system settings
  const useSystemSettings = () => {
    return useQuery<SystemSettings>({
      queryKey: [SETTINGS_CACHE_KEYS.SYSTEM_SETTINGS],
      queryFn: () => settingsService.getAllSettings(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Update system settings
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<SystemSettings>) => settingsService.updateSettings(settings),
    onSuccess: () => {
      // Invalidate settings cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [SETTINGS_CACHE_KEYS.SYSTEM_SETTINGS] });
    }
  });

  // Get users with roles
  const useUsers = () => {
    return useQuery<User[]>({
      queryKey: [SETTINGS_CACHE_KEYS.USERS],
      queryFn: async () => {
        // Use database optimizer for better performance
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            phone,
            user_roles (
              role,
              active
            )
          `)
          .limit(100);

        if (error) throw error;

        // Ensure user_roles is always an array
        return (data || []).map(user => ({
          ...user,
          user_roles: Array.isArray(user.user_roles) ? user.user_roles : []
        }));
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Toggle user role
  const toggleUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role, currentActive }: { userId: string; role: string; currentActive: boolean }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ active: !currentActive })
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Invalidate users cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [SETTINGS_CACHE_KEYS.USERS] });
    }
  });

  // Get company locations
  const useCompanyLocations = () => {
    return useQuery<CompanyLocation[]>({
      queryKey: [SETTINGS_CACHE_KEYS.LOCATIONS],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('warehouses')
          .select('*')
          .order('name');

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Add company location
  const addLocationMutation = useMutation({
    mutationFn: async (locationData: Omit<CompanyLocation, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert([locationData])
        .select();

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    onSuccess: () => {
      // Invalidate locations cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [SETTINGS_CACHE_KEYS.LOCATIONS] });
    }
  });

  // Delete company location
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate locations cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [SETTINGS_CACHE_KEYS.LOCATIONS] });
    }
  });

  // Mutation to invalidate all settings caches
  const invalidateSettingsCache = () => {
    queryClient.invalidateQueries({ queryKey: [SETTINGS_CACHE_KEYS.SYSTEM_SETTINGS] });
    queryClient.invalidateQueries({ queryKey: [SETTINGS_CACHE_KEYS.USERS] });
    queryClient.invalidateQueries({ queryKey: [SETTINGS_CACHE_KEYS.LOCATIONS] });
  };

  return {
    useSystemSettings,
    updateSettings: updateSettingsMutation,
    useUsers,
    toggleUserRole: toggleUserRoleMutation,
    useCompanyLocations,
    addLocation: addLocationMutation,
    deleteLocation: deleteLocationMutation,
    invalidateSettingsCache
  };
};