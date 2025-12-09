import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface Collection {
  id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  collection_date: string;
  total_amount?: number;
  status: string;
}

interface Farmer {
  id: string;
  user_id: string;
  kyc_status: string;
  created_at: string;
}

interface Payment {
  id: string;
  farmer_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface TrendData {
  metric: string;
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

// Cache for trend data to prevent unnecessary recalculations
const trendsCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export class TrendService {
  /**
   * Get date range for current period based on time range
   */
  private getCurrentPeriodFilter(timeRange: string) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    switch(timeRange) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        endDate = endOfWeek(now, { weekStartsOn: 1 });
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
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case 'week':
        // Previous week
        startDate = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        endDate = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        break;
      case 'month':
        // Previous month
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case '90days':
        // Previous 90 days
        startDate = subDays(now, 180);
        endDate = subDays(now, 90);
        break;
      case '180days':
        // Previous 180 days
        startDate = subDays(now, 360);
        endDate = subDays(now, 180);
        break;
      case '365days':
        // Previous 365 days
        startDate = subDays(now, 730);
        endDate = subDays(now, 365);
        break;
      default:
        // Previous week for default
        startDate = subWeeks(now, 2);
        endDate = subWeeks(now, 1);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  /**
   * Fetch collections for a specific period
   */
  private async fetchCollectionsForPeriod(startDate: string, endDate: string): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        id,
        farmer_id,
        staff_id,
        liters,
        collection_date,
        total_amount,
        status
      `)
      .gte('collection_date', startDate)
      .lte('collection_date', endDate)
      .order('collection_date', { ascending: true })
      .limit(200); // Limit for performance

    if (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetch farmers for a specific period
   */
  private async fetchFarmersForPeriod(startDate: string, endDate: string): Promise<Farmer[]> {
    const { data, error } = await supabase
      .from('farmers')
      .select(`
        id,
        user_id,
        kyc_status,
        created_at
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true })
      .limit(100); // Limit for performance

