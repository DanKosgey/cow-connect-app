import { supabase } from '@/integrations/supabase/client';
import { collectorRateService } from '@/services/collector-rate-service';
import { collectorPenaltyService } from './collector-penalty-service';
import { logger } from '@/utils/logger';

export interface CollectorEarnings {
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  periodStart: string;
  periodEnd: string;
}

export interface CollectorPayment {
  id?: string;
  collector_id: string;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_liters: number;
  rate_per_liter: number;
  total_earnings: number;
  status: 'pending' | 'paid';
  payment_date?: string;
  created_at?: string;
  updated_at?: string;
}

// Add new interface for detailed collector performance with penalties
export interface CollectorPerformanceWithPenalties {
  id: string;
  name: string;
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  totalPenalties: number;
  pendingPayments: number;
  paidPayments: number;
  performanceScore: number;
  lastCollectionDate?: string;
  totalVariance?: number;
  positiveVariances?: number;
  negativeVariances?: number;
  avgVariancePercentage?: number;
  penaltyDetails?: {
    positiveVariancePenalties: number;
    negativeVariancePenalties: number;
    totalPositiveVariances: number;
    totalNegativeVariances: number;
  };
}

class CollectorEarningsService {
  private static instance: CollectorEarningsService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): CollectorEarningsService {
    if (!CollectorEarningsService.instance) {
      CollectorEarningsService.instance = new CollectorEarningsService();
    }
    return CollectorEarningsService.instance;
  }

  /**
   * Calculate earnings for a collector within a specific period
   */
  async calculateEarnings(
    collectorId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<CollectorEarnings> {
    try {
      // Get the current collector rate
      const ratePerLiter = await collectorRateService.getCurrentRate();

      // Get total collections and liters for the collector in the period
      // Only count approved collections for payment
      const { data, error } = await supabase
        .from('collections')
        .select('id, liters')
        .eq('staff_id', collectorId)
        .gte('collection_date', periodStart)
        .lte('collection_date', periodEnd)
        .eq('status', 'Collected')
        .eq('approved_for_payment', true); // Only collections approved for payment

      if (error) {
        logger.errorWithContext('CollectorEarningsService - calculateEarnings fetch collections', error);
        throw error;
      }

      const totalCollections = data?.length || 0;
      const totalLiters = data?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
      const totalEarnings = totalLiters * ratePerLiter;

      return {
        totalCollections,
        totalLiters,
        ratePerLiter,
        totalEarnings,
        periodStart,
        periodEnd
      };
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - calculateEarnings exception', error);
      throw error;
    }
  }

  /**
   * Get earnings summary for a collector
   */
  async getEarningsSummary(collectorId: string): Promise<CollectorEarnings> {
    try {
      // Get current date and first day of month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return await this.calculateEarnings(
        collectorId,
        firstDayOfMonth.toISOString().split('T')[0],
        lastDayOfMonth.toISOString().split('T')[0]
      );
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getEarningsSummary exception', error);
      throw error;
    }
  }

  /**
   * Get all-time earnings for a collector
   */
  async getAllTimeEarnings(collectorId: string): Promise<CollectorEarnings> {
    try {
      // Get all collections for this collector that are approved for payment
      const { data, error } = await supabase
        .from('collections')
        .select('id, liters, collection_date')
        .eq('staff_id', collectorId)
        .eq('status', 'Collected')
        .eq('approved_for_payment', true) // Only count collections that are approved for payment
        .order('collection_date', { ascending: true });

      if (error) {
        logger.errorWithContext('CollectorEarningsService - getAllTimeEarnings fetch collections', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          totalCollections: 0,
          totalLiters: 0,
          ratePerLiter: 0,
          totalEarnings: 0,
          periodStart: '',
          periodEnd: ''
        };
      }

      // Get the current collector rate
      const ratePerLiter = await collectorRateService.getCurrentRate();

      const totalCollections = data.length;
      const totalLiters = data.reduce((sum, collection) => sum + (collection.liters || 0), 0);
      const totalEarnings = totalLiters * ratePerLiter;

      // Get date range
      const firstCollectionDate = data[0].collection_date;
      const lastCollectionDate = data[data.length - 1].collection_date;

      return {
        totalCollections,
        totalLiters,
        ratePerLiter,
        totalEarnings,
        periodStart: firstCollectionDate ? firstCollectionDate.split('T')[0] : '',
        periodEnd: lastCollectionDate ? lastCollectionDate.split('T')[0] : ''
      };
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getAllTimeEarnings exception', error);
      throw error;
    }
  }

  /**
   * Record a payment for a collector
   */
  async recordPayment(payment: Omit<CollectorPayment, 'id' | 'created_at' | 'updated_at'>): Promise<CollectorPayment | null> {
    try {
      const { data, error } = await supabase
        .from('collector_payments')
        .insert([payment])
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CollectorEarningsService - recordPayment', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - recordPayment exception', error);
      return null;
    }
  }

  /**
   * Get payment history for a collector
   */
  async getPaymentHistory(collectorId: string): Promise<CollectorPayment[]> {
    try {
      const { data, error } = await supabase
        .from('collector_payments')
        .select('*')
        .eq('collector_id', collectorId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CollectorEarningsService - getPaymentHistory', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getPaymentHistory exception', error);
      return [];
    }
  }

  /**
   * Get pending payments for all collectors
   */
  async getPendingPayments(): Promise<CollectorPayment[]> {
    try {
      const { data, error } = await supabase
        .from('collector_payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CollectorEarningsService - getPendingPayments', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getPendingPayments exception', error);
      return [];
    }
  }

  /**
   * Mark a payment as paid
   */
  async markPaymentAsPaid(paymentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collector_payments')
        .update({ 
          status: 'paid',
          payment_date: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) {
        logger.errorWithContext('CollectorEarningsService - markPaymentAsPaid', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - markPaymentAsPaid exception', error);
      return false;
    }
  }

  /**
   * Get all collectors with their earnings information including penalties
   * This method now aligns with how the variance reporting dashboard calculates collector performance
   */
  async getCollectorsWithEarnings(): Promise<any[]> {
    try {
      // Get all collectors with role 'collector'
      // First, get user IDs with collector role
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'collector')
        .eq('active', true);
      
      if (userRolesError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings fetch user roles', userRolesError);
        throw userRolesError;
      }

      const collectorUserIds = userRolesData?.map(role => role.user_id) || [];
      
      if (collectorUserIds.length === 0) {
        return [];
      }
      
      // Then fetch staff records for those users
      const { data: collectors, error: collectorsError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          profiles (
            full_name
          )
        `)
        .in('user_id', collectorUserIds);
      
      if (collectorsError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings fetch collectors', collectorsError);
        throw collectorsError;
      }

      // Get earnings data for each collector using the same approach as variance reporting
      // Use a date range that covers all collections (last 10 years to future)
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 10);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      // Use the RPC function to calculate collector performance like variance reporting does
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('calculate_collector_performance', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });

      if (performanceError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings fetch performance', performanceError);
        // If RPC fails, fall back to manual calculation
        console.warn('Falling back to manual calculation for collector performance');
      }

      // Get all-time earnings for each collector
      const collectorsWithEarnings = await Promise.all(
        collectors.map(async (collector: any) => {
          const earnings = await this.getAllTimeEarnings(collector.id);
          
          // Find performance data for this collector or calculate manually
          let collectorPerformance;
          if (performanceData) {
            collectorPerformance = performanceData?.find((p: any) => p.collector_id === collector.id) || {
              total_collections: 0,
              total_liters_collected: 0,
              total_variance: 0,
              total_penalty_amount: 0,
              positive_variances: 0,
              negative_variances: 0,
              average_variance_percentage: 0,
              performance_score: 0,
              last_collection_date: null
            };
          } else {
            // Manual calculation fallback
            // Try to get penalties from both tables
            let totalPenaltyAmount = 0;
            let positiveVariances = 0;
            let negativeVariances = 0;
            let avgVariancePercentage = 0;
            let varianceLitersSum = 0;
            
            // Try milk_approvals table
            const { data: milkApprovals, error: approvalsError } = await supabase
              .from('milk_approvals')
              .select('penalty_amount, variance_type, variance_percentage, variance_liters')
              .eq('staff_id', collector.id)
              .neq('penalty_amount', 0);
              
            if (!approvalsError && milkApprovals && milkApprovals.length > 0) {
              totalPenaltyAmount = milkApprovals.reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
              positiveVariances = milkApprovals.filter(a => a.variance_type === 'positive').length;
              negativeVariances = milkApprovals.filter(a => a.variance_type === 'negative').length;
              avgVariancePercentage = milkApprovals.length > 0 
                ? milkApprovals.reduce((sum, approval) => sum + (approval.variance_percentage || 0), 0) / milkApprovals.length 
                : 0;
              varianceLitersSum = milkApprovals.reduce((sum, approval) => sum + (approval.variance_liters || 0), 0);
            } else {
              // Try collector_daily_summaries table
              const { data: dailySummaries, error: summariesError } = await supabase
                .from('collector_daily_summaries')
                .select('total_penalty_amount, variance_type, variance_percentage, variance_liters')
                .eq('collector_id', collector.id)
                .neq('total_penalty_amount', 0);
                
              if (!summariesError && dailySummaries && dailySummaries.length > 0) {
                totalPenaltyAmount = dailySummaries.reduce((sum, summary) => sum + (summary.total_penalty_amount || 0), 0);
                positiveVariances = dailySummaries.filter(s => s.variance_type === 'positive').length;
                negativeVariances = dailySummaries.filter(s => s.variance_type === 'negative').length;
                avgVariancePercentage = dailySummaries.length > 0 
                  ? dailySummaries.reduce((sum, summary) => sum + (summary.variance_percentage || 0), 0) / dailySummaries.length 
                  : 0;
                varianceLitersSum = dailySummaries.reduce((sum, summary) => sum + (summary.variance_liters || 0), 0);
              }
            }
                
            collectorPerformance = {
              total_collections: earnings.totalCollections || 0,
              total_liters_collected: earnings.totalLiters || 0,
              total_variance: varianceLitersSum,
              total_penalty_amount: totalPenaltyAmount,
              positive_variances: positiveVariances,
              negative_variances: negativeVariances,
              average_variance_percentage: avgVariancePercentage,
              performance_score: 100 - (totalPenaltyAmount / 100) - ((positiveVariances + negativeVariances) / Math.max(earnings.totalCollections || 1, 1)) * 10,
              last_collection_date: null
            };
          }
          
          // Get penalty information using the existing penalty service
          const paymentsWithPenalties = await collectorPenaltyService.getCollectorPaymentsWithPenalties();
          const collectorPayments = paymentsWithPenalties.filter(p => p.collector_id === collector.id);
          
          // Calculate pending payments (earnings minus penalties)
          const pendingPayments = collectorPayments
            .filter(p => p.status === 'pending')
            .reduce((sum, payment) => sum + (payment.adjusted_earnings || 0), 0);
            
          // Calculate paid payments
          const paidPayments = collectorPayments
            .filter(p => p.status === 'paid')
            .reduce((sum, payment) => sum + (payment.adjusted_earnings || 0), 0);

          return {
            id: collector.id,
            name: collector.profiles?.full_name || 'Unknown Collector',
            ...earnings,
            totalCollections: collectorPerformance.total_collections || 0,
            totalLiters: collectorPerformance.total_liters_collected || 0,
            totalVariance: collectorPerformance.total_variance || 0,
            totalPenalties: collectorPerformance.total_penalty_amount || 0,
            positiveVariances: collectorPerformance.positive_variances || 0,
            negativeVariances: collectorPerformance.negative_variances || 0,
            avgVariancePercentage: collectorPerformance.average_variance_percentage || 0,
            pendingPayments: pendingPayments,
            paidPayments: paidPayments,
            performanceScore: collectorPerformance.performance_score || 0,
            lastCollectionDate: collectorPerformance.last_collection_date || null
          };
        })
      );

      return collectorsWithEarnings;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings exception', error);
      return [];
    }
  }

  /**
   * Get all collectors with their earnings information including detailed penalties
   * This method now includes more comprehensive penalty analytics
   */
  async getCollectorsWithEarningsAndPenalties(): Promise<CollectorPerformanceWithPenalties[]> {
    try {
      // Get all collectors with role 'collector'
      // First, get user IDs with collector role
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'collector')
        .eq('active', true);
      
      if (userRolesError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarningsAndPenalties fetch user roles', userRolesError);
        throw userRolesError;
      }

      const collectorUserIds = userRolesData?.map(role => role.user_id) || [];
      
      if (collectorUserIds.length === 0) {
        return [];
      }
      
      // Then fetch staff records for those users
      const { data: collectors, error: collectorsError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          profiles (
            full_name
          )
        `)
        .in('user_id', collectorUserIds);
      
      if (collectorsError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarningsAndPenalties fetch collectors', collectorsError);
        throw collectorsError;
      }

      // Get earnings data for each collector using the same approach as variance reporting
      // Use a date range that covers all collections (last 10 years to future)
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 10);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      // Use the RPC function to calculate collector performance like variance reporting does
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('calculate_collector_performance', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });

      if (performanceError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarningsAndPenalties fetch performance', performanceError);
        // If RPC fails, fall back to manual calculation
        console.warn('Falling back to manual calculation for collector performance');
      }

      // Get all-time earnings for each collector
      const collectorsWithEarnings = await Promise.all(
        collectors.map(async (collector: any) => {
          const earnings = await this.getAllTimeEarnings(collector.id);
          
          // Find performance data for this collector or calculate manually
          let collectorPerformance;
          if (performanceData) {
            collectorPerformance = performanceData?.find((p: any) => p.collector_id === collector.id) || {
              total_collections: 0,
              total_liters_collected: 0,
              total_variance: 0,
              total_penalty_amount: 0,
              positive_variances: 0,
              negative_variances: 0,
              average_variance_percentage: 0,
              performance_score: 0,
              last_collection_date: null
            };
          } else {
            // Manual calculation fallback
            // Try to get penalties from both tables
            let totalPenaltyAmount = 0;
            let positiveVariances = 0;
            let negativeVariances = 0;
            let avgVariancePercentage = 0;
            let varianceLitersSum = 0;
            let positiveVariancePenaltiesAmt = 0;
            let negativeVariancePenaltiesAmt = 0;
            
            // Try milk_approvals table
            const { data: milkApprovals, error: approvalsError } = await supabase
              .from('milk_approvals')
              .select('penalty_amount, variance_type, variance_percentage, variance_liters')
              .eq('staff_id', collector.id)
              .neq('penalty_amount', 0);
              
            if (!approvalsError && milkApprovals && milkApprovals.length > 0) {
              totalPenaltyAmount = milkApprovals.reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
              positiveVariances = milkApprovals.filter(a => a.variance_type === 'positive').length;
              negativeVariances = milkApprovals.filter(a => a.variance_type === 'negative').length;
              avgVariancePercentage = milkApprovals.length > 0 
                ? milkApprovals.reduce((sum, approval) => sum + (approval.variance_percentage || 0), 0) / milkApprovals.length 
                : 0;
              varianceLitersSum = milkApprovals.reduce((sum, approval) => sum + (approval.variance_liters || 0), 0);
              
              // Calculate penalty breakdown
              positiveVariancePenaltiesAmt = milkApprovals
                .filter(a => a.variance_type === 'positive')
                .reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
              negativeVariancePenaltiesAmt = milkApprovals
                .filter(a => a.variance_type === 'negative')
                .reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
            } else {
              // Try collector_daily_summaries table
              const { data: dailySummaries, error: summariesError } = await supabase
                .from('collector_daily_summaries')
                .select('total_penalty_amount, variance_type, variance_percentage, variance_liters')
                .eq('collector_id', collector.id)
                .neq('total_penalty_amount', 0);
                
              if (!summariesError && dailySummaries && dailySummaries.length > 0) {
                totalPenaltyAmount = dailySummaries.reduce((sum, summary) => sum + (summary.total_penalty_amount || 0), 0);
                positiveVariances = dailySummaries.filter(s => s.variance_type === 'positive').length;
                negativeVariances = dailySummaries.filter(s => s.variance_type === 'negative').length;
                avgVariancePercentage = dailySummaries.length > 0 
                  ? dailySummaries.reduce((sum, summary) => sum + (summary.variance_percentage || 0), 0) / dailySummaries.length 
                  : 0;
                varianceLitersSum = dailySummaries.reduce((sum, summary) => sum + (summary.variance_liters || 0), 0);
                
                // Calculate penalty breakdown
                positiveVariancePenaltiesAmt = dailySummaries
                  .filter(s => s.variance_type === 'positive')
                  .reduce((sum, summary) => sum + (summary.total_penalty_amount || 0), 0);
                negativeVariancePenaltiesAmt = dailySummaries
                  .filter(s => s.variance_type === 'negative')
                  .reduce((sum, summary) => sum + (summary.total_penalty_amount || 0), 0);
              }
            }
                
            collectorPerformance = {
              total_collections: earnings.totalCollections || 0,
              total_liters_collected: earnings.totalLiters || 0,
              total_variance: varianceLitersSum,
              total_penalty_amount: totalPenaltyAmount,
              positive_variances: positiveVariances,
              negative_variances: negativeVariances,
              average_variance_percentage: avgVariancePercentage,
              performance_score: 100 - (totalPenaltyAmount / 100) - ((positiveVariances + negativeVariances) / Math.max(earnings.totalCollections || 1, 1)) * 10,
              last_collection_date: null
            };
          }
          
          // Get penalty information using the existing penalty service
          const paymentsWithPenalties = await collectorPenaltyService.getCollectorPaymentsWithPenalties();
          const collectorPayments = paymentsWithPenalties.filter(p => p.collector_id === collector.id);
          
          // Calculate pending payments (earnings minus penalties)
          const pendingPayments = collectorPayments
            .filter(p => p.status === 'pending')
            .reduce((sum, payment) => sum + (payment.adjusted_earnings || 0), 0);
            
          // Calculate paid payments
          const paidPayments = collectorPayments
            .filter(p => p.status === 'paid')
            .reduce((sum, payment) => sum + (payment.adjusted_earnings || 0), 0);

          return {
            id: collector.id,
            name: collector.profiles?.full_name || 'Unknown Collector',
            ...earnings,
            totalCollections: collectorPerformance.total_collections || 0,
            totalLiters: collectorPerformance.total_liters_collected || 0,
            totalVariance: collectorPerformance.total_variance || 0,
            totalPenalties: collectorPerformance.total_penalty_amount || 0,
            positiveVariances: collectorPerformance.positive_variances || 0,
            negativeVariances: collectorPerformance.negative_variances || 0,
            avgVariancePercentage: collectorPerformance.average_variance_percentage || 0,
            pendingPayments: pendingPayments,
            paidPayments: paidPayments,
            performanceScore: collectorPerformance.performance_score || 0,
            lastCollectionDate: collectorPerformance.last_collection_date || null,
            penaltyDetails: {
              positiveVariancePenalties: positiveVariancePenaltiesAmt,
              negativeVariancePenalties: negativeVariancePenaltiesAmt,
              totalPositiveVariances: collectorPerformance.positive_variances || 0,
              totalNegativeVariances: collectorPerformance.negative_variances || 0
            }
          };
        })
      );

      return collectorsWithEarnings;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarningsAndPenalties exception', error);
      return [];
    }
  }

  /**
   * Automatically generate payment records for approved collections
   * This function will be called when collections are approved for payment
   */
  async autoGeneratePaymentRecords(): Promise<boolean> {
    try {
      // First try calling the manual_generate_collector_payments function (simpler signature)
      console.log('Attempting to call manual_generate_collector_payments RPC function');
      const { data: manualData, error: manualError } = await supabase.rpc('manual_generate_collector_payments');
      
      if (!manualError) {
        console.log('manual_generate_collector_payments RPC call successful:', manualData);
        return manualData === true;
      }
      
      console.warn('manual_generate_collector_payments RPC failed:', manualError);
      
      // If manual function fails, try the generate_collector_payments function
      console.log('Attempting to call generate_collector_payments RPC function');
      const { data: rpcData, error: rpcError } = await supabase.rpc('generate_collector_payments');
      
      if (!rpcError && rpcData) {
        console.log('generate_collector_payments RPC call successful, inserting records');
        // Insert the generated records into the collector_payments table
        if (rpcData && rpcData.length > 0) {
          const paymentRecords = rpcData.map((record: any) => ({
            collector_id: record.collector_id,
            period_start: record.period_start,
            period_end: record.period_end,
            total_collections: record.total_collections,
            total_liters: record.total_liters,
            rate_per_liter: record.rate_per_liter,
            total_earnings: record.total_earnings,
            status: 'pending'
          }));
          
          const { error: insertError } = await supabase
            .from('collector_payments')
            .insert(paymentRecords);
            
          if (insertError) {
            logger.errorWithContext('CollectorEarningsService - autoGeneratePaymentRecords insert', insertError);
            // Fall back to manual generation
            return await this.fallbackManualPaymentGeneration();
          }
        }
        return true;
      }
      
      console.warn('generate_collector_payments RPC failed:', rpcError);
      
      // If both functions fail, fall back to manual generation
      console.warn('Both RPC functions failed, falling back to manual payment record generation');
      return await this.fallbackManualPaymentGeneration();
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - autoGeneratePaymentRecords exception', error);
      // Fallback to manual generation
      return await this.fallbackManualPaymentGeneration();
    }
  }

  /**
   * Fallback method to manually generate payment records when RPC function fails
   */
  private async fallbackManualPaymentGeneration(): Promise<boolean> {
    try {
      // Get all collectors with approved collections
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('staff_id')
        .eq('approved_for_payment', true)
        .eq('status', 'Collected');
      
      if (collectionsError) {
        logger.errorWithContext('CollectorEarningsService - fallbackManualPaymentGeneration fetch collections', collectionsError);
        return false;
      }
      
      // Get unique collector IDs
      const collectorIds = [...new Set(collections.map(c => c.staff_id))];
      
      if (collectorIds.length === 0) {
        return true; // No collectors with approved collections
      }
      
      // Get current collector rate
      const currentRate = await collectorRateService.getCurrentRate();
      
      // For each collector, generate payment records
      for (const collectorId of collectorIds) {
        // Get approved collections for this collector
        const { data: collectorCollections, error: collectionsError } = await supabase
          .from('collections')
          .select('id, collection_date, liters')
          .eq('staff_id', collectorId)
          .eq('approved_for_payment', true)
          .eq('status', 'Collected');
          
        if (collectionsError) {
          logger.errorWithContext(`CollectorEarningsService - fallbackManualPaymentGeneration fetch collections for collector ${collectorId}`, collectionsError);
          continue;
        }
        
        if (collectorCollections && collectorCollections.length > 0) {
          // Calculate payment data
          const periodStart = collectorCollections
            .map(c => new Date(c.collection_date))
            .reduce((earliest, current) => current < earliest ? current : earliest, new Date());
            
          const periodEnd = collectorCollections
            .map(c => new Date(c.collection_date))
            .reduce((latest, current) => current > latest ? current : latest, new Date());
          
          const totalCollections = collectorCollections.length;
          const totalLiters = collectorCollections.reduce((sum, collection) => sum + (collection.liters || 0), 0);
          const totalEarnings = totalLiters * currentRate;
          
          // Check if payment record already exists
          const { data: existingPayments, error: existingError } = await supabase
            .from('collector_payments')
            .select('id')
            .eq('collector_id', collectorId)
            .gte('period_start', periodStart.toISOString().split('T')[0])
            .lte('period_end', periodEnd.toISOString().split('T')[0]);
            
          if (existingError) {
            logger.errorWithContext(`CollectorEarningsService - fallbackManualPaymentGeneration check existing for collector ${collectorId}`, existingError);
            continue;
          }
          
          // Only create if no existing record
          if (!existingPayments || existingPayments.length === 0) {
            const { error: insertError } = await supabase
              .from('collector_payments')
              .insert([{
                collector_id: collectorId,
                period_start: periodStart.toISOString().split('T')[0],
                period_end: periodEnd.toISOString().split('T')[0],
                total_collections: totalCollections,
                total_liters: totalLiters,
                rate_per_liter: currentRate,
                total_earnings: totalEarnings,
                status: 'pending'
              }]);
              
            if (insertError) {
              logger.errorWithContext(`CollectorEarningsService - fallbackManualPaymentGeneration insert for collector ${collectorId}`, insertError);
              continue;
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - fallbackManualPaymentGeneration exception', error);
      return false;
    }
  }

  /**
   * Trigger automatic payment record generation for a specific collector
   * This can be called when a new collection is approved for a collector
   */
  async triggerAutoPaymentGeneration(collectorId: string): Promise<boolean> {
    try {
      // Check if there are approved collections for this collector that don't have payment records
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('id, collection_date, liters, staff_id')
        .eq('staff_id', collectorId)
        .eq('approved_for_payment', true)
        .eq('status', 'Collected');
        
      if (collectionsError) {
        logger.errorWithContext('CollectorEarningsService - triggerAutoPaymentGeneration fetch collections', collectionsError);
        return false;
      }
      
      if (!collections || collections.length === 0) {
        return true; // No collections to process
      }
      
      // Get the current collector rate
      const ratePerLiter = await collectorRateService.getCurrentRate();
      
      // Aggregate collections by date range (group all collections for the collector)
      const periodStart = collections
        .map(c => new Date(c.collection_date))
        .reduce((earliest, current) => current < earliest ? current : earliest, new Date());
        
      const periodEnd = collections
        .map(c => new Date(c.collection_date))
        .reduce((latest, current) => current > latest ? current : latest, new Date());
      
      const totalCollections = collections.length;
      const totalLiters = collections.reduce((sum, collection) => sum + (collection.liters || 0), 0);
      const totalEarnings = totalLiters * ratePerLiter;
      
      // Check if a payment record already exists for this collector and period
      const { data: existingPayments, error: paymentsError } = await supabase
        .from('collector_payments')
        .select('id')
        .eq('collector_id', collectorId)
        .gte('period_start', periodStart.toISOString().split('T')[0])
        .lte('period_end', periodEnd.toISOString().split('T')[0]);
        
      if (paymentsError) {
        logger.errorWithContext('CollectorEarningsService - triggerAutoPaymentGeneration check existing', paymentsError);
        return false;
      }
      
      // If no existing payment record, create one
      if (!existingPayments || existingPayments.length === 0) {
        const { error: insertError } = await supabase
          .from('collector_payments')
          .insert([{
            collector_id: collectorId,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            total_collections: totalCollections,
            total_liters: totalLiters,
            rate_per_liter: ratePerLiter,
            total_earnings: totalEarnings,
            status: 'pending'
          }]);
          
        if (insertError) {
          logger.errorWithContext('CollectorEarningsService - triggerAutoPaymentGeneration insert', insertError);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - triggerAutoPaymentGeneration exception', error);
      return false;
    }
  }
}

// Export singleton instance
export const collectorEarningsService = CollectorEarningsService.getInstance();