// Utility functions for calculating dashboard trends
import { subDays, subWeeks, subMonths, subQuarters, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

// Format date for Supabase API (ISO format without milliseconds)
const formatForSupabase = (date: Date): string => {
  return date.toISOString().split('.')[0] + 'Z';
};

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
    startDate: formatForSupabase(startDate),
    endDate: formatForSupabase(endDate)
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
    startDate: formatForSupabase(startDate),
    endDate: formatForSupabase(endDate)
  };
};

// Calculate trend percentage with performance optimization
export const calculateTrendPercentage = (current: number, previous: number): { value: number, isPositive: boolean } => {
  // Handle edge cases efficiently
  if (previous === 0) {
    return { 
      value: current > 0 ? 100 : 0, 
      isPositive: current >= 0 
    };
  }
  
  // Use faster Math.round instead of toFixed for better performance
  const percentage = Math.round(((current - previous) / previous) * 100);
  return { 
    value: Math.abs(percentage), 
    isPositive: percentage >= 0 
  };
};

// Calculate metrics with trends - OPTIMIZED VERSION
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
  // Early return for empty data
  if (!currentData.collections || !currentData.farmers || !currentData.staff) {
    return [
      { value: 0, active: 0, trend: { value: 0, isPositive: true } },
      { value: 0, active: 0, trend: { value: 0, isPositive: true } },
      { value: 0, today: 0, trend: { value: 0, isPositive: true } },
      { value: 0, pending: 0, trend: { value: 0, isPositive: true } }
    ];
  }

  // Calculate current period metrics with optimized loops
  const currentCollections = currentData.collections;
  const currentFarmers = currentData.farmers;
  const currentStaff = currentData.staff;
  const currentPayments = currentData.payments;

  // Use single-pass calculations for better performance
  let currentTotalFarmers = currentFarmers.length;
  let currentActiveFarmers = 0;
  let currentTotalLiters = 0;
  let currentTotalRevenue = 0;
  let currentTodayCollections = 0;
  let currentTodayLiters = 0;
  let currentPendingPayments = 0;
  let qualitySum = 0;
  const today = new Date().toDateString();

  // Single loop for collections data
  for (let i = 0; i < currentCollections.length; i++) {
    const c = currentCollections[i];
    currentTotalLiters += (c.liters || 0);
    currentTotalRevenue += (c.total_amount || 0);
    
    // Check if collection is from today
    if (c.collection_date && new Date(c.collection_date).toDateString() === today) {
      currentTodayCollections++;
      currentTodayLiters += (c.liters || 0);
    }
    
    // Remove quality calculation since quality_grade column doesn't exist
    const qualityValue = 3; // Default quality value
    qualitySum += qualityValue;
  }

  // Count active farmers
  for (let i = 0; i < currentFarmers.length; i++) {
    if (currentFarmers[i].kyc_status === 'approved') {
      currentActiveFarmers++;
    }
  }

  // Calculate pending payments
  for (let i = 0; i < currentPayments.length; i++) {
    const p = currentPayments[i];
    if (p.status !== 'Paid') {
      currentPendingPayments += (p.total_amount || 0);
    }
  }

  // Calculate average quality
  const currentAvgQuality = currentCollections.length > 0 ? qualitySum / currentCollections.length : 0;

  // Calculate previous period metrics if available
  let previousTotalFarmers = 0;
  let previousTotalLiters = 0;
  let previousTotalRevenue = 0;
  let previousAvgQuality = 0;

  if (previousData && previousData.collections && previousData.farmers) {
    previousTotalFarmers = previousData.farmers.length;
    let prevQualitySum = 0;
    
    // Single loop for previous collections
    for (let i = 0; i < previousData.collections.length; i++) {
      const c = previousData.collections[i];
      previousTotalLiters += (c.liters || 0);
      previousTotalRevenue += (c.total_amount || 0);
      
      // Remove quality calculation since quality_grade column doesn't exist
      // const qualityValue = c.quality_grade === 'A+' ? 4 : 
      //                     c.quality_grade === 'A' ? 3 : 
      //                     c.quality_grade === 'B' ? 2 : 1;
      const qualityValue = 3; // Default quality value
      prevQualitySum += qualityValue;
    }
    
    previousAvgQuality = previousData.collections.length > 0 ? prevQualitySum / previousData.collections.length : 0;
  }

  // Calculate trends
  const farmersTrend = calculateTrendPercentage(currentTotalFarmers, previousTotalFarmers);
  const litersTrend = calculateTrendPercentage(currentTotalLiters, previousTotalLiters);
  const revenueTrend = calculateTrendPercentage(currentTotalRevenue, previousTotalRevenue);
  const qualityTrend = calculateTrendPercentage(currentAvgQuality, previousAvgQuality);

  // Calculate active staff count
  let currentActiveStaff = 0;
  for (let i = 0; i < currentStaff.length; i++) {
    const s = currentStaff[i];
    if (s.status === 'active' || s.status === undefined || s.status === null) {
      currentActiveStaff++;
    }
  }

  // Return metrics array in the format expected by the dashboard
  return [
    {
      value: currentTotalFarmers,
      active: currentActiveFarmers,
      trend: farmersTrend
    },
    {
      value: currentStaff.length,
      active: currentActiveStaff,
      trend: { value: 0, isPositive: true } // Placeholder trend for staff
    },
    {
      value: Math.round(currentTotalLiters),
      today: Math.round(currentTodayLiters),
      trend: litersTrend
    },
    {
      value: Math.round(currentTotalRevenue),
      pending: Math.round(currentPendingPayments),
      trend: revenueTrend
    }
  ];
};