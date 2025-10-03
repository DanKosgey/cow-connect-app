import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import apiService from '@/services/ApiService';
import { Payment } from '@/types';

// Cache times in milliseconds
const PAYMENTS_STALE_TIME = 3 * 60 * 1000; // 3 minutes
const PAYMENTS_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to fetch payments with pagination
 */
export function usePayments(limit = 50, offset = 0, farmerId?: string) {
  return useQuery({
    queryKey: ['payments', limit, offset, farmerId],
    queryFn: () => apiService.Payments.list(limit, offset, farmerId),
    staleTime: PAYMENTS_STALE_TIME,
    gcTime: PAYMENTS_CACHE_TIME,
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook to fetch a single payment by ID
 */
export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => apiService.Payments.get(id),
    staleTime: PAYMENTS_STALE_TIME,
    gcTime: PAYMENTS_CACHE_TIME,
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook to fetch payment projections for a farmer
 */
export function usePaymentProjections(farmerId: string) {
  return useQuery({
    queryKey: ['payment-projections', farmerId],
    queryFn: () => apiService.Payments.getProjections(farmerId),
    staleTime: PAYMENTS_STALE_TIME,
    gcTime: PAYMENTS_CACHE_TIME,
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook to fetch payment history for a farmer
 */
export function usePaymentHistory(farmerId: string, params?: { 
  page?: number; 
  limit?: number; 
  status?: string; 
  start_date?: string; 
  end_date?: string; 
  payment_method?: string; 
  min_amount?: number; 
  max_amount?: number; 
}) {
  return useQuery({
    queryKey: ['payment-history', farmerId, params],
    queryFn: () => apiService.Payments.getHistory(farmerId, params),
    staleTime: PAYMENTS_STALE_TIME,
    gcTime: PAYMENTS_CACHE_TIME,
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook to create a new payment with optimistic updates
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (paymentData: Partial<Payment>) => 
      apiService.Payments.create(paymentData),
    onMutate: async (newPayment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['payments'] });
      
      // Snapshot the previous value
      const previousPayments = queryClient.getQueryData(['payments']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['payments'], (old: any) => {
        if (old) {
          return [newPayment, ...old];
        }
        return old;
      });
      
      return { previousPayments };
    },
    onError: (err, newPayment, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['payments'], context.previousPayments);
    },
    onSettled: () => {
      // Invalidate and refetch payments list
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

/**
 * Hook to update a payment with optimistic updates
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, paymentData }: { id: string; paymentData: Partial<Payment> }) => 
      apiService.Payments.update(id, paymentData),
    onMutate: async ({ id, paymentData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['payment', id] });
      await queryClient.cancelQueries({ queryKey: ['payments'] });
      
      // Snapshot the previous values
      const previousPayment = queryClient.getQueryData(['payment', id]);
      const previousPayments = queryClient.getQueryData(['payments']);
      
      // Optimistically update the single payment
      queryClient.setQueryData(['payment', id], (old: any) => ({
        ...old,
        ...paymentData
      }));
      
      // Optimistically update the payments list
      queryClient.setQueryData(['payments'], (old: any) => {
        if (old) {
          return old.map((payment: Payment) => 
            payment.id === id ? { ...payment, ...paymentData } : payment
          );
        }
        return old;
      });
      
      return { previousPayment, previousPayments };
    },
    onError: (err, variables, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['payment', variables.id], context.previousPayment);
      queryClient.setQueryData(['payments'], context.previousPayments);
    },
    onSettled: (data, error, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['payment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

/**
 * Hook to delete a payment with optimistic updates
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiService.Payments.delete(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['payments'] });
      
      // Snapshot the previous value
      const previousPayments = queryClient.getQueryData(['payments']);
      
      // Optimistically remove the payment
      queryClient.setQueryData(['payments'], (old: any) => {
        if (old) {
          return old.filter((payment: Payment) => payment.id !== id);
        }
        return old;
      });
      
      return { previousPayments };
    },
    onError: (err, id, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['payments'], context.previousPayments);
    },
    onSettled: () => {
      // Invalidate payments list
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}