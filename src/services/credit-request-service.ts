import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { CreditServiceEssentials } from './credit-service-essentials';
import { formatCurrency } from '@/utils/formatters';

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
    unitPrice: number,
    packagingOptionId?: string | null
  ): Promise<CreditRequest> {
    try {
      const totalAmount = quantity * unitPrice;
      
      // Log the packaging option ID being stored
      logger.info(`CreditRequestService - creating credit request`, {
        farmerId,
        productId,
        quantity,
        unitPrice,
        totalAmount,
        packagingOptionId
      });
      
      const { data, error } = await supabase
        .from('credit_requests')
        .insert({
          farmer_id: farmerId,
          product_id: productId,
          product_name: productName,
          quantity: quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          packaging_option_id: packagingOptionId || null,
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

      // Filter out requests with null product_id as they cannot be processed
      return (data as CreditRequest[]).filter(request => request.product_id !== null);
    } catch (error) {
      logger.errorWithContext('CreditRequestService - getAllCreditRequests', error);
      throw error;
    }
  }

  // Approve a credit request with enhanced enforcement
  static async approveCreditRequest(requestId: string, approvedBy?: string): Promise<{ success: boolean; errorMessage?: string; enforcementDetails?: any }> {
    logger.info(`CreditRequestService - approveCreditRequest initiated`, {
      requestId,
      approvedBy
    });
    
    try {
      // Validate input
      if (!requestId) {
        logger.error(`CreditRequestService - approveCreditRequest: Request ID is required`);
        return { success: false, errorMessage: 'Request ID is required' };
      }

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
        logger.error(`CreditRequestService - approveCreditRequest: Credit request not found`, { requestId });
        return { success: false, errorMessage: 'Credit request not found' };
      }

      // Validate required fields
      if (!request.farmer_id) {
        logger.error(`CreditRequestService - approveCreditRequest: Farmer ID is missing from request`, { requestId });
        return { success: false, errorMessage: 'Farmer ID is missing from request' };
      }

      if (!request.product_id) {
        logger.error(`CreditRequestService - approveCreditRequest: Product ID is missing from request`, { requestId });
        return { success: false, errorMessage: 'Product ID is missing from request' };
      }

      if (!request.quantity || request.quantity <= 0) {
        logger.error(`CreditRequestService - approveCreditRequest: Valid quantity is required`, { 
          requestId, 
          quantity: request.quantity 
        });
        return { success: false, errorMessage: 'Valid quantity is required' };
      }

      if (!request.unit_price || request.unit_price <= 0) {
        logger.error(`CreditRequestService - approveCreditRequest: Valid unit price is required`, { 
          requestId, 
          unitPrice: request.unit_price 
        });
        return { success: false, errorMessage: 'Valid unit price is required' };
      }

      if (!request.total_amount || request.total_amount <= 0) {
        logger.error(`CreditRequestService - approveCreditRequest: Valid total amount is required`, { 
          requestId, 
          totalAmount: request.total_amount 
        });
        return { success: false, errorMessage: 'Valid total amount is required' };
      }
      
      // If the request has a packaging option ID, verify it still exists
      // But allow approval to proceed if we have all the necessary data stored
      if (request.packaging_option_id) {
        const { data: packagingData, error: packagingError } = await supabase
          .from('product_packaging')
          .select('id')
          .eq('id', request.packaging_option_id)
          .eq('product_id', request.product_id)
          .maybeSingle();
          
        if (packagingError) {
          logger.errorWithContext('CreditRequestService - verifying packaging option existence', packagingError);
          // Don't fail the approval just because of a verification error
          // We'll proceed with the stored data
          logger.warn(`CreditRequestService - approveCreditRequest: Error verifying packaging option, proceeding with stored data`, {
            requestId,
            packagingOptionId: request.packaging_option_id,
            productId: request.product_id,
            error: packagingError.message
          });
        }
        
        if (!packagingData) {
          logger.warn(`CreditRequestService - approveCreditRequest: Packaging option no longer exists`, {
            requestId,
            packagingOptionId: request.packaging_option_id,
            productId: request.product_id
          });
          // Don't fail the approval just because the packaging option was deleted
          // We'll proceed with the stored data
          logger.info(`CreditRequestService - approveCreditRequest: Proceeding with stored data for deleted packaging option`, {
            requestId,
            packagingOptionId: request.packaging_option_id,
            storedAmount: request.total_amount,
            storedUnitPrice: request.unit_price
          });
        }
      }

      logger.info(`CreditRequestService - approveCreditRequest: Processing request`, {
        requestId,
        farmerId: request.farmer_id,
        productId: request.product_id,
        quantity: request.quantity,
        totalAmount: request.total_amount
      });

      // Pre-approval credit limit enforcement check
      const preApprovalCheck = await CreditServiceEssentials.enforceCreditLimit(
        request.farmer_id,
        request.total_amount,
        'credit_used'
      );
      
      if (!preApprovalCheck.isAllowed) {
        logger.warn(`CreditRequestService - approveCreditRequest: Pre-approval check failed`, {
          requestId,
          farmerId: request.farmer_id,
          reason: preApprovalCheck.reason
        });
        return { 
          success: false, 
          errorMessage: `Pre-approval check failed: ${preApprovalCheck.reason}`,
          enforcementDetails: preApprovalCheck
        };
      }

      // Process the credit transaction using the packaging option ID from the request
      const result = await CreditServiceEssentials.processCreditTransaction(
        request.farmer_id,
        request.product_id,
        request.quantity,
        request.packaging_option_id, // Use the packaging option ID from the credit request
        approvedBy,
        true, // Indicate this is an existing credit request
        request.unit_price // Pass the stored unit price
      );

      if (result.success) {
        logger.info(`CreditRequestService - approveCreditRequest: Credit transaction processed successfully`, {
          requestId,
          farmerId: request.farmer_id,
          transactionId: result.transactionId
        });

        // Convert user ID to staff ID if provided
        // If the user is an admin, we'll set approved_by to NULL since admins don't have staff records
        let staffId = null;
        if (approvedBy) {
          try {
            const { data: staffData, error: staffError } = await supabase
              .from('staff')
              .select('id')
              .eq('user_id', approvedBy)
              .maybeSingle();
            
            if (!staffError && staffData) {
              staffId = staffData.id;
            } else {
              // If no staff record found, it might be an admin user
              // We'll leave staffId as null for admins
              logger.info(`CreditRequestService - No staff record found for user (might be admin)`, {
                userId: approvedBy
              });
            }
          } catch (staffLookupError) {
            logger.errorWithContext('CreditRequestService - fetching staff record', staffLookupError);
            // Continue with staffId as null
          }
        }

        // Update request status to approved
        const { error: updateError } = await supabase
          .from('credit_requests')
          .update({
            status: 'approved',
            approved_by: staffId, // Use staff ID or NULL for admins
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        if (updateError) {
          logger.errorWithContext('CreditRequestService - updating request status', updateError);
          throw updateError;
        }

        logger.info(`CreditRequestService - approveCreditRequest: Request approved successfully`, {
          requestId,
          farmerId: request.farmer_id
        });

        return { 
          success: true,
          enforcementDetails: result.enforcementDetails
        };
      } else {
        logger.warn(`CreditRequestService - approveCreditRequest: Failed to process credit transaction`, {
          requestId,
          farmerId: request.farmer_id,
          errorMessage: result.errorMessage
        });
        return { 
          success: false, 
          errorMessage: result.errorMessage || 'Failed to process credit transaction',
          enforcementDetails: result.enforcementDetails
        };
      }
    } catch (error) {
      logger.errorWithContext('CreditRequestService - approveCreditRequest', error);
      return { 
        success: false, 
        errorMessage: (error as Error).message 
      };
    }
  }

  // Reject a credit request
  static async rejectCreditRequest(requestId: string, rejectionReason: string, rejectedBy?: string): Promise<boolean> {
    try {
      // Convert user ID to staff ID if provided
      // If the user is an admin, we'll set approved_by to NULL since admins don't have staff records
      let staffId = null;
      if (rejectedBy) {
        try {
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', rejectedBy)
            .maybeSingle();
          
          if (!staffError && staffData) {
            staffId = staffData.id;
          } else {
            // If no staff record found, it might be an admin user
            // We'll leave staffId as null for admins
            logger.info(`CreditRequestService - No staff record found for user (might be admin)`, {
              userId: rejectedBy
            });
          }
        } catch (staffLookupError) {
          logger.errorWithContext('CreditRequestService - fetching staff record for rejection', staffLookupError);
          // Continue with staffId as null
        }
      }

      const { error } = await supabase
        .from('credit_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: staffId, // Use staff ID or NULL for admins
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