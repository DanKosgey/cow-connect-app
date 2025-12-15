import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';
import { formatCurrency } from '@/utils/formatters';
import { deductionService } from '@/services/deduction-service';

interface Collection {
  id: string;
  farmer_id: string;
  collection_id: string;
  collection_date: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  status: string;
  approved_for_payment?: boolean;
  approved_at?: string;
  approved_by?: string;
  staff_id?: string;
  created_at: string;
  updated_at: string;
  credit_used?: number;
  collection_payments?: {
    credit_used?: number;
  }[];
  farmers: {
    id: string;
    user_id: string;
    bank_account_name: string;
    bank_account_number: string;
    bank_name: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
}

interface FarmerPaymentSummary {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  total_collections: number;
  total_liters: number;
  pending_payments: number;        // Collections with status "Collected" or "Verified" AND approved_for_company = true
  paid_amount: number;             // Collections with status "Paid"
  total_deductions: number;        // All deductions for farmer
  credit_used: number;             // Approved credit requests with settlement_status "pending"
  net_payment: number;             // Pending - Deductions - Credit Used - Collector Fees (Pending)
  total_amount: number;            // All collections regardless of status
  bank_info: string;
}

interface PaymentAnalytics {
  total_pending: number;           // Total pending payments (collections with status "Collected" or "Verified" AND approved_for_company = true)
  total_paid: number;              // Total paid amount (collections with status "Paid")
  total_farmers: number;
  avg_payment: number;
  daily_trend: { date: string; collections: number; paidAmount: number; pendingAmount: number; creditUsed: number }[];
  farmer_distribution: { name: string; value: number }[];
  total_credit_used: number;       // All approved credit requests with settlement_status "pending"
  total_deductions: number;        // Total deductions across all farmers
  total_net_payment: number;       // Total net payment across all farmers
  total_amount: number;            // Total amount for all collections regardless of status
}

interface PaymentSystemData {
  collections: Collection[];
  farmerPaymentSummaries: FarmerPaymentSummary[];
  analytics: PaymentAnalytics;
}

const filterCollectionsByTimeFrame = (collectionsData: Collection[], timeFrame: string, customDateRange: { from: string; to: string }) => {
  if (timeFrame === 'all' && !customDateRange.from && !customDateRange.to) {
    return collectionsData;
  }

  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  // Set date range based on selected time frame
  switch (timeFrame) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'weekly':
      const firstDayOfWeek = now.getDate() - now.getDay(); // Sunday as first day
      startDate = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
      endDate = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek + 6, 23, 59, 59);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'custom':
      if (customDateRange.from) {
        startDate = new Date(customDateRange.from);
      }
      if (customDateRange.to) {
        endDate = new Date(customDateRange.to);
        endDate.setHours(23, 59, 59, 999); // End of the day
      }
      break;
    default:
      return collectionsData;
  }

  // Filter collections based on date range
  return collectionsData.filter(collection => {
    const collectionDate = new Date(collection.collection_date);
    
    // If start date is set and collection date is before start date, exclude
    if (startDate && collectionDate < startDate) {
      return false;
    }
    
    // If end date is set and collection date is after end date, exclude
    if (endDate && collectionDate > endDate) {
      return false;
    }
    
    return true;
  });
};

