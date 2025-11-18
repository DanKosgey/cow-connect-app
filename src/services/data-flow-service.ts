import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { EnhancedAuditService } from './enhanced-audit-service';

export class DataFlowService {
  /**
   * Validate that data flow is one-way from collector to staff
   * Prevents staff from modifying collector data and collectors from viewing approval data
   */
  static async validateOneWayDataFlow(
    userId: string,
    userRole: string,
    operation: string,
    tableName: string,
    recordId?: string
  ): Promise<{ allowed: boolean; error?: string }> {
    try {
      // Log the data access attempt
      await EnhancedAuditService.logCollectionInteraction(
        recordId || 'unknown',
        userId,
        `data_access_${operation}`,
        { userRole, tableName, operation }
      );

      // Define allowed operations for each role
      const allowedOperations: Record<string, Record<string, string[]>> = {
        collector: {
          collections: ['insert', 'select_own'],
          farmers: ['select'],
          // Collectors should not be able to access approval or variance data
        },
        staff: {
          collections: ['select', 'update_approval'],
          milk_approvals: ['insert', 'select'],
          variance_penalty_config: ['select'],
          // Staff should not be able to modify core collection data
        },
        admin: {
          // Admins have broader access but still with restrictions
          collections: ['select', 'update_approval', 'admin_update'],
          milk_approvals: ['insert', 'select', 'update'],
          variance_penalty_config: ['insert', 'select', 'update'],
        }
      };

      // Check if the operation is allowed for this role
      const roleOperations = allowedOperations[userRole]?.[tableName];
      if (!roleOperations) {
        return { 
          allowed: false, 
          error: `Role ${userRole} has no access to table ${tableName}` 
        };
      }

      // Special validation for staff updating collections
      if (userRole === 'staff' && tableName === 'collections' && operation === 'update') {
        // Staff can only update approval-related fields
        return { 
          allowed: true 
        };
      }

      // Special validation for collectors accessing collections
      if (userRole === 'collector' && tableName === 'collections' && operation === 'select') {
        // Collectors can only select their own collections
        const { data: collection, error } = await supabase
          .from('collections')
          .select('staff_id')
          .eq('id', recordId)
          .maybeSingle();

        if (error) {
          logger.errorWithContext('DataFlowService - validating collector access', error);
          return { allowed: false, error: 'Failed to validate access' };
        }

        if (collection && collection.staff_id !== userId) {
          return { 
            allowed: false, 
            error: 'Collectors can only view their own collections' 
          };
        }
      }

      // Check if the specific operation is allowed
      if (roleOperations.includes(operation) || roleOperations.includes('all')) {
        return { allowed: true };
      }

      return { 
        allowed: false, 
        error: `Operation ${operation} not allowed for role ${userRole} on table ${tableName}` 
      };
    } catch (error) {
      logger.errorWithContext('DataFlowService - validateOneWayDataFlow', error);
      return { allowed: false, error: 'Failed to validate data flow' };
    }
  }

  /**
   * Enforce one-way data flow at the application level
   */
  static async enforceOneWayDataFlow<T>(
    userId: string,
    userRole: string,
    operation: string,
    tableName: string,
    action: () => Promise<T>,
    recordId?: string
  ): Promise<T> {
    try {
      // Validate the data flow
      const validation = await this.validateOneWayDataFlow(
        userId,
        userRole,
        operation,
        tableName,
        recordId
      );

      if (!validation.allowed) {
        // Log the violation
        await EnhancedAuditService.logSuspiciousActivity(
          'data_flow_violation',
          {
            userId,
            userRole,
            operation,
            tableName,
            recordId,
            error: validation.error
          },
          userId,
          recordId
        );

        throw new Error(validation.error || 'Data flow violation detected');
      }

      // Execute the action
      return await action();
    } catch (error) {
      logger.errorWithContext('DataFlowService - enforceOneWayDataFlow', error);
      throw error;
    }
  }

  /**
   * Get data flow policy for a user role
   */
  static getDataFlowPolicy(userRole: string): Record<string, string[]> {
    const policies: Record<string, Record<string, string[]>> = {
      collector: {
        allowedTables: ['collections', 'farmers'],
        allowedOperations: ['insert', 'select_own'],
        restrictedTables: ['milk_approvals', 'variance_penalty_config'],
      },
      staff: {
        allowedTables: ['collections', 'milk_approvals', 'variance_penalty_config'],
        allowedOperations: ['select', 'insert_approval', 'update_approval'],
        restrictedTables: ['user_roles', 'staff'],
      },
      admin: {
        allowedTables: ['collections', 'milk_approvals', 'variance_penalty_config', 'user_roles', 'staff'],
        allowedOperations: ['select', 'insert', 'update', 'delete'],
        restrictedTables: [],
      }
    };

    return policies[userRole] || {
      allowedTables: [],
      allowedOperations: [],
      restrictedTables: ['collections', 'milk_approvals', 'variance_penalty_config', 'user_roles', 'staff'],
    };
  }

  /**
   * Monitor data flow for suspicious patterns
   */
  static async monitorDataFlow(): Promise<void> {
    try {
      // Get recent audit logs for data access
      const { data: recentAccessLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('operation', 'data_access')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        logger.errorWithContext('DataFlowService - monitoring data flow', error);
        return;
      }

      if (!recentAccessLogs || recentAccessLogs.length === 0) {
        return;
      }

      // Check for suspicious patterns
      const suspiciousPatterns: any[] = [];

      // Group logs by user
      const userLogs: Record<string, any[]> = {};
      recentAccessLogs.forEach(log => {
        const userId = log.changed_by;
        if (!userLogs[userId]) {
          userLogs[userId] = [];
        }
        userLogs[userId].push(log);
      });

      // Check each user's access patterns
      for (const [userId, logs] of Object.entries(userLogs)) {
        // Check if user is accessing data they shouldn't
        const restrictedAccess = logs.filter(log => {
          const data = log.new_data;
          return data?.restricted_access;
        });

        if (restrictedAccess.length > 0) {
          suspiciousPatterns.push({
            userId,
            pattern: 'restricted_data_access',
            count: restrictedAccess.length,
            logs: restrictedAccess
          });
        }

        // Check for rapid access to multiple records
        if (logs.length > 50) {
          suspiciousPatterns.push({
            userId,
            pattern: 'high_volume_access',
            count: logs.length,
            logs: logs.slice(0, 5)
          });
        }
      }

      // Report suspicious patterns
      if (suspiciousPatterns.length > 0) {
        for (const pattern of suspiciousPatterns) {
          await EnhancedAuditService.logSuspiciousActivity(
            'suspicious_data_flow_pattern',
            pattern,
            pattern.userId
          );
        }
      }
    } catch (error) {
      logger.errorWithContext('DataFlowService - monitorDataFlow', error);
    }
  }
}