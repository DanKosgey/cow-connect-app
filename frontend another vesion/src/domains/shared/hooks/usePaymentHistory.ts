import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { PaymentsAPI } from '@/services/ApiService';
import { PaymentHistoryFilter, PaymentHistoryResponse } from '@/types/payment';

interface PaymentHistoryParams extends PaymentHistoryFilter {
  farmerId: string;
  page?: number;
  limit?: number;
}

// Function to fetch payment history with filters
const fetchPaymentHistory = async ({
  farmerId,
  page = 1,
  limit = 20,
  dateRange,
  status,
  paymentMethod,
  minAmount,
  maxAmount
}: PaymentHistoryParams): Promise<PaymentHistoryResponse> => {
  try {
    // Build query parameters
    const params: any = {
      page,
      limit
    };
    
    // Add date range if provided
    if (dateRange.start) {
      params.start_date = dateRange.start.toISOString().split('T')[0];
    }
    if (dateRange.end) {
      params.end_date = dateRange.end.toISOString().split('T')[0];
    }
    
    // Add status filter
    if (status && status !== 'all') {
      params.status = status;
    }
    
    // Add payment method filter
    if (paymentMethod && paymentMethod !== 'all') {
      params.payment_method = paymentMethod;
    }
    
    // Add amount filters
    if (minAmount !== undefined) {
      params.min_amount = minAmount;
    }
    if (maxAmount !== undefined) {
      params.max_amount = maxAmount;
    }
    
    // Use the proper API method
    const data = await PaymentsAPI.getHistory(farmerId, params);
    return data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw new Error('Failed to load payment history');
  }
};

// Hook for paginated payment history with infinite scroll
export const usePaymentHistory = (params: Omit<PaymentHistoryParams, 'page'>) => {
  return useInfiniteQuery<PaymentHistoryResponse>({
    queryKey: ['paymentHistory', params],
    queryFn: ({ pageParam = 1 }) => 
      fetchPaymentHistory({ ...params, page: pageParam as number }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for payment summary
export const usePaymentSummary = (farmerId: string) => {
  return useQuery({
    queryKey: ['paymentSummary', farmerId],
    queryFn: async () => {
      // This would be a separate endpoint in a real implementation
      // For now, we'll return mock data
      return {
        total_earned: 0,
        total_pending: 0,
        average_per_collection: 0
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};