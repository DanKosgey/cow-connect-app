import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CACHE_KEYS } from '@/services/cache-utils';
import { subDays, subWeeks, subMonths, subYears } from 'date-fns';

export const useFarmerDashboard = (timeframe: string = 'month') => {
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
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = subDays(now, 30);
          break;
        case 'quarter':
          startDate = subDays(now, 90);
          break;
        case 'year':
          startDate = subDays(now, 365);
          break;
        default:
          startDate = subDays(now, 30);
      }

      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch today's collections (within the selected timeframe)
      const { data: todayCollections, error: todayCollectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString())
        .order('collection_date', { ascending: false });

      if (todayCollectionsError) throw todayCollectionsError;

      // Calculate today's stats
      const todayLiters = todayCollections ? todayCollections.reduce((sum, collection) => sum + (collection.liters || 0), 0) : 0;
      const todayEarnings = todayCollections ? todayCollections.reduce((sum, collection) => sum + (collection.total_amount || 0), 0) : 0;
      
      // Convert quality grades to numerical values for averaging
      const gradeValues: Record<string, number> = {
        'A+': 4,
        'A': 3,
        'B': 2,
        'C': 1
      };
      
      const todayAvgQuality = todayCollections && todayCollections.length > 0 
        ? todayCollections.reduce((sum, collection) => sum + (gradeValues[collection.quality_grade] || 0), 0) / todayCollections.length 
        : 0;

      // Fetch collections within the selected timeframe
      const { data: timeframeCollections, error: timeframeCollectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString())
        .order('collection_date', { ascending: false });

      if (timeframeCollectionsError) throw timeframeCollectionsError;

      // Calculate timeframe stats
      const timeframeLiters = timeframeCollections ? timeframeCollections.reduce((sum, collection) => sum + (collection.liters || 0), 0) : 0;
      const timeframeEarnings = timeframeCollections ? timeframeCollections.reduce((sum, collection) => sum + (collection.total_amount || 0), 0) : 0;
      const timeframeAvgQuality = timeframeCollections && timeframeCollections.length > 0 
        ? timeframeCollections.reduce((sum, collection) => sum + (gradeValues[collection.quality_grade] || 0), 0) / timeframeCollections.length 
        : 0;

      // Calculate quality distribution
      const qualityDistribution: Record<string, number> = {};
      if (timeframeCollections) {
        timeframeCollections.forEach(collection => {
          const grade = collection.quality_grade;
          qualityDistribution[grade] = (qualityDistribution[grade] || 0) + 1;
        });
      }

      // Fetch recent collections for activity feed (last 10 within timeframe)
      const { data: recentCollections, error: recentCollectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString())
        .order('collection_date', { ascending: false })
        .limit(10);

      if (recentCollectionsError) throw recentCollectionsError;

      // Fetch quality trend data within the selected timeframe
      const { data: qualityTrendData, error: qualityTrendError } = await supabase
        .from('collections')
        .select('collection_date, quality_grade, liters')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString())
        .order('collection_date', { ascending: true });

      if (qualityTrendError) throw qualityTrendError;

      // Group by date for trend chart
      const dailyStats: Record<string, { liters: number; qualityGrades: string[]; count: number }> = {};
      if (qualityTrendData) {
        qualityTrendData.forEach(collection => {
          const date = new Date(collection.collection_date).toISOString().split('T')[0];
          if (!dailyStats[date]) {
            dailyStats[date] = { liters: 0, qualityGrades: [], count: 0 };
          }
          dailyStats[date].liters += collection.liters || 0;
          if (collection.quality_grade) {
            dailyStats[date].qualityGrades.push(collection.quality_grade);
          }
          dailyStats[date].count += 1;
        });
      }

      // Convert quality grades to numerical values for averaging
      const qualityTrend = Object.entries(dailyStats).map(([date, stats]) => {
        let avgQuality = 0;
        if (stats.qualityGrades.length > 0) {
          const gradeValues: Record<string, number> = {
            'A+': 4,
            'A': 3,
            'B': 2,
            'C': 1
          };
          
          const totalValue = stats.qualityGrades.reduce((sum, grade) => sum + (gradeValues[grade] || 0), 0);
          avgQuality = totalValue / stats.qualityGrades.length;
        }
        
        return {
          date,
          avgQuality,
          liters: stats.liters
        };
      });

      // Fetch all-time stats (within timeframe)
      const { data: timeframeAllCollections, error: timeframeAllCollectionsError } = await supabase
        .from('collections')
        .select('liters, quality_grade, total_amount')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', now.toISOString());

      if (timeframeAllCollectionsError) throw timeframeAllCollectionsError;

      // Convert quality grades to numerical values for averaging
      const timeframeStats = {
        totalLiters: timeframeAllCollections ? timeframeAllCollections.reduce((sum, collection) => sum + (collection.liters || 0), 0) : 0,
        totalCollections: timeframeAllCollections ? timeframeAllCollections.length : 0,
        avgQualityScore: timeframeAllCollections && timeframeAllCollections.length > 0 
          ? timeframeAllCollections.reduce((sum, collection) => sum + (gradeValues[collection.quality_grade] || 0), 0) / timeframeAllCollections.length 
          : 0,
        totalEarnings: timeframeAllCollections ? timeframeAllCollections.reduce((sum, collection) => sum + (collection.total_amount || 0), 0) : 0
      };

      // Return all stats with null safety
      return {
        today: {
          collections: todayCollections ? todayCollections.length : 0,
          liters: todayLiters,
          earnings: todayEarnings,
          avgQuality: todayAvgQuality
        },
        thisMonth: {
          collections: timeframeCollections ? timeframeCollections.length : 0,
          liters: timeframeLiters,
          earnings: timeframeEarnings,
          avgQuality: timeframeAvgQuality,
          qualityDistribution: qualityDistribution || {}
        },
        recentCollections: recentCollections || [],
        qualityTrend: qualityTrend || [],
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