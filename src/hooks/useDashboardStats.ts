import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  pendingReviews: number;
  varianceToday: number;
  fieldStaff: number;
  totalCollections: number;
  totalFarmers: number;
  totalEarnings: number;
}

interface VarianceStats {
  avgVariance: number;
  positiveVariances: number;
  negativeVariances: number;
}

export const useDashboardStats = () => {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        // Fetch pending reviews count (collections pending approval for company)
        const { count: pendingReviewsCount, error: pendingError } = await supabase
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .eq('approved_for_company', false);
        
        if (pendingError) {
          console.error('Error fetching pending collections:', pendingError);
        }
        
        // Fetch today's variance data
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
        
        const { data: varianceData } = await supabase
          .from('milk_approvals')
          .select('variance_percentage')
          .gte('approved_at', startOfDay)
          .lte('approved_at', endOfDay);
        
        // Calculate average variance for today
        let varianceToday = 0;
        if (varianceData && varianceData.length > 0) {
          const totalVariance = varianceData.reduce((sum, item) => sum + (item.variance_percentage || 0), 0);
          varianceToday = totalVariance / varianceData.length;
        }
        
        // Fetch field staff count (only users with collector role)
        const { count: fieldStaffCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'collector')
          .eq('active', true);
        
        // Fetch today's collections data
        const { data: collectionsData } = await supabase
          .from('collections')
          .select(`
            id,
            farmer_id,
            liters,
            total_amount
          `)
          .gte('collection_date', startOfDay)
          .lte('collection_date', endOfDay);
        
        // Calculate collection stats
        const totalCollections = collectionsData?.length || 0;
        const totalFarmers = new Set(collectionsData?.map(c => c.farmer_id)).size || 0;
        const totalEarnings = collectionsData?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
        
        return {
          pendingReviews: pendingReviewsCount || 0,
          varianceToday: parseFloat(varianceToday.toFixed(2)),
          fieldStaff: fieldStaffCount || 0,
          totalCollections,
          totalFarmers,
          totalEarnings: parseFloat(totalEarnings.toFixed(2))
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useVarianceStats = () => {
  return useQuery<VarianceStats>({
    queryKey: ['variance-stats'],
    queryFn: async () => {
      try {
        // Fetch recent variance data
        const { data } = await supabase
          .from('milk_approvals')
          .select('variance_percentage, variance_type')
          .not('variance_type', 'is', null)
          .order('approved_at', { ascending: false })
          .limit(50);
        
        if (data && data.length > 0) {
          // Calculate average variance
          const totalVariance = data.reduce((sum, item) => sum + (item.variance_percentage || 0), 0);
          const avgVariance = totalVariance / data.length;
          
          // Count positive and negative variances
          const positiveVariances = data.filter(item => item.variance_type === 'positive').length;
          const negativeVariances = data.filter(item => item.variance_type === 'negative').length;
          
          return {
            avgVariance: parseFloat(avgVariance.toFixed(2)),
            positiveVariances,
            negativeVariances
          };
        } else {
          return {
            avgVariance: 0,
            positiveVariances: 0,
            negativeVariances: 0
          };
        }
      } catch (error) {
        console.error('Error fetching variance stats:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};