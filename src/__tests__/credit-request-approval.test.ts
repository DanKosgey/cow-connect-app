import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreditRequestService, CreditRequest } from '@/services/credit-request-service';
import { CreditServiceEssentials } from '@/services/credit-service-essentials';
import { supabase } from '@/integrations/supabase/client';

// Mock the entire supabase client module
vi.mock('@/integrations/supabase/client', () => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn()
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('Credit Request Approval Workflow', () => {
  const mockFarmerId = 'farmer-123';
  const mockProductId = 'product-456';
  const mockRequestId = 'request-789';
  const mockApprovedBy = 'admin-user';
  
  const mockCreditRequest: CreditRequest = {
    id: mockRequestId,
    farmer_id: mockFarmerId,
    product_id: mockProductId,
    product_name: 'Test Product',
    quantity: 5,
    unit_price: 100,
    total_amount: 500,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock responses
    (supabase.from as any).mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
        single: vi.fn().mockResolvedValue({ error: null, data: null }),
        insert: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: null })
        })),
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: null })
        })),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnValue({ count: 0, error: null })
      };
    });
  });

  it('should create a credit request successfully', async () => {
    // Setup mock responses
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'credit_requests') {
        return {
          insert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: mockCreditRequest })
          }))
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
        insert: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: null })
        }))
      };
    });

    const result = await CreditRequestService.createCreditRequest(
      mockFarmerId,
      mockProductId,
      5,
      'Test Product',
      100
    );

    expect(result).toEqual(mockCreditRequest);
    expect(result.status).toBe('pending');
    expect(result.total_amount).toBe(500); // 5 * 100
  });

  it('should fetch all credit requests for a farmer', async () => {
    const mockRequests = [mockCreditRequest];
    
    // Setup mock responses
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'credit_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: mockRequests })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
      };
    });

    const result = await CreditRequestService.getFarmerCreditRequests(mockFarmerId);

    expect(result).toEqual(mockRequests);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should approve a credit request successfully', async () => {
    // Setup mock responses for fetching the request
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'credit_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditRequest, error: null })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
      };
    });

    // Mock successful credit transaction processing
    vi.spyOn(CreditServiceEssentials, 'processCreditTransaction').mockResolvedValueOnce({
      success: true,
      transactionId: 'transaction-123',
    } as any);

    // Setup mock responses for updating request status
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'credit_requests') {
        return {
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
      };
    });

    const result = await CreditRequestService.approveCreditRequest(mockRequestId, mockApprovedBy);

    expect(result).toBe(true);
    expect(CreditServiceEssentials.processCreditTransaction).toHaveBeenCalledWith(
      mockFarmerId,
      mockProductId,
      5,
      mockApprovedBy
    );
  });

  it('should reject a credit request successfully', async () => {
    const rejectionReason = 'Product not available';
    
    // Setup mock responses
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'credit_requests') {
        return {
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
      };
    });

    const result = await CreditRequestService.rejectCreditRequest(
      mockRequestId,
      rejectionReason,
      mockApprovedBy
    );

    expect(result).toBe(true);
  });

  it('should handle approval failure when credit transaction fails', async () => {
    // Setup mock responses for fetching the request
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'credit_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditRequest, error: null })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
      };
    });

    // Mock failed credit transaction processing
    vi.spyOn(CreditServiceEssentials, 'processCreditTransaction').mockResolvedValueOnce({
      success: false,
      errorMessage: 'Insufficient credit balance',
    } as any);

    await expect(
      CreditRequestService.approveCreditRequest(mockRequestId, mockApprovedBy)
    ).rejects.toThrow('Insufficient credit balance');
  });

  it('should handle approval failure when request not found', async () => {
    // Setup mock responses - return null for request
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'credit_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
      };
    });

    await expect(
      CreditRequestService.approveCreditRequest(mockRequestId, mockApprovedBy)
    ).rejects.toThrow('Credit request not found');
  });

  it('should get pending requests count', async () => {
    // Setup mock responses
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'credit_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          count: vi.fn().mockReturnValue({ count: 5, error: null })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        count: vi.fn().mockReturnValue({ count: 0, error: null })
      };
    });

    const result = await CreditRequestService.getPendingRequestsCount();

    expect(result).toBe(5);
  });
});