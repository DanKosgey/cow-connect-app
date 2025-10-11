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

export class PaymentService {
  // Direct payment method for admin (marks collection as paid immediately)
  static async markCollectionAsPaid(collectionId: string, farmerId: string, collection: Collection) {
    try {
      // Create payment record in the collection_payments table
      const { data: paymentData, error: paymentError } = await supabase
        .from('collection_payments')
        .insert({
          collection_id: collectionId,
          amount: collection.total_amount,
          rate_applied: collection.rate_per_liter
        })
        .select()
        .limit(1);

      if (paymentError) throw paymentError;
      
      // Update collection status
      const { error: collectionError } = await supabase
        .from('collections')
        .update({ status: 'Paid' })
        .eq('id', collectionId);

      if (collectionError) throw collectionError;

      // Send notification
      if (farmerId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: farmerId,
            title: 'Payment Received',
            message: `Your payment of KES ${parseFloat(collection.total_amount?.toString() || '0').toFixed(2)} has been processed`,
            type: 'payment'
          });
      }

      return { success: true, data: paymentData };
    } catch (error) {
      console.error('Error marking collection as paid:', error);
      return { success: false, error };
    }
  }

  // Approval workflow method for staff (creates payment record for approval)
  static async createPaymentForApproval(farmerId: string, collectionIds: string[], totalAmount: number, notes?: string, approvedBy?: string) {
    try {
      const { data, error } = await supabase
        .from('farmer_payments')
        .insert({
          farmer_id: farmerId,
          collection_ids: collectionIds,
          total_amount: totalAmount,
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
          notes: notes || null
        })
        .select()
        .limit(1);

      if (error) throw error;
      
      // Update collections to mark them as approved for payment
      const { error: updateError } = await supabase
        .from('collections')
        .update({ 
          approved_for_payment: true,
          approved_at: new Date().toISOString(),
          approved_by: approvedBy
        })
        .in('id', collectionIds);

      if (updateError) throw updateError;

      return { success: true, data };
    } catch (error) {
      console.error('Error creating payment for approval:', error);
      return { success: false, error };
    }
  }

  // Mark payment as paid (for staff to finalize approved payments)
  static async markPaymentAsPaid(paymentId: string, paidBy?: string) {
    try {
      const { data, error } = await supabase
        .from('farmer_payments')
        .update({
          approval_status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: paidBy
        })
        .eq('id', paymentId)
        .select()
        .limit(1);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      return { success: false, error };
    }
  }

  // Get payment history for a farmer
  static async getFarmerPaymentHistory(farmerId: string) {
    try {
      const { data, error } = await supabase
        .from('farmer_payments')
        .select(`
          id,
          farmer_id,
          collection_ids,
          total_amount,
          approval_status,
          approved_at,
          paid_at,
          notes,
          created_at,
          farmers!farmer_payments_farmer_id_fkey (
            full_name,
            id,
            phone_number
          )
        `)
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching farmer payment history:', error);
      return { success: false, error };
    }
  }

  // Get all payments with status filter
  static async getAllPayments(status?: string) {
    try {
      let query = supabase
        .from('farmer_payments')
        .select(`
          id,
          farmer_id,
          collection_ids,
          total_amount,
          approval_status,
          approved_at,
          paid_at,
          notes,
          created_at,
          farmers!farmer_payments_farmer_id_fkey (
            full_name,
            id,
            phone_number
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('approval_status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching payments:', error);
      return { success: false, error };
    }
  }
}