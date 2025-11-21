import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';

interface PaymentReport {
  date: string;
  total_collections: number;
  total_liters: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  farmers_count: number;
}

interface FarmerReport {
  farmer_id: string;
  farmer_name: string;
  total_collections: number;
  total_liters: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_percentage: number;
}

interface PaymentReportsData {
  dailyReports: PaymentReport[];
  farmerReports: FarmerReport[];
  summary: {
    total_collections: number;
    total_liters: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    farmers_count: number;
  };
}

export const usePaymentReportsData = (dateRange: { start: string; end: string }) => {
  return useQuery<PaymentReportsData>({
    queryKey: [CACHE_KEYS.ADMIN_REPORTS, dateRange.start, dateRange.end],
    queryFn: async () => {
      // Fetch collections within the date range that are approved
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          farmer_id,
          liters,
          total_amount,
          collection_date,
          status,
          farmers (
            profiles (
              full_name
            )
          )
        `)
        .eq('approved_for_company', true) // Only fetch approved collections
        .gte('collection_date', dateRange.start)
        .lte('collection_date', dateRange.end)
        .order('collection_date', { ascending: true });

      if (collectionsError) {
        throw collectionsError;
      }

      // Process daily reports
      const dailyReportsMap: Record<string, PaymentReport> = {};
      
      collections?.forEach(collection => {
        const date = new Date(collection.collection_date).toISOString().split('T')[0];
        
        if (!dailyReportsMap[date]) {
          dailyReportsMap[date] = {
            date,
            total_collections: 0,
            total_liters: 0,
            total_amount: 0,
            paid_amount: 0,
            pending_amount: 0,
            farmers_count: 0
          };
        }
        
        dailyReportsMap[date].total_collections += 1;
        dailyReportsMap[date].total_liters += collection.liters || 0;
        dailyReportsMap[date].total_amount += collection.total_amount || 0;
        
        if (collection.status === 'Paid') {
          dailyReportsMap[date].paid_amount += collection.total_amount || 0;
        } else {
          dailyReportsMap[date].pending_amount += collection.total_amount || 0;
        }
      });
      
      // Convert map to array
      const dailyReports = Object.values(dailyReportsMap);
      
      // Process farmer reports
      const farmerReportsMap: Record<string, Omit<FarmerReport, 'farmer_name'>> = {};
      
      collections?.forEach(collection => {
        const farmerId = collection.farmer_id;
        
        if (!farmerReportsMap[farmerId]) {
          farmerReportsMap[farmerId] = {
            farmer_id: farmerId,
            total_collections: 0,
            total_liters: 0,
            total_amount: 0,
            paid_amount: 0,
            pending_amount: 0,
            payment_percentage: 0
          };
        }
        
        farmerReportsMap[farmerId].total_collections += 1;
        farmerReportsMap[farmerId].total_liters += collection.liters || 0;
        farmerReportsMap[farmerId].total_amount += collection.total_amount || 0;
        
        if (collection.status === 'Paid') {
          farmerReportsMap[farmerId].paid_amount += collection.total_amount || 0;
        } else {
          farmerReportsMap[farmerId].pending_amount += collection.total_amount || 0;
        }
      });
      
      // Convert map to array and add farmer names
      const farmerReports: FarmerReport[] = Object.values(farmerReportsMap).map(report => ({
        ...report,
        farmer_name: collections?.find(c => c.farmer_id === report.farmer_id)?.farmers?.profiles?.full_name || 'Unknown Farmer',
        payment_percentage: report.total_amount > 0 ? (report.paid_amount / report.total_amount) * 100 : 0
      }));
      
      // Calculate summary
      const totalCollections = dailyReports.reduce((sum, r) => sum + (r.total_collections || 0), 0);
      const totalLiters = dailyReports.reduce((sum, r) => sum + (r.total_liters || 0), 0);
      const totalAmount = dailyReports.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const paidAmount = dailyReports.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
      const farmersCount = new Set(collections?.map(c => c.farmer_id)).size || 0;

      return {
        dailyReports,
        farmerReports,
        summary: {
          total_collections: totalCollections,
          total_liters: totalLiters,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          pending_amount: totalAmount - paidAmount,
          farmers_count: farmersCount
        }
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};