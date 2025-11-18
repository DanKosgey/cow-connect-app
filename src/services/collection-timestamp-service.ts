import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class CollectionTimestampService {
  /**
   * Validate that collection is not backdated
   */
  static async validateCollectionDate(collectionDate: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const collectionDateTime = new Date(collectionDate);
      const now = new Date();
      
      // Collection date cannot be in the future
      if (collectionDateTime > now) {
        return { 
          valid: false, 
          error: 'Collection date cannot be in the future' 
        };
      }
      
      // Collection date cannot be more than 24 hours in the past
      const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      if (collectionDateTime < twentyFourHoursAgo) {
        return { 
          valid: false, 
          error: 'Collection date cannot be more than 24 hours in the past' 
        };
      }
      
      return { valid: true };
    } catch (error) {
      logger.errorWithContext('CollectionTimestampService - validateCollectionDate', error);
      return { 
        valid: false, 
        error: 'Invalid collection date format' 
      };
    }
  }

  /**
   * Validate that weighing is done in a timely manner
   */
  static async validateWeighingTimeliness(
    collectionId: string,
    weighingTimestamp: Date
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const { data: collection, error } = await supabase
        .from('collections')
        .select('collection_date, sealed_at')
        .eq('id', collectionId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('CollectionTimestampService - fetching collection for timeliness check', error);
        return { 
          valid: false, 
          error: 'Failed to fetch collection data' 
        };
      }

      if (!collection) {
        return { 
          valid: false, 
          error: 'Collection not found' 
        };
      }

      // Convert collection_date to Date object
      const collectionDate = new Date(collection.collection_date);
      
      // Calculate the time difference in hours between collection and weighing
      const timeDifferenceHours = 
        (weighingTimestamp.getTime() - collectionDate.getTime()) / (1000 * 60 * 60);
      
      // Weighing must be done within 24 hours of collection
      if (timeDifferenceHours > 24) {
        return { 
          valid: false, 
          error: 'Weighing must be done within 24 hours of collection' 
        };
      }
      
      // Weighing cannot be done before collection
      if (timeDifferenceHours < 0) {
        return { 
          valid: false, 
          error: 'Weighing cannot be done before collection' 
        };
      }
      
      return { valid: true };
    } catch (error) {
      logger.errorWithContext('CollectionTimestampService - validateWeighingTimeliness', error);
      return { 
        valid: false, 
        error: 'Failed to validate weighing timeliness' 
      };
    }
  }

  /**
   * Get collection timeline for audit purposes
   */
  static async getCollectionTimeline(collectionId: string) {
    try {
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          collection_date,
          created_at,
          sealed_at,
          updated_at
        `)
        .eq('id', collectionId)
        .maybeSingle();

      if (collectionError) {
        logger.errorWithContext('CollectionTimestampService - fetching collection timeline', collectionError);
        throw collectionError;
      }

      if (!collection) {
        throw new Error('Collection not found');
      }

      const { data: approvals, error: approvalsError } = await supabase
        .from('milk_approvals')
        .select(`
          id,
          approved_at,
          created_at
        `)
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: true });

      if (approvalsError) {
        logger.errorWithContext('CollectionTimestampService - fetching approval timeline', approvalsError);
        throw approvalsError;
      }

      // Get audit logs for this collection
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select(`
          id,
          operation,
          created_at,
          changed_by
        `)
        .eq('record_id', collectionId)
        .order('created_at', { ascending: true });

      if (auditError) {
        logger.errorWithContext('CollectionTimestampService - fetching audit timeline', auditError);
        throw auditError;
      }

      return {
        collection,
        approvals: approvals || [],
        auditLogs: auditLogs || []
      };
    } catch (error) {
      logger.errorWithContext('CollectionTimestampService - getCollectionTimeline', error);
      throw error;
    }
  }

  /**
   * Detect suspicious timing patterns
   */
  static async detectSuspiciousTiming(collectionId: string): Promise<boolean> {
    try {
      const timeline = await this.getCollectionTimeline(collectionId);
      
      // Check if collection was created long after the collection date
      const collectionDate = new Date(timeline.collection.collection_date);
      const createdAt = new Date(timeline.collection.created_at);
      const creationDelay = (createdAt.getTime() - collectionDate.getTime()) / (1000 * 60); // minutes
      
      // If collection was created more than 30 minutes after the collection date, flag as suspicious
      if (creationDelay > 30) {
        logger.warn('Suspicious timing detected: Collection created long after collection date', {
          collectionId,
          collectionDate,
          createdAt,
          delayMinutes: creationDelay
        });
        return true;
      }
      
      // Check if there's a long gap between creation and first approval
      if (timeline.approvals.length > 0) {
        const firstApproval = new Date(timeline.approvals[0].created_at);
        const approvalDelay = (firstApproval.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // hours
        
        // If first approval was more than 24 hours after creation, flag as suspicious
        if (approvalDelay > 24) {
          logger.warn('Suspicious timing detected: Long delay between collection and approval', {
            collectionId,
            createdAt,
            firstApproval,
            delayHours: approvalDelay
          });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.errorWithContext('CollectionTimestampService - detectSuspiciousTiming', error);
      // If we can't check timing, assume it's not suspicious
      return false;
    }
  }
}