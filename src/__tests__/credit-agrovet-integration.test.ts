import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgrovetServiceEssentials } from '@/services/agrovet-service-essentials';
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

// Mock CreditServiceEssentials
vi.mock('@/services/credit-service-essentials', () => {
  return {
    CreditServiceEssentials: {
      calculateCreditEligibility: vi.fn(),
      useCreditForPurchase: vi.fn()
    }
  };
});

describe('Credit System and Agrovet Purchase Integration', () => {
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
        gt: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
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

  describe('getCreditEligibleProducts', () => {
    it('should retrieve all credit-eligible agrovet products', async () => {
      // Mock agrovet products
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Fertilizer A',
          sku: 'FERT-A',
          description: 'High-quality nitrogen fertilizer',
          category: 'Fertilizers',
          unit: 'kg',
          current_stock: 100,
          selling_price: 250.00,
          is_credit_eligible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'product-2',
          name: 'Pesticide B',
          sku: 'PEST-B',
          description: 'Broad-spectrum pesticide',
          category: 'Pesticides',
          unit: 'liter',
          current_stock: 50,
          selling_price: 500.00,
          is_credit_eligible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProducts, error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          order: vi.fn().mockReturnThis()
        };
      });

      const result = await AgrovetServiceEssentials.getCreditEligibleProducts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Fertilizer A');
      expect(result[0].is_credit_eligible).toBe(true);
      expect(result[1].name).toBe('Pesticide B');
      expect(result[1].is_credit_eligible).toBe(true);
    });

    it('should return empty array when no credit-eligible products exist', async () => {
      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: [], error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          order: vi.fn().mockReturnThis()
        };
      });

      const result = await AgrovetServiceEssentials.getCreditEligibleProducts();

      expect(result).toHaveLength(0);
    });
  });

  describe('purchaseWithCredit', () => {
    it('should successfully process credit purchase when farmer is eligible and has sufficient credit', async () => {
      // Mock credit eligibility
      const mockCreditEligibility = {
        isEligible: true,
        creditLimit: 20000.00,
        availableCredit: 15000.00,
        pendingPayments: 25000.00
      };

      // Mock credit transaction result
      const mockCreditTransactionResult = {
        success: true,
        transactionId: 'transaction-1'
      };

      // Mock agrovet product
      const mockProduct = {
        id: 'product-1',
        name: 'Fertilizer A',
        sku: 'FERT-A',
        description: 'High-quality nitrogen fertilizer',
        category: 'Fertilizers',
        unit: 'kg',
        current_stock: 100,
        selling_price: 250.00,
        is_credit_eligible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Purchase details
      const quantity = 3;
      const totalAmount = 750.00; // 3 * 250

      // Get the mocked supabase client and CreditServiceEssentials
      const { supabase } = require('@/integrations/supabase/client');
      const { CreditServiceEssentials } = require('@/services/credit-service-essentials');
      
      // Setup mock responses
      (CreditServiceEssentials.calculateCreditEligibility as jest.Mock)
        .mockResolvedValueOnce(mockCreditEligibility);
      
      (CreditServiceEssentials.useCreditForPurchase as jest.Mock)
        .mockResolvedValueOnce(mockCreditTransactionResult);
      
      let inventoryUpdateCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProduct, error: null }),
            update: vi.fn().mockImplementation((data) => {
              inventoryUpdateCalled = true;
              // Verify that the inventory is updated correctly
              expect(data.current_stock).toBe(97); // 100 - 3
              
              return {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: null })
              };
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      });

      const result = await AgrovetServiceEssentials.purchaseWithCredit(
        'farmer-1',
        'product-1',
        quantity,
        'staff-1'
      );

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('transaction-1');
      expect(CreditServiceEssentials.calculateCreditEligibility).toHaveBeenCalledWith('farmer-1');
      expect(CreditServiceEssentials.useCreditForPurchase).toHaveBeenCalledWith(
        'farmer-1',
        'product-1',
        quantity,
        'staff-1'
      );
      expect(inventoryUpdateCalled).toBe(true);
    });

    it('should reject purchase when farmer is not eligible for credit', async () => {
      // Mock credit eligibility - not eligible
      const mockCreditEligibility = {
        isEligible: false,
        creditLimit: 0,
        availableCredit: 0,
        pendingPayments: 0
      };

      // Get the mocked CreditServiceEssentials
      const { CreditServiceEssentials } = require('@/services/credit-service-essentials');
      
      // Setup mock responses
      (CreditServiceEssentials.calculateCreditEligibility as jest.Mock)
        .mockResolvedValueOnce(mockCreditEligibility);

      const result = await AgrovetServiceEssentials.purchaseWithCredit(
        'farmer-1',
        'product-1',
        2,
        'staff-1'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Farmer is not eligible for credit purchases');
      expect(CreditServiceEssentials.calculateCreditEligibility).toHaveBeenCalledWith('farmer-1');
      expect(CreditServiceEssentials.useCreditForPurchase).not.toHaveBeenCalled();
    });

    it('should reject purchase when credit transaction fails', async () => {
      // Mock credit eligibility
      const mockCreditEligibility = {
        isEligible: true,
        creditLimit: 20000.00,
        availableCredit: 15000.00,
        pendingPayments: 25000.00
      };

      // Mock credit transaction result - failure
      const mockCreditTransactionResult = {
        success: false,
        errorMessage: 'Insufficient credit balance'
      };

      // Get the mocked CreditServiceEssentials
      const { CreditServiceEssentials } = require('@/services/credit-service-essentials');
      
      // Setup mock responses
      (CreditServiceEssentials.calculateCreditEligibility as jest.Mock)
        .mockResolvedValueOnce(mockCreditEligibility);
      
      (CreditServiceEssentials.useCreditForPurchase as jest.Mock)
        .mockResolvedValueOnce(mockCreditTransactionResult);

      const result = await AgrovetServiceEssentials.purchaseWithCredit(
        'farmer-1',
        'product-1',
        5,
        'staff-1'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Insufficient credit balance');
      expect(CreditServiceEssentials.calculateCreditEligibility).toHaveBeenCalledWith('farmer-1');
      expect(CreditServiceEssentials.useCreditForPurchase).toHaveBeenCalledWith(
        'farmer-1',
        'product-1',
        5,
        'staff-1'
      );
    });
  });

  describe('getProductById', () => {
    it('should retrieve product by ID when it exists', async () => {
      // Mock agrovet product
      const mockProduct = {
        id: 'product-1',
        name: 'Fertilizer A',
        sku: 'FERT-A',
        description: 'High-quality nitrogen fertilizer',
        category: 'Fertilizers',
        unit: 'kg',
        current_stock: 100,
        selling_price: 250.00,
        is_credit_eligible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
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
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await AgrovetServiceEssentials.getProductById('product-1');

      expect(result).toEqual(mockProduct);
    });

    it('should return null when product does not exist', async () => {
      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
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
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await AgrovetServiceEssentials.getProductById('non-existent-product');

      expect(result).toBeNull();
    });
  });

  describe('getPurchaseHistory', () => {
    it('should retrieve farmer\'s purchase history with credit transactions', async () => {
      // Mock purchase history
      const mockPurchaseHistory = [
        {
          id: 'transaction-1',
          farmer_id: 'farmer-1',
          transaction_type: 'credit_used',
          amount: 750.00,
          balance_before: 15000.00,
          balance_after: 14250.00,
          product_id: 'product-1',
          product_name: 'Fertilizer A',
          quantity: 3,
          unit_price: 250.00,
          description: 'Credit used for Fertilizer A (3 kg)',
          created_at: new Date('2023-10-15').toISOString()
        },
        {
          id: 'transaction-2',
          farmer_id: 'farmer-1',
          transaction_type: 'credit_used',
          amount: 1000.00,
          balance_before: 14250.00,
          balance_after: 13250.00,
          product_id: 'product-2',
          product_name: 'Pesticide B',
          quantity: 2,
          unit_price: 500.00,
          description: 'Credit used for Pesticide B (2 liter)',
          created_at: new Date('2023-10-10').toISOString()
        }
      ];

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'credit_transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockPurchaseHistory, error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis()
        };
      });

      const result = await AgrovetServiceEssentials.getPurchaseHistory('farmer-1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].product_name).toBe('Fertilizer A');
      expect(result[0].amount).toBe(750.00);
      expect(result[1].product_name).toBe('Pesticide B');
      expect(result[1].amount).toBe(1000.00);
    });
  });
});