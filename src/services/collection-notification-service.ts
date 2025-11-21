import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class CollectionNotificationService {
  /**
   * Send notification when a collection is approved for payment
   */
  static async sendCollectionApprovedForPaymentNotification(
    collectionId: string,
    farmerId: string,
    approvedBy?: string
  ) {
    try {
      // Get farmer's user ID
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CollectionNotificationService - fetching farmer for notification', farmerError);
        return;
      }

      if (!farmer || !farmer.user_id) {
        logger.warn('CollectionNotificationService - Farmer user_id not found', { farmerId });
        return;
      }

      // Get collection details
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('liters, total_amount, collection_date')
        .eq('id', collectionId)
        .eq('approved_for_company', true) // Only consider approved collections
        .maybeSingle();

      if (collectionError) {
        logger.errorWithContext('CollectionNotificationService - fetching collection for notification', collectionError);
        return;
      }

      if (!collection) {
        logger.warn('CollectionNotificationService - Collection not found', { collectionId });
        return;
      }

      // Create notification message
      const message = `Your milk collection of ${collection.liters.toFixed(2)}L collected on ${new Date(collection.collection_date).toLocaleDateString()} has been approved for payment. Expected payment amount: KSh ${collection.total_amount.toFixed(2)}.`;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: farmer.user_id,
          title: 'Collection Approved for Payment',
          message: message,
          type: 'info',
          category: 'payment_approval'
        });

      if (notificationError) {
        logger.warn('CollectionNotificationService - Failed to send approval notification', notificationError);
      }

      // Send real-time notification via Supabase broadcast
      const channel = supabase.channel('collection_approvals');
      await channel.send({
        type: 'broadcast',
        event: 'collection_approved',
        payload: {
          collectionId,
          farmerId,
          farmerName: farmer.profiles?.full_name || 'Unknown Farmer',
          liters: collection.liters,
          amount: collection.total_amount,
          approvedBy,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.errorWithContext('CollectionNotificationService - sendCollectionApprovedForPaymentNotification', error);
    }
  }

  /**
   * Send notification when a collection is marked as paid
   */
  static async sendCollectionPaidNotification(
    collectionId: string,
    farmerId: string,
    paidBy?: string
  ) {
    try {
      // Get farmer's user ID
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('user_id, profiles(full_name)')
        .eq('id', farmerId)
        .maybeSingle();

      if (farmerError) {
        logger.errorWithContext('CollectionNotificationService - fetching farmer for paid notification', farmerError);
        return;
      }

      if (!farmer || !farmer.user_id) {
        logger.warn('CollectionNotificationService - Farmer user_id not found for paid notification', { farmerId });
        return;
      }

      // Get collection details
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('liters, total_amount, collection_date')
        .eq('id', collectionId)
        .eq('approved_for_company', true) // Only consider approved collections
        .maybeSingle();

      if (collectionError) {
        logger.errorWithContext('CollectionNotificationService - fetching collection for paid notification', collectionError);
        return;
      }

      if (!collection) {
        logger.warn('CollectionNotificationService - Collection not found for paid notification', { collectionId });
        return;
      }

      // Create notification message
      const message = `Payment of KSh ${collection.total_amount.toFixed(2)} for your milk collection of ${collection.liters.toFixed(2)}L collected on ${new Date(collection.collection_date).toLocaleDateString()} has been processed.`;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: farmer.user_id,
          title: 'Payment Processed',
          message: message,
          type: 'success',
          category: 'payment_processed'
        });

      if (notificationError) {
        logger.warn('CollectionNotificationService - Failed to send paid notification', notificationError);
      }

      // Send real-time notification via Supabase broadcast
      const channel = supabase.channel('collection_payments');
      await channel.send({
        type: 'broadcast',
        event: 'collection_paid',
        payload: {
          collectionId,
          farmerId,
          farmerName: farmer.profiles?.full_name || 'Unknown Farmer',
          liters: collection.liters,
          amount: collection.total_amount,
          paidBy,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.errorWithContext('CollectionNotificationService - sendCollectionPaidNotification', error);
    }
  }

  /**
   * Subscribe to real-time collection approval notifications
   */
  static subscribeToCollectionApprovals(callback: (payload: any) => void) {
    const channel = supabase.channel('collection_approvals');
    
    channel.on(
      'broadcast',
      { event: 'collection_approved' },
      (payload) => {
        callback(payload);
      }
    ).subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to real-time collection payment notifications
   */
  static subscribeToCollectionPayments(callback: (payload: any) => void) {
    const channel = supabase.channel('collection_payments');
    
    channel.on(
      'broadcast',
      { event: 'collection_paid' },
      (payload) => {
        callback(payload);
      }
    ).subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }
}