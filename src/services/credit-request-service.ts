import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CreditServiceEssentials } from './credit-service-essentials';

export interface CreditRequest {
  id: string;
  farmer_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export class CreditRequestService {
  // Create a new credit request
  static async createCreditRequest(
    farmerId: string,
    productId: string,
    quantity: number,
    productName: string,
    unitPrice: number
  ): Promise<CreditRequest> {
    try {
      const totalAmount = quantity * unitPrice;
      
      const { data, error } = await supabase
        .from('credit_requests')
        .insert({
          farmer_id: farmerId,
          product_id: productId,
          product_name: productName,
          quantity: quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        logger.errorWithContext('CreditRequestService - creating credit request', error);
        throw error;
      }

      return data as CreditRequest;
    } catch (error) {
      logger.errorWithContext('CreditRequestService - createCreditRequest', error);
      throw error;
    }
  }

  // Get all credit requests for a farmer
  static async getFarmerCreditRequests(farmerId: string): Promise<CreditRequest[]> {
    try {
      const { data, error } = await supabase
        .from('credit_requests')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CreditRequestService - fetching farmer credit requests', error);
        throw error;
      }

      return data as CreditRequest[];
    } catch (error) {
      logger.errorWithContext('CreditRequestService - getFarmerCreditRequests', error);
      throw error;
    }
  }

  // Get all credit requests (for admin)
  static async getAllCreditRequests(): Promise<CreditRequest[]> {
    try {
      const { data, error } = await supabase
        .from('credit_requests')
        .select(`
          *,
          farmers(profiles(full_name, phone))
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('CreditRequestService - fetching all credit requests', error);
        throw error;
      }

      return data as CreditRequest[];
    } catch (error) {
      logger.errorWithContext('CreditRequestService - getAllCreditRequests', error);
      throw error;
    }
  }

  // Approve a credit request
  static async approveCreditRequest(requestId: string, approvedBy?: string): Promise<boolean> {
    try {
      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('credit_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('CreditRequestService - fetching request for approval', fetchError);
        throw fetchError;
      }

      if (!request) {
        throw new Error('Credit request not found');
      }

      // Process the credit transaction
      const result = await CreditServiceEssentials.processCreditTransaction(
        request.farmer_id,
        request.product_id,
        request.quantity,
        approvedBy
      );

      if (result.success) {
        // Update request status to approved
        const { error: updateError } = await supabase
          .from('credit_requests')
          .update({
            status: 'approved',
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        if (updateError) {
          logger.errorWithContext('CreditRequestService - updating request status', updateError);
          throw updateError;
        }

        return true;
      } else {
        throw new Error(result.errorMessage || 'Failed to process credit transaction');
      }
    } catch (error) {
      logger.errorWithContext('CreditRequestService - approveCreditRequest', error);
      throw error;
    }
  }

  // Reject a credit request
  static async rejectCreditRequest(requestId: string, rejectionReason: string, rejectedBy?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('credit_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: rejectedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        logger.errorWithContext('CreditRequestService - rejecting credit request', error);
        throw error;
      }

      return true;
    } catch (error) {
      logger.errorWithContext('CreditRequestService - rejectCreditRequest', error);
      throw error;
    }
  }

  // Get pending credit requests count (for admin dashboard)
  static async getPendingRequestsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('credit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) {
        logger.errorWithContext('CreditRequestService - fetching pending requests count', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.errorWithContext('CreditRequestService - getPendingRequestsCount', error);
      throw error;
    }
  }

  // Get credit request by ID
  static async getCreditRequestById(requestId: string): Promise<CreditRequest | null> {
    try {
      const { data, error } = await supabase
        .from('credit_requests')
        .select(`
          *,
          farmers(profiles(full_name, phone))
        `)
        .eq('id', requestId)
        .maybeSingle();

      if (error) {
        logger.errorWithContext('CreditRequestService - fetching credit request by ID', error);
        throw error;
      }

      return data as CreditRequest | null;
    } catch (error) {
      logger.errorWithContext('CreditRequestService - getCreditRequestById', error);
      throw error;
    }
  }
}