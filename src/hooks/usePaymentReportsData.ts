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
      // Fetch daily reports
      const { data: dailyData, error: dailyError } = await supabase
        .rpc('get_payment_reports', {
          start_date: dateRange.start,
          end_date: dateRange.end
        });

      if (dailyError) {
        throw dailyError;
      }

      // Fetch farmer reports
      const { data: farmerData, error: farmerError } = await supabase
        .rpc('get_farmer_payment_reports', {
          start_date: dateRange.start,
          end_date: dateRange.end
        });

      if (farmerError) {
        throw farmerError;
      }

      // Calculate summary
      const totalCollections = dailyData?.reduce((sum, r) => sum + (r.total_collections || 0), 0) || 0;
      const totalLiters = dailyData?.reduce((sum, r) => sum + (r.total_liters || 0), 0) || 0;
      const totalAmount = dailyData?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
      const paidAmount = dailyData?.reduce((sum, r) => sum + (r.paid_amount || 0), 0) || 0;
      const farmersCount = new Set(farmerData?.map(f => f.farmer_id)).size || 0;

      return {
        dailyReports: dailyData || [],
        farmerReports: farmerData || [],
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