import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';
import { useCallback } from 'react';

interface UseAdminDashboardDataOptions {
  timeRange: string;
  getDateFilter: () => { startDate: string; endDate: string };
}

export const useAdminDashboardData = (options: UseAdminDashboardDataOptions) => {
  const { timeRange, getDateFilter } = options;

  const fetchDashboardData = useCallback(async () => {
    const { startDate, endDate } = getDateFilter();
    
    // Fetch collections data
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        collection_id,
        farmer_id,
        staff_id,
        approved_by,
        liters,
        quality_grade,
        rate_per_liter,
        total_amount,
        collection_date,
        status,
        notes,
        farmers!inner(full_name)
      `)
      .gte('collection_date', startDate)
      .lte('collection_date', endDate)
      .order('collection_date', { ascending: false })
      .limit(200);
    
    // Fetch farmers data
    const { data: farmers, error: farmersError } = await supabase
      .from('farmers')
      .select(`
        id,
        user_id,
        registration_number,
        kyc_status,
        created_at,
        profiles:user_id (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    
    // Fetch staff data
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        user_id,
        employee_id,
        status,
        created_at,
        profiles:user_id (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (collectionsError) throw collectionsError;
    if (farmersError) throw farmersError;
    if (staffError) throw staffError;

    return {
      collections: collections || [],
      farmers: farmers || [],
      staff: staff || []
    };
  }, [timeRange, getDateFilter]);

  return useQuery({
    queryKey: [CACHE_KEYS.ADMIN_DASHBOARD, timeRange],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });
};

export const usePendingFarmers = () => {
  return useQuery({
    queryKey: [CACHE_KEYS.ADMIN_DASHBOARD, 'pending-farmers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_farmers')
        .select('id, full_name, email, phone_number, status, created_at, rejection_count')
        .in('status', ['pending_verification', 'email_verified'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useAdminAnalytics = (timeRange: string) => {
  return useQuery({
    queryKey: [CACHE_KEYS.ADMIN_ANALYTICS, timeRange],
    queryFn: async () => {
      // Fetch analytics data
      const { data, error } = await supabase
        .rpc('get_admin_dashboard_metrics', {
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};