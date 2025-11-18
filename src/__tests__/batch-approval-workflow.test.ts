import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MilkApprovalService } from '../services/milk-approval-service';
import { supabase } from '../integrations/supabase/client';

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => {
  const mockSupabase = {
    rpc: vi.fn(),
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  
  // Set up chainable methods
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
  mockSupabase.maybeSingle.mockReturnValue(mockSupabase);
  mockSupabase.single.mockReturnValue(mockSupabase);
  
  return {
    supabase: mockSupabase
  };
});

describe('Batch Approval Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should batch approve collections for a collector', async () => {
    // Mock the RPC call for batch approval
    const mockResult = {
      approved_count: 5,
      total_liters_collected: 1000,
      total_liters_received: 995,
      total_variance: -5,
      total_penalty_amount: 25
    };
    
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [mockResult],
      error: null
    });

    const result = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      'collector-456',
      '2025-11-18',
      199
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResult);
    expect(supabase.rpc).toHaveBeenCalledWith('batch_approve_collector_collections', {
      p_staff_id: 'staff-123',
      p_collector_id: 'collector-456',
      p_collection_date: '2025-11-18',
      p_default_received_liters: 199
    });
  });

  it('should handle batch approval errors', async () => {
    // Mock the RPC call to return an error
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('Database error')
    });

    const result = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      'collector-456',
      '2025-11-18'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should validate required parameters', async () => {
    // Test with missing parameters
    const result = await MilkApprovalService.batchApproveCollections(
      '', // missing staffId
      'collector-456',
      '2025-11-18'
    );
    
    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Staff ID, collector ID, and collection date are required');
  });

  it('should validate negative default received liters', async () => {
    // Test with negative default received liters
    const result = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      'collector-456',
      '2025-11-18',
      -100 // negative value
    );
    
    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Default received liters cannot be negative');
  });
});