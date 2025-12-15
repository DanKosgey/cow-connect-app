import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { EnhancedAuditService } from './enhanced-audit-service';
import { CollectionNotificationService } from './collection-notification-service';

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

interface StaffInfo {
  staffId: string;
  userId: string;
  fullName: string;
  email: string;
  roles: string[];
}

export class MilkApprovalService {
  /**
   * Get staff information by staff ID with proper role identification
   */
  static async getStaffInfo(staffId: string): Promise<StaffInfo | null> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('id', staffId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('MilkApprovalService - fetching staff info', error);
        return null;
      }

      if (!data) {
        logger.warn('MilkApprovalService - staff not found', { staffId });
        return null;
      }

      // Fetch roles as an ARRAY (not maybeSingle)
      // A user can have multiple roles, and maybeSingle fails if multiple rows exist
      let roles: string[] = [];
      if (data.user_id) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user_id)
          .eq('active', true);

        if (rolesError) {
          logger.warn('MilkApprovalService - fetching roles for staff', rolesError);
        } else if (rolesData) {
          roles = rolesData.map((r: any) => r.role);
        }
      }

      return {
        staffId: data.id,
        userId: data.user_id,
        fullName: data.profiles?.full_name || 'Unknown',
        email: data.profiles?.email || '',
        roles
      };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - getStaffInfo', error);
      return null;
    }
  }

  /**
   * Get all staff members with their roles (for filtering collectors vs staff)
   */
  static async getAllStaff(): Promise<StaffInfo[]> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          profiles (
            id,
            full_name,
            email
          )
        `);

      if (error) {
        logger.errorWithContext('MilkApprovalService - fetching all staff', error);
        return [];
      }

      // Fetch roles for all staff members
      const userIds = (data || [])
        .map((staff: any) => staff.user_id)
        .filter(Boolean);

      let rolesMap = new Map<string, string[]>();

      if (userIds.length > 0) {
        const { data: allRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .eq('active', true);

        if (!rolesError && allRoles) {
          allRoles.forEach((ur: any) => {
            if (!rolesMap.has(ur.user_id)) {
              rolesMap.set(ur.user_id, []);
            }
            rolesMap.get(ur.user_id)?.push(ur.role);
          });
        }
      }

      return (data || []).map((staff: any) => {
        const roles = rolesMap.get(staff.user_id) || [];
        return {
          staffId: staff.id,
          userId: staff.user_id,
          fullName: staff.profiles?.full_name || 'Unknown',
          email: staff.profiles?.email || '',
          roles
        };
      });
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - getAllStaff', error);
      return [];
    }
  }

  /**
   * Get collectors only
   */
  static async getCollectors(): Promise<StaffInfo[]> {
    const allStaff = await this.getAllStaff();
    return allStaff.filter(staff => staff.roles.includes('collector'));
  }

  /**
   * Get staff members (non-collectors)
   */
  static async getStaffMembers(): Promise<StaffInfo[]> {
    const allStaff = await this.getAllStaff();
    return allStaff.filter(staff => staff.roles.includes('staff'));
  }

  /**
   * Get pending collections with enriched collector information
   * These collections are ready for approval by staff members
   * 
   * FIXED: Uses separate queries to avoid schema cache issues with table relationships
   * NOTE: RLS policies now handle appropriate access control - staff can view all pending collections
   */
  static async getPendingCollections(currentUserId?: string) {
    try {
      console.log('Fetching pending collections...', { currentUserId });
      
      // Build the base query - fetch ALL pending collections
      // RLS policies will filter appropriately based on user role
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_date,
          liters,
          farmer_id,
          staff_id,
          status,
          approved_for_company,
          company_approval_id,
          created_at
        `)
        .eq('approved_for_company', false)
        .order('collection_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (collectionsError) {
        logger.errorWithContext('MilkApprovalService - fetching collections', collectionsError);
        throw collectionsError;
      }

      logger.info('MilkApprovalService - fetched pending collections', {
        collectionCount: collections?.length || 0
      });

      console.log('Raw collections data:', collections);

      if (!collections || collections.length === 0) {
        return { success: true, data: [] };
      }

      // Extract unique staff IDs and farmer IDs
      const staffIds = [...new Set(collections.map((c: any) => c.staff_id).filter(Boolean))] as string[];
      const farmerIds = [...new Set(collections.map((c: any) => c.farmer_id).filter(Boolean))] as string[];

      console.log('Extracted staff IDs:', staffIds);
      console.log('Extracted farmer IDs:', farmerIds);

      // Fetch staff data with profile information in one query
      let staffData: any[] = [];
      if (staffIds.length > 0) {
        const { data, error } = await supabase
          .from('staff')
          .select(`
            id,
            user_id,
            profiles (
              id,
              full_name,
              email,
              phone
            )
          `)
          .in('id', staffIds);

        console.log('Staff query result:', { data, error });

        if (error) {
          logger.warn('MilkApprovalService - fetching staff data', error);
        } else {
          staffData = data || [];
        }
      }

      console.log('Staff data fetched:', staffData);

      // Fetch farmers data with profile information in one query
      let farmersData: any[] = [];
      if (farmerIds.length > 0) {
        const { data, error } = await supabase
          .from('farmers')
          .select(`
            id,
            user_id,
            registration_number,
            profiles (
              id,
              full_name,
              phone
            )
          `)
          .in('id', farmerIds);

        console.log('Farmers query result:', { data, error });

        if (error) {
          logger.warn('MilkApprovalService - fetching farmers data', error);
        } else {
          farmersData = data || [];
        }
      }

      console.log('Farmers data fetched:', farmersData);

      // Create maps for quick lookup
      const staffMap = staffData.reduce((acc, staff) => {
        acc[staff.id] = staff;
        return acc;
      }, {} as Record<string, any>);

      const farmersMap = farmersData.reduce((acc, farmer) => {
        acc[farmer.id] = farmer;
        return acc;
      }, {} as Record<string, any>);

      // Enrich collections with collector and farmer info
      const enrichedCollections = collections.map((collection: any, index: number) => {
        const staffRecord = staffMap[collection.staff_id];
        const farmerRecord = farmersMap[collection.farmer_id];

        // Build collector info from the staff data with embedded profile
        const collectorInfo = staffRecord ? {
          staffId: staffRecord.id,
          userId: staffRecord.user_id,
          fullName: staffRecord.profiles?.full_name || 'Unknown Collector',
          email: staffRecord.profiles?.email || '',
          phone: staffRecord.profiles?.phone || '',
          roles: [] // Will populate this below
        } : {
          staffId: collection.staff_id,
          userId: '',
          fullName: collection.staff_id ? 'Unknown Collector' : 'Unassigned',
          email: '',
          phone: '',
          roles: []
        };

        // Build farmer info from the farmers data with embedded profile
        const farmerInfo = farmerRecord ? {
          id: farmerRecord.id,
          fullName: farmerRecord.profiles?.full_name || 'Unknown Farmer',
          phoneNumber: farmerRecord.profiles?.phone || '',
          registrationNumber: farmerRecord.registration_number || ''
        } : {
          id: collection.farmer_id,
          fullName: collection.farmer_id ? 'Unknown Farmer' : 'Unassigned',
          phoneNumber: '',
          registrationNumber: ''
        };

        const enrichedCollection = {
          ...collection,
          status: collection.status || 'pending',
          collector: collectorInfo,
          farmer: farmerInfo
        };

        // Log enrichment for debugging
        if (index < 5) {
          console.log('Enriched collection:', {
            index,
            originalStaffId: collection.staff_id,
            hasStaffRecord: !!staffRecord,
            collectorName: enrichedCollection.collector?.fullName,
            farmerName: enrichedCollection.farmer?.fullName
          });
        }

        return enrichedCollection;
      });

      // Now fetch roles for all staff members in the collections
      const userIds = staffData
        .map((s: any) => s.user_id)
        .filter(Boolean);

      console.log('User IDs to fetch roles for:', userIds);

      // Bulk fetch roles for those user_ids
      const rolesMap = new Map<string, string[]>();
      if (userIds.length > 0) {
        const { data: allRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .eq('active', true);

        if (rolesError) {
          logger.warn('MilkApprovalService - bulk fetching roles for collectors', rolesError);
        } else if (allRoles) {
          allRoles.forEach((ur: any) => {
            if (!rolesMap.has(ur.user_id)) {
              rolesMap.set(ur.user_id, []);
            }
            rolesMap.get(ur.user_id)?.push(ur.role);
          });
        }
      }

      console.log('Roles map created:', rolesMap);

      // Apply roles to the enriched collections
      enrichedCollections.forEach((collection: any) => {
        if (collection.collector?.userId && rolesMap.has(collection.collector.userId)) {
          collection.collector.roles = rolesMap.get(collection.collector.userId) || [];
        }
      });

      logger.info('MilkApprovalService - final enriched collections', {
        collectionCount: enrichedCollections.length,
        foundCollectorCount: enrichedCollections.filter((c: any) => 
          c.collector?.fullName !== 'Unknown Collector'
        ).length,
        foundFarmerCount: enrichedCollections.filter((c: any) => 
          c.farmer?.fullName !== 'Unknown Farmer'
        ).length,
        sampleCollections: enrichedCollections.slice(0, 2)
      });

      console.log('Final enriched collections:', enrichedCollections.slice(0, 3));

      return { success: true, data: enrichedCollections };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - getPendingCollections', error);
      return { success: false, error };
    }
  }

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
        return 0;
      }

      return Math.abs(varianceData.varianceLiters) * data.penalty_rate_per_liter;
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - calculatePenalty', error);
      throw error;
    }
  }

  /**
   * Convert user ID to staff ID
   */
  static async convertUserIdToStaffId(userId: string): Promise<{ success: boolean; staffId?: string; error?: string }> {
    try {
      console.log('Converting user ID to staff ID:', userId);
      
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Staff data lookup result:', { staffData, staffError });

      if (staffError) {
        logger.errorWithContext('MilkApprovalService - converting user ID to staff ID', staffError);
        return { success: false, error: `Database error: ${staffError.message}` };
      }

      if (staffData?.id) {
        logger.info('MilkApprovalService - converted user ID to staff ID', {
          userId,
          staffId: staffData.id
        });
        return { success: true, staffId: staffData.id };
      }

      logger.warn('Staff record not found for user ID', userId);
      return { success: false, error: 'User does not have a staff record. Only staff members can approve collections.' };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - convertUserIdToStaffId', error);
      return { success: false, error: 'Failed to validate staff credentials' };
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

      // Convert user ID to staff ID if needed
      const staffIdResult = await this.convertUserIdToStaffId(approvalData.staffId);
      if (!staffIdResult.success) {
        throw new Error(staffIdResult.error);
      }
      const staffId = staffIdResult.staffId!;

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
          staff_id: staffId,
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
          approved_by: staffId,
          updated_at: new Date().toISOString()
        })
        .eq('id', approvalData.collectionId);

      if (updateError) {
        logger.errorWithContext('MilkApprovalService - updating collection approval status', updateError);
        throw updateError;
      }

      // Send notification to farmer
      try {
        await CollectionNotificationService.sendCollectionApprovedForPaymentNotification(
          approvalData.collectionId,
          collection.farmer_id,
          staffId
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send approval notification', notificationError);
      }

      return {
        success: true,
        data: {
          approval,
          collectionId: approvalData.collectionId,
          farmerId: collection.farmer_id
        }
      };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - approveMilkCollection', error);
      return { success: false, error };
    }
  }

  /**
   * Batch approve all collections for a collector on a specific date
   */
  static async batchApproveCollections(
    staffId: string,
    collectorId: string,
    collectionDate: string,
    defaultReceivedLiters?: number
  ) {
    try {
      console.log('Batch approve collections called with:', {
        staffId,
        collectorId,
        collectionDate,
        defaultReceivedLiters
      });

      // Validate inputs
      if (!staffId || !collectorId || !collectionDate) {
        logger.errorWithContext('MilkApprovalService - batchApproveCollections - Missing required parameters', {
          staffId: !!staffId,
          collectorId: !!collectorId,
          collectionDate: !!collectionDate
        });
        return { success: false, error: new Error('Staff ID, collector ID, and collection date are required') };
      }

      // Convert user ID to staff ID if needed
      const staffIdResult = await this.convertUserIdToStaffId(staffId);
      if (!staffIdResult.success) {
        return { success: false, error: new Error(staffIdResult.error) };
      }
      const actualStaffId = staffIdResult.staffId!;

      logger.info('MilkApprovalService - batchApproveCollections called with parameters', {
        staffId: actualStaffId,
        originalStaffId: staffId,
        collectorId,
        collectionDate,
        defaultReceivedLiters
      });

      // Validate default received liters if provided
      if (defaultReceivedLiters !== undefined && defaultReceivedLiters < 0) {
        logger.errorWithContext('MilkApprovalService - batchApproveCollections - Negative default received liters', {
          defaultReceivedLiters
        });
        return { success: false, error: new Error('Default received liters cannot be negative') };
      }

      console.log('Calling RPC with parameters:', {
        p_staff_id: actualStaffId,
        p_collector_id: collectorId,
        p_collection_date: collectionDate,
        p_total_received_liters: defaultReceivedLiters
      });

      // Call the database function for batch approval
      const { data, error } = await supabase
        .rpc('batch_approve_collector_collections', {
          p_staff_id: actualStaffId,
          p_collector_id: collectorId,
          p_collection_date: collectionDate,
          p_total_received_liters: defaultReceivedLiters
        });

      console.log('RPC result:', { data, error });

      if (error) {
        logger.errorWithContext('MilkApprovalService - batch approving collections FAILED', {
          error: error.message,
          staffId: actualStaffId,
          originalStaffId: staffId,
          collectorId,
          collectionDate
        });
        return { success: false, error };
      }

      logger.info('MilkApprovalService - batch approving collections SUCCESS', {
        approvedCount: data?.[0]?.approved_count,
        staffId: actualStaffId,
        originalStaffId: staffId,
        collectorId,
        collectionDate
      });

      // Log audit entry for batch operation
      await this.logBatchAuditEntry(
        actualStaffId,
        collectorId,
        collectionDate,
        data?.[0] || {}
      );

      // Send notification to collector
      try {
        await this.sendBatchApprovalNotification(
          collectorId,
          collectionDate,
          data?.[0] || {}
        );
      } catch (notificationError) {
        logger.warn('Warning: Failed to send batch approval notification', notificationError);
      }

      return { success: true, data: data?.[0] || {} };
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - batchApproveCollections - Unexpected error', {
        error,
        staffId,
        collectorId,
        collectionDate
      });
      return { success: false, error };
    }
  }

  /**
   * Send notification about batch approval to collector
   */
  static async sendBatchApprovalNotification(
    collectorId: string,
    collectionDate: string,
    summaryData: any
  ) {
    try {
      // Get the collector's user ID
      const { data: collector, error: collectorError } = await supabase
        .from('staff')
        .select('user_id')
        .eq('id', collectorId)
        .maybeSingle();

      if (collectorError) {
        logger.errorWithContext('MilkApprovalService - fetching collector for notification', collectorError);
        throw collectorError;
      }

      if (!collector || !collector.user_id) {
        return;
      }

      // Create notification message
      let message = `Batch approval completed for ${collectionDate}. `;
      message += `${summaryData.approved_count} collections approved. `;
      message += `Total variance: ${summaryData.total_variance?.toFixed(2) || 0}L. `;

      if (summaryData.total_penalty_amount > 0) {
        message += `Total penalties applied: KSh ${summaryData.total_penalty_amount.toFixed(2)}.`;
      }

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: collector.user_id,
          title: 'Batch Milk Collections Approved',
          message: message,
          type: 'info',
          category: 'collection_approval'
        });

      if (notificationError) {
        logger.warn('Warning: Failed to send batch approval notification', notificationError);
      }
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - sendBatchApprovalNotification', error);
    }
  }

  /**
   * Log audit entry for batch approval operation
   */
  static async logBatchAuditEntry(
    staffId: string,
    collectorId: string,
    collectionDate: string,
    summaryData: any
  ) {
    try {
      // Get staff name
      const staffInfo = await this.getStaffInfo(staffId);
      const staffName = staffInfo?.fullName || 'Unknown Staff';

      const auditData = {
        collector_id: collectorId,
        collection_date: collectionDate,
        approved_count: summaryData.approved_count,
        total_liters_collected: summaryData.total_liters_collected,
        total_liters_received: summaryData.total_liters_received,
        total_variance: summaryData.total_variance,
        total_penalty_amount: summaryData.total_penalty_amount,
        timestamp: new Date().toISOString(),
        staff_name: staffName
      };

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'collections',
          operation: 'batch_approve_collections',
          changed_by: staffId,
          new_data: {
            ...auditData,
            description: `Batch approval performed by ${staffName} for collector ${collectorId} on ${collectionDate}. ${summaryData.approved_count} collections approved.`
          }
        });

      if (auditError) {
        logger.warn('Warning: Failed to log batch audit entry', auditError);
      }
    } catch (error) {
      logger.errorWithContext('MilkApprovalService - logBatchAuditEntry', error);
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
        .limit(12);

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