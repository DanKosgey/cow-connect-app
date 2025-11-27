import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface VarianceData {
  collectedLiters: number;
  receivedLiters: number;
  varianceLiters: number;
  variancePercentage: number;
  varianceType: 'positive' | 'negative' | 'none';
}

export class VarianceCalculationService {
  /**
   * Calculate variance between collected and received milk amounts
   */
  static calculateVariance(collectedLiters: number, receivedLiters: number): VarianceData {
    const varianceLiters = receivedLiters - collectedLiters;
    const variancePercentage = collectedLiters > 0 
      ? (varianceLiters / collectedLiters) * 100 
      : 0;
    
    let varianceType: 'positive' | 'negative' | 'none' = 'none';
    if (varianceLiters > 0) {
      varianceType = 'positive';
    } else if (varianceLiters < 0) {
      varianceType = 'negative';
    }
    
    return {
      collectedLiters,
      receivedLiters,
      varianceLiters,
      variancePercentage,
      varianceType
    };
  }

  /**
   * Calculate penalty based on variance and configured rates
   */
  static async calculatePenalty(varianceData: VarianceData): Promise<number> {
    try {
      // Only calculate penalty for non-zero variances
      if (varianceData.varianceType === 'none') {
        return 0;
      }

      // Get active penalty configuration for the variance type and percentage
      const { data, error } = await supabase
        .from('variance_penalty_config')
        .select('penalty_rate_per_liter')
        .eq('is_active', true)
        .eq('variance_type', varianceData.varianceType)
        .gte('max_variance_percentage', Math.abs(varianceData.variancePercentage))
        .lte('min_variance_percentage', Math.abs(varianceData.variancePercentage))
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('VarianceCalculationService - fetching penalty config', error);
        throw error;
      }

      if (!data) {
        // No matching penalty configuration found, return 0
        return 0;
      }

      // Calculate penalty: |variance_liters| * penalty_rate_per_liter
      return Math.abs(varianceData.varianceLiters) * data.penalty_rate_per_liter;
    } catch (error) {
      logger.errorWithContext('VarianceCalculationService - calculatePenalty', error);
      throw error;
    }
  }

  /**
   * Process collection approval with automatic variance calculation
   */
  static async processCollectionApproval(
    collectionId: string,
    staffId: string,
    companyReceivedLiters: number,
    approvalNotes?: string
  ) {
    try {
      // Get the collection details
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('id, liters, farmer_id, staff_id')
        .eq('id', collectionId)
        .maybeSingle();

      if (collectionError) {
        logger.errorWithContext('VarianceCalculationService - fetching collection', collectionError);
        throw collectionError;
      }

      if (!collection) {
        throw new Error('Collection not found');
      }

      // Calculate variance using the automated system
      const varianceData = this.calculateVariance(
        collection.liters, 
        companyReceivedLiters
      );

      // Calculate penalty using the automated system
      const penaltyAmount = await this.calculatePenalty(varianceData);

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
        logger.errorWithContext('VarianceCalculationService - creating approval', approvalError);
        throw approvalError;
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
        logger.errorWithContext('VarianceCalculationService - updating collection', updateError);
        throw updateError;
      }

      // Log the automated processing for audit trail
      await this.logAutomatedProcessing(
        collectionId,
        staffId,
        varianceData,
        penaltyAmount,
        approval.id
      );

      return { success: true, data: approval };
    } catch (error) {
      logger.errorWithContext('VarianceCalculationService - processCollectionApproval', error);
      return { success: false, error };
    }
  }

  /**
   * Log automated processing for audit trail
   */
  static async logAutomatedProcessing(
    collectionId: string,
    staffId: string,
    varianceData: VarianceData,
    penaltyAmount: number,
    approvalId: string
  ) {
    try {
      const auditData = {
        collection_id: collectionId,
        staff_id: staffId,
        company_received_liters: varianceData.receivedLiters,
        variance_liters: varianceData.varianceLiters,
        variance_percentage: varianceData.variancePercentage,
        variance_type: varianceData.varianceType,
        penalty_amount: penaltyAmount,
        approval_id: approvalId,
        processing_type: 'automated'
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'milk_approvals',
          record_id: approvalId,
          operation: 'approve_collection_automated',
          changed_by: staffId,
          new_data: auditData
        });

      if (auditError) {
        logger.warn('Warning: Failed to log automated processing audit entry', auditError);
      }
    } catch (error) {
      logger.errorWithContext('VarianceCalculationService - logAutomatedProcessing', error);
      // Don't throw error as this is supplementary functionality
      console.warn('Failed to log automated processing audit entry:', error);
    }
  }

  /**
   * Validate that the weighing process was done in a timely manner
   */
  static async validateWeighingTimeliness(
    collectionId: string,
    weighingTimestamp: Date
  ): Promise<boolean> {
    try {
      const { data: collection, error } = await supabase
        .from('collections')
        .select('collection_date')
        .eq('id', collectionId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('VarianceCalculationService - fetching collection for timeliness check', error);
        throw error;
      }

      if (!collection) {
        throw new Error('Collection not found for timeliness check');
      }

      // Convert collection_date to Date object
      const collectionDate = new Date(collection.collection_date);
      
      // Calculate the time difference in hours
      const timeDifferenceHours = 
        (weighingTimestamp.getTime() - collectionDate.getTime()) / (1000 * 60 * 60);
      
      // Allow up to 24 hours for weighing
      return timeDifferenceHours <= 24;
    } catch (error) {
      logger.errorWithContext('VarianceCalculationService - validateWeighingTimeliness', error);
      // In case of error, we'll allow the weighing to proceed but log the issue
      return true;
    }
  }
}