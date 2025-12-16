import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { VarianceCalculationService } from '@/services/variance-calculation-service';
import { collectorPenaltyAccountService } from './collector-penalty-account-service';

export interface PenaltyConfig {
  id: string;
  variance_type: 'positive' | 'negative' | 'none';
  min_variance_percentage: number;
  max_variance_percentage: number;
  penalty_rate_per_liter: number;
  is_active: boolean;
}

export interface CollectorDailySummary {
  id: string;
  collector_id: string;
  collection_date: string;
  total_collections: number;
  total_liters_collected: number;
  total_liters_received: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: 'positive' | 'negative' | 'none';
  total_penalty_amount: number;
  approved_by: string;
  approved_at: string;
  notes: string;
}

export interface CollectorPaymentWithPenalties {
  id: string;
  collector_id: string;
  collector_name?: string;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_liters: number;
  rate_per_liter: number;
  total_earnings: number;
  total_penalties: number;
  adjusted_earnings: number;
  status: 'pending' | 'paid';
  payment_date?: string;
  notes?: string;
}

export interface CollectorPenaltyAnalytics {
  collectorId: string;
  collectorName: string;
  totalPenalties: number;
  pendingPenalties: number;
  paidPenalties: number;
  penaltyBreakdown: {
    positiveVariancePenalties: number;
    negativeVariancePenalties: number;
    totalPositiveVariances: number;
    totalNegativeVariances: number;
  };
  recentPenalties: CollectorDailySummary[];
  penaltyTrend: {
    date: string;
    penalties: number;
  }[];
}

export interface PenaltyAnalyticsData {
  overallPenaltyStats: {
    totalPenalties: number;
    avgPenaltyPerCollector: number;
    highestPenaltyCollector: string;
    highestPenaltyAmount: number;
  };
  collectorPenaltyData: CollectorPenaltyAnalytics[];
}

