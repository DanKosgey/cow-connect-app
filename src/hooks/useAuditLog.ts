import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ComprehensiveCreditAnalyticsService } from '@/services/comprehensive-credit-analytics-service';

// Cache keys for audit log data
export const AUDIT_CACHE_KEYS = {
  TRANSACTION_AUDIT: 'transaction-audit',
  CREDIT_AUDIT: 'credit-audit',
  PAYMENT_AUDIT: 'payment-audit'
};

// Main hook for Audit Log data
export const useAuditLog = () => {
  const queryClient = useQueryClient();

  // Get transaction audit records with caching
  const useTransactionAudit = (limit: number = 200) => {
    return useQuery({
      queryKey: [AUDIT_CACHE_KEYS.TRANSACTION_AUDIT, limit],
      queryFn: () => ComprehensiveCreditAnalyticsService.getTransactionAuditReport(limit),
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Get credit audit records with caching
  const useCreditAudit = (limit: number = 200) => {
    return useQuery({
      queryKey: [AUDIT_CACHE_KEYS.CREDIT_AUDIT, limit],
      queryFn: async () => {
        // This would typically fetch credit audit records
        // For now, we'll return an empty array as a placeholder
        return [];
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Get payment audit records with caching
  const usePaymentAudit = (limit: number = 200) => {
    return useQuery({
      queryKey: [AUDIT_CACHE_KEYS.PAYMENT_AUDIT, limit],
      queryFn: async () => {
        // This would typically fetch payment audit records
        // For now, we'll return an empty array as a placeholder
        return [];
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Mutation to invalidate audit log cache
  const invalidateAuditCache = () => {
    queryClient.invalidateQueries({ queryKey: [AUDIT_CACHE_KEYS.TRANSACTION_AUDIT] });
    queryClient.invalidateQueries({ queryKey: [AUDIT_CACHE_KEYS.CREDIT_AUDIT] });
    queryClient.invalidateQueries({ queryKey: [AUDIT_CACHE_KEYS.PAYMENT_AUDIT] });
  };

  // Mutation to refresh transaction audit
  const refreshTransactionAudit = () => {
    return queryClient.refetchQueries({ queryKey: [AUDIT_CACHE_KEYS.TRANSACTION_AUDIT] });
  };

  // Mutation to refresh credit audit
  const refreshCreditAudit = () => {
    return queryClient.refetchQueries({ queryKey: [AUDIT_CACHE_KEYS.CREDIT_AUDIT] });
  };

  // Mutation to refresh payment audit
  const refreshPaymentAudit = () => {
    return queryClient.refetchQueries({ queryKey: [AUDIT_CACHE_KEYS.PAYMENT_AUDIT] });
  };

  return {
    useTransactionAudit,
    useCreditAudit,
    usePaymentAudit,
    invalidateAuditCache,
    refreshTransactionAudit,
    refreshCreditAudit,
    refreshPaymentAudit
  };
};