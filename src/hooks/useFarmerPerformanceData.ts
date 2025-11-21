import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trendService } from '@/services/trend-service';

// Define interfaces for our data structures
interface FarmerPerformance {
  id: string;
  name: string;
  registrationNumber: string;
  performanceScore: number;
  totalLiters: number;
  totalEarnings: number;
  avgQuality: number;
  collectionsCount: number;
  collectionFrequency: number;
  consistencyScore: number;
  lastCollection: string | null;
}

interface AtRiskFarmer {
  id: string;
  name: string;
  score: number;
  risk: string;
  riskScore: number;
  riskFactors: string[];
  issue: string;
  volume: number;
  quality: string;
  lastCollection: string;
  trend: string;
  staff: string;
  action: string;
}

interface TopPerformer {
  id: string;
  name: string;
  score: number;
  volume: number;
  quality: string;
  collections: number;
  earnings: number;
  badge: string;
}

interface PerformanceStats {
  totalFarmers: number;
  activeFarmers: number;
  atRiskFarmers: number;
  criticalRisk: number;
  highRisk: number;
  mediumRisk: number;
  avgPerformanceScore: number;
  churnRate: number;
  retentionRate: number;
  collectionsTrend: { value: number; isPositive: boolean };
  litersTrend: { value: number; isPositive: boolean };
  revenueTrend: { value: number; isPositive: boolean };
  qualityTrend: { value: number; isPositive: boolean };
}

interface InactiveStats {
  slightly: number;
  moderately: number;
  highly: number;
  dormant: number;
  lost: number;
}

// Cache keys for different data types
export const FARMER_PERFORMANCE_CACHE_KEYS = {
  DASHBOARD_DATA: 'farmer-performance-dashboard',
  FILTERED_FARMERS: 'filtered-farmers'
};

