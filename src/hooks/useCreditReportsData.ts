import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditAnalyticsService } from '@/services/credit-analytics-service';

// Define interfaces for our data structures
interface CreditAnalytics {
  totalCreditLimit: number;
  totalAvailableCredit: number;
  totalCreditUsed: number;
  totalPendingPayments: number;
  creditUtilizationRate: number;
  activeCreditLines: number;
  farmersWithCredit: number;
  averageCreditLimit: number;
  averageCreditUsed: number;
}

interface CreditTrend {
  date: string;
  totalCreditLimit: number;
  totalAvailableCredit: number;
  totalCreditUsed: number;
  newCreditLines: number;
  creditUsed: number;
}

interface FarmerCreditReport {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  pending_payments: number;
  credit_utilization: number;
  credit_status: 'active' | 'inactive' | 'over_limit';
  last_transaction_date: string;
}

interface CreditCategoryReport {
  category: string;
  total_purchases: number;
  total_amount: number;
  credit_purchases: number;
  credit_amount: number;
  utilization_rate: number;
}

interface CreditRiskAssessment {
  highRiskFarmers: number;
  mediumRiskFarmers: number;
  lowRiskFarmers: number;
  overLimitFarmers: number;
  totalFarmers: number;
  riskDistribution: { risk_level: string; count: number }[];
}

// Cache keys for different data types
export const CREDIT_REPORTS_CACHE_KEYS = {
  ANALYTICS: 'credit-analytics',
  TRENDS: 'credit-trends',
  FARMER_REPORTS: 'farmer-credit-reports',
  CATEGORY_REPORTS: 'credit-category-reports',
  RISK_ASSESSMENT: 'credit-risk-assessment'
};

// Main hook for Credit Reports data
export const useCreditReportsData = () => {
  const queryClient = useQueryClient();

  // Get credit analytics data
  const useCreditAnalytics = () => {
    return useQuery<CreditAnalytics>({
      queryKey: [CREDIT_REPORTS_CACHE_KEYS.ANALYTICS],
      queryFn: () => CreditAnalyticsService.getCreditAnalytics(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get credit trends data
  const useCreditTrends = (days: number = 30) => {
    return useQuery<CreditTrend[]>({
      queryKey: [CREDIT_REPORTS_CACHE_KEYS.TRENDS, days],
      queryFn: () => CreditAnalyticsService.getCreditTrends(days),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get farmer credit reports data
  const useFarmerCreditReports = () => {
    return useQuery<FarmerCreditReport[]>({
      queryKey: [CREDIT_REPORTS_CACHE_KEYS.FARMER_REPORTS],
      queryFn: () => CreditAnalyticsService.getFarmerCreditReport(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get credit by category reports data
  const useCreditCategoryReports = () => {
    return useQuery<CreditCategoryReport[]>({
      queryKey: [CREDIT_REPORTS_CACHE_KEYS.CATEGORY_REPORTS],
      queryFn: () => CreditAnalyticsService.getCreditByCategoryReport(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get credit risk assessment data
  const useCreditRiskAssessment = () => {
    return useQuery<CreditRiskAssessment>({
      queryKey: [CREDIT_REPORTS_CACHE_KEYS.RISK_ASSESSMENT],
      queryFn: () => CreditAnalyticsService.getCreditRiskAssessment(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Refresh all credit reports data
  const refreshCreditReportsData = () => {
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.ANALYTICS] });
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.TRENDS] });
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.FARMER_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.CATEGORY_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.RISK_ASSESSMENT] });
  };

  // Mutation to invalidate all credit reports caches
  const invalidateCreditReportsCache = () => {
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.ANALYTICS] });
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.TRENDS] });
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.FARMER_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.CATEGORY_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [CREDIT_REPORTS_CACHE_KEYS.RISK_ASSESSMENT] });
  };

  return {
    useCreditAnalytics,
    useCreditTrends,
    useFarmerCreditReports,
    useCreditCategoryReports,
    useCreditRiskAssessment,
    refreshCreditReportsData,
    invalidateCreditReportsCache
  };
};