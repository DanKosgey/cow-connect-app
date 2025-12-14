import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { VarianceCalculationService } from './variance-calculation-service';
import { EnhancedAuditService } from './enhanced-audit-service';
import { CollectionTimestampService } from './collection-timestamp-service';
import { GPSVerificationService } from './gps-verification-service';

export class AutomatedApprovalService {
  /**
   * Process automated approval for a collection
   */
  static async processAutomatedApproval(
    collectionId: string,
    staffId: string,
    companyReceivedLiters: number,
    approvalNotes?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Log the start of automated approval process
      logger.info('Starting automated approval process', { collectionId, staffId });
      
      // Validate collection timestamp
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select(`
          id,
          liters,
          collection_date,
          farmer_id,
          staff_id,
          gps_latitude,
          gps_longitude
        `)
        .eq('id', collectionId)
        .maybeSingle();

      if (collectionError) {
        logger.errorWithContext('AutomatedApprovalService - fetching collection', collectionError);
        return { success: false, error: 'Failed to fetch collection data' };
      }

      if (!collection) {
        return { success: false, error: 'Collection not found' };
      }

      // Validate weighing timeliness
      const timelinessValidation = await CollectionTimestampService.validateWeighingTimeliness(
        collectionId,
        new Date()
      );

      if (!timelinessValidation.valid) {
        await EnhancedAuditService.logSuspiciousActivity(
          'late_weighing',
          {
            collectionId,
            staffId,
            error: timelinessValidation.error
          },
          staffId,
          collectionId
        );
        
        return { 
          success: false, 
          error: timelinessValidation.error || 'Weighing is not timely' 
        };
      }

      // Validate GPS location if provided
      if (location && collection.gps_latitude && collection.gps_longitude) {
        const locationValidation = await GPSVerificationService.validateStaffLocation(
          staffId,
          location.latitude,
          location.longitude
        );

        if (!locationValidation.valid) {
          await EnhancedAuditService.logSuspiciousActivity(
            'invalid_staff_location',
            {
              collectionId,
              staffId,
              location,
              error: locationValidation.error
            },
            staffId,
            collectionId
          );
          
          // We'll log the issue but not fail the approval
          logger.warn('Invalid staff location during approval', {
            collectionId,
            staffId,
            error: locationValidation.error
          });
        }
      }

      // Calculate variance using the automated system
      const varianceData = VarianceCalculationService.calculateVariance(
        collection.liters,
        companyReceivedLiters
      );

      // Calculate penalty using the automated system
      const penaltyAmount = await VarianceCalculationService.calculatePenalty(varianceData);

      // Create milk approval record with automated calculations
      const { data: approval, error: approvalError } = await supabase
        .from('milk_approvals')
        .insert({
          collection_id: collectionId,
          staff_id: staffId,
          company_received_liters: companyReceivedLiters,
          variance_liters: varianceData.varianceLiters,
          variance_percentage: varianceData.variancePercentage,
          variance_type: varianceData.varianceType,
          penalty_amount: penaltyAmount,
          approval_notes: approvalNotes
        })
        .select()
        .single();

      if (approvalError) {
        logger.errorWithContext('AutomatedApprovalService - creating approval', approvalError);
        return { success: false, error: 'Failed to create approval record' };
      }

      // Update collection to mark as approved
      const { error: updateError } = await supabase
        .from('collections')
        .update({
          approved_for_company: true,
          company_approval_id: approval.id,
          approved_by: staffId,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (updateError) {
        logger.errorWithContext('AutomatedApprovalService - updating collection', updateError);
        return { success: false, error: 'Failed to update collection status' };
      }

      // Log the automated processing for audit trail
      await EnhancedAuditService.logVarianceCalculation(
        collectionId,
        staffId,
        varianceData,
        penaltyAmount
      );

      await EnhancedAuditService.logApproval(
        approval.id,
        collectionId,
        staffId,
        {
          companyReceivedLiters,
          varianceLiters: varianceData.varianceLiters,
          variancePercentage: varianceData.variancePercentage,
          varianceType: varianceData.varianceType,
          penaltyAmount,
          approvalNotes
        }
      );

      logger.info('Automated approval process completed successfully', { 
        collectionId, 
        approvalId: approval.id 
      });

      return { success: true, data: approval };
    } catch (error) {
      logger.errorWithContext('AutomatedApprovalService - processAutomatedApproval', error);
      
      // Log the error for audit trail
      await EnhancedAuditService.logSuspiciousActivity(
        'approval_processing_error',
        {
          collectionId,
          staffId,
          error: String(error)
        },
        staffId,
        collectionId
      );
      
      return { success: false, error: 'Failed to process automated approval' };
    }
  }

  /**
   * Process batch automated approvals
   */
  static async processBatchApprovals(
    approvalData: {
      collectionId: string;
      staffId: string;
      companyReceivedLiters: number;
      approvalNotes?: string;
    }[]
  ): Promise<{ 
    success: boolean; 
    results: { 
      collectionId: string; 
      success: boolean; 
      error?: string; 
      approvalId?: string 
    }[]; 
    error?: string 
  }> {
    try {
      const results = [];
      
      // Process each approval sequentially to avoid overwhelming the system
      for (const data of approvalData) {
        try {
          const result = await this.processAutomatedApproval(
            data.collectionId,
            data.staffId,
            data.companyReceivedLiters,
            data.approvalNotes
          );
          
          results.push({
            collectionId: data.collectionId,
            success: result.success,
            error: result.error,
            approvalId: result.data?.id
          });
        } catch (error) {
          logger.errorWithContext('AutomatedApprovalService - batch approval error', error);
          results.push({
            collectionId: data.collectionId,
            success: false,
            error: String(error)
          });
        }
      }
      
      // Check if all approvals were successful
      const allSuccessful = results.every(result => result.success);
      
      // Log batch processing for audit trail
      await EnhancedAuditService.logCollectionInteraction(
        'batch_approvals',
        approvalData[0]?.staffId || 'system',
        'batch_approval_processed',
        {
          totalCount: approvalData.length,
          successfulCount: results.filter(r => r.success).length,
          failedCount: results.filter(r => !r.success).length,
          results
        }
      );
      
      return {
        success: allSuccessful,
        results
      };
    } catch (error) {
      logger.errorWithContext('AutomatedApprovalService - processBatchApprovals', error);
      return { 
        success: false, 
        results: [], 
        error: 'Failed to process batch approvals' 
      };
    }
  }

  /**
   * Validate approval data before processing
   */
  static async validateApprovalData(
    collectionId: string,
    companyReceivedLiters: number
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Validate that the collection exists and is not already approved
      const { data: collection, error } = await supabase
        .from('collections')
        .select('id, approved_for_company')
        .eq('id', collectionId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('AutomatedApprovalService - validating collection', error);
        return { valid: false, error: 'Failed to validate collection' };
      }

      if (!collection) {
        return { valid: false, error: 'Collection not found' };
      }

      if (collection.approved_for_company) {
        return { valid: false, error: 'Collection is already approved' };
      }

      // Validate that received liters is a positive number
      if (companyReceivedLiters < 0) {
        return { valid: false, error: 'Received liters cannot be negative' };
      }

      return { valid: true };
    } catch (error) {
      logger.errorWithContext('AutomatedApprovalService - validateApprovalData', error);
      return { valid: false, error: 'Failed to validate approval data' };
    }
  }

  /**
   * Get approval statistics for reporting
   */
  static async getApprovalStatistics(timeRange: '24h' | '7d' | '30d' = '7d') {
    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
          break;
        case '7d':
          startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          break;
        case '30d':
          startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          break;
        default:
          startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      }

      // Check if we have an authenticated session before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        logger.warn('No authenticated session available for getting approval statistics');
        throw new Error('Authentication required to get approval statistics');
      }

      // Get approval statistics
      const { data: statistics, error } = await supabase.rpc('get_approval_statistics', {
        start_date: startDate.toISOString(),
        end_date: now.toISOString()
      });

      if (error) {
        logger.errorWithContext('AutomatedApprovalService - fetching statistics', error);
        throw error;
      }

      return statistics || [];
    } catch (error) {
      logger.errorWithContext('AutomatedApprovalService - getApprovalStatistics', error);
      throw error;
    }
  }
}