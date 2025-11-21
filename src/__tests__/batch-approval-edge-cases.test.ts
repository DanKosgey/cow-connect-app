import { MilkApprovalService } from '@/services/milk-approval-service';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  }
}));

describe('Batch Approval Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle batch approval with zero collections', async () => {
    // Mock RPC to return zero approved collections
    (supabase.rpc as jest.Mock).mockReturnValue({
      data: [{ approved_count: 0, message: 'No collections found for approval' }],
      error: null
    });

    const result = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      'collector-456',
      '2025-11-18',
      0
    );

    expect(result.success).toBe(true);
    expect(result.data?.approved_count).toBe(0);
    expect(result.data?.message).toBe('No collections found for approval');
  });

  it('should handle batch approval with negative liters', async () => {
    const result = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      'collector-456',
      '2025-11-18',
      -10
    );

    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Default received liters cannot be negative');
  });

  it('should handle batch approval with missing required parameters', async () => {
    // Test missing staff ID
    const result1 = await MilkApprovalService.batchApproveCollections(
      '',
      'collector-456',
      '2025-11-18'
    );
    
    expect(result1.success).toBe(false);
    expect(result1.error.message).toBe('Staff ID, collector ID, and collection date are required');

    // Test missing collector ID
    const result2 = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      '',
      '2025-11-18'
    );
    
    expect(result2.success).toBe(false);
    expect(result2.error.message).toBe('Staff ID, collector ID, and collection date are required');

    // Test missing collection date
    const result3 = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      'collector-456',
      ''
    );
    
    expect(result3.success).toBe(false);
    expect(result3.error.message).toBe('Staff ID, collector ID, and collection date are required');
  });

  it('should handle database errors gracefully', async () => {
    // Mock RPC to return an error
    (supabase.rpc as jest.Mock).mockReturnValue({
      data: null,
      error: new Error('Database connection failed')
    });

    const result = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      'collector-456',
      '2025-11-18',
      100
    );

    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Database connection failed');
  });

  it('should handle successful batch approval with multiple collections', async () => {
    // Mock RPC to return successful approval
    (supabase.rpc as jest.Mock).mockReturnValue({
      data: [{
        approved_count: 5,
        total_liters_collected: 125,
        total_liters_received: 120,
        total_variance: -5,
        total_penalty_amount: 25,
        message: 'Successfully approved 5 collections'
      }],
      error: null
    });

    const result = await MilkApprovalService.batchApproveCollections(
      'staff-123',
      'collector-456',
      '2025-11-18',
      120
    );

    expect(result.success).toBe(true);
    expect(result.data?.approved_count).toBe(5);
    expect(result.data?.total_liters_collected).toBe(125);
    expect(result.data?.total_liters_received).toBe(120);
    expect(result.data?.total_variance).toBe(-5);
    expect(result.data?.total_penalty_amount).toBe(25);
  });
});