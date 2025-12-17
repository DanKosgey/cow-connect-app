import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateMetricsWithTrends } from '@/utils/dashboardTrends';
import { CACHE_KEYS } from '@/services/cache-utils';
import { 
  subDays, 
  subWeeks, 
  subMonths, 
  subQuarters, 
  subYears,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear
} from 'date-fns';

interface Collection {
  id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

interface Farmer {
  id: string;
  user_id: string;
  registration_number: string;
  kyc_status: string;
  created_at: string;
}

interface Staff {
  id: string;
  user_id: string;
  employee_id: string;
  status?: string;
  created_at: string;
}

interface PaymentTrendData {
  date: string;
  paidAmount: number;
  pendingAmount: number;
  creditUsed: number;
  collections: number;
}

interface AnalyticsData {
  collections: Collection[];
  farmers: Farmer[];
  staff: Staff[];
  metrics: any[];
  collectionTrends: any[];
  revenueData: any[];
  paymentTrends: PaymentTrendData[];
}

const getDateFilter = (dateRange: string) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  
  switch(dateRange) {
    case '7days':
      startDate = subDays(now, 7);
      endDate = now;
      break;
    case '30days':
      startDate = subDays(now, 30);
      endDate = now;
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
      startDate = subDays(now, 30);
      endDate = now;
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

const fetchPreviousPeriodData = async (startDate: string, endDate: string) => {
  try {
    // Calculate previous period dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const prevEndDate = new Date(start.getTime() - 1000); // One second before start
    const prevStartDate = new Date(prevEndDate.getTime() - diffTime);
    
    // Fetch collections for previous period
    const { data: prevCollectionsData, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        farmer_id,
        staff_id,
        liters,
        rate_per_liter,
        total_amount,
        collection_date,
        status
      `)
      .gte('collection_date', prevStartDate.toISOString())
      .lte('collection_date', prevEndDate.toISOString())
      .order('collection_date', { ascending: false });

    if (collectionsError) {
      console.error('Error fetching previous period collections:', collectionsError);
      return null;
    }

    const { data: prevFarmersData, error: farmersError } = await supabase
      .from('farmers')
      .select(`
        id,
        user_id,
        registration_number,
        kyc_status,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (farmersError) {
      console.error('Error fetching previous period farmers:', farmersError);
      return null;
    }

    return {
      collections: prevCollectionsData || [],
      farmers: prevFarmersData || [],
      payments: prevCollectionsData || []
    };
  } catch (error: any) {
    console.error('Error fetching previous period data:', error);
    return null;
  }
};

// Function to calculate payment trends
const calculatePaymentTrends = async (collectionsData: Collection[], startDate: string, endDate: string) => {
  // Determine date range for trend calculation
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Get unique farmer IDs from collections data
  const farmerIds = [...new Set(collectionsData.map(c => c.farmer_id))];
  
  // Fetch credit requests for these farmers with both pending and processed settlement status
  let creditRequestsData: any[] = [];
  if (farmerIds.length > 0) {
    const { data: creditRequests, error: creditError } = await supabase
      .from('credit_requests')
      .select('farmer_id, total_amount, created_at, status, settlement_status')
      .in('farmer_id', farmerIds)
      .eq('status', 'approved')
      .in('settlement_status', ['pending', 'processed']);
    
    if (!creditError && creditRequests) {
      creditRequestsData = creditRequests;
    }
  }
  
  // Generate daily trend data
  const dailyTrend = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateString = new Date(d).toISOString().split('T')[0];
    
    // Count collections for this date
    const collectionsCount = collectionsData
      .filter(c => c.collection_date?.startsWith(dateString))
      .length;
    
    const paidAmount = collectionsData
      .filter(c => c.status === 'Paid' && c.collection_date?.startsWith(dateString))
      .reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate gross pending amount for this date
    const pendingAmount = collectionsData
      .filter(c => c.status !== 'Paid' && c.collection_date?.startsWith(dateString))
      .reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate actual credit used for this date from credit requests
    const creditUsed = creditRequestsData
      .filter(request => {
        if (!request.created_at) return false;
        const requestDate = new Date(request.created_at);
        const requestDateString = requestDate.toISOString().split('T')[0];
        return requestDateString === dateString;
      })
      .reduce((sum, request) => sum + (request.total_amount || 0), 0);
    
    dailyTrend.push({ 
      date: dateString, 
      collections: collectionsCount,
      paidAmount,
      pendingAmount,
      creditUsed
    });
  }
  
  return dailyTrend;
};

export const useAnalyticsData = (dateRange: string) => {
  return useQuery<AnalyticsData>({
    queryKey: [CACHE_KEYS.ADMIN_ANALYTICS, dateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateFilter(dateRange);
      
      // Fetch current period data
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          farmer_id,
          staff_id,
          liters,
          rate_per_liter,
          total_amount,
          collection_date,
          status
        `)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }

      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          user_id,
          registration_number,
          kyc_status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (farmersError) {
        throw farmersError;
      }

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          employee_id,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (staffError) {
        throw staffError;
      }

      // Fetch previous period data for trend calculations
      const previousData = await fetchPreviousPeriodData(startDate, endDate);

      // Prepare current data for metrics calculation
      const currentData = {
        collections: collectionsData || [],
        farmers: farmersData || [],
        staff: staffData || [],
        payments: collectionsData || [] // Using collections as payments for now
      };

      // Calculate metrics with trends
      const calculatedMetrics = calculateMetricsWithTrends(currentData, previousData);

      // Process trends data for charts - GROUP BY DATE and SUM LITERS
      const trendsData = (collectionsData || []).reduce((acc: any, collection: any) => {
        const date = new Date(collection.collection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[date]) {
          acc[date] = {
            date,
            liters: 0,
            collections: 0,
            revenue: 0
          };
        }
        // SUM the liters for each date instead of counting collections
        acc[date].liters += collection.liters;
        acc[date].collections += 1;
        acc[date].revenue += collection.total_amount;
        
        return acc;
      }, {});

      // Convert to array and sort by date
      const trendsArray = Object.values(trendsData)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });

      // Transform revenue data for charts
      const revenueData = trendsArray.map((trend: any) => ({
        month: trend.date,
        actual: trend.revenue,
        predicted: trend.revenue * 1.05 // Simple prediction for demo
      }));

      // Calculate payment trends
      const paymentTrends = await calculatePaymentTrends(collectionsData || [], startDate, endDate);

      // Get unique farmer IDs from collections data
      const farmerIds = [...new Set((collectionsData || []).map(c => c.farmer_id))];

      // Calculate total credit used across all farmers with both pending and processed settlement status
      let totalCreditUsed = 0;
      if (farmerIds.length > 0) {
        const { data: creditRequests, error: creditError } = await supabase
          .from('credit_requests')
          .select('farmer_id, total_amount, status, settlement_status')
          .in('farmer_id', farmerIds)
          .eq('status', 'approved')
          .in('settlement_status', ['pending', 'processed']);
        
        if (!creditError && creditRequests) {
          totalCreditUsed = creditRequests.reduce((sum, request) => sum + (request.total_amount || 0), 0);
        }
      }

      return {
        collections: collectionsData || [],
        farmers: farmersData || [],
        staff: staffData || [],
        metrics: calculatedMetrics,
        collectionTrends: trendsArray,
        revenueData: revenueData,
        paymentTrends: paymentTrends
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};