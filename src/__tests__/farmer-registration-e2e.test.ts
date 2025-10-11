import { FarmerRegistrationService, type FarmerRegistrationData } from '@/services/farmerRegistrationService';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn()
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
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
    rpc: jest.fn()
  }
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

describe('Farmer Registration End-to-End Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Complete Registration Flow', () => {
    it('should complete the full farmer registration and approval workflow', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Step 1: Farmer Registration
      const registrationData: FarmerRegistrationData = {
        email: 'newfarmer@example.com',
        password: 'securepassword123',
        confirmPassword: 'securepassword123',
        fullName: 'John Doe',
        phone: '+254712345678',
        nationalId: '12345678',
        address: '123 Farm Road, Nairobi',
        farmLocation: 'Trans-Nzoia'
      };

      // Mock auth signup response
      const mockAuthData = {
        data: {
          user: { id: 'user-123' },
          session: null
        },
        error: null
      };
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthData);

      // Start registration
      const startResult = await FarmerRegistrationService.startRegistration(registrationData);
      expect(startResult.success).toBe(true);
      expect(startResult.userId).toBe('user-123');
      
      // Verify pending profile was stored
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'pending_profile',
        expect.stringContaining('user-123')
      );

      // Step 2: Email Confirmation and Profile Completion
      const pendingData = {
        userId: 'user-123',
        fullName: 'John Doe',
        email: 'newfarmer@example.com',
        phone: '+254712345678',
        role: 'farmer',
        createdAt: new Date().toISOString(),
        farmerData: {
          nationalId: '12345678',
          address: '123 Farm Road, Nairobi',
          farmLocation: 'Trans-Nzoia'
        }
      };

      // Mock database responses for profile completion
      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'user_roles') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'pending_farmers') {
          return {
            upsert: jest.fn().mockResolvedValue({
              data: [{ id: 'pending-123' }],
              error: null
            }),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'farmer_analytics') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return mockSupabase;
      });

      const completeResult = await FarmerRegistrationService.completeRegistration('user-123', pendingData);
      expect(completeResult.success).toBe(true);
      expect(completeResult.farmerId).toBe('pending-123');

      // Step 3: KYC Document Upload
      const mockFile = new File([''], 'id-front.jpg', { type: 'image/jpeg' });
      
      // Mock storage upload
      (mockSupabase.storage as any) = {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/id-front.jpg' } })
      };
      
      // Mock document insert
      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'kyc_documents') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [{ id: 'doc-123' }],
              error: null
            }),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis()
          };
        }
        return mockSupabase;
      });

      const uploadResult = await FarmerRegistrationService.uploadDocument('pending-123', mockFile, 'id_front');
      expect(uploadResult).toEqual({ id: 'doc-123' });

      // Step 4: Submit for Review
      const mockSubmitResponse = {
        data: {
          success: true,
          message: 'KYC submitted for review',
          submission_id: 'pending-123'
        },
        error: null
      };
      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockSubmitResponse);

      const submitResult = await mockSupabase.rpc('submit_kyc_for_review', {
        p_pending_farmer_id: 'pending-123',
        p_user_id: 'user-123'
      });
      expect(submitResult.data.success).toBe(true);
      expect(submitResult.data.submission_id).toBe('pending-123');

      // Step 5: Admin Approval
      const mockApprovalResponse = {
        data: {
          success: true,
          farmer_id: 'farmer-123',
          message: 'Farmer approved successfully'
        },
        error: null
      };
      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockApprovalResponse);

      const approvalResult = await mockSupabase.rpc('approve_pending_farmer', {
        p_pending_farmer_id: 'pending-123',
        p_admin_id: 'admin-123'
      });
      expect(approvalResult.data.success).toBe(true);
      expect(approvalResult.data.farmer_id).toBe('farmer-123');

      // Step 6: Verify Final State
      // Mock the final farmer record retrieval
      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'farmers') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [{ id: 'farmer-123', kyc_status: 'approved', registration_completed: true }],
              error: null
            }),
            single: jest.fn().mockReturnThis()
          };
        }
        return mockSupabase;
      });

      const { data: farmerData, error: farmerError } = await mockSupabase
        .from('farmers')
        .select('*')
        .eq('id', 'farmer-123')
        .single();

      expect(farmerError).toBeNull();
      expect(farmerData).toBeDefined();
      expect(farmerData.id).toBe('farmer-123');
      expect(farmerData.kyc_status).toBe('approved');
    });

    it('should handle registration rejection and resubmission workflow', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Step 1: Initial registration (same as above)
      const registrationData: FarmerRegistrationData = {
        email: 'rejectfarmer@example.com',
        password: 'securepassword123',
        confirmPassword: 'securepassword123',
        fullName: 'Jane Smith',
        phone: '+254712345679',
        nationalId: '87654321',
        address: '456 Farm Road, Nairobi',
        farmLocation: 'Trans-Nzoia'
      };

      const mockAuthData = {
        data: {
          user: { id: 'user-456' },
          session: null
        },
        error: null
      };
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthData);

      await FarmerRegistrationService.startRegistration(registrationData);

      // Step 2: Complete registration
      const pendingData = {
        userId: 'user-456',
        fullName: 'Jane Smith',
        email: 'rejectfarmer@example.com',
        phone: '+254712345679',
        role: 'farmer',
        createdAt: new Date().toISOString(),
        farmerData: {
          nationalId: '87654321',
          address: '456 Farm Road, Nairobi',
          farmLocation: 'Trans-Nzoia'
        }
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'user_roles') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'pending_farmers') {
          return {
            upsert: jest.fn().mockResolvedValue({
              data: [{ id: 'pending-456' }],
              error: null
            }),
            update: jest.fn().mockResolvedValue({ error: null })
          };
        } else if (table === 'farmer_analytics') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return mockSupabase;
      });

      await FarmerRegistrationService.completeRegistration('user-456', pendingData);

      // Step 3: Submit for review
      const mockSubmitResponse = {
        data: {
          success: true,
          message: 'KYC submitted for review',
          submission_id: 'pending-456'
        },
        error: null
      };
      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockSubmitResponse);

      await mockSupabase.rpc('submit_kyc_for_review', {
        p_pending_farmer_id: 'pending-456',
        p_user_id: 'user-456'
      });

      // Step 4: Admin Rejection
      const mockRejectionResponse = {
        data: {
          success: true,
          message: 'Farmer application rejected',
          rejection_count: 1,
          can_resubmit: true
        },
        error: null
      };
      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockRejectionResponse);

      const rejectionResult = await mockSupabase.rpc('reject_pending_farmer', {
        p_pending_farmer_id: 'pending-456',
        p_admin_id: 'admin-123',
        p_rejection_reason: 'ID document not clear'
      });
      expect(rejectionResult.data.success).toBe(true);
      expect(rejectionResult.data.rejection_count).toBe(1);
      expect(rejectionResult.data.can_resubmit).toBe(true);

      // Step 5: Farmer Resubmission
      const mockResubmitResponse = {
        data: {
          success: true,
          message: 'You can now upload new documents',
          rejection_reason: 'ID document not clear',
          attempts_remaining: 2
        },
        error: null
      };
      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockResubmitResponse);

      const resubmitResult = await mockSupabase.rpc('resubmit_kyc_documents', {
        p_pending_farmer_id: 'pending-456',
        p_user_id: 'user-456'
      });
      expect(resubmitResult.data.success).toBe(true);
      expect(resubmitResult.data.attempts_remaining).toBe(2);

      // Step 6: Upload new documents and resubmit
      const mockFile = new File([''], 'new-id-front.jpg', { type: 'image/jpeg' });
      
      (mockSupabase.storage as any) = {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/new-id-front.jpg' } })
      };
      
      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'kyc_documents') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [{ id: 'doc-456' }],
              error: null
            }),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis()
          };
        }
        return mockSupabase;
      });

      await FarmerRegistrationService.uploadDocument('pending-456', mockFile, 'id_front');

      // Resubmit for review
      const resubmitReviewResult = await mockSupabase.rpc('submit_kyc_for_review', {
        p_pending_farmer_id: 'pending-456',
        p_user_id: 'user-456'
      });
      expect(resubmitReviewResult.data.success).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle duplicate email registration gracefully', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      const registrationData: FarmerRegistrationData = {
        email: 'existing@example.com',
        password: 'securepassword123',
        confirmPassword: 'securepassword123',
        fullName: 'John Doe',
        phone: '+254712345678',
        nationalId: '12345678',
        address: '123 Farm Road, Nairobi',
        farmLocation: 'Trans-Nzoia'
      };

      // Mock auth signup to return email exists error
      const mockAuthError = {
        data: {
          user: null
        },
        error: { 
          message: 'User already registered', 
          status: 400 
        }
      };
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthError);

      await expect(FarmerRegistrationService.startRegistration(registrationData))
        .rejects
        .toThrow('Authentication failed: User already registered');
    });

    it('should prevent resubmission after maximum attempts', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock resubmit function to return max attempts error
      const mockMaxAttemptsResponse = {
        data: {
          success: false,
          message: 'Maximum resubmission attempts reached'
        },
        error: null
      };
      (mockSupabase.rpc as jest.Mock).mockResolvedValue(mockMaxAttemptsResponse);

      const result = await mockSupabase.rpc('resubmit_kyc_documents', {
        p_pending_farmer_id: 'pending-max-attempts',
        p_user_id: 'user-max-attempts'
      });

      expect(result.data.success).toBe(false);
      expect(result.data.message).toBe('Maximum resubmission attempts reached');
    });
  });
});