const calculateAnalytics = async (collectionsData: Collection[], timeFrame: string, customDateRange: { from: string; to: string }) => {
  // Apply time frame filtering
  const filteredData = filterCollectionsByTimeFrame(collectionsData, timeFrame, customDateRange);
  
  // Update pending collections calculation to filter by status "Collected" or "Verified"
  // Note: All collections are already filtered by approved_for_company = true in the query
  const pendingCollections = filteredData.filter(c => (c.status === 'Collected' || c.status === 'Verified') && c.approved_for_payment);
  const paidCollections = filteredData.filter(c => c.status === 'Paid');
  
  // Calculate gross pending and paid amounts
  const grossPending = pendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const totalPaid = paidCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const uniqueFarmers = new Set(filteredData.map(c => c.farmer_id)).size;
  
  // Calculate total amount for all collections regardless of status
  const totalAmount = filteredData.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  
  // Calculate credit usage from credit_requests table with approved status and pending settlement
  let totalCreditUsed = 0;
  let totalDeductions = 0;
  try {
    // Get all approved credit requests with pending settlement across all farmers in the filtered data
    const farmerIds = [...new Set(filteredData.map(c => c.farmer_id))];
    if (farmerIds.length > 0) {
      const { data: creditRequests, error: creditError } = await supabase
        .from('credit_requests')
        .select('farmer_id, total_amount, status, settlement_status')
        .in('farmer_id', farmerIds)
        .eq('status', 'approved')
        .eq('settlement_status', 'pending');
      
      if (!creditError && creditRequests) {
        // Sum all approved credit requests with pending settlement
        totalCreditUsed = creditRequests.reduce((sum, request) => sum + (request.total_amount || 0), 0);
      } else if (creditError) {
        console.error('Error fetching credit requests:', creditError);
      }
      
      // Calculate total deductions across all farmers
      for (const farmerId of farmerIds) {
        try {
          const farmerDeductions = await deductionService.calculateTotalDeductionsForFarmer(farmerId);
          totalDeductions += farmerDeductions;
        } catch (error) {
          console.warn('Error fetching deduction data for farmer:', farmerId, error);
        }
      }
    }
  } catch (error) {
    console.warn('Error fetching credit requests for analytics:', error);
  }
  
  // Calculate net pending (gross pending - credit used - deductions)
  const netPending = Math.max(0, grossPending - totalCreditUsed - totalDeductions);
  const totalNetPayment = totalPaid + netPending;
  
  // Calculate daily trend based on time frame
  const dailyTrend = [];
  
  // Determine date range for trend calculation
  let trendStartDate: Date;
  let trendEndDate: Date;
  
  if (timeFrame === 'daily') {
    trendStartDate = new Date();
    trendStartDate.setDate(trendStartDate.getDate() - 6); // Last 7 days including today
    trendEndDate = new Date();
  } else if (timeFrame === 'weekly') {
    trendStartDate = new Date();
    trendStartDate.setDate(trendStartDate.getDate() - 6); // Last 7 days
    trendEndDate = new Date();
  } else if (timeFrame === 'monthly') {
    trendStartDate = new Date();
    trendStartDate.setDate(trendStartDate.getDate() - 29); // Last 30 days
    trendEndDate = new Date();
  } else if (timeFrame === 'lastMonth') {
    const now = new Date();
    trendEndDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
    trendStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // First day of previous month
  } else if (timeFrame === 'custom' && customDateRange.from && customDateRange.to) {
    trendStartDate = new Date(customDateRange.from);
    trendEndDate = new Date(customDateRange.to);
  } else {
    // Default to last 7 days
    trendEndDate = new Date();
    trendStartDate = new Date();
    trendStartDate.setDate(trendStartDate.getDate() - 6);
  }
  
  // Get unique farmer IDs from filtered data
  const farmerIds = [...new Set(filteredData.map(c => c.farmer_id))];
  
  // Generate daily trend data
  for (let d = new Date(trendStartDate); d <= trendEndDate; d.setDate(d.getDate() + 1)) {
    const dateString = new Date(d).toISOString().split('T')[0];
    
    // Count collections for this date
    const collectionsCount = filteredData
      .filter(c => c.collection_date?.startsWith(dateString))
      .length;
    
    const paidAmount = filteredData
      .filter(c => c.status === 'Paid' && c.collection_date?.startsWith(dateString))
      .reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate gross pending amount for this date
    const grossPendingAmount = filteredData
      .filter(c => (c.status === 'Collected' || c.status === 'Verified') && c.approved_for_payment && c.collection_date?.startsWith(dateString))
      .reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate credit used for this date from credit_requests table
    let creditUsed = 0;
    if (farmerIds.length > 0) {
      try {
        // Get credit requests for this specific date
        const { data: creditRequests, error: creditError } = await supabase
          .from('credit_requests')
          .select('total_amount, created_at, status, settlement_status')
          .in('farmer_id', farmerIds)
          .eq('status', 'approved')
          .eq('settlement_status', 'pending');
        
        if (!creditError && creditRequests) {
          // Filter credit requests by date and status
          const dailyCreditRequests = creditRequests.filter(request => {
            if (!request.created_at) return false;
            const requestDate = new Date(request.created_at);
            const requestDateString = requestDate.toISOString().split('T')[0];
            
            // Check if it matches our date and has the right status
            const dateMatch = requestDateString === dateString;
            
            return dateMatch;
          });
          
          creditUsed = dailyCreditRequests.reduce((sum, request) => sum + (request.total_amount || 0), 0);
        }
      } catch (error) {
        console.warn('Error fetching credit requests for date:', dateString, error);
      }
    }
    
    // Calculate net pending amount (gross pending - credit used)
    const netPendingAmount = Math.max(0, grossPendingAmount - creditUsed);
    
    dailyTrend.push({ 
      date: dateString, 
      collections: collectionsCount,
      paidAmount,
      pendingAmount: grossPendingAmount, // Show gross pending amount for the chart
      creditUsed
    });
  }
  
  // Calculate farmer distribution (top 5 farmers by payment amount)
  const farmerPayments = filteredData.reduce((acc, collection) => {
    const farmerId = collection.farmer_id;
    if (!farmerId) return acc; // Skip if no farmer_id
    
    if (!acc[farmerId]) {
      acc[farmerId] = {
        name: collection.farmer_id, // We'll update this with the actual name later
        value: 0
      };
    }
    acc[farmerId].value += collection.total_amount || 0;
    return acc;
  }, {} as Record<string, { name: string; value: number }>);
  
  // Map farmer IDs to names
  const farmerNames: Record<string, string> = {};
  filteredData.forEach(collection => {
    if (collection.farmer_id && collection.farmers?.profiles?.full_name) {
      farmerNames[collection.farmer_id] = collection.farmers.profiles.full_name;
    }
  });
  
  Object.keys(farmerPayments).forEach(farmerId => {
    farmerPayments[farmerId].name = farmerNames[farmerId] || `Farmer ${farmerId.substring(0, 8)}`;
  });
  
  const farmerDistribution = Object.values(farmerPayments)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  
  return {
    total_pending: netPending, // Use net pending instead of gross pending
    total_paid: totalPaid,
    total_farmers: uniqueFarmers,
    avg_payment: uniqueFarmers > 0 ? (netPending + totalPaid) / uniqueFarmers : 0, // Use net pending
    daily_trend: dailyTrend,
    farmer_distribution: farmerDistribution,
    total_credit_used: totalCreditUsed,
    total_deductions: totalDeductions,
    total_net_payment: totalNetPayment,
    total_amount: totalAmount
  };
};