class CollectorPenaltyService {
  private static instance: CollectorPenaltyService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): CollectorPenaltyService {
    if (!CollectorPenaltyService.instance) {
      CollectorPenaltyService.instance = new CollectorPenaltyService();
    }
    return CollectorPenaltyService.instance;
  }

  /**
   * Get active penalty configuration
   */
  async getActivePenaltyConfigs(): Promise<PenaltyConfig[]> {
    try {
      const { data, error } = await supabase
        .from('variance_penalty_config')
        .select('*')
        .eq('is_active', true)
        .order('min_variance_percentage', { ascending: true });

      if (error) {
        logger.errorWithContext('CollectorPenaltyService - getActivePenaltyConfigs', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - getActivePenaltyConfigs exception', error);
      return [];
    }
  }

  /**
   * Calculate penalty for a specific variance using the existing variance calculation service
   */
  async calculatePenalty(varianceLiters: number, variancePercentage: number, varianceType: 'positive' | 'negative' | 'none'): Promise<number> {
    try {
      // Use the existing variance calculation service
      const varianceData = {
        collectedLiters: 0, // We don't need actual values for penalty calculation
        receivedLiters: 0,  // We just need the variance data
        varianceLiters,
        variancePercentage,
        varianceType
      };
      
      return await VarianceCalculationService.calculatePenalty(varianceData);
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - calculatePenalty exception', error);
      return 0;
    }
  }

  /**
   * Incur a penalty for a collector and record it in their penalty account
   */
  async incurPenaltyForCollector(
    collectorId: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    description?: string,
    createdBy?: string
  ): Promise<boolean> {
    try {
      // Add penalty to collector's account
      const result = await collectorPenaltyAccountService.incurPenalty(
        collectorId,
        amount,
        referenceType,
        referenceId,
        description,
        createdBy
      );

      return result;
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - incurPenaltyForCollector exception', error);
      return false;
    }
  }

  /**
   * Get collector daily summaries with penalties for a specific period
   */
  async getCollectorDailySummariesWithPenalties(
    collectorId: string,
    startDate: string,
    endDate: string
  ): Promise<CollectorDailySummary[]> {
    try {
      const { data, error } = await supabase
        .from('collector_daily_summaries')
        .select('*')
        .eq('collector_id', collectorId)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .not('approved_at', 'is', null)
        .order('collection_date', { ascending: true });

      if (error) {
        logger.errorWithContext('CollectorPenaltyService - getCollectorDailySummariesWithPenalties', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - getCollectorDailySummariesWithPenalties exception', error);
      return [];
    }
  }

  /**
   * Calculate total penalties for a collector in a specific period
   * This method now checks both milk_approvals and collector_daily_summaries tables
   */
  async calculateTotalPenaltiesForPeriod(
    collectorId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    try {
      console.log(`Calculating total penalties for collector ${collectorId} from ${startDate} to ${endDate}`);
      
      let totalPenalties = 0;
      
      // Get all milk approvals and collections for this calculation
      // Only include penalties with penalty_status = 'pending'
      console.log('Fetching all penalty data for collector...');
      const milkApprovalsResponse = await supabase
        .from('milk_approvals')
        .select('id, collection_id, penalty_amount, approved_at, penalty_status')
        .neq('penalty_amount', 0)
        .eq('penalty_status', 'pending'); // Changed from neq to eq for consistency
      
      const collectionsResponse = await supabase
        .from('collections')
        .select('id, staff_id')
        .eq('approved_for_payment', true);
      
      const milkApprovals = !milkApprovalsResponse.error ? milkApprovalsResponse.data : [];
      const collections = !collectionsResponse.error ? collectionsResponse.data : [];
      
      if (milkApprovalsResponse.error) {
        console.log('Error fetching milk approvals:', milkApprovalsResponse.error);
      }
      
      if (collectionsResponse.error) {
        console.log('Error fetching collections:', collectionsResponse.error);
      }

      // Create a map of collection_id to collector_staff_id for quick lookup
      const collectionToCollectorMap = new Map<string, string>();
      collections.forEach(collection => {
        collectionToCollectorMap.set(collection.id, collection.staff_id);
      });
      
      // Filter by date range for milk approvals that belong to this collector
      console.log('Checking milk_approvals table for penalties...');
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      // Set periodEnd to end of day for proper date comparison
      periodEnd.setHours(23, 59, 59, 999);
      
      const filteredApprovals = milkApprovals.filter(approval => {
        // First check if the approval is within the date range
        if (!approval.approved_at) return false;
        const approvalDate = new Date(approval.approved_at);
        
        // Normalize dates for comparison (compare only date parts, not time)
        const approvalDateNormalized = new Date(approvalDate.getFullYear(), approvalDate.getMonth(), approvalDate.getDate());
        const periodStartNormalized = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
        const periodEndNormalized = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
        
        // Check if approval date is within the payment period
        const isWithinPeriod = approvalDateNormalized >= periodStartNormalized && approvalDateNormalized <= periodEndNormalized;
        
        if (!isWithinPeriod) return false;
        
        // Now check if this approval's collection belongs to this collector
        const collectionId = approval.collection_id;
        const collectorIdForThisCollection = collectionToCollectorMap.get(collectionId);
        
        // Check if this collection was collected by the specified collector
        return collectorIdForThisCollection === collectorId;
      });
      
      console.log(`Found ${filteredApprovals.length} penalties in milk_approvals within date range for collector ${collectorId}`);
      if (filteredApprovals.length > 0) {
        totalPenalties += filteredApprovals.reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
      }
      
      console.log(`Total penalties calculated: ${totalPenalties}`);
      return parseFloat(totalPenalties.toFixed(2));
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - calculateTotalPenaltiesForPeriod exception', error);
      return 0;
    }
  }

  /**
   * Get collector payments with penalty information
   * This method now aligns with how the variance reporting dashboard calculates and displays penalties
   */
  async getCollectorPaymentsWithPenalties(): Promise<CollectorPaymentWithPenalties[]> {
    try {
      // Get all collector payments
      const { data: payments, error: paymentsError } = await supabase
        .from('collector_payments')
        .select(`
          *,
          staff!inner (
            profiles (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        logger.errorWithContext('CollectorPenaltyService - getCollectorPaymentsWithPenalties fetch payments', paymentsError);
        return [];
      }

      // Get all milk approvals and collections for better performance
      // Only include penalties with penalty_status = 'pending'
      console.log('Fetching all penalty data...');
      const allMilkApprovalsResponse = await supabase
        .from('milk_approvals')
        .select('id, collection_id, staff_id, penalty_amount, approved_at, penalty_status')
        .neq('penalty_amount', 0)
        .eq('penalty_status', 'pending') // Changed from neq to eq for consistency
        .order('approved_at', { ascending: false });
      
      const allCollectionsResponse = await supabase
        .from('collections')
        .select('id, staff_id')
        .eq('approved_for_payment', true);
      
      const allMilkApprovals = !allMilkApprovalsResponse.error ? allMilkApprovalsResponse.data : [];
      const allCollections = !allCollectionsResponse.error ? allCollectionsResponse.data : [];
      
      if (allMilkApprovalsResponse.error) {
        console.log('Error fetching milk approvals:', allMilkApprovalsResponse.error);
        // Check if this is an RLS recursion error
        if (allMilkApprovalsResponse.error.message && allMilkApprovalsResponse.error.message.includes('infinite recursion')) {
          console.log('RLS recursion detected in milk approvals query, using fallback method');
          // Fallback to individual queries if there's an RLS recursion issue
        }
      }
      
      if (allCollectionsResponse.error) {
        console.log('Error fetching collections:', allCollectionsResponse.error);
      }

      // Create a map of collection_id to collector_staff_id for quick lookup
      const collectionToCollectorMap = new Map<string, string>();
      allCollections.forEach(collection => {
        collectionToCollectorMap.set(collection.id, collection.staff_id);
      });

      // Calculate penalties for each payment period
      const paymentsWithPenalties = await Promise.all(
        payments.map(async (payment: any) => {
          console.log(`=== FETCHING PENALTIES FOR PAYMENT ===`);
          console.log(`Payment ID: ${payment.id}`);
          console.log(`Collector ID: ${payment.collector_id}`);
          console.log(`Collector Name: ${payment.staff?.profiles?.full_name || 'Unknown Collector'}`);
          console.log(`Period: ${payment.period_start} to ${payment.period_end}`);
          console.log(`Gross Earnings: ${payment.total_earnings}`);
          console.log(`Current Status: ${payment.status}`);
          console.log(`Total Collections in Period: ${payment.total_collections}`);
          
          let totalPenalties = 0;
          
          // Filter milk approvals for this collector and period
          console.log('--- Checking milk_approvals table ---');
          const periodStart = new Date(payment.period_start);
          const periodEnd = new Date(payment.period_end);
          // Set periodEnd to end of day for proper date comparison
          periodEnd.setHours(23, 59, 59, 999);
          
          // Find approvals that belong to this collector by joining through collections
          const collectorMilkApprovals = allMilkApprovals.filter(approval => {
            // First check if the approval is within the date range
            if (!approval.approved_at) return false;
            const approvalDate = new Date(approval.approved_at);
            
            // Normalize dates for comparison (compare only date parts, not time)
            const approvalDateNormalized = new Date(approvalDate.getFullYear(), approvalDate.getMonth(), approvalDate.getDate());
            const periodStartNormalized = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
            const periodEndNormalized = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
            
            // Check if approval date is within the payment period
            const isWithinPeriod = approvalDateNormalized >= periodStartNormalized && approvalDateNormalized <= periodEndNormalized;
            
            if (!isWithinPeriod) return false;
            
            // Now check if this approval's collection belongs to this collector
            // Get the collection for this approval
            const collectionId = approval.collection_id;
            const collectorIdForThisCollection = collectionToCollectorMap.get(collectionId);
            
            // Check if this collection was collected by the current payment's collector
            const isSameCollector = collectorIdForThisCollection === payment.collector_id;
            if (isSameCollector) {
              console.log(`Found approval ${approval.id} for collection ${collectionId} belonging to collector ${payment.collector_id}`);
            }
            return isSameCollector;
          });
          
          console.log(`Found ${collectorMilkApprovals.length} penalties in milk_approvals for this collector and period`);
          if (collectorMilkApprovals.length > 0) {
            const penaltySum = collectorMilkApprovals.reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
            console.log(`Penalty sum from milk_approvals: ${penaltySum}`);
            totalPenalties = penaltySum;
          }
          
          console.log(`Total penalties for payment ${payment.id}: ${totalPenalties}`);
          
          const adjustedEarnings = Math.max(0, payment.total_earnings - totalPenalties);
          console.log(`Adjusted earnings for payment ${payment.id}: ${adjustedEarnings} (gross: ${payment.total_earnings} - penalties: ${totalPenalties})`);

          return {
            id: payment.id,
            collector_id: payment.collector_id,
            collector_name: payment.staff?.profiles?.full_name || 'Unknown Collector',
            period_start: payment.period_start,
            period_end: payment.period_end,
            total_collections: payment.total_collections,
            total_liters: payment.total_liters,
            rate_per_liter: payment.rate_per_liter,
            total_earnings: payment.total_earnings,
            total_penalties: parseFloat(totalPenalties.toFixed(2)),
            adjusted_earnings: parseFloat(adjustedEarnings.toFixed(2)),
            status: payment.status,
            payment_date: payment.payment_date,
            notes: payment.notes
          };
        })
      );

      return paymentsWithPenalties;
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - getCollectorPaymentsWithPenalties exception', error);
      return [];
    }
  }

  /**
   * Get a specific collector payment with penalty information
   */
  async getCollectorPaymentWithPenalties(paymentId: string): Promise<CollectorPaymentWithPenalties | null> {
    try {
      const { data: payment, error } = await supabase
        .from('collector_payments')
        .select(`
          *,
          staff!inner (
            profiles (
              full_name
            )
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error) {
        logger.errorWithContext('CollectorPenaltyService - getCollectorPaymentWithPenalties', error);
        return null;
      }

      if (!payment) {
        return null;
      }

      const totalPenalties = await this.calculateTotalPenaltiesForPeriod(
        payment.collector_id,
        payment.period_start,
        payment.period_end
      );

      const adjustedEarnings = Math.max(0, payment.total_earnings - totalPenalties);

      return {
        id: payment.id,
        collector_id: payment.collector_id,
        collector_name: payment.staff?.profiles?.full_name || 'Unknown Collector',
        period_start: payment.period_start,
        period_end: payment.period_end,
        total_collections: payment.total_collections,
        total_liters: payment.total_liters,
        rate_per_liter: payment.rate_per_liter,
        total_earnings: payment.total_earnings,
        total_penalties: parseFloat(totalPenalties.toFixed(2)),
        adjusted_earnings: parseFloat(adjustedEarnings.toFixed(2)),
        status: payment.status,
        payment_date: payment.payment_date,
        notes: payment.notes
      };
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - getCollectorPaymentWithPenalties exception', error);
      return null;
    }
  }

  /**
   * Get detailed penalty analytics for all collectors
   */
  async getPenaltyAnalytics(): Promise<PenaltyAnalyticsData> {
    try {
      console.log('Fetching detailed penalty analytics for all collectors...');
      
      // Get all collectors with role 'collector'
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'collector')
        .eq('active', true);
      
      if (userRolesError) {
        logger.errorWithContext('CollectorPenaltyService - getPenaltyAnalytics fetch user roles', userRolesError);
        throw userRolesError;
      }

      const collectorUserIds = userRolesData?.map(role => role.user_id) || [];
      
      if (collectorUserIds.length === 0) {
        return {
          overallPenaltyStats: {
            totalPenalties: 0,
            avgPenaltyPerCollector: 0,
            highestPenaltyCollector: '',
            highestPenaltyAmount: 0
          },
          collectorPenaltyData: []
        };
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
        logger.errorWithContext('CollectorPenaltyService - getPenaltyAnalytics fetch collectors', collectorsError);
        throw collectorsError;
      }

      // Get all penalty data upfront for better performance
      console.log('Fetching all penalty data...');
      // Only include penalties with penalty_status != 'paid'
      const allMilkApprovalsResponse = await supabase
        .from('milk_approvals')
        .select('*')
        .neq('penalty_amount', 0)
        .eq('penalty_status', 'pending') // Changed from neq to eq for consistency
        .order('approved_at', { ascending: false });
      
      const allCollectionsResponse = await supabase
        .from('collections')
        .select('id, staff_id')
        .eq('approved_for_payment', true);
      
      // Only include daily summaries with penalty_status != 'paid'
      const allDailySummariesResponse = await supabase
        .from('collector_daily_summaries')
        .select('*')
        .neq('total_penalty_amount', 0)
        .eq('penalty_status', 'pending') // Changed from neq to eq for consistency
        .order('collection_date', { ascending: false });
      
      const allMilkApprovals = !allMilkApprovalsResponse.error ? allMilkApprovalsResponse.data : [];
      const allCollections = !allCollectionsResponse.error ? allCollectionsResponse.data : [];
      const allDailySummaries = !allDailySummariesResponse.error ? allDailySummariesResponse.data : [];
      
      if (allMilkApprovalsResponse.error) {
        console.log('Error fetching milk approvals:', allMilkApprovalsResponse.error);
      }
      
      if (allCollectionsResponse.error) {
        console.log('Error fetching collections:', allCollectionsResponse.error);
      }
      
      if (allDailySummariesResponse.error) {
        console.log('Error fetching daily summaries:', allDailySummariesResponse.error);
      }

      // Create a map of collection_id to collector_staff_id for quick lookup
      const collectionToCollectorMap = new Map<string, string>();
      allCollections.forEach(collection => {
        collectionToCollectorMap.set(collection.id, collection.staff_id);
      });

      // Get penalty data for each collector
      const collectorPenaltyData = await Promise.all(
        collectors.map(async (collector: any) => {
          // Filter penalties for this specific collector by joining through collections
          const collectorMilkApprovals = allMilkApprovals.filter(approval => {
            const collectionId = approval.collection_id;
            const collectorIdForThisCollection = collectionToCollectorMap.get(collectionId);
            return collectorIdForThisCollection === collector.id;
          });
          
          const collectorDailySummaries = allDailySummaries.filter(summary => summary.collector_id === collector.id);
          
          // Take only recent penalties (last 10)
          const recentMilkApprovals = collectorMilkApprovals.slice(0, 10);
          const recentDailySummaries = collectorDailySummaries.slice(0, 10);

          // Calculate totals
          let totalPenalties = 0;
          let positiveVariancePenalties = 0;
          let negativeVariancePenalties = 0;
          let totalPositiveVariances = 0;
          let totalNegativeVariances = 0;
          
          // Process milk approval penalties
          if (collectorMilkApprovals.length > 0) {
            totalPenalties += collectorMilkApprovals.reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
            positiveVariancePenalties += collectorMilkApprovals
              .filter(a => a.variance_type === 'positive')
              .reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
            negativeVariancePenalties += collectorMilkApprovals
              .filter(a => a.variance_type === 'negative')
              .reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
            totalPositiveVariances += collectorMilkApprovals.filter(a => a.variance_type === 'positive').length;
            totalNegativeVariances += collectorMilkApprovals.filter(a => a.variance_type === 'negative').length;
          }
          
          // Process daily summary penalties
          if (collectorDailySummaries.length > 0) {
            totalPenalties += collectorDailySummaries.reduce((sum, summary) => sum + (summary.total_penalty_amount || 0), 0);
            positiveVariancePenalties += collectorDailySummaries
              .filter(s => s.variance_type === 'positive')
              .reduce((sum, summary) => sum + (summary.total_penalty_amount || 0), 0);
            negativeVariancePenalties += collectorDailySummaries
              .filter(s => s.variance_type === 'negative')
              .reduce((sum, summary) => sum + (summary.total_penalty_amount || 0), 0);
            totalPositiveVariances += collectorDailySummaries.filter(s => s.variance_type === 'positive').length;
            totalNegativeVariances += collectorDailySummaries.filter(s => s.variance_type === 'negative').length;
          }
          
          // Get payment status data
          const { data: paymentData, error: paymentError } = await supabase
            .from('collector_payments')
            .select('*')
            .eq('collector_id', collector.id);
            
          let pendingPenalties = 0;
          let paidPenalties = 0;
          
          if (!paymentError && paymentData) {
            pendingPenalties = paymentData
              .filter(p => p.status === 'pending')
              .reduce((sum, payment) => sum + (payment.total_earnings || 0), 0);
              
            paidPenalties = paymentData
              .filter(p => p.status === 'paid')
              .reduce((sum, payment) => sum + (payment.total_earnings || 0), 0);
          }
          
          // Prepare recent penalties data (combine both sources)
          let recentPenalties: CollectorDailySummary[] = [];
          if (recentMilkApprovals.length > 0) {
            recentPenalties = recentPenalties.concat(recentMilkApprovals.map(approval => ({
              id: approval.id,
              collector_id: collector.id, // Use the collector ID, not the approver ID
              collection_date: approval.approved_at ? new Date(approval.approved_at).toISOString().split('T')[0] : '',
              total_collections: 1,
              total_liters_collected: 0, // Not available in milk_approvals
              total_liters_received: approval.company_received_liters,
              variance_liters: approval.variance_liters || 0,
              variance_percentage: approval.variance_percentage || 0,
              variance_type: approval.variance_type || 'none',
              total_penalty_amount: approval.penalty_amount || 0,
              approved_by: approval.staff_id || '', // This is the approver ID
              approved_at: approval.approved_at || '',
              notes: approval.approval_notes || ''
            })));
          }
          
          if (recentDailySummaries.length > 0) {
            recentPenalties = recentPenalties.concat(recentDailySummaries);
          }
          
          // Sort and limit to 10 most recent
          recentPenalties.sort((a, b) => 
            new Date(b.collection_date || b.approved_at).getTime() - 
            new Date(a.collection_date || a.approved_at).getTime()
          );
          recentPenalties = recentPenalties.slice(0, 10);
          
          // Generate penalty trend data (last 30 days)
          const penaltyTrend = await this.generatePenaltyTrend(collector.id, allMilkApprovals, allDailySummaries);
          
          return {
            collectorId: collector.id,
            collectorName: collector.profiles?.full_name || 'Unknown Collector',
            totalPenalties: parseFloat(totalPenalties.toFixed(2)),
            pendingPenalties: parseFloat(pendingPenalties.toFixed(2)),
            paidPenalties: parseFloat(paidPenalties.toFixed(2)),
            penaltyBreakdown: {
              positiveVariancePenalties: parseFloat(positiveVariancePenalties.toFixed(2)),
              negativeVariancePenalties: parseFloat(negativeVariancePenalties.toFixed(2)),
              totalPositiveVariances,
              totalNegativeVariances
            },
            recentPenalties,
            penaltyTrend
          };
        })
      );

      // Calculate overall stats
      const totalPenalties = collectorPenaltyData.reduce((sum, collector) => sum + collector.totalPenalties, 0);
      const avgPenaltyPerCollector = collectorPenaltyData.length > 0 ? totalPenalties / collectorPenaltyData.length : 0;
      
      // Find collector with highest penalties
      let highestPenaltyCollector = '';
      let highestPenaltyAmount = 0;
      if (collectorPenaltyData.length > 0) {
        const highest = collectorPenaltyData.reduce((prev, current) => 
          (prev.totalPenalties > current.totalPenalties) ? prev : current
        );
        highestPenaltyCollector = highest.collectorName;
        highestPenaltyAmount = highest.totalPenalties;
      }

      return {
        overallPenaltyStats: {
          totalPenalties: parseFloat(totalPenalties.toFixed(2)),
          avgPenaltyPerCollector: parseFloat(avgPenaltyPerCollector.toFixed(2)),
          highestPenaltyCollector,
          highestPenaltyAmount: parseFloat(highestPenaltyAmount.toFixed(2))
        },
        collectorPenaltyData
      };
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - getPenaltyAnalytics exception', error);
      return {
        overallPenaltyStats: {
          totalPenalties: 0,
          avgPenaltyPerCollector: 0,
          highestPenaltyCollector: '',
          highestPenaltyAmount: 0
        },
        collectorPenaltyData: []
      };
    }
  }

  /**
   * Generate penalty trend data for a collector (last 30 days)
   */
  private async generatePenaltyTrend(
    collectorId: string, 
    allMilkApprovals: any[] = [], 
    allDailySummaries: any[] = []
  ): Promise<{date: string, penalties: number}[]> {
    try {
      const trendData: {date: string, penalties: number}[] = [];
      const today = new Date();
      
      // If data wasn't passed in, fetch it
      let milkApprovals = allMilkApprovals;
      let dailySummaries = allDailySummaries;
      let collectionToCollectorMap = new Map<string, string>();
      
      if (milkApprovals.length === 0 || dailySummaries.length === 0) {
        // Only include penalties with penalty_status != 'paid'
        const milkApprovalsResponse = await supabase
          .from('milk_approvals')
          .select('id, collection_id, penalty_amount, approved_at, penalty_status')
          .neq('penalty_amount', 0)
          .neq('penalty_status', 'paid'); // Exclude paid penalties
        
        const collectionsResponse = await supabase
          .from('collections')
          .select('id, staff_id')
          .eq('approved_for_payment', true);
        
        // Only include daily summaries with penalty_status != 'paid'
        const dailySummariesResponse = await supabase
          .from('collector_daily_summaries')
          .select('total_penalty_amount, collection_date, penalty_status')
          .eq('collector_id', collectorId)
          .neq('total_penalty_amount', 0)
          .neq('penalty_status', 'paid'); // Exclude paid penalties
        
        milkApprovals = !milkApprovalsResponse.error ? milkApprovalsResponse.data : [];
        const collections = !collectionsResponse.error ? collectionsResponse.data : [];
        dailySummaries = !dailySummariesResponse.error ? dailySummariesResponse.data : [];
        
        // Create collection to collector mapping
        collections.forEach(collection => {
          collectionToCollectorMap.set(collection.id, collection.staff_id);
        });
      } else {
        // If data was passed in, we need to fetch collections to create the mapping
        const collectionsResponse = await supabase
          .from('collections')
          .select('id, staff_id')
          .eq('approved_for_payment', true);
        
        const collections = !collectionsResponse.error ? collectionsResponse.data : [];
        collections.forEach(collection => {
          collectionToCollectorMap.set(collection.id, collection.staff_id);
        });
      }
      
      // Generate data for last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        // Filter penalties for this specific date that belong to this collector
        const dailyMilkApprovals = milkApprovals.filter(approval => {
          if (!approval.approved_at) return false;
          const approvalDate = new Date(approval.approved_at);
          if (approvalDate.toISOString().split('T')[0] !== dateString) return false;
          
          // Check if this approval belongs to the specified collector
          const collectionId = approval.collection_id;
          const collectorIdForThisCollection = collectionToCollectorMap.get(collectionId);
          return collectorIdForThisCollection === collectorId;
        });
        
        const dailyDailySummaries = dailySummaries.filter(summary => {
          if (!summary.collection_date) return false;
          return summary.collection_date === dateString && summary.collector_id === collectorId;
        });
        
        let dailyPenalties = 0;
        
        if (dailyMilkApprovals.length > 0) {
          dailyPenalties += dailyMilkApprovals.reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
        }
        
        if (dailyDailySummaries.length > 0) {
          dailyPenalties += dailyDailySummaries.reduce((sum, summary) => sum + (summary.total_penalty_amount || 0), 0);
        }
        
        trendData.push({
          date: dateString,
          penalties: parseFloat(dailyPenalties.toFixed(2))
        });
      }
      
      return trendData;
    } catch (error) {
      logger.errorWithContext('CollectorPenaltyService - generatePenaltyTrend exception', error);
      return [];
    }
  }
}

// Export singleton instance
export const collectorPenaltyService = CollectorPenaltyService.getInstance();