    if (error) {
      console.error('Error fetching farmers:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetch payments for a specific period
   */
  private async fetchPaymentsForPeriod(startDate: string, endDate: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        id,
        farmer_id,
        total_amount,
        collection_date
      `)
      .gte('collection_date', startDate)
      .lte('collection_date', endDate)
      .limit(200); // Limit for performance

    if (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }

    // Convert collections to payments format
    return (data || []).map(collection => ({
      id: `pay_${collection.id}`,
      farmer_id: collection.farmer_id,
      amount: collection.total_amount || 0,
      status: 'completed', // Assuming all collections are paid for simplicity
      created_at: collection.collection_date
    }));
  }

  /**
   * Calculate trend percentage
   */
  private calculateTrendPercentage(current: number, previous: number): { value: number, isPositive: boolean } {
    if (previous === 0) {
      return { 
        value: current > 0 ? 100 : 0, 
        isPositive: current >= 0 
      };
    }
    
    const percentage = Math.round(((current - previous) / previous) * 100);
    return { 
      value: Math.abs(percentage), 
      isPositive: percentage >= 0 
    };
  }

  /**
   * Calculate trends for collections analytics dashboard
   */
  async calculateCollectionsTrends(timeRange: string) {
    // Check cache first
    const cacheKey = `collections-trends-${timeRange}`;
    const cached = trendsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Get date ranges
      const currentPeriod = this.getCurrentPeriodFilter(timeRange);
      const previousPeriod = this.getPreviousPeriodFilter(timeRange);

      // Fetch data for both periods in parallel
      const [
        currentCollections,
        previousCollections,
        currentFarmers,
        previousFarmers,
        currentPayments,
        previousPayments
      ] = await Promise.all([
        this.fetchCollectionsForPeriod(currentPeriod.startDate, currentPeriod.endDate),
        this.fetchCollectionsForPeriod(previousPeriod.startDate, previousPeriod.endDate),
        this.fetchFarmersForPeriod(currentPeriod.startDate, currentPeriod.endDate),
        this.fetchFarmersForPeriod(previousPeriod.startDate, previousPeriod.endDate),
        this.fetchPaymentsForPeriod(currentPeriod.startDate, currentPeriod.endDate),
        this.fetchPaymentsForPeriod(previousPeriod.startDate, previousPeriod.endDate)
      ]);

      // Calculate metrics for current period
      const currentTotalCollections = currentCollections.length;
      const currentTotalLiters = currentCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
      const currentTotalRevenue = currentCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);

      // Calculate metrics for previous period
      const previousTotalCollections = previousCollections.length;
      const previousTotalLiters = previousCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
      const previousTotalRevenue = previousCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);

      // Calculate trends
      const collectionsTrend = this.calculateTrendPercentage(currentTotalCollections, previousTotalCollections);
      const litersTrend = this.calculateTrendPercentage(currentTotalLiters, previousTotalLiters);
      const revenueTrend = this.calculateTrendPercentage(currentTotalRevenue, previousTotalRevenue);
      // Removed quality trend since quality_grade column was deleted
      const qualityTrend = { value: 0, isPositive: true };

      const result = {
        totalCollections: currentTotalCollections,
        totalLiters: currentTotalLiters,
        totalRevenue: currentTotalRevenue,
        // Removed avgQuality since quality_grade column was deleted
        avgQuality: 0,
        collectionsTrend,
        litersTrend,
        revenueTrend,
        qualityTrend
      };

      // Cache the result
      trendsCache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Error calculating collections trends:', error);
      throw error;
    }
  }

  /**
   * Calculate trends for payment system
   */
  async calculatePaymentTrends(timeRange: string) {
    // Check cache first
    const cacheKey = `payment-trends-${timeRange}`;
    const cached = trendsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Get date ranges
      const currentPeriod = this.getCurrentPeriodFilter(timeRange);
      const previousPeriod = this.getPreviousPeriodFilter(timeRange);

      // Fetch data for both periods in parallel
      const [
        currentCollections,
        previousCollections,
        currentPayments,
        previousPayments
      ] = await Promise.all([
        this.fetchCollectionsForPeriod(currentPeriod.startDate, currentPeriod.endDate),
        this.fetchCollectionsForPeriod(previousPeriod.startDate, previousPeriod.endDate),
        this.fetchPaymentsForPeriod(currentPeriod.startDate, currentPeriod.endDate),
        this.fetchPaymentsForPeriod(previousPeriod.startDate, previousPeriod.endDate)
      ]);

      // Calculate metrics for current period
      const currentTotalCollections = currentCollections.length;
      const currentTotalLiters = currentCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
      const currentTotalRevenue = currentCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
      const currentPendingPayments = currentCollections.filter(c => c.status !== 'Paid').length;
      const currentPaidPayments = currentCollections.filter(c => c.status === 'Paid').length;

      // Calculate metrics for previous period
      const previousTotalCollections = previousCollections.length;
      const previousTotalLiters = previousCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
      const previousTotalRevenue = previousCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
      const previousPendingPayments = previousCollections.filter(c => c.status !== 'Paid').length;
      const previousPaidPayments = previousCollections.filter(c => c.status === 'Paid').length;

      // Calculate trends
      const collectionsTrend = this.calculateTrendPercentage(currentTotalCollections, previousTotalCollections);
      const litersTrend = this.calculateTrendPercentage(currentTotalLiters, previousTotalLiters);
      const revenueTrend = this.calculateTrendPercentage(currentTotalRevenue, previousTotalRevenue);
      const pendingPaymentsTrend = this.calculateTrendPercentage(currentPendingPayments, previousPendingPayments);

      const result = {
        totalCollections: currentTotalCollections,
        totalLiters: currentTotalLiters,
        totalRevenue: currentTotalRevenue,
        pendingPayments: currentPendingPayments,
        paidPayments: currentPaidPayments,
        collectionsTrend,
        litersTrend,
        revenueTrend,
        pendingPaymentsTrend
      };

      // Cache the result
      trendsCache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Error calculating payment trends:', error);
      throw error;
    }
  }

  /**
   * Clear the trends cache
   */
  clearCache() {
    trendsCache.clear();
  }
}

export const trendService = new TrendService();