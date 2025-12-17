import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CACHE_KEYS } from '@/services/cache-utils';
import { subDays, subWeeks, subMonths, subYears } from 'date-fns';

export const useFarmerDashboard = (timeframe: string = 'week') => {
  const { data: stats, isLoading: loading, error, refetch } = useQuery({
    queryKey: [CACHE_KEYS.FARMER_DASHBOARD, timeframe],
    queryFn: async () => {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // First, get the farmer record
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (farmerError) throw farmerError;
      
      if (!farmer) {
        throw new Error('Farmer profile not found');
      }

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'day':
          startDate = subDays(now, 1);
          break;
        case 'week':
          startDate = subWeeks(now, 1);
          break;
        case 'month':
          startDate = subMonths(now, 1);
          break;
        case 'quarter':
          startDate = subMonths(now, 3);
          break;
        case 'year':
          startDate = subYears(now, 1);
          break;
        default:
          startDate = subMonths(now, 1);
      }

      // Fetch collections within the selected timeframe - only show approved collections
      const { data: timeframeCollections, error: timeframeCollectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .eq('approved_for_company', true)  // Add this filter to match Collections page
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString())
        .order('collection_date', { ascending: false });

      if (timeframeCollectionsError) throw timeframeCollectionsError;

      // Calculate timeframe stats
      const timeframeLiters = timeframeCollections ? timeframeCollections.reduce((sum, collection) => sum + (collection.liters || 0), 0) : 0;
      const timeframeEarnings = timeframeCollections ? timeframeCollections.reduce((sum, collection) => sum + (collection.total_amount || 0), 0) : 0;

      // Fetch recent collections for activity feed (last 10 within timeframe)
      const { data: recentCollections, error: recentCollectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .eq('approved_for_company', true)  // Add this filter to match Collections page
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString())
        .order('collection_date', { ascending: false })
        .limit(10);

      if (recentCollectionsError) throw recentCollectionsError;

      // Fetch collection trend data within the selected timeframe
      const { data: collectionTrendData, error: collectionTrendError } = await supabase
        .from('collections')
        .select('collection_date, liters')
        .eq('farmer_id', farmer.id)
        .eq('approved_for_company', true)  // Add this filter to match Collections page
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString())
        .order('collection_date', { ascending: true });

      if (collectionTrendError) throw collectionTrendError;

      // Group by date for trend chart
      const dailyStats: Record<string, { liters: number; count: number }> = {};
      if (collectionTrendData) {
        collectionTrendData.forEach(collection => {
          const date = new Date(collection.collection_date).toISOString().split('T')[0];
          if (!dailyStats[date]) {
            dailyStats[date] = { liters: 0, count: 0 };
          }
          dailyStats[date].liters += collection.liters || 0;
          dailyStats[date].count += 1;
        });
      }

      // Convert to collection trend format
      const collectionTrend = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        liters: stats.liters
      }));

      // Fetch all-time stats (within timeframe)
      const { data: timeframeAllCollections, error: timeframeAllCollectionsError } = await supabase
        .from('collections')
        .select('liters, total_amount')
        .eq('farmer_id', farmer.id)
        .eq('approved_for_company', true)  // Add this filter to match Collections page
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString());

      if (timeframeAllCollectionsError) throw timeframeAllCollectionsError;

      const timeframeStats = {
        totalLiters: timeframeAllCollections ? timeframeAllCollections.reduce((sum, collection) => sum + (collection.liters || 0), 0) : 0,
        totalCollections: timeframeAllCollections ? timeframeAllCollections.length : 0,
        totalEarnings: timeframeAllCollections ? timeframeAllCollections.reduce((sum, collection) => sum + (collection.total_amount || 0), 0) : 0
      };

      // Return all stats with null safety
      return {
        today: {
          collections: timeframeCollections ? timeframeCollections.length : 0,
          liters: timeframeLiters,
          earnings: timeframeEarnings
        },
        thisMonth: {
          collections: timeframeCollections ? timeframeCollections.length : 0,
          liters: timeframeLiters,
          earnings: timeframeEarnings
        },
        recentCollections: recentCollections || [],
        collectionTrend: collectionTrend || [],
        allTime: timeframeStats
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes,
    retry: 2, // Retry failed requests up to 2 times
  });

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, error: error?.message || null, refresh };
};