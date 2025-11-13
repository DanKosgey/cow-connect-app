import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface MilkApprovalData {
  collectionId: string;
  staffId: string;
  companyReceivedLiters: number;
  approvalNotes?: string;
}

interface VarianceData {
  collectedLiters: number;
  receivedLiters: number;
  varianceLiters: number;
  variancePercentage: number;
  varianceType: 'positive' | 'negative' | 'none';
}

export class MilkApprovalService {
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
        logger.errorWithContext('MilkApprovalService - fetching penalty config', error);
        throw error;
      }

      if (!data) {
        // No matching penalty configuration found, return 0
        return 0;
      }

      // Calculate penalty: |variance_liters| * penalty_rate_per_liter
      return Math.abs(varianceData.varianceLiters) * data.penalty_rate_per_liter;
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - calculatePenalty', error);
      throw error;
    }
  }

  /**
   * Approve milk collection with variance tracking
   */
  static async approveMilkCollection(approvalData: MilkApprovalData) {
    try {
      // Get the collection details
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('id, liters, farmer_id, staff_id')
        .eq('id', approvalData.collectionId)
        .maybeSingle();

      if (collectionError) {
        logger.errorWithContext('MilkApprovalService - fetching collection', collectionError);
        throw collectionError;
      }

      if (!collection) {
        throw new Error('Collection not found');
      }

      // Calculate variance
      const varianceData = this.calculateVariance(
        collection.liters, 
        approvalData.companyReceivedLiters
      );

      // Calculate penalty
      const penaltyAmount = await this.calculatePenalty(varianceData);

      // Create milk approval record
      const { data: approval, error: approvalError } = await supabase
        .from('milk_approvals')
        .insert({
          collection_id: approvalData.collectionId,
          staff_id: approvalData.staffId,
          company_received_liters: approvalData.companyReceivedLiters,
          variance_liters: varianceData.varianceLiters,
          variance_percentage: varianceData.variancePercentage,
          variance_type: varianceData.varianceType,
          penalty_amount: penaltyAmount,
          approval_notes: approvalData.approvalNotes
        })
        .select()
        .single();

      if (approvalError) {
        logger.errorWithContext('MilkApprovalService - creating approval', approvalError);
        throw approvalError;
      }

      // Update collection to mark as approved
      const { error: updateError } = await supabase
        .from('collections')
        .update({
          approved_for_company: true,
          company_approval_id: approval.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', approvalData.collectionId);

      if (updateError) {
        logger.errorWithContext('MilkApprovalService - updating collection', updateError);
        throw updateError;
      }

      // Update collector performance metrics
      await this.updateCollectorPerformance(
        collection.staff_id, 
        varianceData, 
        penaltyAmount
      );

      // Send notification to collector about approval
      await this.sendApprovalNotification(
        collection.staff_id,
        approvalData.collectionId,
        varianceData,
        penaltyAmount
      );

      // Log audit entry
      await this.logAuditEntry(
        approvalData.collectionId,
        approvalData.staffId,
        varianceData,
        penaltyAmount,
        approval.id
      );

      return { success: true, data: approval };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - approveMilkCollection', error);
      return { success: false, error };
    }
  }

  /**
   * Update collector performance metrics
   */
  static async updateCollectorPerformance(
    collectorId: string, 
    varianceData: VarianceData, 
    penaltyAmount: number
  ) {
    try {
      // Get current performance record for this collector for the current period
      // For simplicity, we'll use the current month as the period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Try to get existing performance record
      const { data: existingPerformance, error: fetchError } = await supabase
        .from('collector_performance')
        .select('*')
        .eq('staff_id', collectorId)
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .eq('period_end', periodEnd.toISOString().split('T')[0])
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('MilkApprovalService - fetching performance record', fetchError);
        throw fetchError;
      }

      if (existingPerformance) {
        // Update existing record
        const updates: any = {
          total_collections: existingPerformance.total_collections + 1,
          total_liters_collected: existingPerformance.total_liters_collected + varianceData.collectedLiters,
          total_liters_received: existingPerformance.total_liters_received + varianceData.receivedLiters,
          total_variance: existingPerformance.total_variance + varianceData.varianceLiters,
          total_penalty_amount: existingPerformance.total_penalty_amount + penaltyAmount,
          updated_at: new Date().toISOString()
        };

        // Update variance type counters
        if (varianceData.varianceType === 'positive') {
          updates.positive_variances = existingPerformance.positive_variances + 1;
        } else if (varianceData.varianceType === 'negative') {
          updates.negative_variances = existingPerformance.negative_variances + 1;
        }

        // Recalculate average variance percentage
        if (updates.total_collections > 0) {
          updates.average_variance_percentage = (updates.total_variance / updates.total_liters_collected) * 100;
        }

        // Recalculate performance score (simplified formula)
        // Performance score decreases with higher penalties and variances
        const baseScore = 100;
        const penaltyDeduction = (updates.total_penalty_amount / 1000) * 5; // 5 points per 1000 penalty
        const varianceDeduction = Math.abs(updates.total_variance) * 0.1; // 0.1 points per liter variance
        updates.performance_score = Math.max(0, baseScore - penaltyDeduction - varianceDeduction);

        const { error: updateError } = await supabase
          .from('collector_performance')
          .update(updates)
          .eq('id', existingPerformance.id);

        if (updateError) {
          logger.errorWithContext('MilkApprovalService - updating performance record', updateError);
          throw updateError;
        }
      } else {
        // Create new performance record
        const performanceData: any = {
          staff_id: collectorId,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          total_collections: 1,
          total_liters_collected: varianceData.collectedLiters,
          total_liters_received: varianceData.receivedLiters,
          total_variance: varianceData.varianceLiters,
          total_penalty_amount: penaltyAmount,
          average_variance_percentage: varianceData.variancePercentage,
          performance_score: 100 // Start with perfect score
        };

        // Set variance type counters
        if (varianceData.varianceType === 'positive') {
          performanceData.positive_variances = 1;
          performanceData.negative_variances = 0;
        } else if (varianceData.varianceType === 'negative') {
          performanceData.positive_variances = 0;
          performanceData.negative_variances = 1;
        } else {
          performanceData.positive_variances = 0;
          performanceData.negative_variances = 0;
        }

        // Calculate performance score
        const penaltyDeduction = (penaltyAmount / 1000) * 5;
        const varianceDeduction = Math.abs(varianceData.varianceLiters) * 0.1;
        performanceData.performance_score = Math.max(0, 100 - penaltyDeduction - varianceDeduction);

        const { error: insertError } = await supabase
          .from('collector_performance')
          .insert(performanceData);

        if (insertError) {
          logger.errorWithContext('MilkApprovalService - creating performance record', insertError);
          throw insertError;
        }
      }
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - updateCollectorPerformance', error);
      // Don't throw error as this is supplementary functionality
      console.warn('Failed to update collector performance metrics:', error);
    }
  }

  /**
   * Send notification about approval status
   */
  static async sendApprovalNotification(
    collectorId: string,
    collectionId: string,
    varianceData: VarianceData,
    penaltyAmount: number
  ) {
    try {
      // Get the collector's user ID
      const { data: collector, error: collectorError } = await supabase
        .from('staff')
        .select('user_id')
        .eq('id', collectorId)
        .maybeSingle();

      if (collectorError) {
        logger.errorWithContext('MilkApprovalService - fetching collector', collectorError);
        throw collectorError;
      }

      if (!collector || !collector.user_id) {
        // No user ID found, skip notification
        return;
      }

      // Create notification message
      let message = `Milk collection ${collectionId.substring(0, 8)} has been approved. `;
      
      if (varianceData.varianceType === 'positive') {
        message += `Positive variance of ${varianceData.varianceLiters.toFixed(2)}L (${varianceData.variancePercentage.toFixed(2)}%). `;
      } else if (varianceData.varianceType === 'negative') {
        message += `Negative variance of ${varianceData.varianceLiters.toFixed(2)}L (${varianceData.variancePercentage.toFixed(2)}%). `;
      } else {
        message += 'No variance detected. ';
      }
      
      if (penaltyAmount > 0) {
        message += `Penalty applied: KSh ${penaltyAmount.toFixed(2)}.`;
      }

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: collector.user_id,
          title: 'Milk Collection Approved',
          message: message,
          type: 'info',
          category: 'collection_approval'
        });

      if (notificationError) {
        logger.warn('Warning: Failed to send approval notification', notificationError);
      }
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - sendApprovalNotification', error);
      // Don't throw error as this is supplementary functionality
      console.warn('Failed to send approval notification:', error);
    }
  }

  /**
   * Log audit entry for milk approval action
   */
  static async logAuditEntry(
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
        approval_id: approvalId
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'milk_approvals',
          record_id: approvalId,
          operation: 'approve_collection',
          changed_by: staffId,
          new_data: auditData
        });

      if (auditError) {
        logger.warn('Warning: Failed to log audit entry', auditError);
      }
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - logAuditEntry', error);
      // Don't throw error as this is supplementary functionality
      console.warn('Failed to log audit entry:', error);
    }
  }

  /**
   * Get pending collections for approval
   */
  static async getPendingCollections() {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          liters,
          collection_date,
          status,
          approved_for_company,
          farmers (
            full_name,
            id
          ),
          staff!collections_staff_id_fkey (
            id,
            user_id
          )
        `)
        .eq('status', 'Collected')
        .eq('approved_for_company', false)
        .order('collection_date', { ascending: false });

      if (error) {
        logger.errorWithContext('MilkApprovalService - fetching pending collections', error);
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - getPendingCollections', error);
      return { success: false, error };
    }
  }

  /**
   * Get approval history for a collection
   */
  static async getCollectionApprovalHistory(collectionId: string) {
    try {
      const { data, error } = await supabase
        .from('milk_approvals')
        .select(`
          id,
          company_received_liters,
          variance_liters,
          variance_percentage,
          variance_type,
          penalty_amount,
          approval_notes,
          approved_at,
          created_at,
          staff!milk_approvals_staff_id_fkey (
            id,
            user_id,
            profiles (
              full_name
            )
          )
        `)
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('MilkApprovalService - fetching approval history', error);
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - getCollectionApprovalHistory', error);
      return { success: false, error };
    }
  }

  /**
   * Get collector performance metrics
   */
  static async getCollectorPerformance(collectorId: string) {
    try {
      const { data, error } = await supabase
        .from('collector_performance')
        .select('*')
        .eq('staff_id', collectorId)
        .order('period_start', { ascending: false })
        .limit(12); // Last 12 periods (months)

      if (error) {
        logger.errorWithContext('MilkApprovalService - fetching collector performance', error);
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - getCollectorPerformance', error);
      return { success: false, error };
    }
  }
}