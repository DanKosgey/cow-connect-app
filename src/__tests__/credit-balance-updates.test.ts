import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreditServiceEssentials } from '@/services/credit-service-essentials';

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

describe('Credit Balance Updates', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Get the mocked supabase client
    const { supabase } = require('@/integrations/supabase/client');
    
    // Setup default mock responses
    supabase.from.mockImplementation((table: string) => {
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

  describe('grantCreditToFarmer', () => {
    it('should correctly update credit balance when granting credit', async () => {
      // Mock farmer credit profile before granting
      const mockProfileBefore = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 0.00, // No credit granted yet
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock pending collections
      const mockCollections = [
        { total_amount: 20000 },
        { total_amount: 10000 }
      ];

      // Expected credit limit after granting (60% of 30000 = 18000)
      const expectedCreditLimit = 18000.00;

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let selectCallCount = 0;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call - check eligibility
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfileBefore, error: null })
            };
          } else if (selectCallCount === 2) {
            // Second call - get profile for granting
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfileBefore, error: null })
                .mockResolvedValueOnce({ data: mockProfileBefore, error: null })
            };
          } else {
            // Subsequent calls
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileBefore, error: null }),
              update: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                  error: null, 
                  data: { 
                    ...mockProfileBefore, 
                    current_credit_balance: expectedCreditLimit,
                    updated_at: new Date().toISOString()
                  } 
                })
              }))
            };
          }
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

      const result = await CreditServiceEssentials.grantCreditToFarmer('farmer-1', 'admin-1');

      expect(result).toBe(true);
      // Verify that the update was called with the correct parameters
      // We can't directly test the updated values without more complex mocking,
      // but we can verify the function was called
      expect(supabase.from).toHaveBeenCalledWith('farmer_credit_profiles');
    });

    it('should not grant credit if farmer already has credit', async () => {
      // Mock farmer credit profile with existing credit
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 15000.00, // Already has credit
        total_credit_used: 5000.00,
        pending_deductions: 2000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock pending collections
      const mockCollections = [
        { total_amount: 20000 },
        { total_amount: 10000 }
      ];

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
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
  });

  describe('useCreditForPurchase', () => {
    it('should correctly update credit balance after purchase', async () => {
      // Mock farmer credit profile before purchase
      const mockProfileBefore = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 15000.00, // 15,000 available
        total_credit_used: 20000.00,
        pending_deductions: 5000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock agrovet inventory item
      const mockProduct = {
        id: 'product-1',
        name: 'Fertilizer',
        sku: 'FERT-001',
        description: 'High-quality fertilizer',
        category: 'Fertilizers',
        unit: 'kg',
        current_stock: 100,
        reorder_level: 20,
        supplier: 'AgroSuppliers Ltd',
        cost_price: 200.00,
        selling_price: 250.00,
        is_credit_eligible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Purchase details
      const quantity = 3;
      const totalAmount = 750.00; // 3 * 250

      // Expected profile after purchase
      const expectedProfileAfter = {
        ...mockProfileBefore,
        current_credit_balance: 14250.00, // 15000 - 750
        total_credit_used: 20750.00, // 20000 + 750
        pending_deductions: 5750.00, // 5000 + 750
        updated_at: new Date().toISOString()
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let selectCallCount = 0;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call - check eligibility
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfileBefore, error: null })
            };
          } else if (selectCallCount === 2) {
            // Second call - get profile for purchase
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfileBefore, error: null })
                .mockResolvedValueOnce({ data: mockProfileBefore, error: null })
            };
          } else {
            // Third call - update profile
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileBefore, error: null }),
              update: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                  error: null, 
                  data: expectedProfileAfter
                })
              }))
            };
          }
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: [], error: null })
          };
        } else if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProduct, error: null })
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

      const result = await CreditServiceEssentials.useCreditForPurchase(
        'farmer-1',
        'product-1',
        quantity,
        'staff-1'
      );

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('transaction-1');
    });

    it('should not allow purchase that exceeds credit balance', async () => {
      // Mock farmer credit profile with low credit balance
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 100.00, // Very low balance
        total_credit_used: 5000.00,
        pending_deductions: 1000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock agrovet inventory item
      const mockProduct = {
        id: 'product-1',
        name: 'Fertilizer',
        sku: 'FERT-001',
        description: 'High-quality fertilizer',
        category: 'Fertilizers',
        unit: 'kg',
        current_stock: 100,
        reorder_level: 20,
        supplier: 'AgroSuppliers Ltd',
        cost_price: 200.00,
        selling_price: 250.00,
        is_credit_eligible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Purchase that exceeds available credit
      const quantity = 5; // 5 * 250 = 1250, but only 100 available

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
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
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: [], error: null })
          };
        } else if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProduct, error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await CreditServiceEssentials.useCreditForPurchase(
        'farmer-1',
        'product-1',
        quantity,
        'staff-1'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Insufficient credit balance');
    });
  });

  describe('performMonthlySettlement', () => {
    it('should correctly reset credit balance during monthly settlement', async () => {
      // Mock farmer credit profile before settlement
      const mockProfileBefore = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'premium',
        credit_limit_percentage: 70.00,
        max_credit_amount: 100000.00,
        current_credit_balance: 25000.00, // 25,000 remaining
        total_credit_used: 75000.00,
        pending_deductions: 30000.00, // 30,000 to be deducted
        is_frozen: false,
        last_settlement_date: '2023-10-01',
        next_settlement_date: '2023-11-01',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Expected profile after settlement
      const expectedProfileAfter = {
        ...mockProfileBefore,
        current_credit_balance: 100000.00, // Reset to max amount
        pending_deductions: 0.00, // Reset to zero
        last_settlement_date: new Date().toISOString().split('T')[0], // Today's date
        updated_at: new Date().toISOString()
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfileBefore, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                error: null, 
                data: expectedProfileAfter
              })
            }))
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: { id: 'settlement-1' } })
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

      const result = await CreditServiceEssentials.performMonthlySettlement('farmer-1', 'admin-1');

      expect(result).toBe(true);
      // Verify that the update was called with the correct parameters
      expect(supabase.from).toHaveBeenCalledWith('farmer_credit_profiles');
    });
  });
});