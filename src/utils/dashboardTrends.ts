// Utility functions for calculating dashboard trends
import { subDays, subWeeks, subMonths, subQuarters, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

// Get date filter for current period
export const getCurrentPeriodFilter = (timeRange: string) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  
  switch(timeRange) {
    case 'today':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'yesterday':
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'lastWeek':
      startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      endDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      break;
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'lastMonth':
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    case 'quarter':
      startDate = startOfQuarter(now);
      endDate = endOfQuarter(now);
      break;
    case 'lastQuarter':
      startDate = startOfQuarter(subQuarters(now, 1));
      endDate = endOfQuarter(subQuarters(now, 1));
      break;
    case 'year':
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
    case 'lastYear':
      startDate = startOfYear(subYears(now, 1));
      endDate = endOfYear(subYears(now, 1));
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
    case 'allTime':
      startDate = new Date(2020, 0, 1); // Start from 2020
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
};

// Get date filter for previous period
export const getPreviousPeriodFilter = (timeRange: string) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  
  switch(timeRange) {
    case 'today':
      // Previous day
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;
    case 'yesterday':
      // Day before yesterday
      startDate = startOfDay(subDays(now, 2));
      endDate = endOfDay(subDays(now, 2));
      break;
    case 'week':
      // Previous week
      startDate = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      endDate = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      break;
    case 'lastWeek':
      // Week before last week
      startDate = startOfWeek(subDays(now, 14), { weekStartsOn: 1 });
      endDate = endOfWeek(subDays(now, 14), { weekStartsOn: 1 });
      break;
    case 'month':
      // Previous month
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    case 'lastMonth':
      // Month before last month
      startDate = startOfMonth(subMonths(now, 2));
      endDate = endOfMonth(subMonths(now, 2));
      break;
    case 'quarter':
      // Previous quarter
      startDate = startOfQuarter(subQuarters(now, 1));
      endDate = endOfQuarter(subQuarters(now, 1));
      break;
    case 'lastQuarter':
      // Quarter before last quarter
      startDate = startOfQuarter(subQuarters(now, 2));
      endDate = endOfQuarter(subQuarters(now, 2));
      break;
    case 'year':
      // Previous year
      startDate = startOfYear(subYears(now, 1));
      endDate = endOfYear(subYears(now, 1));
      break;
    case 'lastYear':
      // Year before last year
      startDate = startOfYear(subYears(now, 2));
      endDate = endOfYear(subYears(now, 2));
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
    case 'allTime':
      // For all time, we'll use the previous year for comparison
      startDate = startOfYear(subYears(now, 1));
      endDate = endOfYear(subYears(now, 1));
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
};

// Calculate trend percentage
export const calculateTrendPercentage = (current: number, previous: number): { value: number, isPositive: boolean } => {
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
};

// Calculate metrics with trends
export const calculateMetricsWithTrends = (
  currentData: {
    collections: any[],
    farmers: any[],
    staff: any[],
    payments: any[]
  },
  previousData: {
    collections: any[],
    farmers: any[],
    payments: any[]
  } | null
) => {
  // Calculate current period metrics
  const currentTotalFarmers = currentData.farmers.length;
  const currentActiveFarmers = currentData.farmers.filter((f: any) => f.kyc_status === 'approved').length;
  const currentTotalCollections = currentData.collections.length;
  const currentTotalLiters = currentData.collections.reduce((sum: number, c: any) => sum + (c.liters || 0), 0);
  const currentTotalRevenue = currentData.collections.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
  
  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const currentTodayCollections = currentData.collections.filter((c: any) => isToday(c.collection_date)).length;
  const currentTodayLiters = currentData.collections
    .filter((c: any) => isToday(c.collection_date))
    .reduce((sum: number, c: any) => sum + (c.liters || 0), 0);

  // Calculate pending payments
  const currentPendingPayments = currentData.payments
    .filter((p: any) => p.status !== 'Paid')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Calculate average quality
  const qualityScores: Record<string, number> = { 'A+': 100, 'A': 90, 'B': 75, 'C': 60 };
  const currentAvgQuality = currentData.collections.length > 0
    ? currentData.collections.reduce((sum: number, c: any) => sum + (qualityScores[c.quality_grade] || 0), 0) / currentData.collections.length
    : 0;

  // Calculate previous period metrics if available
  let previousTotalFarmers = 0;
  let previousTotalLiters = 0;
  let previousTotalRevenue = 0;
  let previousAvgQuality = 0;

  if (previousData) {
    previousTotalFarmers = previousData.farmers.length;
    previousTotalLiters = previousData.collections.reduce((sum: number, c: any) => sum + (c.liters || 0), 0);
    previousTotalRevenue = previousData.collections.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
    
    previousAvgQuality = previousData.collections.length > 0
      ? previousData.collections.reduce((sum: number, c: any) => sum + (qualityScores[c.quality_grade] || 0), 0) / previousData.collections.length
      : 0;
  }

  // Calculate trends
  const farmersTrend = calculateTrendPercentage(currentTotalFarmers, previousTotalFarmers);
  const litersTrend = calculateTrendPercentage(currentTotalLiters, previousTotalLiters);
  const revenueTrend = calculateTrendPercentage(currentTotalRevenue, previousTotalRevenue);
  const qualityTrend = calculateTrendPercentage(currentAvgQuality, previousAvgQuality);

  return {
    totalFarmers: currentTotalFarmers,
    activeFarmers: currentActiveFarmers,
    totalCollections: currentTotalCollections,
    todayCollections: currentTodayCollections,
    totalLiters: Math.round(currentTotalLiters),
    todayLiters: Math.round(currentTodayLiters),
    totalRevenue: Math.round(currentTotalRevenue),
    pendingPayments: Math.round(currentPendingPayments),
    averageQuality: currentAvgQuality.toFixed(1),
    staffMembers: currentData.staff.length,
    farmersTrend,
    litersTrend,
    revenueTrend,
    qualityTrend
  };
};