const calculateFarmerSummaries = async (
  collections: any[], 
  timeFrame: string, 
  customDateRange: { from: string; to: string }
): Promise<FarmerPaymentSummary[]> => {
  // Apply time frame filtering
  const filteredCollections = filterCollectionsByTimeFrame(collections, timeFrame, customDateRange);
  
  // Group collections by farmer
  const groupedCollections = filteredCollections.reduce((acc: any, collection: any) => {
    const farmerId = collection.farmer_id;
    if (!acc[farmerId]) {
      acc[farmerId] = [];
    }
    acc[farmerId].push(collection);
    return acc;
  }, {});
  
  // Get current collector rate
  // Check if we have an authenticated session before proceeding
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.warn('No authenticated session available for getting collector rate');
    return []; // Return empty array as fallback
  }
  
  const collectorRateResponse = await supabase.rpc('get_current_collector_rate');
  const collectorRate = collectorRateResponse.data || 0;
  
  // Calculate summaries for each farmer
  const farmerSummaries: FarmerPaymentSummary[] = [];
  
  for (const [farmerId, farmerCollections] of Object.entries(groupedCollections)) {
    const collectionsArray = farmerCollections as any[];
    const firstCollection = collectionsArray[0];
    
    const totalCollections = collectionsArray.length;
    const totalLiters = collectionsArray.reduce((sum, c) => sum + (c.liters || 0), 0);
    
    // Calculate total amount for all collections regardless of status
    const totalAmount = collectionsArray.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate pending payments: collections with status "Collected" or "Verified" AND approved_for_company = true
    // Note: All collections are already filtered by approved_for_company = true in the query
    const pendingCollections = collectionsArray.filter(c => (c.status === 'Collected' || c.status === 'Verified') && c.approved_for_payment);
    const pendingPayments = pendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate paid amount: collections with status "Paid"
    const paidCollections = collectionsArray.filter(c => c.status === 'Paid');
    const paidAmount = paidCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate collector fees for pending collections only
    const pendingCollectorFees = pendingCollections.reduce((sum, c) => sum + ((c.liters || 0) * collectorRate), 0);
    
    // Calculate credit used from credit_requests table with approved status and pending settlement
    let creditUsed = 0;
    try {
      // Get all approved credit requests for this farmer that are pending settlement
      const { data: creditRequests, error: creditError } = await supabase
        .from('credit_requests')
        .select('total_amount, status, settlement_status')
        .eq('farmer_id', farmerId)
        .eq('status', 'approved')
        .eq('settlement_status', 'pending');
      
      if (!creditError && creditRequests) {
        // Sum all approved credit requests with pending settlement
        creditUsed = creditRequests.reduce((sum, request) => sum + (request.total_amount || 0), 0);
      }
    } catch (error) {
      console.warn('Error fetching credit requests for farmer:', farmerId, error);
    }

    // Calculate total deductions for the farmer
    let totalDeductions = 0;
    try {
      totalDeductions = await deductionService.calculateTotalDeductionsForFarmer(farmerId);
    } catch (error) {
      console.warn('Error fetching deduction data for farmer:', farmerId, error);
    }

    // Calculate net payment: Pending Payments - Deductions - Credit Used - Collector Fees (Pending)
    const netPayment = Math.max(0, pendingPayments - totalDeductions - creditUsed - pendingCollectorFees);

    farmerSummaries.push({
      farmer_id: farmerId,
      farmer_name: firstCollection.farmers?.profiles?.full_name || 'Unknown Farmer',
      farmer_phone: firstCollection.farmers?.profiles?.phone || 'No phone',
      total_collections: totalCollections,
      total_liters: totalLiters,
      pending_payments: pendingPayments,
      paid_amount: paidAmount,
      total_deductions: totalDeductions,
      credit_used: creditUsed,
      net_payment: netPayment,
      total_amount: totalAmount,
      bank_info: `${firstCollection.farmers?.bank_name || 'N/A'} - ${firstCollection.farmers?.bank_account_number || 'No account'}`
    });
  }
  
  return farmerSummaries;
};

