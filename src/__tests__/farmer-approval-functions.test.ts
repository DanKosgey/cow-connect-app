import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../integrations/supabase/client';

// Mock the supabase client
jest.mock('../integrations/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    strictSelect: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    throwOnError: jest.fn().mockReturnThis(),
    csv: jest.fn().mockReturnThis(),
    explain: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    fts: jest.fn().mockReturnThis(),
    plfts: jest.fn().mockReturnThis(),
    phfts: jest.fn().mockReturnThis(),
    wfts: jest.fn().mockReturnThis(),
    val: jest.fn().mockReturnThis(),
  }
}));

describe('Farmer Approval Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('approve_pending_farmer', () => {
    it('should approve a pending farmer successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          farmer_id: 'farmer-123',
          message: 'Farmer approved successfully'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('approve_pending_farmer', {
        p_pending_farmer_id: 'pending-123',
        p_admin_id: 'admin-123',
        p_admin_notes: 'All documents verified'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('approve_pending_farmer', {
        p_pending_farmer_id: 'pending-123',
        p_admin_id: 'admin-123',
        p_admin_notes: 'All documents verified'
      });
      expect(result.data.success).toBe(true);
      expect(result.data.farmer_id).toBe('farmer-123');
    });

    it('should handle approval failure', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'Pending farmer not found or invalid status'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('approve_pending_farmer', {
        p_pending_farmer_id: 'invalid-id',
        p_admin_id: 'admin-123'
      });

      expect(result.data.success).toBe(false);
      expect(result.data.message).toBe('Pending farmer not found or invalid status');
    });
  });

  describe('reject_pending_farmer', () => {
    it('should reject a pending farmer successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Farmer application rejected',
          rejection_count: 1,
          can_resubmit: true
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('reject_pending_farmer', {
        p_pending_farmer_id: 'pending-123',
        p_admin_id: 'admin-123',
        p_rejection_reason: 'ID document not clear'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('reject_pending_farmer', {
        p_pending_farmer_id: 'pending-123',
        p_admin_id: 'admin-123',
        p_rejection_reason: 'ID document not clear'
      });
      expect(result.data.success).toBe(true);
      expect(result.data.rejection_count).toBe(1);
      expect(result.data.can_resubmit).toBe(true);
    });

    it('should handle rejection with validation error', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'Rejection reason is required'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('reject_pending_farmer', {
        p_pending_farmer_id: 'pending-123',
        p_admin_id: 'admin-123',
        p_rejection_reason: ''
      });

      expect(supabase.rpc).toHaveBeenCalledWith('reject_pending_farmer', {
        p_pending_farmer_id: 'pending-123',
        p_admin_id: 'admin-123',
        p_rejection_reason: ''
      });
      expect(result.data.success).toBe(false);
      expect(result.data.message).toBe('Rejection reason is required');
    });
  });

  describe('resubmit_kyc_documents', () => {
    it('should prepare farmer for resubmission successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'You can now upload new documents',
          rejection_reason: 'ID document not clear',
          attempts_remaining: 2
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('resubmit_kyc_documents', {
        pending_farmer_id: 'pending-123',
        user_id: 'user-123'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('resubmit_kyc_documents', {
        pending_farmer_id: 'pending-123',
        user_id: 'user-123'
      });
      expect(result.data.success).toBe(true);
      expect(result.data.message).toBe('You can now upload new documents');
      expect(result.data.attempts_remaining).toBe(2);
    });

    it('should handle resubmission limit exceeded', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'Maximum resubmission attempts reached'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('resubmit_kyc_documents', {
        pending_farmer_id: 'pending-123',
        user_id: 'user-123'
      });

      expect(result.data.success).toBe(false);
      expect(result.data.message).toBe('Maximum resubmission attempts reached');
    });
  });

  describe('submit_kyc_for_review', () => {
    it('should submit KYC documents for review successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'KYC submitted for review',
          submission_id: 'pending-123',
          estimated_review_time: '2-3 business days'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('submit_kyc_for_review', {
        pending_farmer_id: 'pending-123',
        user_id: 'user-123'
      });

      expect(supabase.rpc).toHaveBeenCalledWith('submit_kyc_for_review', {
        pending_farmer_id: 'pending-123',
        user_id: 'user-123'
      });
      expect(result.data.success).toBe(true);
      expect(result.data.message).toBe('KYC submitted for review');
      expect(result.data.estimated_review_time).toBe('2-3 business days');
    });

    it('should handle missing documents error', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'All 3 KYC documents (ID front, ID back, selfie) must be uploaded'
        },
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('submit_kyc_for_review', {
        pending_farmer_id: 'pending-123',
        user_id: 'user-123'
      });

      expect(result.data.success).toBe(false);
      expect(result.data.message).toBe('All 3 KYC documents (ID front, ID back, selfie) must be uploaded');
    });
  });

  describe('get_pending_farmers_for_review', () => {
    it('should retrieve pending farmers for review', async () => {
      const mockData = [
        {
          id: 'pending-123',
          full_name: 'John Doe',
          email: 'john@example.com',
          status: 'email_verified',
          created_at: '2023-01-01T00:00:00Z',
          rejection_count: 0
        },
        {
          id: 'pending-456',
          full_name: 'Jane Smith',
          email: 'jane@example.com',
          status: 'email_verified',
          created_at: '2023-01-02T00:00:00Z',
          rejection_count: 1
        }
      ];

      const mockResponse = {
        data: mockData,
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('get_pending_farmers_for_review', {
        p_admin_id: 'admin-123',
        p_status_filter: 'email_verified',
        p_limit: 50,
        p_offset: 0
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_pending_farmers_for_review', {
        p_admin_id: 'admin-123',
        p_status_filter: 'email_verified',
        p_limit: 50,
        p_offset: 0
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].full_name).toBe('John Doe');
      expect(result.data[1].full_name).toBe('Jane Smith');
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: [],
        error: null
      };

      (supabase.rpc as jest.Mock).mockResolvedValue(mockResponse);

      const result = await supabase.rpc('get_pending_farmers_for_review', {
        p_admin_id: 'admin-123'
      });

      expect(result.data).toHaveLength(0);
    });
  });
});