// Main hook for Farmer Performance Dashboard data
export const useFarmerPerformanceData = () => {
  const queryClient = useQueryClient();

  // Get farmer performance dashboard data
  const useFarmerPerformanceDashboard = () => {
    return useQuery<{
      stats: PerformanceStats;
      atRiskFarmers: AtRiskFarmer[];
      topPerformers: TopPerformer[];
      inactiveStats: InactiveStats;
      lastRefreshed: Date;
    }>({
      queryKey: [FARMER_PERFORMANCE_CACHE_KEYS.DASHBOARD_DATA],
      queryFn: async () => {
        // Fetch farmers data
        const { data: farmersData, error: farmersError } = await supabase
          .from('farmers')
          .select(`
            id,
            full_name,
            registration_number,
            kyc_status,
            created_at
          `)
          .order('created_at', { ascending: false });

        // Fetch farmer analytics data separately to avoid relationship ambiguity
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('farmer_analytics')
          .select(`
            farmer_id,
            total_collections,
            total_liters,
            avg_quality_score,
            current_month_liters,
            current_month_earnings
          `);

        if (farmersError) throw farmersError;
        if (analyticsError) throw analyticsError;
        
        // Combine farmers with their analytics data
        const farmers = farmersData.map(farmer => {
          const analytics = analyticsData.find(a => a.farmer_id === farmer.id);
          return {
            ...farmer,
            farmer_analytics: analytics || {
              total_collections: 0,
              total_liters: 0,
              avg_quality_score: 0,
              current_month_liters: 0,
              current_month_earnings: 0
            }
          };
        });

        // Fetch collections data for risk analysis
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select(`
            id,
            farmer_id,
            liters,
            quality_grade,
            total_amount,
            collection_date
          `)
          .eq('approved_for_company', true) // Only fetch approved collections
          .order('collection_date', { ascending: false });

        if (collectionsError) throw collectionsError;

        // Fetch payments data for financial analysis
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id,
            farmer_id,
            amount,
            status,
            created_at
          `)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;

        // Calculate trends using the trend service
        let trends = {
          collectionsTrend: { value: 0, isPositive: true },
          litersTrend: { value: 0, isPositive: true },
          revenueTrend: { value: 0, isPositive: true },
          qualityTrend: { value: 0, isPositive: true }
        };

        try {
          trends = await trendService.calculateCollectionsTrends('30days');
        } catch (trendError) {
          console.error('Error calculating trends:', trendError);
        }

        // Calculate real stats
        const totalFarmers = farmers.length;
        const activeFarmers = farmers.filter(f => f.kyc_status === 'approved').length;
        
        // Calculate performance scores based on real data using business intelligence logic
        const farmerPerformanceData = farmers.map(farmer => {
          const farmerCollections = collectionsData.filter(c => c.farmer_id === farmer.id);
          const totalLiters = farmerCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
          const totalEarnings = farmerCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
          
          // Convert quality grade to numerical score (A+ = 4, A = 3, B = 2, C = 1)
          const qualityScores: Record<string, number> = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 };
          const avgQuality = farmerCollections.length > 0 
            ? farmerCollections.reduce((sum, c) => sum + (qualityScores[c.quality_grade] || 0), 0) / farmerCollections.length
            : 0;
          
          // Calculate collection frequency (collections per week)
          const firstCollection = farmerCollections.length > 0 
            ? new Date(farmerCollections[farmerCollections.length - 1].collection_date) 
            : new Date();
          const lastCollection = farmerCollections.length > 0 
            ? new Date(farmerCollections[0].collection_date) 
            : new Date();
          const weeksActive = Math.max(1, (lastCollection.getTime() - firstCollection.getTime()) / (1000 * 60 * 60 * 24 * 7));
          const collectionFrequency = weeksActive > 0 ? farmerCollections.length / weeksActive : 0;
          
          // Calculate consistency score (percentage of weeks with collections)
          const weeksWithCollections = new Set(
            farmerCollections.map(c => 
              new Date(c.collection_date).toISOString().split('T')[0]
            )
          ).size;
          const consistencyScore = weeksActive > 0 ? (weeksWithCollections / weeksActive) * 100 : 0;
          
          // Advanced performance score calculation using weighted metrics
          const volumeScore = Math.min(100, (totalLiters / 1000) * 10); // Normalize liters to 0-100 scale
          const qualityScore = avgQuality * 25; // Convert 0-4 scale to 0-100 scale
          const frequencyScore = Math.min(100, collectionFrequency * 10); // Normalize frequency
          const consistencyScoreNormalized = consistencyScore; // Already 0-100 scale
          
          // Weighted performance score
          // Volume (30%), Quality (30%), Frequency (20%), Consistency (20%)
          const performanceScore = Math.round(
            (volumeScore * 0.3) + 
            (qualityScore * 0.3) + 
            (frequencyScore * 0.2) + 
            (consistencyScoreNormalized * 0.2)
          );
          
          return {
            id: farmer.id,
            name: farmer.full_name,
            registrationNumber: farmer.registration_number,
            performanceScore,
            totalLiters,
            totalEarnings,
            avgQuality,
            collectionsCount: farmerCollections.length,
            collectionFrequency,
            consistencyScore,
            lastCollection: farmerCollections[0]?.collection_date || null
          };
        });

        // Advanced risk detection algorithm
        const calculateRiskFactors = (farmerData: any) => {
          const riskFactors = [];
          let riskScore = 0;
          
          // Performance score risk (30% weight)
          if (farmerData.performanceScore < 50) {
            riskScore += 30;
            riskFactors.push('Poor overall performance');
          } else if (farmerData.performanceScore < 70) {
            riskScore += 15;
            riskFactors.push('Below average performance');
          }
          
          // Collection frequency risk (20% weight)
          if (farmerData.collectionFrequency < 0.5) { // Less than 0.5 collections per week
            riskScore += 20;
            riskFactors.push('Infrequent collections');
          } else if (farmerData.collectionFrequency < 1) { // Less than 1 collection per week
            riskScore += 10;
            riskFactors.push('Low collection frequency');
          }
          
          // Quality risk (15% weight)
          if (farmerData.avgQuality < 1.5) { // Below B grade
            riskScore += 15;
            riskFactors.push('Consistently poor quality');
          } else if (farmerData.avgQuality < 2.5) { // Below A grade
            riskScore += 7;
            riskFactors.push('Variable quality');
          }
          
          // Consistency risk (15% weight)
          if (farmerData.consistencyScore < 40) { // Less than 40% consistency
            riskScore += 15;
            riskFactors.push('Irregular collection pattern');
          } else if (farmerData.consistencyScore < 70) { // Less than 70% consistency
            riskScore += 7;
            riskFactors.push('Moderate consistency issues');
          }
          
          // Inactivity risk (20% weight)
          const daysSinceLastCollection = farmerData.lastCollection ? 
            Math.floor((new Date().getTime() - new Date(farmerData.lastCollection).getTime()) / (1000 * 60 * 60 * 24)) : 30;
          
          if (daysSinceLastCollection > 30) { // No collections for 30+ days
            riskScore += 20;
            riskFactors.push(`Inactive for ${daysSinceLastCollection} days`);
          } else if (daysSinceLastCollection > 14) { // No collections for 14+ days
            riskScore += 10;
            riskFactors.push(`Inactive for ${daysSinceLastCollection} days`);
          }
          
          // Determine risk level based on total risk score
          let riskLevel = 'low';
          if (riskScore >= 50) {
            riskLevel = 'critical';
          } else if (riskScore >= 30) {
            riskLevel = 'high';
          } else if (riskScore >= 15) {
            riskLevel = 'medium';
          }
          
          return {
            riskLevel,
            riskScore,
            riskFactors: riskFactors.slice(0, 2) // Limit to top 2 factors
          };
        };

        // Identify at-risk farmers based on advanced risk detection
        const atRiskFarmers = farmerPerformanceData
          .filter(f => f.performanceScore < 80) // Filter for farmers with below-average performance
          .map(f => {
            const riskData = calculateRiskFactors(f);
            
            return {
              id: f.id,
              name: f.name,
              score: f.performanceScore,
              risk: riskData.riskLevel,
              riskScore: riskData.riskScore,
              riskFactors: riskData.riskFactors,
              issue: f.collectionsCount === 0 ? 'No collections recorded' : 
                     riskData.riskFactors.length > 0 ? riskData.riskFactors[0] : 'Low performance',
              volume: Math.round(f.totalLiters),
              quality: f.avgQuality.toFixed(1),
              lastCollection: f.lastCollection ? `${Math.floor((new Date().getTime() - new Date(f.lastCollection).getTime()) / (1000 * 60 * 60 * 24))} days ago` : 'Never',
              trend: 'down',
              staff: 'System',
              action: 'pending'
            };
          })
          .sort((a, b) => b.riskScore - a.riskScore) // Sort by risk score
          .slice(0, 10); // Limit to top 10 at-risk farmers

        // Identify top performers based on real data
        const topPerformers = farmerPerformanceData
          .sort((a, b) => b.performanceScore - a.performanceScore)
          .slice(0, 5)
          .map((f, index) => ({
            id: f.id,
            name: f.name,
            score: f.performanceScore,
            volume: f.totalLiters,
            quality: f.avgQuality.toFixed(1),
            collections: f.collectionsCount,
            earnings: f.totalEarnings,
            badge: index < 3 ? 'Gold' : 'Silver'
          }));

        // Calculate real inactivity stats based on collection dates
        const now = new Date();
        const inactiveStats = {
          slightly: 0,  // 7-14 days
          moderately: 0, // 15-30 days
          highly: 0,    // 31-60 days
          dormant: 0,   // 61-90 days
          lost: 0       // 90+ days
        };

        farmers.forEach(farmer => {
          const farmerCollections = collectionsData.filter(c => c.farmer_id === farmer.id);
          if (farmerCollections.length > 0) {
            const lastCollection = new Date(farmerCollections[0].collection_date);
            const daysSinceLastCollection = Math.floor((now.getTime() - lastCollection.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLastCollection >= 7 && daysSinceLastCollection < 15) {
              inactiveStats.slightly++;
            } else if (daysSinceLastCollection >= 15 && daysSinceLastCollection < 31) {
              inactiveStats.moderately++;
            } else if (daysSinceLastCollection >= 31 && daysSinceLastCollection < 61) {
              inactiveStats.highly++;
            } else if (daysSinceLastCollection >= 61 && daysSinceLastCollection < 91) {
              inactiveStats.dormant++;
            } else if (daysSinceLastCollection >= 91) {
              inactiveStats.lost++;
            }
          } else {
            // Farmers with no collections at all
            inactiveStats.lost++;
          }
        });

        // Calculate stats with trend data
        const stats = {
          totalFarmers,
          activeFarmers,
          atRiskFarmers: atRiskFarmers.length,
          criticalRisk: atRiskFarmers.filter(f => f.risk === 'critical').length,
          highRisk: atRiskFarmers.filter(f => f.risk === 'high').length,
          mediumRisk: atRiskFarmers.filter(f => f.risk === 'medium').length,
          avgPerformanceScore: farmerPerformanceData.length > 0 
            ? Math.round(farmerPerformanceData.reduce((sum, f) => sum + f.performanceScore, 0) / farmerPerformanceData.length)
            : 0,
          churnRate: Math.round((atRiskFarmers.length / totalFarmers) * 100) || 0,
          retentionRate: totalFarmers > 0 ? Math.round(((totalFarmers - atRiskFarmers.length) / totalFarmers) * 100) : 0,
          collectionsTrend: trends.collectionsTrend,
          litersTrend: trends.litersTrend,
          revenueTrend: trends.revenueTrend,
          qualityTrend: trends.qualityTrend
        };

        return {
          stats,
          atRiskFarmers,
          topPerformers,
          inactiveStats,
          lastRefreshed: new Date()
        };
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get filtered farmers data
  const useFilteredFarmers = (riskFilter: string, searchTerm: string, sortBy: string) => {
    return useQuery<any[]>({
      queryKey: [FARMER_PERFORMANCE_CACHE_KEYS.FILTERED_FARMERS, riskFilter, searchTerm, sortBy],
      queryFn: async () => {
        let query = supabase
          .from('farmers')
          .select(`
            id,
            full_name,
            registration_number,
            kyc_status,
            created_at,
            farmer_analytics!farmer_id (
              total_collections,
              total_liters,
              avg_quality_score,
              current_month_liters,
              current_month_earnings
            )
          `);

        // Apply search term filter
        if (searchTerm) {
          query = query.or(`full_name.ilike.%${searchTerm}%,registration_number.ilike.%${searchTerm}%`);
        }

        // Apply sorting
        switch (sortBy) {
          case 'name':
            query = query.order('full_name', { ascending: true });
            break;
          case 'collections':
            query = query.order('farmer_analytics.total_collections', { ascending: false, foreignTable: 'farmer_analytics' });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query.limit(50); // Limit results for performance

        if (error) throw error;
        return data || [];
      },
      enabled: false, // Only fetch when needed
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Refresh dashboard data
  const refreshDashboardDataMutation = useMutation({
    mutationFn: async () => {
      // Invalidate the dashboard data cache to force a refresh
      queryClient.invalidateQueries({ queryKey: [FARMER_PERFORMANCE_CACHE_KEYS.DASHBOARD_DATA] });
      return true;
    }
  });

  // Mutation to invalidate all farmer performance caches
  const invalidateFarmerPerformanceCache = () => {
    queryClient.invalidateQueries({ queryKey: [FARMER_PERFORMANCE_CACHE_KEYS.DASHBOARD_DATA] });
    queryClient.invalidateQueries({ queryKey: [FARMER_PERFORMANCE_CACHE_KEYS.FILTERED_FARMERS] });
  };

  return {
    useFarmerPerformanceDashboard,
    useFilteredFarmers,
    refreshDashboardData: refreshDashboardDataMutation,
    invalidateFarmerPerformanceCache
  };
};