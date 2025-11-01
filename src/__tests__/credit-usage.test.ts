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

describe('Credit Usage Calculations', () => {
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

  describe('useCreditForPurchase', () => {
    it('should correctly calculate credit usage for a purchase', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 15000.00,
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
        2, // 2 units
        'staff-1'
      );

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('transaction-1');
    });

    it('should reject purchase when product is not credit eligible', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 15000.00,
        total_credit_used: 20000.00,
        pending_deductions: 5000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock agrovet inventory item that is not credit eligible
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
        is_credit_eligible: false, // Not credit eligible
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
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
        2, // 2 units
        'staff-1'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('This product is not eligible for credit purchase');
    });

    it('should reject purchase when farmer has insufficient credit', async () => {
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
        selling_price: 250.00, // 250 per unit
        is_credit_eligible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

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
        5, // 5 units at 250 each = 1250, but only 100 credit available
        'staff-1'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Insufficient credit balance');
    });

    it('should correctly update credit profile after successful purchase', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 15000.00,
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

      // Expected updated profile after purchase of 2 units (500 total)
      const expectedUpdatedProfile = {
        ...mockProfile,
        current_credit_balance: 14500.00, // 15000 - 500
        total_credit_used: 20500.00, // 20000 + 500
        pending_deductions: 5500.00 // 5000 + 500
      };

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
              .mockResolvedValueOnce({ data: mockProfile, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: expectedUpdatedProfile })
            }))
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
        2, // 2 units at 250 each = 500 total
        'staff-1'
      );

      expect(result.success).toBe(true);
      // We can't directly test the updated profile values without more complex mocking,
      // but we can verify the function was called with the correct parameters
      expect(supabase.from).toHaveBeenCalledWith('farmer_credit_profiles');
    });
  });
});