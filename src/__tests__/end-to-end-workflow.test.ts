import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MilkApprovalService } from '../services/milk-approval-service';
import { PaymentService } from '../services/payment-service';
import { supabase } from '../integrations/supabase/client';

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => {
  const mockSupabase = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
    contains: vi.fn(),
    rpc: vi.fn(),
  };
  
  // Set up chainable methods
  mockSupabase.from.mockImplementation((table) => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
      from: mockSupabase.from,
    };
  });
  
  return {
    supabase: mockSupabase
  };
});

describe('End-to-End Workflow Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete the full milk collection to payment workflow', async () => {
    // Mock the collection data
    const mockCollection = {
      id: 'collection-123',
      liters: 100,
      farmer_id: 'farmer-456',
      staff_id: 'staff-789',
      status: 'Collected',
      approved_for_company: false,
      approved_for_payment: false
    };
    
    // Mock the staff data
    const mockStaff = {
      id: 'staff-789',
      user_id: 'user-789'
    };
    
    // Mock the farmer data
    const mockFarmer = {
      id: 'farmer-456',
      user_id: 'user-456'
    };

    // Step 1: Fetch pending collections (staff portal)
    (supabase.from as jest.Mock)
      .mockImplementationOnce((table) => {
        if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: [mockCollection],
              error: null
            })
          };
        }
        return supabase;
      });

    const pendingResult = await MilkApprovalService.getPendingCollections();
    expect(pendingResult.success).toBe(true);
    expect(pendingResult.data).toBeDefined();
    expect(Array.isArray(pendingResult.data)).toBe(true);

    // Step 2: Approve collection (staff portal)
    (supabase.from as jest.Mock)
      .mockImplementationOnce((table) => {
        if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: [mockCollection],
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'variance_penalty_config') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: { penalty_rate_per_liter: 2.0 },
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'milk_approvals') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: 'approval-123',
                collection_id: 'collection-123',
                staff_id: 'staff-789',
                company_received_liters: 95,
                variance_liters: -5,
                variance_percentage: -5,
                variance_type: 'negative',
                penalty_amount: 10,
                approval_notes: 'Test approval'
              },
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'collections') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'collector_performance') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: mockStaff,
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: null
            })
          };
        }
        return supabase;
      });

    const approvalResult = await MilkApprovalService.approveMilkCollection({
      collectionId: 'collection-123',
      staffId: 'staff-789',
      companyReceivedLiters: 95,
      approvalNotes: 'Test approval'
    });

    expect(approvalResult.success).toBe(true);
    expect(approvalResult.data).toBeDefined();

    // Step 3: Create payment for approval (admin portal)
    (supabase.from as jest.Mock)
      .mockImplementationOnce((table) => {
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: mockStaff,
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'farmer_payments') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: 'payment-123',
                farmer_id: 'farmer-456',
                collection_ids: ['collection-123'],
                total_amount: 950,
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: 'staff-789',
                credit_used: 0,
                net_payment: 950
              },
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'collections') {
          return {
            update: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: null
            })
          };
        }
        return supabase;
      });

    const paymentResult = await PaymentService.createPaymentForApproval(
      'farmer-456',
      ['collection-123'],
      950,
      'Test payment',
      'user-789'
    );

    expect(paymentResult.success).toBe(true);
    expect(paymentResult.data).toBeDefined();

    // Step 4: Mark payment as paid (admin portal)
    (supabase.from as jest.Mock)
      .mockImplementationOnce((table) => {
        if (table === 'staff') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: mockStaff,
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'farmer_payments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: {
                farmer_id: 'farmer-456',
                total_amount: 950,
                collection_ids: ['collection-123']
              },
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'farmer_credit_limits') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'farmer_payments') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: 'payment-123',
                approval_status: 'approved',
                paid_at: new Date().toISOString(),
                paid_by: 'staff-789',
                credit_used: 0,
                net_payment: 950
              },
              error: null
            })
          };
        }
        return supabase;
      })
      .mockImplementationOnce((table) => {
        if (table === 'collections') {
          return {
            update: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: null
            })
          };
        }
        return supabase;
      });

    // This would be the markPaymentAsPaid function call
    // For now, we'll just verify the workflow steps
  });

  it('should handle workflow errors gracefully', async () => {
    // Mock an error in the approval process
    (supabase.from as jest.Mock)
      .mockImplementationOnce((table) => {
        if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({
              data: null,
              error: new Error('Collection not found')
            })
          };
        }
        return supabase;
      });

    const result = await MilkApprovalService.approveMilkCollection({
      collectionId: 'non-existent-collection',
      staffId: 'staff-789',
      companyReceivedLiters: 95,
      approvalNotes: 'Test approval'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});