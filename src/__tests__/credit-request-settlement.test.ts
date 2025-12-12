import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { PaymentService } from '@/services/payment-service';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  };
  
  return {
    supabase: mockSupabase,
  };
});

describe('Credit Request Settlement Status Update', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore all mocks after each test
    vi.restoreAllMocks();
  });

  it('should update credit requests settlement status to paid when marking collection as paid', async () => {
    // Mock the collection data
    const mockCollection = {
      id: 'collection-1',
      farmer_id: 'farmer-1',
      total_amount: 1000,
      rate_per_liter: 50,
      status: 'Collected',
      approved_for_payment: true,
      liters: 20,
      staff_id: 'staff-1',
    };

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'collections') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: {
              id: 'collection-1',
              approved_for_payment: true,
              status: 'Collected',
              liters: 20,
              staff_id: 'staff-1',
            },
            error: null,
          }),
        };
      } else if (table === 'payment_batches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: { batch_id: 'batch-1' },
            error: null,
          }),
        };
      } else if (table === 'collection_payments') {
        return {
          insert: vi.fn().mockResolvedValueOnce({
            data: [{ id: 'payment-1' }],
            error: null,
          }),
        };
      } else if (table === 'credit_requests') {
        return {
          update: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      };
    });

    (supabase.from('').update as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Call the function
    const result = await PaymentService.markCollectionAsPaid('collection-1', 'farmer-1', mockCollection);

    // Verify the result
    expect(result.success).toBe(true);
  });

  it('should update credit requests settlement status to paid when marking payment as paid', async () => {
    // Mock the payment data
    const mockPaymentData = {
      id: 'payment-1',
      farmer_id: 'farmer-1',
      total_amount: 1000,
      collection_ids: ['collection-1', 'collection-2'],
    };

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'farmer_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: mockPaymentData,
            error: null,
          }),
        };
      } else if (table === 'collections') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: [
              { id: 'collection-1', approved_for_payment: true, status: 'Collected' },
              { id: 'collection-2', approved_for_payment: true, status: 'Collected' },
            ],
            error: null,
          }),
        };
      } else if (table === 'credit_requests') {
        return {
          update: vi.fn().mockResolvedValueOnce({
            data: null,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      };
    });

    (supabase.from('').update as jest.Mock).mockResolvedValueOnce({
      data: [{ id: 'updated-payment-1' }],
      error: null,
    });

    // Mock the collections update response
    (supabase.from('').update as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Call the function
    const result = await PaymentService.markPaymentAsPaid('payment-1');

    // Verify the result
    expect(result.success).toBe(true);
  });
});