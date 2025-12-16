import { supabase } from '@/integrations/supabase/client';
import { collectorRateService } from '@/services/collector-rate-service';
import { collectorPenaltyService } from './collector-penalty-service';
import { collectorPenaltyAccountService } from './collector-penalty-account-service';
import { deductionService } from '@/services/deduction-service';
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
   * Debug function to check milk approvals for a collector
   * This is for troubleshooting purposes only
   */
  async debugMilkApprovalsForCollector(collectorId: string): Promise<void> {
    try {
      logger.info(`=== DEBUG: Checking milk approvals for collector ${collectorId} ===`);
      
      // First, get all milk approvals for this collector regardless of status
      const { data: allApprovals, error: allError } = await supabase
        .from('milk_approvals')
        .select('*')
        .eq('staff_id', collectorId);
      
      logger.info(`All milk approvals for collector ${collectorId}:`, { 
        data: allApprovals, 
        error: allError,
        count: allApprovals?.length || 0
      });
      
      // Then get only pending ones
      const { data: pendingApprovals, error: pendingError } = await supabase
        .from('milk_approvals')
        .select('*')
        .eq('staff_id', collectorId)
        .eq('penalty_status', 'pending');
        
      logger.info(`Pending milk approvals for collector ${collectorId}:`, { 
        data: pendingApprovals, 
        error: pendingError,
        count: pendingApprovals?.length || 0
      });
      
      // DEBUG: Check for pending non-zero milk approvals
      const { data: pendingNonZeroApprovals, error: pendingNonZeroError } = await supabase
        .from('milk_approvals')
        .select('*')
        .eq('staff_id', collectorId)
        .eq('penalty_status', 'pending')
        .neq('penalty_amount', 0);
        
      logger.info(`Pending non-zero milk approvals for collector ${collectorId}:`, { 
        data: pendingNonZeroApprovals, 
        error: pendingNonZeroError,
        count: pendingNonZeroApprovals?.length || 0
      });
      
      logger.info(`=== END DEBUG: Milk approvals for collector ${collectorId} ===`);
    } catch (error) {
      logger.error(`Debug error for collector ${collectorId}:`, error);
    }
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
   * Gross earnings = Sum of all collection fee amounts regardless of payment status
   */
  async getAllTimeEarnings(collectorId: string): Promise<CollectorEarnings> {
    try {
      // Validate input
      if (!collectorId) {
        throw new ValidationError('Collector ID is required');
      }
      
      // Get all collections for this collector that are approved for payment
      // This represents the GROSS earnings (all collections regardless of payment status)
      const { data, error } = await supabase
        .from('collections')
        .select('id, liters, collection_date')
        .eq('staff_id', collectorId)
        .eq('status', 'Collected')
        .eq('approved_for_payment', true)
        // Include ALL collections (both pending and paid) for gross earnings calculation
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
      
      // Calculate gross earnings as total liters * rate per liter
      // This represents ALL collection fees regardless of payment status
      const totalEarnings = totalLiters * ratePerLiter;
      
      logger.withContext('CollectorEarningsService - getAllTimeEarnings').info(`Total collections: ${totalCollections}, Total liters: ${totalLiters}, Gross earnings: ${totalEarnings}`);

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
   * Also updates penalty_status for related milk_approvals and collector_daily_summaries records
   * And updates status in collector_payments table
   */
  async markCollectionsAsPaid(collectorId: string, periodStart?: string, periodEnd?: string): Promise<boolean> {
    try {
      logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info('Starting to mark collections as paid for collector', { collectorId, periodStart, periodEnd });
      
      if (!collectorId) {
        throw new ValidationError('Collector ID is required');
      }

      // First, get the collections that will be marked as paid
      let collectionsQuery = supabase
        .from('collections')
        .select('id')
        .eq('staff_id', collectorId)
        .eq('approved_for_payment', true)
        .eq('collection_fee_status', 'pending'); // Only get collections with pending fees

      // Apply date filters if provided
      if (periodStart) {
        collectionsQuery = collectionsQuery.gte('collection_date', periodStart);
      }
      
      if (periodEnd) {
        collectionsQuery = collectionsQuery.lte('collection_date', periodEnd);
      }

      const { data: collectionsToBeUpdated, error: fetchError } = await collectionsQuery;

      if (fetchError) {
        logger.errorWithContext('CollectorEarningsService - markCollectionsAsPaid fetch collections', fetchError);
        throw new DatabaseError('Failed to fetch collections to be updated', 'FETCH_COLLECTIONS_FOR_UPDATE', fetchError);
      }

      // Extract collection IDs
      const collectionIds = collectionsToBeUpdated?.map(c => c.id) || [];

      // If no collections to update, return early
      if (collectionIds.length === 0) {
        logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info('No collections to update for collector', { collectorId });
        return true;
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

      const { error: updateCollectionsError } = await query;

      if (updateCollectionsError) {
        logger.errorWithContext('CollectorEarningsService - markCollectionsAsPaid update collections', updateCollectionsError);
        throw new DatabaseError('Failed to mark collections as paid', 'UPDATE_COLLECTIONS_STATUS', updateCollectionsError);
      }

      logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info(`Successfully updated ${collectionIds.length} collections to paid status`);

      // Update penalty_status for related milk_approvals records
      // Only update penalties for the collections we just marked as paid
      if (collectionIds.length > 0) {
        try {
          logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info(`Attempting to update penalty status for ${collectionIds.length} milk approvals`);
          
          // First, let's check what records we're trying to update
          const { data: approvalsToBeUpdated, error: fetchApprovalsError } = await supabase
            .from('milk_approvals')
            .select('id, collection_id, staff_id, penalty_status, penalty_amount')
            .in('collection_id', collectionIds)
            .eq('penalty_status', 'pending');
          
          if (fetchApprovalsError) {
            logger.warn('Failed to fetch milk approvals to be updated:', fetchApprovalsError);
          } else {
            logger.info(`Found ${approvalsToBeUpdated?.length || 0} milk approvals to update:`, approvalsToBeUpdated);
            
            // Check if current user has permission to update these approvals
            const { data: currentUserStaff, error: staffError } = await supabase
              .from('staff')
              .select('id')
              .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');
            
            if (!staffError && currentUserStaff && currentUserStaff.length > 0) {
              const currentUserStaffId = currentUserStaff[0].id;
              const unauthorizedApprovals = approvalsToBeUpdated?.filter(approval => 
                approval.staff_id !== currentUserStaffId
              ) || [];
              
              if (unauthorizedApprovals.length > 0) {
                logger.warn(`User attempted to update ${unauthorizedApprovals.length} approvals for other collectors:`, unauthorizedApprovals);
              }
            }
          }
          
          // Try updating milk approvals with enhanced error handling
          const { error: updateMilkApprovalsError, data: updatedApprovalsData } = await supabase
            .from('milk_approvals')
            .update({ penalty_status: 'paid' })
            .in('collection_id', collectionIds)
            .eq('penalty_status', 'pending')
            .select();

          if (updateMilkApprovalsError) {
            logger.warn('Failed to update milk approvals penalty status:', updateMilkApprovalsError);
            // Check if this is an RLS recursion error and handle it gracefully
            if (updateMilkApprovalsError.message && (
              updateMilkApprovalsError.message.includes('infinite recursion') || 
              updateMilkApprovalsError.message.includes('row-level security policy') ||
              updateMilkApprovalsError.message.includes('permission denied')
            )) {
              logger.warn('RLS policy violation detected, attempting alternative update method');
              
              // Try updating each record individually as a workaround
              let successfulUpdates = 0;
              let failedUpdates = 0;
              
              for (const collectionId of collectionIds) {
                try {
                  // First, check if there are any approvals for this collection
                  const { data: existingApprovals, error: checkError } = await supabase
                    .from('milk_approvals')
                    .select('id, penalty_status')
                    .eq('collection_id', collectionId)
                    .eq('penalty_status', 'pending');
                  
                  if (checkError) {
                    logger.warn(`Failed to check milk approvals for collection ${collectionId}:`, checkError);
                    failedUpdates++;
                    continue;
                  }
                  
                  if (!existingApprovals || existingApprovals.length === 0) {
                    logger.info(`No pending milk approvals found for collection ${collectionId}`);
                    continue;
                  }
                  
                  // Update the approvals
                  const { error: individualUpdateError } = await supabase
                    .from('milk_approvals')
                    .update({ penalty_status: 'paid' })
                    .eq('collection_id', collectionId)
                    .eq('penalty_status', 'pending');
                  
                  if (individualUpdateError) {
                    logger.warn(`Failed to update individual milk approval for collection ${collectionId}:`, individualUpdateError);
                    failedUpdates++;
                  } else {
                    logger.info(`Successfully updated ${existingApprovals.length} milk approvals for collection ${collectionId}`);
                    successfulUpdates++;
                  }
                } catch (individualError) {
                  logger.warn(`Exception while updating individual milk approval for collection ${collectionId}:`, individualError);
                  failedUpdates++;
                }
              }
              
              logger.info(`Individual update results: ${successfulUpdates} successful, ${failedUpdates} failed`);
              
              // If we had some successful updates, consider it a partial success
              if (successfulUpdates > 0) {
                logger.info(`Partially successful milk approvals update: ${successfulUpdates} updated`);
              }
            } else {
              // Try a more general approach without the penalty_status condition
              logger.warn('Trying general update without penalty_status condition');
              const { error: generalUpdateError, data: generalUpdateData } = await supabase
                .from('milk_approvals')
                .update({ penalty_status: 'paid' })
                .in('collection_id', collectionIds)
                .select();
              
              if (generalUpdateError) {
                logger.warn('General update also failed:', generalUpdateError);
                
                // Last resort: Try updating by individual approval IDs
                if (approvalsToBeUpdated && approvalsToBeUpdated.length > 0) {
                  logger.warn('Trying update by individual approval IDs');
                  const approvalIds = approvalsToBeUpdated.map(a => a.id);
                  
                  const { error: idUpdateError, data: idUpdateData } = await supabase
                    .from('milk_approvals')
                    .update({ penalty_status: 'paid' })
                    .in('id', approvalIds)
                    .select();
                  
                  if (idUpdateError) {
                    logger.warn('Update by approval IDs also failed:', idUpdateError);
                  } else {
                    logger.info(`Successfully updated ${idUpdateData?.length || 0} milk approvals by ID to paid status`);
                  }
                }
              } else {
                logger.info(`Successfully updated ${generalUpdateData?.length || 0} milk approvals to paid status (general update)`);
              }
            }
          } else {
            logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info(`Updated ${updatedApprovalsData?.length || 0} milk approvals penalty status to paid`);
            
            // Verify the update worked
            const { data: updatedApprovals, error: verifyError } = await supabase
              .from('milk_approvals')
              .select('id, collection_id, penalty_status')
              .in('collection_id', collectionIds)
              .eq('penalty_status', 'paid');
            
            if (verifyError) {
              logger.warn('Failed to verify milk approvals update:', verifyError);
            } else {
              logger.info(`Verified ${updatedApprovals?.length || 0} milk approvals were updated to paid status`);
            }
          }
        } catch (milkApprovalsError) {
          logger.warn('Exception while updating milk approvals penalty status:', milkApprovalsError);
          // Continue with the operation even if this fails
        }
      }

      // Update penalty_status for related collector_daily_summaries records
      // For daily summaries, we need to update based on collector_id and date range
      try {
        if (periodStart || periodEnd) {
          logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info(`Attempting to update penalty status for daily summaries with date range`, { periodStart, periodEnd });
          
          let dailySummariesQuery = supabase
            .from('collector_daily_summaries')
            .update({ penalty_status: 'paid' })
            .eq('collector_id', collectorId)
            .eq('penalty_status', 'pending');

          if (periodStart) {
            dailySummariesQuery = dailySummariesQuery.gte('collection_date', periodStart);
          }
          
          if (periodEnd) {
            dailySummariesQuery = dailySummariesQuery.lte('collection_date', periodEnd);
          }

          const { error: updateDailySummariesError } = await dailySummariesQuery;

          if (updateDailySummariesError) {
            logger.warn('Failed to update collector daily summaries penalty status:', updateDailySummariesError);
            // Don't throw here as this is secondary to the main operation
          } else {
            logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info(`Updated collector daily summaries penalty status to paid for collector ${collectorId}`);
          }
        }
      } catch (dailySummariesError) {
        logger.warn('Exception while updating collector daily summaries penalty status:', dailySummariesError);
        // Continue with the operation even if this fails
      }

      // Update status for related collector_payments records
      try {
        logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info(`Attempting to update status for collector payments`);
        
        const { error: updatePaymentsError } = await supabase
          .from('collector_payments')
          .update({ status: 'paid' })
          .eq('collector_id', collectorId)
          .eq('status', 'pending');

        if (updatePaymentsError) {
          logger.warn('Failed to update collector payments status:', updatePaymentsError);
          // Don't throw here as this is secondary to the main operation
        } else {
          logger.withContext('CollectorEarningsService - markCollectionsAsPaid').info(`Updated collector payments status to paid for collector ${collectorId}`);
        }
      } catch (paymentsError) {
        logger.warn('Exception while updating collector payments status:', paymentsError);
        // Continue with the operation even if this fails
      }

      // Invalidate cache to ensure fresh data on next fetch
      // This helps prevent stale data issues
      try {
        // Send a custom event to notify other parts of the app to refresh their data
        window.dispatchEvent(new CustomEvent('collectorDataUpdated', { detail: { collectorId } }));
      } catch (eventError) {
        logger.warn('Failed to dispatch collector data update event:', eventError);
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
      logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Found ${collectorUserIds.length} collector user IDs`, { collectorUserIds });
      
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
      
      logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Found ${collectors?.length || 0} collector staff records`, { collectors });

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
          logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Found performance data for collector ${collector.id}`, collectorPerformance);
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
            .neq('penalty_amount', 0)
            .eq('penalty_status', 'pending'); // Add filter for pending penalties only
              
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
              .neq('total_penalty_amount', 0)
              .eq('penalty_status', 'pending');
              
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
        
        logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Collector performance data for ${collector.id}:`, collectorPerformance);

        // Calculate pending and paid amounts directly from collections
        // Get pending collections
        const { data: pendingCollections, error: pendingError } = await supabase
          .from('collections')
          .select('liters')
          .eq('staff_id', collector.id)
          .eq('approved_for_payment', true)
          .eq('collection_fee_status', 'pending');
        
        if (pendingError) {
          logger.warn(`Error fetching pending collections for collector ${collector.id}:`, pendingError);
        }
        
        const pendingLiters = pendingError ? 0 : pendingCollections?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
        const pendingAmount = pendingLiters * earnings.ratePerLiter;
        
        // Get paid collections
        const { data: paidCollections, error: paidError } = await supabase
          .from('collections')
          .select('liters')
          .eq('staff_id', collector.id)
          .eq('approved_for_payment', true)
          .eq('collection_fee_status', 'paid');
        
        if (paidError) {
          logger.warn(`Error fetching paid collections for collector ${collector.id}:`, paidError);
        }
        
        const paidLiters = paidError ? 0 : paidCollections?.reduce((sum, collection) => sum + (collection.liters || 0), 0) || 0;
        const paidAmount = paidLiters * earnings.ratePerLiter;
        
        // Note: earnings.totalEarnings now includes ALL collections (pending + paid)
        // pendingAmount and paidAmount represent the monetary value of pending and paid collections respectively
        
        // Note: earnings.totalEarnings now includes ALL collections (pending + paid)
        // pendingAmount and paidAmount represent the monetary value of pending and paid collections respectively

        // Determine overall penalty status based on whether there are pending penalties
        // If all penalties have been paid, set penaltyStatus to 'paid', otherwise 'pending'
        const totalPendingPenalties = await this.calculatePendingPenaltiesForCollector(collector.id);
        const penaltyStatus = totalPendingPenalties > 0 ? 'pending' : 'paid';
        
        logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Penalty calculations for collector ${collector.id}:`, {
          totalPendingPenalties,
          penaltyStatus,
          totalPenaltiesFromPerformance: collectorPerformance.total_penalty_amount
        });

        logger.withContext('CollectorEarningsService - getCollectorsWithEarnings').info(`Completed processing for collector ${collector.id}: Total liters: ${earnings.totalLiters}, Total earnings: ${earnings.totalEarnings}`);
        
        // Use the penalty amount from performance data as the primary source, fallback to calculated pending penalties
        const displayPenalties = collectorPerformance.total_penalty_amount || totalPendingPenalties;
        
        return {
          id: collector.id,
          name: collector.profiles?.full_name || 'Unknown Collector',
          ...earnings,
          totalCollections: collectorPerformance.total_collections || 0,
          totalLiters: collectorPerformance.total_liters_collected || 0,
          totalVariance: collectorPerformance.total_variance || 0,
          totalPenalties: displayPenalties,
          positiveVariances: collectorPerformance.positive_variances || 0,
          negativeVariances: collectorPerformance.negative_variances || 0,
          avgVariancePercentage: collectorPerformance.average_variance_percentage || 0,
          pendingPayments: pendingAmount,
          paidPayments: paidAmount,
          performanceScore: collectorPerformance.performance_score || 0,
          lastCollectionDate: collectorPerformance.last_collection_date || null,
          penaltyStatus,
          pendingPenalties: totalPendingPenalties,
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
              .neq('penalty_amount', 0)
              .eq('penalty_status', 'pending'); // Add filter for pending penalties only
              
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
                .neq('total_penalty_amount', 0)
                .eq('penalty_status', 'pending');
                
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
          
          // Calculate total deductions for this collector (if any)
          // For now, we'll use a placeholder - in a full implementation, this would calculate
          // deductions based on the farmer collections associated with this collector
          const totalDeductions = 0;
          
          // Note: earnings.totalEarnings now includes ALL collections (pending + paid)
          // pendingAmount and paidAmount represent the monetary value of pending and paid collections respectively

          // Determine overall penalty status based on whether there are pending penalties
          // If all penalties have been paid, set penaltyStatus to 'paid', otherwise 'pending'
          const totalPendingPenalties = await this.calculatePendingPenaltiesForCollector(collector.id);
          const penaltyStatus = totalPendingPenalties > 0 ? 'pending' : 'paid';

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
            penaltyStatus,
            pendingPenalties: totalPendingPenalties,
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

  /**
   * Calculate pending penalties for a collector
   * This function looks at all penalties for this collector that have not been paid
   */
  async calculatePendingPenaltiesForCollector(collectorId: string): Promise<number> {
    try {
      logger.info(`Calculating pending penalties for collector: ${collectorId}`);
      
      let pendingPenalties = 0;
      
      // Approach 1: Try the standard query first
      try {
        const { data: milkApprovals, error: approvalsError } = await supabase
          .from('milk_approvals')
          .select('penalty_amount')
          .eq('staff_id', collectorId)
          .eq('penalty_status', 'pending')
          .gt('penalty_amount', 0);
        
        if (approvalsError) {
          logger.warn(`Standard milk approvals query failed for collector ${collectorId}:`, approvalsError);
        } else if (milkApprovals && milkApprovals.length > 0) {
          pendingPenalties += milkApprovals.reduce((sum, approval) => {
            const amount = typeof approval.penalty_amount === 'string' 
              ? parseFloat(approval.penalty_amount) 
              : approval.penalty_amount;
            // Remove validation to prevent extremely high values as requested by user
            const validatedAmount = amount && amount > 0 ? amount : 0;
            return sum + validatedAmount;
          }, 0);
          logger.info(`Found ${milkApprovals.length} pending milk approvals for collector ${collectorId}: ${pendingPenalties}`);
        } else {
          logger.info(`No pending milk approvals found with standard query for collector ${collectorId}`);
        }
      } catch (queryError) {
        logger.warn(`Exception in standard milk approvals query for collector ${collectorId}:`, queryError);
      }
      
      // Approach 2: Try collector_daily_summaries if milk_approvals didn't yield results
      if (pendingPenalties === 0) {
        try {
          const { data: dailySummaries, error: summariesError } = await supabase
            .from('collector_daily_summaries')
            .select('total_penalty_amount')
            .eq('collector_id', collectorId)
            .eq('penalty_status', 'pending')
            .gt('total_penalty_amount', 0);
            
          if (summariesError) {
            logger.warn(`Standard daily summaries query failed for collector ${collectorId}:`, summariesError);
          } else if (dailySummaries && dailySummaries.length > 0) {
            const dailyPenalties = dailySummaries.reduce((sum, summary) => {
              const amount = typeof summary.total_penalty_amount === 'string' 
                ? parseFloat(summary.total_penalty_amount) 
                : summary.total_penalty_amount;
              // Remove validation to prevent extremely high values as requested by user
              const validatedAmount = amount && amount > 0 ? amount : 0;
              return sum + validatedAmount;
            }, 0);
            pendingPenalties += dailyPenalties;
            logger.info(`Found ${dailySummaries.length} pending daily summaries for collector ${collectorId}: ${dailyPenalties}`);
          } else {
            logger.info(`No pending daily summaries found with standard query for collector ${collectorId}`);
          }
        } catch (summariesQueryError) {
          logger.warn(`Exception in standard daily summaries query for collector ${collectorId}:`, summariesQueryError);
        }
      }
      
      // If we still have 0 penalties, do a broad search to debug
      if (pendingPenalties === 0) {
        logger.info(`No pending penalties found yet for collector ${collectorId}, doing broad search for debugging`);
        
        try {
          // Get all milk approvals for this collector to see what we have
          const { data: allMilkApprovals, error: allError } = await supabase
            .from('milk_approvals')
            .select('penalty_amount, penalty_status, staff_id') // Remove collector_id since it doesn't exist in this table
            .eq('staff_id', collectorId);
            
          if (!allError && allMilkApprovals && allMilkApprovals.length > 0) {
            logger.info(`Found ${allMilkApprovals.length} total milk approvals for collector ${collectorId}:`, allMilkApprovals);
            
            // Count how many are pending
            const pendingCount = allMilkApprovals.filter(a => a.penalty_status === 'pending').length;
            const paidCount = allMilkApprovals.filter(a => a.penalty_status === 'paid').length;
            logger.info(`Of ${allMilkApprovals.length} approvals, ${pendingCount} are pending, ${paidCount} are paid`);
            
            // Count how many have non-zero penalties
            const nonZeroCount = allMilkApprovals.filter(a => {
              const amount = typeof a.penalty_amount === 'string' 
                ? parseFloat(a.penalty_amount) 
                : a.penalty_amount;
              return amount && amount > 0;
            }).length;
            logger.info(`Of ${allMilkApprovals.length} approvals, ${nonZeroCount} have non-zero penalties`);
          } else {
            logger.info(`No milk approvals found at all for collector ${collectorId}`);
          }
        } catch (debugError) {
          logger.warn(`Exception in debug query for collector ${collectorId}:`, debugError);
        }
      }
      
      // Remove validation to prevent extremely high penalty values as requested by user
      const validatedPenalties = pendingPenalties && pendingPenalties > 0 ? pendingPenalties : 0;
      logger.info(`Final total pending penalties for collector ${collectorId}: ${validatedPenalties}`);
      return parseFloat(validatedPenalties.toFixed(2));
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - calculatePendingPenaltiesForCollector exception', error);
      return 0;
    }
  }

  /**
   * Calculate total deductions for a collector based on their associated farmers
   * This function looks at all farmers who have had collections by this collector
   * and sums up any active deductions for those farmers
   */
  async calculateCollectorDeductions(collectorId: string): Promise<number> {
    try {
      // Get all farmers who have had collections by this collector
      const { data: farmerIds, error: farmersError } = await supabase
        .from('collections')
        .select('farmer_id')
        .eq('staff_id', collectorId)
        .neq('status', 'Cancelled');
      
      if (farmersError) {
        logger.errorWithContext('CollectorEarningsService - calculateCollectorDeductions fetch farmers', farmersError);
        return 0;
      }
      
      // Extract unique farmer IDs
      const uniqueFarmerIds = [...new Set(farmerIds?.map(c => c.farmer_id) || [])];
      
      if (uniqueFarmerIds.length === 0) {
        return 0;
      }
      
      // Calculate total deductions for all these farmers
      let totalDeductions = 0;
      for (const farmerId of uniqueFarmerIds) {
        const farmerDeductions = await deductionService.calculateTotalDeductionsForFarmer(farmerId);
        totalDeductions += farmerDeductions;
      }
      
      return parseFloat(totalDeductions.toFixed(2));
    } catch (error) {
      logger.errorWithContext('CollectorEarningsService - calculateCollectorDeductions exception', error);
      return 0;
    }
  }

}

// Export singleton instance
export const collectorEarningsService = CollectorEarningsService.getInstance();
