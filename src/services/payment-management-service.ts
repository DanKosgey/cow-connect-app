import { supabase } from '@/integrations/supabase/client';

interface Collection {
  id: string;
  farmer_id: string;
  total_amount: number;
  rate_per_liter: number;
  status: string;
}

interface FarmerPayment {
  id: string;
  farmer_id: string;
  collection_ids: string[];
  total_amount: number;
  approval_status: string;
  notes?: string;
}

export class PaymentManagementService {
  // Mark a single collection as paid
  static async markCollectionAsPaid(collectionId: string, farmerId: string, collection: Collection) {
    try {
      // Update collection status to 'Paid'
      const { error: collectionError } = await supabase
        .from('collections')
        .update({ 
          status: 'Paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (collectionError) throw collectionError;

      // Find and update related farmer_payments records
      const { data: relatedPayments, error: findPaymentsError } = await supabase
        .from('farmer_payments')
        .select('id, collection_ids, approval_status')
        .contains('collection_ids', [collectionId]);

      if (findPaymentsError) {
        console.warn('Warning: Error finding related farmer payments', findPaymentsError);
      } else if (relatedPayments && relatedPayments.length > 0) {
        // Update all related farmer_payments to mark as approved (since 'paid' is not a valid enum value)
        for (const payment of relatedPayments) {
          // Only update if the payment is not already approved
          if (payment.approval_status !== 'approved') {
            const { error: updatePaymentError } = await supabase
              .from('farmer_payments')
              .update({ 
                approval_status: 'approved',
                paid_at: new Date().toISOString()
              })
              .eq('id', payment.id);

            if (updatePaymentError) {
              console.warn('Warning: Error updating farmer payment status', updatePaymentError);
            }
          }
        }
      }

      // Create payment record in collection_payments table
      const { error: paymentError } = await supabase
        .from('collection_payments')
        .insert({
          collection_id: collectionId,
          amount: collection.total_amount,
          rate_applied: collection.rate_per_liter
        });

      if (paymentError) throw paymentError;

      // Send notification to farmer
      if (farmerId) {
        try {
          const { data: farmerData, error: farmerError } = await supabase
            .from('farmers')
            .select('user_id')
            .eq('id', farmerId)
            .maybeSingle();

          if (!farmerError && farmerData && farmerData.user_id) {
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: farmerData.user_id,
                title: 'Payment Received',
                message: `Your payment of KES ${parseFloat(collection.total_amount?.toString() || '0').toFixed(2)} has been processed for collection ${collectionId.substring(0, 8)}`,
                type: 'payment',
                category: 'payment'
              });

            if (notificationError) {
              console.warn('Warning: Failed to send payment notification', notificationError);
            }
          }
        } catch (notificationException) {
          console.warn('Warning: Exception while sending payment notification', notificationException);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking collection as paid:', error);
      return { success: false, error };
    }
  }

  // Mark all collections for a farmer as paid
  static async markAllFarmerCollectionsAsPaid(farmerId: string, collections: Collection[]) {
    try {
      // Mark each collection as paid
      const results = await Promise.all(
        collections.map(collection => 
          this.markCollectionAsPaid(collection.id, farmerId, collection)
        )
      );
      
      // Check if all operations were successful
      const failedOperations = results.filter(result => !result.success);
      if (failedOperations.length > 0) {
        throw new Error(`Failed to mark ${failedOperations.length} collections as paid`);
      }
      
      return { success: true, data: results };
    } catch (error) {
      console.error('Error marking all farmer collections as paid:', error);
      return { success: false, error };
    }
  }

  // Get payment summary for all farmers
  static async getFarmerPaymentSummaries() {
    try {
      // Get all collections with farmer information
      const { data: collections, error } = await supabase
        .from('collections')
        .select(`
          id,
          farmer_id,
          liters,
          total_amount,
          status,
          collection_date,
          farmers (
            id,
            user_id,
            bank_account_name,
            bank_account_number,
            bank_name,
            profiles (
              full_name,
              phone
            )
          )
        `)
        .order('collection_date', { ascending: false });

      if (error) throw error;

      // Group by farmer and calculate summaries
      const farmerSummaries = collections?.reduce((acc: any, collection: any) => {
        const farmerId = collection.farmer_id;
        if (!acc[farmerId]) {
          acc[farmerId] = {
            farmer_id: farmerId,
            farmer_name: collection.farmers?.profiles?.full_name || 'Unknown Farmer',
            farmer_phone: collection.farmers?.profiles?.phone || 'No phone',
            total_collections: 0,
            total_liters: 0,
            total_amount: 0,
            paid_amount: 0,
            pending_amount: 0,
            bank_info: `${collection.farmers?.bank_name || 'N/A'} - ${collection.farmers?.bank_account_number || 'No account'}`
          };
        }
        
        acc[farmerId].total_collections += 1;
        acc[farmerId].total_liters += collection.liters || 0;
        acc[farmerId].total_amount += collection.total_amount || 0;
        
        if (collection.status === 'Paid') {
          acc[farmerId].paid_amount += collection.total_amount || 0;
        } else {
          acc[farmerId].pending_amount += collection.total_amount || 0;
        }
        
        return acc;
      }, {}) || {};

      return { success: true, data: Object.values(farmerSummaries) };
    } catch (error) {
      console.error('Error fetching farmer payment summaries:', error);
      return { success: false, error };
    }
  }

  // Get payment analytics
  static async getPaymentAnalytics() {
    try {
      // Get all collections
      const { data: collections, error } = await supabase
        .from('collections')
        .select('id, farmer_id, total_amount, status, collection_date')
        .order('collection_date', { ascending: false });

      if (error) throw error;

      const pendingCollections = collections?.filter(c => c.status !== 'Paid') || [];
      const paidCollections = collections?.filter(c => c.status === 'Paid') || [];
      
      const totalPending = pendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
      const totalPaid = paidCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
      const uniqueFarmers = new Set(collections?.map(c => c.farmer_id)).size;
      
      // Calculate daily trend (last 7 days)
      const dailyTrend = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayTotal = collections
          ?.filter(c => c.status === 'Paid' && c.collection_date.startsWith(dateString))
          .reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
        
        dailyTrend.push({ date: dateString, amount: dayTotal });
      }
      
      // Calculate farmer distribution (top 5 farmers by payment amount)
      const farmerPayments = collections?.reduce((acc, collection) => {
        const farmerId = collection.farmer_id;
        if (!acc[farmerId]) {
          acc[farmerId] = {
            name: `Farmer ${farmerId.substring(0, 8)}`,
            value: 0
          };
        }
        acc[farmerId].value += collection.total_amount || 0;
        return acc;
      }, {} as Record<string, { name: string; value: number }>) || {};
      
      const farmerDistribution = Object.values(farmerPayments)
        .sort((a, b) => (b as { name: string; value: number }).value - (a as { name: string; value: number }).value)
        .slice(0, 5);

      return { 
        success: true, 
        data: {
          total_pending: totalPending,
          total_paid: totalPaid,
          total_farmers: uniqueFarmers,
          avg_payment: uniqueFarmers > 0 ? (totalPending + totalPaid) / uniqueFarmers : 0,
          daily_trend: dailyTrend,
          farmer_distribution: farmerDistribution
        }
      };
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      return { success: false, error };
    }
  }

  // Get collections with filters
  static async getCollections(status?: string, search?: string) {
    try {
      let query = supabase
        .from('collections')
        .select(`
          *,
          farmers (
            id,
            user_id,
            bank_account_name,
            bank_account_number,
            bank_name,
            profiles!user_id (
              full_name,
              phone
            )
          )
        `)
        .order('collection_date', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filter if provided
      let filteredData = data || [];
      if (search) {
        filteredData = filteredData.filter(collection => 
          collection.farmers?.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          collection.collection_id?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return { success: true, data: filteredData };
    } catch (error) {
      console.error('Error fetching collections:', error);
      return { success: false, error };
    }
  }
}