import { describe, it, expect, vi } from 'vitest';
import { VarianceCalculationService } from '../services/variance-calculation-service';

// Mock the logger
vi.mock('@/utils/logger', () => ({
  logger: {
    errorWithContext: vi.fn()
  }
}));

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
  }
}));

describe('Penalty System', () => {
  describe('calculatePenalty', () => {
    it('should not apply penalties for positive variances', async () => {
      const varianceData = {
        collectedLiters: 100,
        receivedLiters: 105,
        varianceLiters: 5,
        variancePercentage: 5,
        varianceType: 'positive' as const
      };

      const penalty = await VarianceCalculationService.calculatePenalty(varianceData);
      expect(penalty).toBe(0);
    });

    it('should not apply penalties for zero variances', async () => {
      const varianceData = {
        collectedLiters: 100,
        receivedLiters: 100,
        varianceLiters: 0,
        variancePercentage: 0,
        varianceType: 'none' as const
      };

      const penalty = await VarianceCalculationService.calculatePenalty(varianceData);
      expect(penalty).toBe(0);
    });

    it('should apply penalties for negative variances when configuration exists', async () => {
      // Mock the database response for negative variance penalty configuration
      const mockSupabase = (await import('@/integrations/supabase/client')).supabase;
      
      // Reset the mock and set up a specific response
      vi.clearAllMocks();
      
      // Mock the chain of Supabase methods
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { penalty_rate_per_liter: 3.0 },
        error: null
      });
      
      const mockLimit = vi.fn().mockReturnThis();
      mockLimit.mockImplementation(() => ({
        maybeSingle: mockMaybeSingle
      }));
      
      const mockLte = vi.fn().mockReturnThis();
      mockLte.mockImplementation(() => ({
        limit: mockLimit
      }));
      
      const mockGte = vi.fn().mockReturnThis();
      mockGte.mockImplementation(() => ({
        lte: mockLte
      }));
      
      const mockEq2 = vi.fn().mockReturnThis();
      mockEq2.mockImplementation(() => ({
        gte: mockGte
      }));
      
      const mockEq1 = vi.fn().mockReturnThis();
      mockEq1.mockImplementation(() => ({
        eq: mockEq2
      }));
      
      const mockSelect = vi.fn().mockReturnThis();
      mockSelect.mockImplementation(() => ({
        eq: mockEq1
      }));
      
      mockSupabase.from.mockImplementation(() => ({
        select: mockSelect
      }));

      const varianceData = {
        collectedLiters: 100,
        receivedLiters: 95,
        varianceLiters: -5,
        variancePercentage: -5,
        varianceType: 'negative' as const
      };

      const penalty = await VarianceCalculationService.calculatePenalty(varianceData);
      // Expect penalty to be calculated: 5 liters * 3.0 KSh/liter = 15.0 KSh
      expect(penalty).toBeCloseTo(15.0);
    });
  });
});