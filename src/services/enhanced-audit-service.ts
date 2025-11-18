import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class EnhancedAuditService {
  /**
   * Log collection creation with detailed information
   */
  static async logCollectionCreation(
    collectionId: string,
    staffId: string,
    farmerId: string,
    liters: number,
    location?: { latitude: number; longitude: number }
  ) {
    try {
      const auditData = {
        collection_id: collectionId,
        staff_id: staffId,
        farmer_id: farmerId,
        liters: liters,
        location: location,
        action: 'collection_created',
        timestamp: new Date().toISOString()
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'collections',
          record_id: collectionId,
          operation: 'create',
          changed_by: staffId,
          new_data: auditData
        });

      if (auditError) {
        logger.warn('Warning: Failed to log collection creation audit entry', auditError);
      }
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - logCollectionCreation', error);
    }
  }

  /**
   * Log weighing session with authentication details
   */
  static async logWeighingSession(
    collectionId: string,
    staffId: string,
    receivedLiters: number,
    sessionId: string,
    authenticationMethod: string,
    additionalDetails?: {
      ipAddress?: string;
      userAgent?: string;
      location?: { latitude: number; longitude: number };
      deviceInfo?: string;
    }
  ) {
    try {
      const auditData = {
        collection_id: collectionId,
        staff_id: staffId,
        received_liters: receivedLiters,
        session_id: sessionId,
        authentication_method: authenticationMethod,
        additional_details: additionalDetails,
        action: 'weighing_session',
        timestamp: new Date().toISOString()
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'milk_approvals',
          record_id: collectionId,
          operation: 'weighing_session',
          changed_by: staffId,
          new_data: auditData
        });

      if (auditError) {
        logger.warn('Warning: Failed to log weighing session audit entry', auditError);
      }
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - logWeighingSession', error);
    }
  }

  /**
   * Log variance calculation with automated processing details
   */
  static async logVarianceCalculation(
    collectionId: string,
    staffId: string,
    varianceData: {
      collectedLiters: number;
      receivedLiters: number;
      varianceLiters: number;
      variancePercentage: number;
      varianceType: string;
    },
    penaltyAmount: number
  ) {
    try {
      const auditData = {
        collection_id: collectionId,
        staff_id: staffId,
        variance_data: varianceData,
        penalty_amount: penaltyAmount,
        action: 'variance_calculation',
        processing_type: 'automated',
        timestamp: new Date().toISOString()
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'milk_approvals',
          record_id: collectionId,
          operation: 'variance_calculation',
          changed_by: staffId,
          new_data: auditData
        });

      if (auditError) {
        logger.warn('Warning: Failed to log variance calculation audit entry', auditError);
      }
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - logVarianceCalculation', error);
    }
  }

  /**
   * Log approval with comprehensive details
   */
  static async logApproval(
    approvalId: string,
    collectionId: string,
    staffId: string,
    approvalData: {
      companyReceivedLiters: number;
      varianceLiters: number;
      variancePercentage: number;
      varianceType: string;
      penaltyAmount: number;
      approvalNotes?: string;
    }
  ) {
    try {
      const auditData = {
        approval_id: approvalId,
        collection_id: collectionId,
        staff_id: staffId,
        approval_data: approvalData,
        action: 'approval_processed',
        timestamp: new Date().toISOString()
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'milk_approvals',
          record_id: approvalId,
          operation: 'approve',
          changed_by: staffId,
          new_data: auditData
        });

      if (auditError) {
        logger.warn('Warning: Failed to log approval audit entry', auditError);
      }
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - logApproval', error);
    }
  }

  /**
   * Send real-time notification to admins
   */
  private static async sendAdminNotification(
    activityType: string,
    details: any,
    staffId?: string,
    collectionId?: string
  ) {
    try {
      // Get all admin users
      const { data: admins, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminError) {
        logger.errorWithContext('EnhancedAuditService - fetching admins', adminError);
        return;
      }

      if (!admins || admins.length === 0) {
        return;
      }

      // Create notifications for each admin
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        title: `Suspicious Activity Detected: ${activityType}`,
        message: `Type: ${activityType}\nStaff: ${staffId || 'Unknown'}\nCollection: ${collectionId || 'Unknown'}\nDetails: ${JSON.stringify(details)}`,
        type: 'warning',
        category: 'security_alert',
        created_at: new Date().toISOString()
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        logger.warn('Warning: Failed to send admin notifications', notificationError);
      }
      
      // Send real-time notification via Supabase realtime
      await this.sendRealtimeNotification(activityType, details, staffId, collectionId);
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - sendAdminNotification', error);
    }
  }

  /**
   * Send real-time notification via Supabase realtime
   */
  private static async sendRealtimeNotification(
    activityType: string,
    details: any,
    staffId?: string,
    collectionId?: string
  ) {
    try {
      // Send a realtime event that admin dashboards can listen to
      const channel = supabase.channel('security_alerts');
      
      await channel.send({
        type: 'broadcast',
        event: 'security_alert',
        payload: {
          activityType,
          details,
          staffId,
          collectionId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - sendRealtimeNotification', error);
    }
  }

  /**
   * Log suspicious activity for admin notification
   */
  static async logSuspiciousActivity(
    activityType: string,
    details: any,
    staffId?: string,
    collectionId?: string
  ) {
    try {
      const auditData = {
        activity_type: activityType,
        details: details,
        staff_id: staffId,
        collection_id: collectionId,
        action: 'suspicious_activity',
        timestamp: new Date().toISOString()
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'suspicious_activities',
          operation: 'detect',
          changed_by: staffId || 'system',
          new_data: auditData
        });

      if (auditError) {
        logger.warn('Warning: Failed to log suspicious activity audit entry', auditError);
      }
      
      // Also send real-time notification to admins
      await this.sendAdminNotification(activityType, details, staffId, collectionId);
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - logSuspiciousActivity', error);
    }
  }

  /**
   * Get audit trail for a specific collection
   */
  static async getCollectionAuditTrail(collectionId: string) {
    try {
      const { data: auditLogs, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          table_name,
          operation,
          changed_by,
          old_data,
          new_data,
          created_at
        `)
        .or(`record_id.eq.${collectionId},new_data->>collection_id.eq.${collectionId}`)
        .order('created_at', { ascending: true });

      if (error) {
        logger.errorWithContext('EnhancedAuditService - fetching audit trail', error);
        throw error;
      }

      return auditLogs || [];
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - getCollectionAuditTrail', error);
      throw error;
    }
  }

  /**
   * Get comprehensive audit report for fraud detection
   */
  static async getFraudDetectionReport(timeRange: '24h' | '7d' | '30d' = '7d') {
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

      // Get suspicious activities
      const { data: suspiciousActivities, error: activitiesError } = await supabase
        .from('audit_logs')
        .select(`
          id,
          operation,
          changed_by,
          new_data,
          created_at
        `)
        .eq('table_name', 'suspicious_activities')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (activitiesError) {
        logger.errorWithContext('EnhancedAuditService - fetching suspicious activities', activitiesError);
        throw activitiesError;
      }

      // Get collections with high variance
      const { data: highVarianceCollections, error: varianceError } = await supabase
        .from('milk_approvals')
        .select(`
          id,
          collection_id,
          variance_percentage,
          variance_type,
          penalty_amount,
          created_at,
          staff!milk_approvals_staff_id_fkey (
            id,
            profiles (
              full_name
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .gte('variance_percentage', 10) // 10% or higher variance
        .order('variance_percentage', { ascending: false })
        .limit(50);

      if (varianceError) {
        logger.errorWithContext('EnhancedAuditService - fetching high variance collections', varianceError);
        throw varianceError;
      }

      // Get collections with negative variances (potential theft)
      const { data: negativeVarianceCollections, error: negativeError } = await supabase
        .from('milk_approvals')
        .select(`
          id,
          collection_id,
          variance_percentage,
          variance_liters,
          created_at,
          staff!milk_approvals_staff_id_fkey (
            id,
            profiles (
              full_name
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lt('variance_liters', 0) // Negative variance
        .order('variance_liters', { ascending: true })
        .limit(50);

      if (negativeError) {
        logger.errorWithContext('EnhancedAuditService - fetching negative variance collections', negativeError);
        throw negativeError;
      }

      return {
        suspiciousActivities: suspiciousActivities || [],
        highVarianceCollections: highVarianceCollections || [],
        negativeVarianceCollections: negativeVarianceCollections || [],
        reportGeneratedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - getFraudDetectionReport', error);
      throw error;
    }
  }

  /**
   * Log all interactions with collection data for comprehensive audit trail
   */
  static async logCollectionInteraction(
    collectionId: string,
    userId: string,
    action: string,
    details?: any
  ) {
    try {
      const auditData = {
        collection_id: collectionId,
        user_id: userId,
        action: action,
        details: details,
        timestamp: new Date().toISOString()
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'collections',
          record_id: collectionId,
          operation: 'interaction',
          changed_by: userId,
          new_data: auditData
        });

      if (auditError) {
        logger.warn('Warning: Failed to log collection interaction audit entry', auditError);
      }
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - logCollectionInteraction', error);
    }
  }

  /**
   * Get all audit logs for a specific user
   */
  static async getUserAuditTrail(userId: string, limit: number = 100) {
    try {
      const { data: auditLogs, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          table_name,
          operation,
          record_id,
          changed_by,
          old_data,
          new_data,
          created_at
        `)
        .eq('changed_by', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.errorWithContext('EnhancedAuditService - fetching user audit trail', error);
        throw error;
      }

      return auditLogs || [];
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - getUserAuditTrail', error);
      throw error;
    }
  }

  /**
   * Get audit summary for a specific time period
   */
  static async getAuditSummary(startDate: string, endDate: string) {
    try {
      // We'll need to use raw SQL for grouping since Supabase doesn't support group() directly
      const { data: auditSummary, error } = await supabase.rpc('get_audit_summary', {
        start_date: startDate,
        end_date: endDate
      });

      if (error) {
        logger.errorWithContext('EnhancedAuditService - fetching audit summary', error);
        throw error;
      }

      return auditSummary || [];
    } catch (error) {
      logger.errorWithContext('EnhancedAuditService - getAuditSummary', error);
      throw error;
    }
  }
}