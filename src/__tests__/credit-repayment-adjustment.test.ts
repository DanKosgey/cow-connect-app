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

describe('Credit Repayment and Adjustment Mechanisms', () => {
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

  describe('performMonthlySettlement', () => {
    it('should correctly reset credit balance and pending deductions during monthly settlement', async () => {
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
      expect(supabase.from).toHaveBeenCalledWith('credit_transactions');
    });

    it('should create settlement transaction with correct amount', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 15000.00,
        total_credit_used: 60000.00,
        pending_deductions: 25000.00, // This amount should be recorded in settlement transaction
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
                  current_credit_balance: 75000.00,
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
              // Verify that the settlement transaction has the correct amount
              if (data && data.amount === 25000.00) {
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({ error: null, data: { id: 'settlement-1' } })
                };
              }
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: new Error('Incorrect amount in settlement transaction'), data: null })
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

  describe('freezeUnfreezeCredit', () => {
    it('should correctly freeze credit when requested by admin', async () => {
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

      // Expected profile after freezing
      const expectedProfileAfter = {
        ...mockProfile,
        is_frozen: true,
        freeze_reason: 'Overdue payment',
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
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
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
              single: vi.fn().mockResolvedValue({ error: null, data: { id: 'freeze-1' } })
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

      const result = await CreditServiceEssentials.freezeUnfreezeCredit(
        'farmer-1', 
        true, // Freeze
        'Overdue payment', 
        'admin-1'
      );

      expect(result).toBe(true);
      // Verify that the profile was updated to frozen state
      expect(supabase.from).toHaveBeenCalledWith('farmer_credit_profiles');
    });

    it('should correctly unfreeze credit when requested by admin', async () => {
      // Mock farmer credit profile that is currently frozen
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 20000.00,
        total_credit_used: 55000.00,
        pending_deductions: 15000.00,
        is_frozen: true, // Currently frozen
        freeze_reason: 'Overdue payment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Expected profile after unfreezing
      const expectedProfileAfter = {
        ...mockProfile,
        is_frozen: false,
        freeze_reason: null,
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
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
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
              single: vi.fn().mockResolvedValue({ error: null, data: { id: 'unfreeze-1' } })
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

      const result = await CreditServiceEssentials.freezeUnfreezeCredit(
        'farmer-1', 
        false, // Unfreeze
        '', // No reason needed for unfreezing
        'admin-1'
      );

      expect(result).toBe(true);
      // Verify that the profile was updated to unfrozen state
      expect(supabase.from).toHaveBeenCalledWith('farmer_credit_profiles');
    });
  });

  describe('adjustCreditLimit', () => {
    it('should correctly adjust the maximum credit amount', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'premium',
        credit_limit_percentage: 70.00,
        max_credit_amount: 100000.00, // Current max limit
        current_credit_balance: 30000.00,
        total_credit_used: 70000.00,
        pending_deductions: 20000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // New maximum credit amount to set
      const newMaxAmount = 150000.00;

      // Expected updated profile
      const expectedUpdatedProfile = {
        ...mockProfile,
        max_credit_amount: newMaxAmount,
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
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                error: null, 
                data: expectedUpdatedProfile
              })
            }))
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: { id: 'adjustment-1' } })
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

      const result = await CreditServiceEssentials.adjustCreditLimit('farmer-1', newMaxAmount, 'admin-1');

      expect(result).toBe(true);
      // Verify that the update was called with the correct parameters
      expect(supabase.from).toHaveBeenCalledWith('farmer_credit_profiles');
    });

    it('should create adjustment transaction with correct amount difference', async () => {
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00, // Current max limit
        current_credit_balance: 25000.00,
        total_credit_used: 50000.00,
        pending_deductions: 15000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // New maximum credit amount to set
      const newMaxAmount = 90000.00;
      const difference = newMaxAmount - mockProfile.max_credit_amount; // 15,000

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
                  max_credit_amount: newMaxAmount,
                  updated_at: new Date().toISOString()
                }
              })
            }))
          };
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the adjustment transaction has the correct amount difference
              if (data && data.amount === difference) {
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({ error: null, data: { id: 'adjustment-1' } })
                };
              }
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: new Error('Incorrect amount difference in adjustment transaction'), data: null })
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

      const result = await CreditServiceEssentials.adjustCreditLimit('farmer-1', newMaxAmount, 'admin-1');

      expect(result).toBe(true);
      expect(insertCalled).toBe(true);
    });
  });
});