export const usePaymentSystemData = (timeFrame: string = 'week', customDateRange: { from: string; to: string } = { from: '', to: '' }) => {
  return useQuery<PaymentSystemData>({
    queryKey: [CACHE_KEYS.ADMIN_PAYMENTS, timeFrame, customDateRange],
    queryFn: async () => {
      try {
        // Build date filter based on timeFrame
        let dateFilter = '';
        const now = new Date();
        
        switch (timeFrame) {
          case 'daily':
            dateFilter = now.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = `gte.${weekAgo.toISOString().split('T')[0]}`;
            break;
          case 'monthly':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            dateFilter = `gte.${monthAgo.toISOString().split('T')[0]}`;
            break;
          case 'custom':
            if (customDateRange.from && customDateRange.to) {
              dateFilter = `gte.${customDateRange.from},lte.${customDateRange.to}`;
            }
            break;
          default:
            // For 'all' or other cases, we'll limit to last 3 months for performance
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            dateFilter = `gte.${threeMonthsAgo.toISOString().split('T')[0]}`;
        }

        // Fetch collections with farmer data that are approved for company (milk approval)
        let query = supabase
          .from('collections')
          .select(`
            *,
            approved_for_payment,
            farmers (
              id,
              user_id,
              bank_account_name,
              bank_account_number,
              bank_name,
              profiles (
                full_name,
                phone
              )
            ),
            collection_payments!collection_payments_collection_id_fkey (
              credit_used,
              collector_fee
            )
          `)
          .eq('approved_for_company', true); // Only fetch collections approved for company (milk approval)

        // Apply date filter if applicable
        if (dateFilter && timeFrame !== 'all') {
          if (timeFrame === 'daily') {
            query = query.eq('collection_date', dateFilter);
          } else if (dateFilter.includes(',')) {
            // Handle custom range with both gte and lte
            const [gtePart, ltePart] = dateFilter.split(',');
            query = query.gte('collection_date', gtePart.split('.')[1])
                         .lte('collection_date', ltePart.split('.')[1]);
          } else {
            query = query.gte('collection_date', dateFilter.split('.')[1]);
          }
        }

        // Order and increase limit for better performance with pagination
        const { data: collectionsData, error: collectionsError } = await query
          .order('collection_date', { ascending: false })
          .limit(1000); // Increased limit to reduce frequent refetching

        if (collectionsError) {
          console.error('Error fetching collections data:', collectionsError);
          throw new Error(`Failed to fetch collections: ${collectionsError.message}`);
        }

        const collections = collectionsData || [];
        
        // Calculate analytics and farmer summaries with better error handling
        let analytics;
        let farmerPaymentSummaries;
        
        try {
          analytics = await calculateAnalytics(collections, timeFrame, customDateRange);
        } catch (error) {
          console.error('Error calculating analytics:', error);
          // Provide fallback analytics
          analytics = {
            total_pending: 0,
            total_paid: 0,
            total_farmers: 0,
            avg_payment: 0,
            daily_trend: [],
            farmer_distribution: [],
            total_credit_used: 0,
            total_deductions: 0,
            total_net_payment: 0,
            total_amount: 0
          };
        }
        
        try {
          farmerPaymentSummaries = await calculateFarmerSummaries(collections, timeFrame, customDateRange);
        } catch (error) {
          console.error('Error calculating farmer summaries:', error);
          // Provide empty array as fallback
          farmerPaymentSummaries = [];
        }

        return {
          collections,
          farmerPaymentSummaries,
          analytics
        };
      } catch (error) {
        console.error('Error in usePaymentSystemData:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // Increased to 5 minutes to reduce frequent updates
    gcTime: 1000 * 60 * 15, // Increased to 15 minutes
    retry: 2, // Allow 2 retries for better reliability
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * 2 ** attemptIndex, 5000); // Exponential backoff up to 5 seconds
    },
    refetchOnWindowFocus: false, // Disable automatic refetch on window focus to reduce load
    refetchOnReconnect: false, // Disable automatic refetch on reconnect
  });
};
