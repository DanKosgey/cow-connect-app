import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('Credit Granting Logic', () => {
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
        order: vi.fn().mockReturnThis()
      };
    });
  });

  describe('calculateCreditEligibility', () => {
    it('should calculate credit eligibility correctly for a new farmer with pending payments', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock pending collections
      const mockCollections = [
        { total_amount: 10000 },
        { total_amount: 5000 }
      ];

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCollections, error: null })
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { created_at: new Date().toISOString() }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await CreditServiceEssentials.calculateCreditEligibility('farmer-1');

      expect(result.isEligible).toBe(true);
      expect(result.pendingPayments).toBe(15000);
      expect(result.creditLimit).toBe(4500); // 30% of 15000
      expect(result.availableCredit).toBe(0); // No credit granted yet
    });

    it('should calculate credit eligibility correctly for an established farmer', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 10000.00,
        total_credit_used: 20000.00,
        pending_deductions: 5000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock pending collections
      const mockCollections = [
        { total_amount: 20000 },
        { total_amount: 10000 }
      ];

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCollections, error: null })
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { created_at: new Date().toISOString() }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await CreditServiceEssentials.calculateCreditEligibility('farmer-1');

      expect(result.isEligible).toBe(true);
      expect(result.pendingPayments).toBe(30000);
      expect(result.creditLimit).toBe(18000); // 60% of 30000
      expect(result.availableCredit).toBe(10000); // Current balance
    });

    it('should respect maximum credit amount cap', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'premium',
        credit_limit_percentage: 70.00,
        max_credit_amount: 100000.00,
        current_credit_balance: 50000.00,
        total_credit_used: 100000.00,
        pending_deductions: 25000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock pending collections - very high amount
      const mockCollections = [
        { total_amount: 200000 },
        { total_amount: 100000 }
      ];

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCollections, error: null })
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { created_at: new Date().toISOString() }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await CreditServiceEssentials.calculateCreditEligibility('farmer-1');

      expect(result.isEligible).toBe(true);
      expect(result.pendingPayments).toBe(300000);
      expect(result.creditLimit).toBe(100000); // Capped at max amount, not 210000 (70% of 300000)
      expect(result.availableCredit).toBe(50000); // Current balance
    });

    it('should return zero eligibility for frozen credit profile', async () => {
      // Mock frozen farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: true,
        freeze_reason: 'Overdue payments',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { created_at: new Date().toISOString() }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await CreditServiceEssentials.calculateCreditEligibility('farmer-1');

      expect(result.isEligible).toBe(false);
      expect(result.creditLimit).toBe(0);
      expect(result.availableCredit).toBe(0);
      expect(result.pendingPayments).toBe(0);
    });
  });

  describe('grantCreditToFarmer', () => {
    it('should grant credit to a farmer with pending payments', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock pending collections
      const mockCollections = [
        { total_amount: 10000 },
        { total_amount: 5000 }
      ];

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
              .mockResolvedValueOnce({ data: mockProfile, error: null })
              .mockResolvedValueOnce({ data: mockProfile, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: mockProfile })
            }))
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCollections, error: null })
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: null })
            }))
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { created_at: new Date().toISOString() }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      });

      const result = await CreditServiceEssentials.grantCreditToFarmer('farmer-1', 'admin-1');

      expect(result).toBe(true);
    });

    it('should grant default credit to a farmer with no pending payments', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock no pending collections
      const mockCollections = [];

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
              .mockResolvedValueOnce({ data: mockProfile, error: null })
              .mockResolvedValueOnce({ data: mockProfile, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: mockProfile })
            }))
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCollections, error: null })
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: null })
            }))
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { created_at: new Date().toISOString() }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      });

      const result = await CreditServiceEssentials.grantCreditToFarmer('farmer-1', 'admin-1');

      expect(result).toBe(true);
    });

    it('should throw error when trying to grant credit to a farmer who already has credit', async () => {
      // Mock farmer credit profile with existing credit
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 5000.00, // Already has credit
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock pending collections
      const mockCollections = [
        { total_amount: 10000 }
      ];

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
              .mockResolvedValueOnce({ data: mockProfile, error: null })
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCollections, error: null })
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { created_at: new Date().toISOString() }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      await expect(CreditServiceEssentials.grantCreditToFarmer('farmer-1', 'admin-1'))
        .rejects
        .toThrow('Credit has already been granted to this farmer');
    });

    it('should throw error when farmer is not eligible for credit', async () => {
      // Mock frozen farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: true, // Frozen account
        freeze_reason: 'Overdue payments',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { created_at: new Date().toISOString() }, 
              error: null 
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      await expect(CreditServiceEssentials.grantCreditToFarmer('farmer-1', 'admin-1'))
        .rejects
        .toThrow('Farmer is not eligible for credit');
    });
  });
});