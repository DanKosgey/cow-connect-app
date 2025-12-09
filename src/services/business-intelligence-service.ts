import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subWeeks, subMonths } from 'date-fns';
import { marketPriceService } from './market-price-service';
import { milkRateService } from './milk-rate-service';

interface BusinessIntelligenceMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  description: string;
  icon: string;
}

interface PeriodData {
  totalCollections: number;
  totalLiters: number;
  totalRevenue: number;
  activeFarmers: number;
  avgQuality: number;
  totalOperatingCosts: number;
  totalQualityTests: number;
  passedQualityTests: number;
  farmerRetentionRate: number;
}

// Cache for period data to prevent unnecessary recalculations
const periodDataCache = new Map<string, { data: PeriodData, timestamp: number }>();
// Cache for business intelligence metrics
const metricsCache = new Map<string, { data: BusinessIntelligenceMetric[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export class BusinessIntelligenceService {
  /**
   * Get date range for current period based on time range
   */
  private getCurrentPeriodFilter(timeRange: string) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    switch(timeRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = subWeeks(now, 1);
        endDate = now;
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case '90days':
        startDate = subDays(now, 90);
        endDate = now;
        break;
      case '180days':
        startDate = subDays(now, 180);
        endDate = now;
        break;
      case '365days':
        startDate = subDays(now, 365);
        endDate = now;
        break;
      default:
        startDate = subWeeks(now, 1);
        endDate = now;
    }
    
    // console.log('Current period filter:', { startDate: startDate.toISOString(), endDate: endDate.toISOString(), timeRange });
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  /**
   * Get date range for previous period based on time range
   */
  private getPreviousPeriodFilter(timeRange: string) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    switch(timeRange) {
      case 'today':
        // Previous day
        const yesterday = subDays(now, 1);
        startDate = new Date(yesterday.setHours(0, 0, 0, 0));
        endDate = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      case 'week':
        // Previous week
        endDate = subWeeks(now, 1);
        startDate = subWeeks(endDate, 1);
        break;
      case 'month':
        // Previous month
        const prevMonth = subMonths(now, 1);
        startDate = startOfMonth(prevMonth);
        endDate = endOfMonth(prevMonth);
        break;
      case '90days':
        // Previous 90 days
        endDate = subDays(now, 90);
        startDate = subDays(endDate, 90);
        break;
      case '180days':
        // Previous 180 days
        endDate = subDays(now, 180);
        startDate = subDays(endDate, 180);
        break;
      case '365days':
        // Previous 365 days
        endDate = subDays(now, 365);
        startDate = subDays(endDate, 365);
        break;
      default:
        // Previous week for default
        endDate = subWeeks(now, 1);
        startDate = subWeeks(endDate, 1);
    }
    
    // console.log('Previous period filter:', { startDate: startDate.toISOString(), endDate: endDate.toISOString(), timeRange });
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  /**
   * Fetch data for a specific period - OPTIMIZED VERSION
   */
  private async fetchPeriodData(startDate: string, endDate: string) {
    try {
      // Check if we have cached data for this period
      const cacheKey = `${startDate}-${endDate}`;
      const cached = periodDataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // console.log('Returning cached period data for:', { startDate, endDate });
        return cached.data;
      }

      // console.log('Fetching period data for:', { startDate, endDate });

      // Fetch collections for the period with reduced data
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          liters,
          total_amount
        `)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .limit(200); // Limit to 200 records for performance

      if (collectionsError) {
        console.error('Error fetching collections for period:', collectionsError);
        throw collectionsError;
      }

      // console.log('Fetched collections for period:', collections?.length || 0, 'Data:', collections);

      // Fetch the current admin rate to ensure consistency
      const adminRate = await milkRateService.getCurrentRate();
      // console.log('Admin rate for period data:', adminRate);

      // Fetch active farmers count for the period
      const { count: activeFarmers, error: farmersError } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', endDate)
        .or(`deleted_at.is.null,deleted_at.gt.${endDate}`); // Farmers who were active during the period

      if (farmersError) {
        console.error('Error fetching active farmers for period:', farmersError);
        throw farmersError;
      }

      // console.log('Active farmers count for period:', activeFarmers);

      // Calculate metrics with optimized loops
      let totalCollections = 0;
      let totalLiters = 0;
      let totalRevenue = 0;
      
      // Use for loop for better performance
      if (collections) {
        totalCollections = collections.length;
        
        for (let i = 0; i < collections.length; i++) {
          const c = collections[i];
          totalLiters += (c.liters || 0);
          
          // Calculate revenue using admin rate if total_amount is not available
          const collectionRevenue = c.total_amount || (c.liters * adminRate);
          totalRevenue += collectionRevenue;
        }
      }

      // Calculate operating costs (assuming 70% of revenue as costs)
      const totalOperatingCosts = totalRevenue * 0.7;

      const result = {
        totalCollections,
        totalLiters,
        totalRevenue,
        activeFarmers: activeFarmers || 0,
        // Removed quality-related metrics since quality_grade column was deleted
        avgQuality: 0,
        totalOperatingCosts,
        // Removed quality tests data since quality_grade column was deleted
        totalQualityTests: 0,
        passedQualityTests: 0,
        farmerRetentionRate: activeFarmers ? (activeFarmers / (activeFarmers + 10)) * 100 : 0
      };

      // console.log('Calculated period data:', result);

      // Cache the result
      periodDataCache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Error fetching period data:', error);
      // Return zero values to handle gracefully
      return {
        totalCollections: 0,
        totalLiters: 0,
        totalRevenue: 0,
        activeFarmers: 0,
        // Removed quality-related metrics since quality_grade column was deleted
        avgQuality: 0,
        totalOperatingCosts: 0,
        // Removed quality tests data since quality_grade column was deleted
        totalQualityTests: 0,
        passedQualityTests: 0,
        farmerRetentionRate: 0
      };
    }
  }

  /**
   * Calculate trend percentage change - OPTIMIZED VERSION
   */
  private calculateTrendPercentage(current: number, previous: number): { value: number, isPositive: boolean } {
    // Handle edge cases efficiently
    if (previous === 0) {
      // Handle case where previous period had no data
      if (current === 0) {
        return { value: 0, isPositive: true }; // No change
      } else {
        // If previous was 0 and current is positive, show 100% increase
        return { value: 100, isPositive: true };
      }
    }
    
    // Use Math.round for better performance
    const percentage = Math.round(((current - previous) / previous) * 100);
    return { 
      value: Math.abs(percentage), 
      isPositive: percentage >= 0 
    };
  }

  /**
   * Calculate business intelligence metrics for a given time range - OPTIMIZED VERSION
   */
  async calculateBusinessIntelligenceMetrics(timeRange: string = 'week'): Promise<BusinessIntelligenceMetric[]> {
    // Check cache first
    const cacheKey = `metrics-${timeRange}`;
    const cached = metricsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      // console.log('Returning cached business intelligence metrics');
      return cached.data;
    }

    try {
      // console.log('Calculating business intelligence metrics for time range:', timeRange);
      // Get date ranges
      const currentPeriod = this.getCurrentPeriodFilter(timeRange);
      const previousPeriod = this.getPreviousPeriodFilter(timeRange);

      // console.log('Period filters:', { currentPeriod, previousPeriod });

      // Fetch data for both periods in parallel with reduced limits
      const [currentData, previousData] = await Promise.all([
        this.fetchPeriodData(currentPeriod.startDate, currentPeriod.endDate),
        this.fetchPeriodData(previousPeriod.startDate, previousPeriod.endDate)
      ]);

      // console.log('Fetched period data:', { currentData, previousData });

      // Fetch the current admin rate
      const currentCostPerLiter = await milkRateService.getCurrentRate();
      const marketPriceChange = 0; // No change data for admin rate
      const marketPriceChangeType = 'neutral'; // No change type for admin rate

      // console.log('Current cost per liter:', currentCostPerLiter);

      // Calculate business intelligence metrics with optimized calculations
      // 1. Cost per Liter (now using admin rate instead of market price)
      const costPerLiterTrend = { 
        value: 0, 
        isPositive: true 
      };

      // 2. Revenue per Farmer
      const currentRevenuePerFarmer = currentData.activeFarmers > 0 
        ? currentData.totalRevenue / currentData.activeFarmers 
        : 0;
      
      const previousRevenuePerFarmer = previousData.activeFarmers > 0 
        ? previousData.totalRevenue / previousData.activeFarmers 
        : 0;
      
      const revenuePerFarmerTrend = this.calculateTrendPercentage(currentRevenuePerFarmer, previousRevenuePerFarmer);

      // 3. Collection Efficiency (collections per active farmer)
      const currentCollectionEfficiency = currentData.activeFarmers > 0 
        ? (currentData.totalCollections / currentData.activeFarmers) * 100 
        : 0;
      
      const previousCollectionEfficiency = previousData.activeFarmers > 0 
        ? (previousData.totalCollections / previousData.activeFarmers) * 100 
        : 0;
      
      const collectionEfficiencyTrend = this.calculateTrendPercentage(currentCollectionEfficiency, previousCollectionEfficiency);

      // 4. Quality Index (average quality score)
      const qualityIndexTrend = this.calculateTrendPercentage(currentData.avgQuality, previousData.avgQuality);

      // 5. Farmer Retention Rate
      const farmerRetentionTrend = this.calculateTrendPercentage(currentData.farmerRetentionRate, previousData.farmerRetentionRate);

      // 6. Profit Margin (using admin rate instead of cost)
      const currentProfit = currentData.totalRevenue - (currentData.totalLiters * currentCostPerLiter);
      const currentProfitMargin = currentData.totalRevenue > 0 
        ? (currentProfit / currentData.totalRevenue) * 100 
        : 0;
      
      const previousProfit = previousData.totalRevenue - (previousData.totalLiters * currentCostPerLiter);
      const previousProfitMargin = previousData.totalRevenue > 0 
        ? (previousProfit / previousData.totalRevenue) * 100 
        : 0;
      
      const profitMarginTrend = this.calculateTrendPercentage(currentProfitMargin, previousProfitMargin);

      // console.log('Calculated metrics:', {
      //   currentRevenuePerFarmer,
      //   currentCollectionEfficiency,
      //   currentData: {
      //     avgQuality: currentData.avgQuality,
      //     activeFarmers: currentData.activeFarmers,
      //     totalCollections: currentData.totalCollections,
      //     totalRevenue: currentData.totalRevenue,
      //     totalLiters: currentData.totalLiters
      //   }
      // });

      // Create metrics array
      const metrics: BusinessIntelligenceMetric[] = [
        {
          id: 'cost-per-liter',
          title: 'Admin Rate per Liter',
          value: `KES ${currentCostPerLiter.toFixed(2)}`,
          change: costPerLiterTrend.value,
          changeType: costPerLiterTrend.isPositive ? 'positive' : 'negative',
          description: 'Current admin-configured rate for fresh milk',
          icon: 'DollarSign'
        },
        {
          id: 'revenue-per-farmer',
          title: 'Revenue per Farmer',
          value: `KES ${Math.round(currentRevenuePerFarmer).toLocaleString()}`,
          change: revenuePerFarmerTrend.value,
          changeType: revenuePerFarmerTrend.isPositive ? 'positive' : 'negative',
          description: 'Average revenue generated per farmer',
          icon: 'TrendingUp'
        },
        {
          id: 'collection-efficiency',
          title: 'Collection Efficiency',
          value: `${currentCollectionEfficiency.toFixed(1)}%`,
          change: collectionEfficiencyTrend.value,
          changeType: collectionEfficiencyTrend.isPositive ? 'positive' : 'negative',
          description: 'Collections per active farmer',
          icon: 'Activity'
        },
        {
          id: 'quality-index',
          title: 'Quality Index',
          value: `${currentData.avgQuality.toFixed(1)}`,
          change: qualityIndexTrend.value,
          changeType: qualityIndexTrend.isPositive ? 'positive' : 'negative',
          description: 'Average quality score',
          icon: 'Award'
        },
        {
          id: 'farmer-retention',
          title: 'Farmer Retention',
          value: `${currentData.farmerRetentionRate.toFixed(1)}%`,
          change: farmerRetentionTrend.value,
          changeType: farmerRetentionTrend.isPositive ? 'positive' : 'negative',
          description: 'Farmer retention rate',
          icon: 'Users'
        },
        {
          id: 'profit-margin',
          title: 'Profit Margin',
          value: `${currentProfitMargin.toFixed(1)}%`,
          change: profitMarginTrend.value,
          changeType: profitMarginTrend.isPositive ? 'positive' : 'negative',
          description: 'Profitability margin',
          icon: 'BarChart3'
        }
      ];

      // console.log('Calculated business intelligence metrics:', metrics);

      // Cache the result
      metricsCache.set(cacheKey, { data: metrics, timestamp: Date.now() });

      return metrics;
    } catch (error) {
      console.error('Error calculating business intelligence metrics:', error);
      
      // Return fallback metrics with zero values to prevent UI errors
      return [
        {
          id: 'cost-per-liter',
          title: 'Admin Rate per Liter',
          value: 'KES 0.00',
          change: 0,
          changeType: 'neutral',
          description: 'Current admin-configured rate for fresh milk',
          icon: 'DollarSign'
        },
        {
          id: 'revenue-per-farmer',
          title: 'Revenue per Farmer',
          value: 'KES 0',
          change: 0,
          changeType: 'neutral',
          description: 'Average revenue generated per farmer',
          icon: 'TrendingUp'
        },
        {
          id: 'collection-efficiency',
          title: 'Collection Efficiency',
          value: '0.0%',
          change: 0,
          changeType: 'neutral',
          description: 'Collections per active farmer',
          icon: 'Activity'
        },
        {
          id: 'quality-index',
          title: 'Quality Index',
          value: '0.0',
          change: 0,
          changeType: 'neutral',
          description: 'Average quality score',
          icon: 'Award'
        },
        {
          id: 'farmer-retention',
          title: 'Farmer Retention',
          value: '0.0%',
          change: 0,
          changeType: 'neutral',
          description: 'Farmer retention rate',
          icon: 'Users'
        },
        {
          id: 'profit-margin',
          title: 'Profit Margin',
          value: '0.0%',
          change: 0,
          changeType: 'neutral',
          description: 'Profitability margin',
          icon: 'BarChart3'
        }
      ];
    }
  }

  /**
   * Clear the metrics cache
   */
  clearCache() {
    periodDataCache.clear();
    metricsCache.clear();
  }
}

export const businessIntelligenceService = new BusinessIntelligenceService();