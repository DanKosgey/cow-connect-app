import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CACHE_KEYS } from '@/services/cache-utils';

export const useFarmerDashboard = () => {
  const { data: stats, isLoading: loading, error, refetch } = useQuery({
    queryKey: [CACHE_KEYS.FARMER_DASHBOARD],
    queryFn: async () => {
      console.log('[useFarmerDashboard] Fetching dashboard data');
      console.log('[FarmerPortal] Farmer dashboard data fetch initiated', {
        timestamp: new Date().toISOString()
      });
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');
      
      console.log('[useFarmerDashboard] Authenticated user found', { userId: user.id });
      console.log('[FarmerPortal] Fetching data for farmer', { 
        userId: user.id, 
        timestamp: new Date().toISOString() 
      });

      // First, get the farmer record
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (farmerError) throw farmerError;
      
      if (!farmer) {
        console.log('[useFarmerDashboard] No farmer record found for user');
        console.log('[FarmerPortal] No farmer record found', { 
          userId: user.id, 
          timestamp: new Date().toISOString() 
        });
        throw new Error('Farmer profile not found');
      }

      console.log('[useFarmerDashboard] Farmer record found', { farmerId: farmer.id });
      console.log('[FarmerPortal] Farmer record retrieved', { 
        farmerId: farmer.id, 
        userId: user.id, 
        timestamp: new Date().toISOString() 
      });

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Fetch today's collections
      console.log('[useFarmerDashboard] Fetching today\'s collections');
      const { data: todayCollections, error: todayCollectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', startOfDay)
        .order('collection_date', { ascending: false });

      if (todayCollectionsError) throw todayCollectionsError;

      // Calculate today's stats
      const todayLiters = todayCollections.reduce((sum, collection) => sum + collection.liters, 0);
      const todayEarnings = todayCollections.reduce((sum, collection) => sum + collection.total_amount, 0);
      
      // Convert quality grades to numerical values for averaging
      const gradeValues: Record<string, number> = {
        'A+': 4,
        'A': 3,
        'B': 2,
        'C': 1
      };
      
      const todayAvgQuality = todayCollections.length > 0 
        ? todayCollections.reduce((sum, collection) => sum + (gradeValues[collection.quality_grade] || 0), 0) / todayCollections.length 
        : 0;

      console.log('[useFarmerDashboard] Today\'s collections fetched', { 
        count: todayCollections.length, 
        liters: todayLiters 
      });
      console.log('[FarmerPortal] Today\'s collections data retrieved', { 
        farmerId: farmer.id, 
        collectionsCount: todayCollections.length, 
        totalLiters: todayLiters,
        timestamp: new Date().toISOString() 
      });

      // Fetch this month's collections
      console.log('[useFarmerDashboard] Fetching this month\'s collections');
      const { data: monthCollections, error: monthCollectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', startOfMonth)
        .order('collection_date', { ascending: false });

      if (monthCollectionsError) throw monthCollectionsError;

      // Calculate this month's stats
      const monthLiters = monthCollections.reduce((sum, collection) => sum + collection.liters, 0);
      const monthEarnings = monthCollections.reduce((sum, collection) => sum + collection.total_amount, 0);
      const monthAvgQuality = monthCollections.length > 0 
        ? monthCollections.reduce((sum, collection) => sum + (gradeValues[collection.quality_grade] || 0), 0) / monthCollections.length 
        : 0;

      // Calculate quality distribution
      const qualityDistribution: Record<string, number> = {};
      monthCollections.forEach(collection => {
        const grade = collection.quality_grade;
        qualityDistribution[grade] = (qualityDistribution[grade] || 0) + 1;
      });

      console.log('[useFarmerDashboard] Month collections fetched', { 
        count: monthCollections.length, 
        liters: monthLiters 
      });
      console.log('[FarmerPortal] Month collections data retrieved', { 
        farmerId: farmer.id, 
        collectionsCount: monthCollections.length, 
        totalLiters: monthLiters,
        timestamp: new Date().toISOString() 
      });

      // Fetch recent collections for activity feed (last 10)
      console.log('[useFarmerDashboard] Fetching recent collections for activity feed');
      const { data: recentCollections, error: recentCollectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .order('collection_date', { ascending: false })
        .limit(10);

      if (recentCollectionsError) throw recentCollectionsError;

      console.log('[useFarmerDashboard] Recent collections fetched', { count: recentCollections.length });
      console.log('[FarmerPortal] Recent collections for activity feed retrieved', { 
        farmerId: farmer.id, 
        collectionsCount: recentCollections.length,
        timestamp: new Date().toISOString() 
      });

      // Fetch quality trend data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoString = sevenDaysAgo.toISOString();

      console.log('[useFarmerDashboard] Fetching quality trend data');
      const { data: qualityTrendData, error: qualityTrendError } = await supabase
        .from('collections')
        .select('collection_date, quality_grade, liters')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', sevenDaysAgoString)
        .order('collection_date', { ascending: true });

      if (qualityTrendError) throw qualityTrendError;

      // Group by date for trend chart
      const dailyStats: Record<string, { liters: number; qualityGrades: string[]; count: number }> = {};
      qualityTrendData.forEach(collection => {
        const date = new Date(collection.collection_date).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { liters: 0, qualityGrades: [], count: 0 };
        }
        dailyStats[date].liters += collection.liters;
        if (collection.quality_grade) {
          dailyStats[date].qualityGrades.push(collection.quality_grade);
        }
        dailyStats[date].count += 1;
      });

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

      console.log('[useFarmerDashboard] Quality trend data processed', { days: qualityTrend.length });
      console.log('[FarmerPortal] Quality trend data processed', { 
        farmerId: farmer.id, 
        days: qualityTrend.length,
        timestamp: new Date().toISOString() 
      });

      // Fetch all-time stats
      console.log('[useFarmerDashboard] Fetching all-time stats');
      const { data: allCollections, error: allCollectionsError } = await supabase
        .from('collections')
        .select('liters, quality_grade, total_amount')
        .eq('farmer_id', farmer.id);

      if (allCollectionsError) throw allCollectionsError;

      // Convert quality grades to numerical values for averaging
      const allTimeStats = {
        totalLiters: allCollections.reduce((sum, collection) => sum + collection.liters, 0),
        totalCollections: allCollections.length,
        avgQualityScore: allCollections.length > 0 
          ? allCollections.reduce((sum, collection) => sum + (gradeValues[collection.quality_grade] || 0), 0) / allCollections.length 
          : 0,
        totalEarnings: allCollections.reduce((sum, collection) => sum + collection.total_amount, 0)
      };

      console.log('[useFarmerDashboard] All-time stats calculated', allTimeStats);
      console.log('[FarmerPortal] All-time stats calculated', { 
        farmerId: farmer.id, 
        ...allTimeStats,
        timestamp: new Date().toISOString() 
      });

      // Return all stats
      return {
        today: {
          collections: todayCollections.length,
          liters: todayLiters,
          earnings: todayEarnings,
          avgQuality: todayAvgQuality
        },
        thisMonth: {
          collections: monthCollections.length,
          liters: monthLiters,
          earnings: monthEarnings,
          avgQuality: monthAvgQuality,
          qualityDistribution
        },
        recentCollections,
        qualityTrend,
        allTime: allTimeStats
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, error: error?.message || null, refresh };
};