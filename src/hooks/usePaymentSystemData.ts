import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';
import { formatCurrency } from '@/utils/formatters';

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
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  bank_info: string;
  credit_used: number;
  net_payment: number;
}

interface PaymentAnalytics {
  total_pending: number;
  total_paid: number;
  total_farmers: number;
  avg_payment: number;
  daily_trend: { date: string; collections: number; paidAmount: number; pendingAmount: number; creditUsed: number }[];
  farmer_distribution: { name: string; value: number }[];
  total_credit_used: number;
  total_net_payment: number;
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

const calculateAnalytics = (collectionsData: Collection[], timeFrame: string, customDateRange: { from: string; to: string }) => {
  // Apply time frame filtering
  const filteredData = filterCollectionsByTimeFrame(collectionsData, timeFrame, customDateRange);
  
  const pendingCollections = filteredData.filter(c => c.status !== 'Paid');
  const paidCollections = filteredData.filter(c => c.status === 'Paid');
  
  // Calculate gross pending and paid amounts
  const grossPending = pendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const totalPaid = paidCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const uniqueFarmers = new Set(filteredData.map(c => c.farmer_id)).size;
  
  // Calculate credit usage from collection payments
  const totalCreditUsed = filteredData.reduce((sum, c) => {
    const collectionCredit = c.collection_payments?.[0]?.credit_used || 0;
    return sum + collectionCredit;
  }, 0);
  
  // Calculate net pending (gross pending - credit used)
  const netPending = Math.max(0, grossPending - totalCreditUsed);
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
      .filter(c => c.status !== 'Paid' && c.collection_date?.startsWith(dateString))
      .reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate credit used for this date
    const creditUsed = filteredData
      .filter(c => c.collection_date?.startsWith(dateString))
      .reduce((sum, c) => {
        const collectionCredit = c.collection_payments?.[0]?.credit_used || 0;
        return sum + collectionCredit;
      }, 0);
    
    // Calculate net pending amount (gross pending - credit used)
    const netPendingAmount = Math.max(0, grossPendingAmount - creditUsed);
    
    dailyTrend.push({ 
      date: dateString, 
      collections: collectionsCount,
      paidAmount,
      pendingAmount: netPendingAmount, // Use net pending instead of gross pending
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
    total_net_payment: totalNetPayment
  };
};

const calculateFarmerSummaries = async (collectionsData: Collection[], timeFrame: string, customDateRange: { from: string; to: string }) => {
  // Apply time frame filtering
  const filteredData = filterCollectionsByTimeFrame(collectionsData, timeFrame, customDateRange);
  
  // Group collections by farmer
  const farmerCollections = filteredData.reduce((acc, collection) => {
    const farmerId = collection.farmer_id;
    if (!farmerId) return acc;
    
    if (!acc[farmerId]) {
      acc[farmerId] = [];
    }
    acc[farmerId].push(collection);
    return acc;
  }, {} as Record<string, Collection[]>);
  
  // Calculate summaries for each farmer
  const farmerSummaries: FarmerPaymentSummary[] = [];
  
  for (const farmerId of Object.keys(farmerCollections)) {
    const farmerCollectionsList = farmerCollections[farmerId];
    const firstCollection = farmerCollectionsList[0];
    
    // Calculate totals
    const totalCollections = farmerCollectionsList.length;
    const totalLiters = farmerCollectionsList.reduce((sum, c) => sum + (c.liters || 0), 0);
    const totalAmount = farmerCollectionsList.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const paidAmount = farmerCollectionsList
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const grossPendingAmount = totalAmount - paidAmount;
    
    // Calculate credit used and net payment from collection payments
    let creditUsed = 0;
    
    // Sum credit used from all collections for this farmer
    creditUsed = farmerCollectionsList.reduce((sum, c) => {
      const collectionCredit = c.collection_payments?.[0]?.credit_used || 0;
      return sum + collectionCredit;
    }, 0);
    
    // Fetch credit data for the farmer
    try {
      const { data: creditData, error: creditError } = await supabase
        .from('farmer_credit_limits')
        .select('current_credit_balance, total_credit_used')
        .eq('farmer_id', farmerId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!creditError && creditData) {
        creditUsed = creditData.total_credit_used || 0;
      }
    } catch (error) {
      console.warn('Error fetching credit data for farmer:', farmerId, error);
    }

    // Calculate net pending amount (gross pending - credit used)
    const netPendingAmount = Math.max(0, grossPendingAmount - creditUsed);
    
    // Calculate net payment (same as paid amount since we're looking at what's actually paid)
    const netPayment = paidAmount;
    
    farmerSummaries.push({
      farmer_id: farmerId,
      farmer_name: firstCollection.farmers?.profiles?.full_name || 'Unknown Farmer',
      farmer_phone: firstCollection.farmers?.profiles?.phone || 'No phone',
      total_collections: totalCollections,
      total_liters: totalLiters,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      pending_amount: netPendingAmount, // Use net pending instead of gross pending
      bank_info: `${firstCollection.farmers?.bank_name || 'N/A'} - ${firstCollection.farmers?.bank_account_number || 'No account'}`,
      credit_used: creditUsed,
      net_payment: netPayment
    });
  }
  
  return farmerSummaries;
};

export const usePaymentSystemData = (timeFrame: string = 'all', customDateRange: { from: string; to: string } = { from: '', to: '' }) => {
  return useQuery<PaymentSystemData>({
    queryKey: [CACHE_KEYS.ADMIN_PAYMENTS, timeFrame, customDateRange],
    queryFn: async () => {
      // Fetch collections with farmer data
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          *,
          farmers (
            id,
            user_id,
            bank_account_name,
            bank_account_number,
            bank_name,
            profiles!user_id (
              full_name,
              phone
            )
          ),
          collection_payments!collection_payments_collection_id_fkey (
            credit_used
          )
        `)
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }

      const collections = collectionsData || [];
      
      // Calculate analytics and farmer summaries
      const analytics = calculateAnalytics(collections, timeFrame, customDateRange);
      const farmerPaymentSummaries = await calculateFarmerSummaries(collections, timeFrame, customDateRange);

      return {
        collections,
        farmerPaymentSummaries,
        analytics
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};