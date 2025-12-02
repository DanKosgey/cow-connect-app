import { supabase } from '@/integrations/supabase/client';
import { collectorRateService } from '@/services/collector-rate-service';
import { collectorPenaltyService } from './collector-penalty-service';
import { collectorPenaltyAccountService } from './collector-penalty-account-service';
import { logger } from '@/utils/logger';
import { 
  CollectorEarningsError, 
  DatabaseError, 
  CollectorNotFoundError,
  CalculationError,
  ValidationError
} from '@/errors/CollectorEarningsError';

export interface CollectorEarnings {
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  periodStart: string;
  periodEnd: string;
}

// CollectorPayment interface removed - using collections table directly

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
      // Validate inputs
      if (!collectorId) {
        throw new ValidationError('Collector ID is required');
      }
      
      if (!periodStart || !periodEnd) {
        throw new ValidationError('Period start and end dates are required');
      }
      
      // Validate date format
      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid date format. Expected YYYY-MM-DD');
      }
      
      if (startDate > endDate) {
        throw new ValidationError('Period start date cannot be after end date');
      }

      // Get the current collector rate
      const ratePerLiter = await collectorRateService.getCurrentRate();
      logger.withContext('CollectorEarningsService - calculateEarnings').info(`Current rate per liter: ${ratePerLiter}`);

      // Get total collections and liters for the collector in the period
      // Only count approved collections with pending fees
      const { data, error } = await supabase
        .from('collections')
        .select('id, liters')
        .eq('staff_id', collectorId)
        .gte('collection_date', periodStart)
        .lte('collection_date', periodEnd)
        .eq('status', 'Collected')
        .eq('approved_for_payment', true)
        .eq('collection_fee_status', 'pending'); // Only collections with pending fees

      if (error) {
        logger.errorWithContext('CollectorEarningsService - calculateEarnings fetch collections', error);
        throw new DatabaseError('Failed to fetch collections', 'FETCH_COLLECTIONS', error);
      }

      logger.withContext('CollectorEarningsService - calculateEarnings').info(`Found ${data?.length || 0} collections for collector ${collectorId}`);
      
      const totalCollections = data?.length || 0;
      const totalLiters = data?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
      
      // Validate calculation results
      if (ratePerLiter < 0) {
        throw new CalculationError('Invalid rate per liter');
      }
      
      if (totalLiters < 0) {
        throw new CalculationError('Invalid total liters');
      }
      
      const totalEarnings = totalLiters * ratePerLiter;
      
      logger.withContext('CollectorEarningsService - calculateEarnings').info(`Total collections: ${totalCollections}, Total liters: ${totalLiters}, Total earnings: ${totalEarnings}`);

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
      
      // Re-throw custom errors as-is
      if (error instanceof CollectorEarningsError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new CollectorEarningsError('Failed to calculate earnings', 'CALCULATE_EARNINGS_FAILED', error as Error);
    }
  }

  /**
   * Get earnings summary for a collector
   */
  async getEarningsSummary(collectorId: string): Promise<CollectorEarnings> {
    try {
      // Validate input
      if (!collectorId) {
        throw new ValidationError('Collector ID is required');
      }
      
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
      
      // Re-throw custom errors as-is
      if (error instanceof CollectorEarningsError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new CollectorEarningsError('Failed to get earnings summary', 'GET_EARNINGS_SUMMARY_FAILED', error as Error);
    }
  }

  /**
   * Get all-time earnings for a collector
   * Includes all collections (both pending and paid) that are approved for payment
   */
  async getAllTimeEarnings(collectorId: string): Promise<CollectorEarnings> {
    try {
      // Validate input
      if (!collectorId) {
        throw new ValidationError('Collector ID is required');
      }
      
      // Get all collections for this collector that are approved for payment
      const { data, error } = await supabase
        .from('collections')
        .select('id, liters, collection_date')
        .eq('staff_id', collectorId)
        .eq('status', 'Collected')
        .eq('approved_for_payment', true)
        // Include both pending and paid collections for total earnings calculation
        .order('collection_date', { ascending: true });

      if (error) {
        logger.errorWithContext('CollectorEarningsService - getAllTimeEarnings fetch collections', error);
        throw new DatabaseError('Failed to fetch collections', 'FETCH_ALL_TIME_COLLECTIONS', error);
      }

      logger.withContext('CollectorEarningsService - getAllTimeEarnings').info(`Found ${data?.length || 0} collections for collector ${collectorId}`);
      
      if (!data || data.length === 0) {
        logger.withContext('CollectorEarningsService - getAllTimeEarnings').info(`No collections found for collector ${collectorId}`);
        return {
          totalCollections: 0,
          totalLiters: 0,
          ratePerLiter: 0,
          totalEarnings: 0,
          periodStart: '',
          periodEnd: ''
        };
      }

      // Log individual collection details for debugging
      data.forEach((collection, index) => {
        logger.withContext('CollectorEarningsService - getAllTimeEarnings').info(`Collection ${index + 1}: ${collection.liters} liters`);
      });

      // Get the current collector rate
      const ratePerLiter = await collectorRateService.getCurrentRate();
      logger.withContext('CollectorEarningsService - getAllTimeEarnings').info(`Current rate per liter: ${ratePerLiter}`);

      const totalCollections = data.length;
      const totalLiters = data.reduce((sum, collection) => sum + (collection.liters || 0), 0);
      
      // Validate calculation results
      if (ratePerLiter < 0) {
        throw new CalculationError('Invalid rate per liter');
      }
      
      if (totalLiters < 0) {
        throw new CalculationError('Invalid total liters');
      }
      
      const totalEarnings = totalLiters * ratePerLiter;
      
      logger.withContext('CollectorEarningsService - getAllTimeEarnings').info(`Total collections: ${totalCollections}, Total liters: ${totalLiters}, Total earnings: ${totalEarnings}`);

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
      
      // Re-throw custom errors as-is
      if (error instanceof CollectorEarningsError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new CollectorEarningsError('Failed to get all-time earnings', 'GET_ALL_TIME_EARNINGS_FAILED', error as Error);
    }
  }

  // recordPayment method removed - using collections table directly

  // getPaymentHistory method removed - using collections table directly

  // getPendingPayments method removed - using collections table directly

  /**
   * Mark collections as paid for a collector
   * Updates collection_fee_status from 'pending' to 'paid' directly in collections table
   */
  async markCollectionsAsPaid(collectorId: string, periodStart?: string, periodEnd?: string): Promise<boolean> {
    try {
      // Validate input
      if (!collectorId) {
        throw new ValidationError('Collector ID is required');
      }

      // Build the query to update collections
      let query = supabase
        .from('collections')
        .update({ collection_fee_status: 'paid' })
        .eq('staff_id', collectorId)
        .eq('approved_for_payment', true)
        .eq('collection_fee_status', 'pending'); // Only update collections with pending fees

      // Apply date filters if provided
      if (periodStart) {
        query = query.gte('collection_date', periodStart);
      }
      
      if (periodEnd) {
        query = query.lte('collection_date', periodEnd);
      }

      const { error } = await query;

      if (error) {
        logger.errorWithContext('CollectorEarningsService - markCollectionsAsPaid update collections', error);
        throw new DatabaseError('Failed to mark collections as paid', 'UPDATE_COLLECTIONS_STATUS', error);
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - markCollectionsAsPaid exception', error);
      
      // Re-throw custom errors as-is
      if (error instanceof CollectorEarningsError) {
        throw error;
      }
      
      // Return false for unexpected errors
      return false;
    }
  }

  /**
   * Get all collectors with their earnings information including penalties
   * This method now aligns with how the variance reporting dashboard calculates collector performance
   */
  async getCollectorsWithEarnings(): Promise<any[]> {
    try {
      logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info('Starting to fetch collectors with earnings');
      
      // Get all collectors with role 'collector'
      // First, get user IDs with collector role
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'collector')
        .eq('active', true);
      
      if (userRolesError) {
        logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings fetch user roles', userRolesError);
        throw new DatabaseError('Failed to fetch user roles', 'FETCH_USER_ROLES', userRolesError);
      }

      const collectorUserIds = userRolesData?.map(role => role.user_id) || [];
      logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Found ${collectorUserIds.length} collector user IDs`);
      
      if (collectorUserIds.length === 0) {
        logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info('No collector user IDs found');
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
        throw new DatabaseError('Failed to fetch collectors', 'FETCH_COLLECTORS', collectorsError);
      }
      
      logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Found ${collectors?.length || 0} collector staff records`);

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
        logger.warn('Falling back to manual calculation for collector performance');
      }

      // Get all-time earnings for each collector
      const collectorsWithEarnings = await Promise.all(
        collectors.map(async (collector: any) => {
          logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Processing earnings for collector ${collector.id}`);
          const earnings = await this.getAllTimeEarnings(collector.id);
          
          // Find performance data for this collector or calculate manually
          let collectorPerformance;
          let positiveVariancePenaltiesAmt = 0;
          let negativeVariancePenaltiesAmt = 0;
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
            logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Found performance data for collector ${collector.id}`);
          } else {
            logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`No performance data found for collector ${collector.id}, using fallback calculation`);
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
              } else {
                // Initialize penalty breakdown variables if no data found
                positiveVariancePenaltiesAmt = 0;
                negativeVariancePenaltiesAmt = 0;
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
          
          // Calculate pending and paid amounts directly from collections
          // Get pending collections
          const { data: pendingCollections, error: pendingError } = await supabase
            .from('collections')
            .select('liters')
            .eq('staff_id', collector.id)
            .eq('approved_for_payment', true)
            .eq('collection_fee_status', 'pending');
          
          const pendingLiters = pendingError ? 0 : pendingCollections?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
          const pendingAmount = pendingLiters * earnings.ratePerLiter;
          
          // Get paid collections
          const { data: paidCollections, error: paidError } = await supabase
            .from('collections')
            .select('liters')
            .eq('staff_id', collector.id)
            .eq('approved_for_payment', true)
            .eq('collection_fee_status', 'paid');
          
          const paidLiters = paidError ? 0 : paidCollections?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
          const paidAmount = paidLiters * earnings.ratePerLiter;
          
          // Note: earnings.totalEarnings now includes ALL collections (pending + paid)
          // pendingAmount and paidAmount represent the monetary value of pending and paid collections respectively
          
          // Note: earnings.totalEarnings now includes ALL collections (pending + paid)
          // pendingAmount and paidAmount represent the monetary value of pending and paid collections respectively

          logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Completed processing for collector ${collector.id}: Total liters: ${earnings.totalLiters}, Total earnings: ${earnings.totalEarnings}`);
          
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
            pendingPayments: pendingAmount,
            paidPayments: paidAmount,
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

      logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Completed processing for all collectors`);
      return collectorsWithEarnings;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - getCollectorsWithEarnings exception', error);
      
      // Re-throw custom errors as-is
      if (error instanceof CollectorEarningsError) {
        throw error;
      }
      
      // Return empty array for unexpected errors (maintaining existing behavior)
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
        throw new DatabaseError('Failed to fetch user roles', 'FETCH_USER_ROLES_PENALTIES', userRolesError);
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
        throw new DatabaseError('Failed to fetch collectors', 'FETCH_COLLECTORS_PENALTIES', collectorsError);
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
        logger.warn('Falling back to manual calculation for collector performance');
      }

      // Get all-time earnings for each collector
      const collectorsWithEarnings = await Promise.all(
        collectors.map(async (collector: any) => {
          const earnings = await this.getAllTimeEarnings(collector.id);
          
          // Find performance data for this collector or calculate manually
          let collectorPerformance;
          // Declare penalty variables at the right scope
          let positiveVariancePenaltiesAmt = 0;
          let negativeVariancePenaltiesAmt = 0;
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
              } else {
                // Initialize penalty breakdown variables if no data found
                positiveVariancePenaltiesAmt = 0;
                negativeVariancePenaltiesAmt = 0;
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
          
          // Calculate pending and paid amounts directly from collections
          // Get pending collections
          const { data: pendingCollections, error: pendingError } = await supabase
            .from('collections')
            .select('liters')
            .eq('staff_id', collector.id)
            .eq('approved_for_payment', true)
            .eq('collection_fee_status', 'pending');
          
          const pendingLiters = pendingError ? 0 : pendingCollections?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
          const pendingAmount = pendingLiters * earnings.ratePerLiter;
          
          // Get paid collections
          const { data: paidCollections, error: paidError } = await supabase
            .from('collections')
            .select('liters')
            .eq('staff_id', collector.id)
            .eq('approved_for_payment', true)
            .eq('collection_fee_status', 'paid');
          
          const paidLiters = paidError ? 0 : paidCollections?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
          const paidAmount = paidLiters * earnings.ratePerLiter;
          
          // Note: earnings.totalEarnings now includes ALL collections (pending + paid)
          // pendingAmount and paidAmount represent the monetary value of pending and paid collections respectively

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
            pendingPayments: pendingAmount,
            paidPayments: paidAmount,
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
      
      // Re-throw custom errors as-is
      if (error instanceof CollectorEarningsError) {
        throw error;
      }
      
      // Return empty array for unexpected errors (maintaining existing behavior)
      return [];
    }
  }

  /**
   * Automatically update collection fee statuses for approved collections
   * This function ensures collections that are approved for payment have the correct fee status
   */
  async autoUpdateCollectionFeeStatuses(): Promise<boolean> {
    try {
      // Ensure all approved collections have a collection_fee_status set
      // This is a safeguard to ensure data consistency
      const { error: updateError } = await supabase
        .from('collections')
        .update({ collection_fee_status: 'pending' })
        .eq('approved_for_payment', true)
        .is('collection_fee_status', null);
      
      if (updateError) {
        logger.warn('Failed to update collection fee statuses:', updateError);
        return false;
      }
      
      logger.info('Successfully updated collection fee statuses for approved collections');
      return true;
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - autoUpdateCollectionFeeStatuses exception', error);
      return false;
    }
  }

  // fallbackManualPaymentGeneration method removed - using collections table directly

  // triggerAutoPaymentGeneration method removed - using collections table directly
}

// Export singleton instance
export const collectorEarningsService = CollectorEarningsService.getInstance();
