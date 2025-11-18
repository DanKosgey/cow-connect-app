import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MilkApprovalService } from '../services/milk-approval-service';
import { supabase } from '../integrations/supabase/client';

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    },
    logger: {
      errorWithContext: vi.fn(),
    }
  };
});

describe('Staff Portal Approval Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have approveMilkCollection method in MilkApprovalService', () => {
    expect(typeof MilkApprovalService.approveMilkCollection).toBe('function');
  });

  it('should have batchApproveCollections method in MilkApprovalService', () => {
    expect(typeof MilkApprovalService.batchApproveCollections).toBe('function');
  });

  it('should calculate variance correctly', () => {
    const result = MilkApprovalService.calculateVariance(100, 95);
    expect(result.varianceLiters).toBe(-5);
    expect(result.variancePercentage).toBe(-5);
    expect(result.varianceType).toBe('negative');
  });

  it('should calculate penalty based on variance', async () => {
    // Mock the penalty configuration
    (supabase.from as jest.Mock)
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
      });

    const varianceData = MilkApprovalService.calculateVariance(100, 95);
    const penalty = await MilkApprovalService.calculatePenalty(varianceData);
    expect(penalty).toBe(10); // 5 liters * 2.0 penalty rate
  });
});