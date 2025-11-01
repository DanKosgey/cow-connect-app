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

describe('Credit Transaction Audit Trail Integrity', () => {
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
    it('should create audit trail with correct transaction details when granting credit', async () => {
      // Mock farmer credit profile
      const mockProfile = {
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
      // Total pending payments: 30,000
      // 60% of 30,000 = 18,000
      // This is the amount that should be granted and recorded in the transaction

      // Expected transaction details
      const expectedTransaction = {
        farmer_id: 'farmer-1',
        transaction_type: 'credit_granted',
        amount: 18000.00,
        balance_before: 0.00,
        balance_after: 18000.00,
        description: expect.stringContaining('Credit granted based on pending payments of KES 30000.00'),
        approved_by: 'admin-1',
        approval_status: 'approved'
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let selectCallCount = 0;
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call - check eligibility
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
            };
          } else if (selectCallCount === 2) {
            // Second call - get profile for granting
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
                .mockResolvedValueOnce({ data: mockProfile, error: null })
            };
          } else {
            // Third call - update profile
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
              update: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                  error: null, 
                  data: { 
                    ...mockProfile, 
                    current_credit_balance: 18000.00,
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
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the transaction data matches expected values
              expect(data.farmer_id).toBe(expectedTransaction.farmer_id);
              expect(data.transaction_type).toBe(expectedTransaction.transaction_type);
              expect(data.amount).toBe(expectedTransaction.amount);
              expect(data.balance_before).toBe(expectedTransaction.balance_before);
              expect(data.balance_after).toBe(expectedTransaction.balance_after);
              expect(data.description).toEqual(expect.stringContaining('Credit granted based on pending payments'));
              expect(data.approved_by).toBe(expectedTransaction.approved_by);
              expect(data.approval_status).toBe(expectedTransaction.approval_status);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'transaction-1' } })
              };
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
      expect(insertCalled).toBe(true);
    });
  });

  describe('useCreditForPurchase', () => {
    it('should create audit trail with correct transaction details when using credit for purchase', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'premium',
        credit_limit_percentage: 70.00,
        max_credit_amount: 100000.00,
        current_credit_balance: 25000.00,
        total_credit_used: 75000.00,
        pending_deductions: 20000.00,
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
      const quantity = 4;
      const totalAmount = 1000.00; // 4 * 250

      // Expected transaction details
      const expectedTransaction = {
        farmer_id: 'farmer-1',
        transaction_type: 'credit_used',
        amount: 1000.00,
        balance_before: 25000.00,
        balance_after: 24000.00, // 25000 - 1000
        product_id: 'product-1',
        product_name: 'Fertilizer',
        quantity: 4,
        unit_price: 250.00,
        description: 'Credit used for Fertilizer (4 kg)',
        approved_by: 'staff-1',
        approval_status: 'approved'
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let selectCallCount = 0;
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First call - check eligibility
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
            };
          } else if (selectCallCount === 2) {
            // Second call - get profile for purchase
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
                .mockResolvedValueOnce({ data: mockProfile, error: null })
            };
          } else {
            // Third call - update profile
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
              update: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                  error: null, 
                  data: { 
                    ...mockProfile, 
                    current_credit_balance: 24000.00,
                    total_credit_used: 76000.00,
                    pending_deductions: 21000.00,
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
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the transaction data matches expected values
              expect(data.farmer_id).toBe(expectedTransaction.farmer_id);
              expect(data.transaction_type).toBe(expectedTransaction.transaction_type);
              expect(data.amount).toBe(expectedTransaction.amount);
              expect(data.balance_before).toBe(expectedTransaction.balance_before);
              expect(data.balance_after).toBe(expectedTransaction.balance_after);
              expect(data.product_id).toBe(expectedTransaction.product_id);
              expect(data.product_name).toBe(expectedTransaction.product_name);
              expect(data.quantity).toBe(expectedTransaction.quantity);
              expect(data.unit_price).toBe(expectedTransaction.unit_price);
              expect(data.description).toBe(expectedTransaction.description);
              expect(data.approved_by).toBe(expectedTransaction.approved_by);
              expect(data.approval_status).toBe(expectedTransaction.approval_status);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'transaction-1' } })
              };
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

      const result = await CreditServiceEssentials.useCreditForPurchase(
        'farmer-1',
        'product-1',
        quantity,
        'staff-1'
      );

      expect(result.success).toBe(true);
      expect(insertCalled).toBe(true);
    });
  });

  describe('adjustCreditLimit', () => {
    it('should create audit trail with correct transaction details when adjusting credit limit', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00, // Current limit
        current_credit_balance: 20000.00,
        total_credit_used: 55000.00,
        pending_deductions: 15000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // New credit limit
      const newLimit = 90000.00;
      const difference = newLimit - mockProfile.max_credit_amount; // 15,000

      // Expected transaction details
      const expectedTransaction = {
        farmer_id: 'farmer-1',
        transaction_type: 'credit_adjusted',
        amount: difference, // 15,000
        balance_before: 20000.00,
        balance_after: 20000.00, // Balance unchanged
        description: 'Credit limit adjusted from KES 75000.00 to KES 90000.00',
        approved_by: 'admin-1',
        approval_status: 'approved'
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                error: null, 
                data: { 
                  ...mockProfile, 
                  max_credit_amount: newLimit,
                  updated_at: new Date().toISOString()
                } 
              })
            }))
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the transaction data matches expected values
              expect(data.farmer_id).toBe(expectedTransaction.farmer_id);
              expect(data.transaction_type).toBe(expectedTransaction.transaction_type);
              expect(data.amount).toBe(expectedTransaction.amount);
              expect(data.balance_before).toBe(expectedTransaction.balance_before);
              expect(data.balance_after).toBe(expectedTransaction.balance_after);
              expect(data.description).toBe(expectedTransaction.description);
              expect(data.approved_by).toBe(expectedTransaction.approved_by);
              expect(data.approval_status).toBe(expectedTransaction.approval_status);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'transaction-1' } })
              };
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

      const result = await CreditServiceEssentials.adjustCreditLimit('farmer-1', newLimit, 'admin-1');

      expect(result).toBe(true);
      expect(insertCalled).toBe(true);
    });
  });

  describe('freezeUnfreezeCredit', () => {
    it('should create audit trail with correct transaction details when freezing credit', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 15000.00,
        total_credit_used: 35000.00,
        pending_deductions: 10000.00,
        is_frozen: false, // Currently not frozen
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Expected transaction details
      const expectedTransaction = {
        farmer_id: 'farmer-1',
        transaction_type: 'credit_adjusted',
        amount: 0, // No amount change
        balance_before: 15000.00,
        balance_after: 15000.00, // Balance unchanged
        description: 'Credit line frozen: Overdue payment',
        approved_by: 'admin-1',
        approval_status: 'approved'
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                error: null, 
                data: { 
                  ...mockProfile, 
                  is_frozen: true,
                  freeze_reason: 'Overdue payment',
                  updated_at: new Date().toISOString()
                } 
              })
            }))
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the transaction data matches expected values
              expect(data.farmer_id).toBe(expectedTransaction.farmer_id);
              expect(data.transaction_type).toBe(expectedTransaction.transaction_type);
              expect(data.amount).toBe(expectedTransaction.amount);
              expect(data.balance_before).toBe(expectedTransaction.balance_before);
              expect(data.balance_after).toBe(expectedTransaction.balance_after);
              expect(data.description).toBe(expectedTransaction.description);
              expect(data.approved_by).toBe(expectedTransaction.approved_by);
              expect(data.approval_status).toBe(expectedTransaction.approval_status);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'transaction-1' } })
              };
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

      const result = await CreditServiceEssentials.freezeUnfreezeCredit(
        'farmer-1',
        true, // Freeze
        'Overdue payment',
        'admin-1'
      );

      expect(result).toBe(true);
      expect(insertCalled).toBe(true);
    });
  });

  describe('performMonthlySettlement', () => {
    it('should create audit trail with correct transaction details during monthly settlement', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'premium',
        credit_limit_percentage: 70.00,
        max_credit_amount: 100000.00,
        current_credit_balance: 25000.00,
        total_credit_used: 75000.00,
        pending_deductions: 30000.00, // This amount should be recorded in settlement transaction
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Expected transaction details
      const expectedTransaction = {
        farmer_id: 'farmer-1',
        transaction_type: 'settlement',
        amount: 30000.00, // Pending deductions amount
        balance_before: 25000.00,
        balance_after: 100000.00, // Reset to max credit amount
        description: expect.stringContaining('Monthly settlement completed. KES 30000.00 deducted from milk payments.'),
        approved_by: 'admin-1',
        approval_status: 'approved'
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                error: null, 
                data: { 
                  ...mockProfile, 
                  current_credit_balance: 100000.00,
                  pending_deductions: 0.00,
                  last_settlement_date: new Date().toISOString().split('T')[0],
                  updated_at: new Date().toISOString()
                } 
              })
            }))
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the transaction data matches expected values
              expect(data.farmer_id).toBe(expectedTransaction.farmer_id);
              expect(data.transaction_type).toBe(expectedTransaction.transaction_type);
              expect(data.amount).toBe(expectedTransaction.amount);
              expect(data.balance_before).toBe(expectedTransaction.balance_before);
              expect(data.balance_after).toBe(expectedTransaction.balance_after);
              expect(data.description).toEqual(expect.stringContaining('Monthly settlement completed'));
              expect(data.approved_by).toBe(expectedTransaction.approved_by);
              expect(data.approval_status).toBe(expectedTransaction.approval_status);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'transaction-1' } })
              };
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

      const result = await CreditServiceEssentials.performMonthlySettlement('farmer-1', 'admin-1');

      expect(result).toBe(true);
      expect(insertCalled).toBe(true);
    });
  });

  describe('getCreditTransactions', () => {
    it('should retrieve audit trail transactions in correct order', async () => {
      // Mock credit transactions
      const mockTransactions = [
        {
          id: 'transaction-3',
          farmer_id: 'farmer-1',
          transaction_type: 'credit_used',
          amount: 5000.00,
          balance_before: 20000.00,
          balance_after: 15000.00,
          description: 'Credit used for Seeds',
          created_at: new Date('2023-10-15').toISOString()
        },
        {
          id: 'transaction-2',
          farmer_id: 'farmer-1',
          transaction_type: 'credit_granted',
          amount: 20000.00,
          balance_before: 0.00,
          balance_after: 20000.00,
          description: 'Credit granted',
          created_at: new Date('2023-10-10').toISOString()
        },
        {
          id: 'transaction-1',
          farmer_id: 'farmer-1',
          transaction_type: 'credit_adjusted',
          amount: 0.00,
          balance_before: 15000.00,
          balance_after: 15000.00,
          description: 'Credit line frozen',
          created_at: new Date('2023-10-05').toISOString()
        }
      ];

      // Expected transactions in descending order by created_at
      const expectedOrderedTransactions = [
        mockTransactions[0], // Most recent
        mockTransactions[1], // Middle
        mockTransactions[2]  // Oldest
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
            maybeSingle: vi.fn().mockResolvedValue({ error: null, data: mockTransactions })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await CreditServiceEssentials.getCreditTransactions('farmer-1', 10);

      expect(result).toEqual(expectedOrderedTransactions);
    });
  });
});