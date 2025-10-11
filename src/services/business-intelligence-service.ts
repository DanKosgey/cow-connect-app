import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subWeeks, subMonths } from 'date-fns';

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
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  /**
   * Fetch data for a specific period
   */
  private async fetchPeriodData(startDate: string, endDate: string): Promise<PeriodData> {
    try {
      // Fetch collections for the period
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          farmer_id,
          liters,
          quality_grade,
          total_amount,
          collection_date
        `)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate);

      if (collectionsError) throw collectionsError;

      // Fetch active farmers for the period
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select('id')
        .lte('created_at', endDate)
        .or(`deleted_at.is.null,deleted_at.gt.${endDate}`); // Farmers who were active during the period

      if (farmersError) throw farmersError;

      // Calculate metrics
      const totalCollections = collections?.length || 0;
      const totalLiters = collections?.reduce((sum, c) => sum + (c.liters || 0), 0) || 0;
      const totalRevenue = collections?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      const activeFarmers = farmers?.length || 0;

      // Calculate average quality score
      const qualityScores: Record<string, number> = { 'A+': 100, 'A': 90, 'B': 75, 'C': 60 };
      const avgQuality = collections && collections.length > 0
        ? collections.reduce((sum, c) => sum + (qualityScores[c.quality_grade] || 0), 0) / collections.length
        : 0;

      // Calculate operating costs (assuming 70% of revenue as costs)
      const totalOperatingCosts = totalRevenue * 0.7;

      // Calculate quality tests data
      const totalQualityTests = collections?.length || 0;
      const passedQualityTests = collections?.filter(c => 
        c.quality_grade === 'A+' || c.quality_grade === 'A' || c.quality_grade === 'B'
      ).length || 0;

      // Calculate farmer retention rate (simplified)
      const farmerRetentionRate = activeFarmers > 0 ? (activeFarmers / (activeFarmers + 10)) * 100 : 0;

      return {
        totalCollections,
        totalLiters,
        totalRevenue,
        activeFarmers,
        avgQuality,
        totalOperatingCosts,
        totalQualityTests,
        passedQualityTests,
        farmerRetentionRate
      };
    } catch (error) {
      console.error('Error fetching period data:', error);
      // Return zero values to handle gracefully
      return {
        totalCollections: 0,
        totalLiters: 0,
        totalRevenue: 0,
        activeFarmers: 0,
        avgQuality: 0,
        totalOperatingCosts: 0,
        totalQualityTests: 0,
        passedQualityTests: 0,
        farmerRetentionRate: 0
      };
    }
  }

  /**
   * Calculate trend percentage change
   */
  private calculateTrendPercentage(current: number, previous: number): { value: number, isPositive: boolean } {
    if (previous === 0) {
      // Handle case where previous period had no data
      if (current === 0) {
        return { value: 0, isPositive: true }; // No change
      } else {
        // If previous was 0 and current is positive, show 100% increase
        return { value: 100, isPositive: true };
      }
    }
    
    const percentage = ((current - previous) / previous) * 100;
    return { 
      value: Math.abs(parseFloat(percentage.toFixed(1))), 
      isPositive: percentage >= 0 
    };
  }

  /**
   * Calculate business intelligence metrics for a given time range
   */
  async calculateBusinessIntelligenceMetrics(timeRange: string = 'week'): Promise<BusinessIntelligenceMetric[]> {
    try {
      // Get date ranges
      const currentPeriod = this.getCurrentPeriodFilter(timeRange);
      const previousPeriod = this.getPreviousPeriodFilter(timeRange);

      // Fetch data for both periods in parallel
      const [currentData, previousData] = await Promise.all([
        this.fetchPeriodData(currentPeriod.startDate, currentPeriod.endDate),
        this.fetchPeriodData(previousPeriod.startDate, previousPeriod.endDate)
      ]);

      // Calculate business intelligence metrics
      // 1. Cost per Liter
      const currentCostPerLiter = currentData.totalLiters > 0 
        ? currentData.totalOperatingCosts / currentData.totalLiters 
        : 0;
      
      const previousCostPerLiter = previousData.totalLiters > 0 
        ? previousData.totalOperatingCosts / previousData.totalLiters 
        : 0;
      
      const costPerLiterTrend = this.calculateTrendPercentage(currentCostPerLiter, previousCostPerLiter);

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

      // 6. Profit Margin
      const currentProfit = currentData.totalRevenue - currentData.totalOperatingCosts;
      const currentProfitMargin = currentData.totalRevenue > 0 
        ? (currentProfit / currentData.totalRevenue) * 100 
        : 0;
      
      const previousProfit = previousData.totalRevenue - previousData.totalOperatingCosts;
      const previousProfitMargin = previousData.totalRevenue > 0 
        ? (previousProfit / previousData.totalRevenue) * 100 
        : 0;
      
      const profitMarginTrend = this.calculateTrendPercentage(currentProfitMargin, previousProfitMargin);

      // Create metrics array
      const metrics: BusinessIntelligenceMetric[] = [
        {
          id: 'cost-per-liter',
          title: 'Cost per Liter',
          value: `KES ${currentCostPerLiter.toFixed(2)}`,
          change: costPerLiterTrend.value,
          changeType: costPerLiterTrend.isPositive ? 'positive' : 'negative',
          description: 'Operational cost efficiency',
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

      return metrics;
    } catch (error) {
      console.error('Error calculating business intelligence metrics:', error);
      
      // Return fallback metrics with zero values to prevent UI errors
      return [
        {
          id: 'cost-per-liter',
          title: 'Cost per Liter',
          value: 'KES 0.00',
          change: 0,
          changeType: 'neutral',
          description: 'Operational cost efficiency',
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
}

export const businessIntelligenceService = new BusinessIntelligenceService();