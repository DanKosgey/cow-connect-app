import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreditServiceEssentials } from '@/services/credit-service-essentials';
import { CreditRequestService } from '@/services/credit-request-service';
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

describe('Credit System Edge Cases and Error Handling', () => {
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

  describe('Credit Calculation Edge Cases', () => {
    it('should handle farmer with no collections data', async () => {
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

      // Mock no collections data
      const mockCollections = null;

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
      expect(result.pendingPayments).toBe(0);
      expect(result.creditLimit).toBe(0); // 30% of 0
      expect(result.availableCredit).toBe(0);
    });

    it('should handle database error when fetching credit profile', async () => {
      // Setup mock responses with error
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('Database connection failed') })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      await expect(CreditServiceEssentials.calculateCreditEligibility('farmer-1'))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('Credit Granting Edge Cases', () => {
    it('should handle database error when creating default credit profile', async () => {
      // Mock no existing credit profile
      const mockProfile = null;

      // Setup mock responses with error
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
              data: null, 
              error: new Error('Farmer not found') 
            })
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: [], error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          insert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: new Error('Insert failed'), data: null })
          }))
        };
      });

      await expect(CreditServiceEssentials.calculateCreditEligibility('farmer-1'))
        .rejects
        .toThrow('Insert failed');
    });
  });

  describe('Credit Usage Edge Cases', () => {
    it('should handle product not found error', async () => {
      // Setup mock responses with error
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
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

      const result = await CreditServiceEssentials.processCreditTransaction(
        'farmer-1',
        'non-existent-product',
        5,
        'admin-1'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Product not found');
    });

    it('should handle insufficient credit balance', async () => {
      // Mock product data
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        selling_price: 1000,
        is_credit_eligible: true
      };

      // Mock farmer credit profile with low balance
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 1000.00, // Low balance
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock credit eligibility with low available credit
      const mockCreditInfo = {
        isEligible: true,
        creditLimit: 5000,
        availableCredit: 1000,
        pendingPayments: 10000
      };

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProduct, error: null })
          };
        } else if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      // Mock the calculateCreditEligibility method
      vi.spyOn(CreditServiceEssentials, 'calculateCreditEligibility').mockResolvedValueOnce(mockCreditInfo);

      const result = await CreditServiceEssentials.processCreditTransaction(
        'farmer-1',
        'product-1',
        5, // 5 * 1000 = 5000, but only 1000 available
        'admin-1'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Insufficient credit balance');
    });
  });

  describe('Credit Request Service Edge Cases', () => {
    it('should handle database error when creating credit request', async () => {
      // Setup mock responses with error
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'credit_requests') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: new Error('Insert failed'), data: null })
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

      await expect(CreditRequestService.createCreditRequest(
        'farmer-1',
        'product-1',
        5,
        'Test Product',
        100
      )).rejects.toThrow('Insert failed');
    });

    it('should handle database error when approving credit request', async () => {
      // Mock credit request
      const mockCreditRequest = {
        id: 'request-1',
        farmer_id: 'farmer-1',
        product_id: 'product-1',
        product_name: 'Test Product',
        quantity: 5,
        unit_price: 100,
        total_amount: 500,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Setup mock responses with error
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'credit_requests') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditRequest, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: new Error('Update failed'), data: null })
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

      // Mock successful credit transaction processing
      vi.spyOn(CreditServiceEssentials, 'processCreditTransaction').mockResolvedValueOnce({
        success: true,
        transactionId: 'transaction-123',
      } as any);

      await expect(CreditRequestService.approveCreditRequest('request-1', 'admin-1'))
        .rejects
        .toThrow('Update failed');
    });
  });

  describe('Mathematical Edge Cases', () => {
    it('should handle zero quantity purchases', async () => {
      // Mock product data
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        selling_price: 1000,
        is_credit_eligible: true
      };

      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 5000.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProduct, error: null })
          };
        } else if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: mockProfile })
            }))
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: { id: 'transaction-1' } })
            }))
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

      const result = await CreditServiceEssentials.processCreditTransaction(
        'farmer-1',
        'product-1',
        0, // Zero quantity
        'admin-1'
      );

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });

    it('should handle negative values gracefully', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 5000.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
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
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      // Mock the calculateCreditEligibility method to return negative values
      vi.spyOn(CreditServiceEssentials, 'calculateCreditEligibility').mockResolvedValueOnce({
        isEligible: true,
        creditLimit: -1000, // Negative credit limit
        availableCredit: 5000,
        pendingPayments: -5000 // Negative pending payments
      });

      const result = await CreditServiceEssentials.calculateCreditEligibility('farmer-1');

      // Values should be handled properly (converted to positive or zero)
      expect(result.pendingPayments).toBeGreaterThanOrEqual(0);
      expect(result.creditLimit).toBeGreaterThanOrEqual(0);
    });
  });
});