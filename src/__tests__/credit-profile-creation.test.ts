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

describe('Credit Profile Creation and Tier Assignments', () => {
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

  describe('createDefaultCreditProfile', () => {
    it('should create a new credit profile with correct tier for new farmer', async () => {
      // Mock farmer data for a new farmer (registered less than 3 months ago)
      const mockFarmerData = {
        created_at: new Date().toISOString() // Today's date
      };

      // Expected credit profile for new farmer
      const expectedCreditProfile = {
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockFarmerData, error: null })
          };
        } else if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
            insert: vi.fn().mockImplementation((data) => {
              // Verify that the inserted data matches expected values for new farmer
              expect(data.farmer_id).toBe('farmer-1');
              expect(data.credit_tier).toBe('new');
              expect(data.credit_limit_percentage).toBe(30.00);
              expect(data.max_credit_amount).toBe(50000.00);
              expect(data.current_credit_balance).toBe(0.00);
              expect(data.is_frozen).toBe(false);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                  error: null, 
                  data: { 
                    id: 'profile-1',
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  } 
                })
              };
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

      const result = await CreditServiceEssentials.createDefaultCreditProfile('farmer-1');

      expect(result).toEqual(expect.objectContaining(expectedCreditProfile));
    });

    it('should create a credit profile with established tier for farmer registered more than 3 months ago', async () => {
      // Mock farmer data for an established farmer (registered more than 3 months ago but less than 12)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 4); // 4 months ago
      
      const mockFarmerData = {
        created_at: threeMonthsAgo.toISOString()
      };

      // Expected credit profile for established farmer
      const expectedCreditProfile = {
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockFarmerData, error: null })
          };
        } else if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
            insert: vi.fn().mockImplementation((data) => {
              // Verify that the inserted data matches expected values for established farmer
              expect(data.farmer_id).toBe('farmer-1');
              expect(data.credit_tier).toBe('established');
              expect(data.credit_limit_percentage).toBe(60.00);
              expect(data.max_credit_amount).toBe(75000.00);
              expect(data.current_credit_balance).toBe(0.00);
              expect(data.is_frozen).toBe(false);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                  error: null, 
                  data: { 
                    id: 'profile-1',
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  } 
                })
              };
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

      const result = await CreditServiceEssentials.createDefaultCreditProfile('farmer-1');

      expect(result).toEqual(expect.objectContaining(expectedCreditProfile));
    });

    it('should create a credit profile with premium tier for farmer registered more than 12 months ago', async () => {
      // Mock farmer data for a premium farmer (registered more than 12 months ago)
      const thirteenMonthsAgo = new Date();
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13); // 13 months ago
      
      const mockFarmerData = {
        created_at: thirteenMonthsAgo.toISOString()
      };

      // Expected credit profile for premium farmer
      const expectedCreditProfile = {
        farmer_id: 'farmer-1',
        credit_tier: 'premium',
        credit_limit_percentage: 70.00,
        max_credit_amount: 100000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockFarmerData, error: null })
          };
        } else if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
            insert: vi.fn().mockImplementation((data) => {
              // Verify that the inserted data matches expected values for premium farmer
              expect(data.farmer_id).toBe('farmer-1');
              expect(data.credit_tier).toBe('premium');
              expect(data.credit_limit_percentage).toBe(70.00);
              expect(data.max_credit_amount).toBe(100000.00);
              expect(data.current_credit_balance).toBe(0.00);
              expect(data.is_frozen).toBe(false);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                  error: null, 
                  data: { 
                    id: 'profile-1',
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  } 
                })
              };
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

      const result = await CreditServiceEssentials.createDefaultCreditProfile('farmer-1');

      expect(result).toEqual(expect.objectContaining(expectedCreditProfile));
    });

    it('should create a default new tier profile when farmer data is not found', async () => {
      // Mock case where farmer data is not found
      const mockFarmerData = null;

      // Expected credit profile for new farmer (default)
      const expectedCreditProfile = {
        farmer_id: 'farmer-1',
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockFarmerData, error: null })
          };
        } else if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
            insert: vi.fn().mockImplementation((data) => {
              // Verify that the inserted data matches expected values for default new farmer
              expect(data.farmer_id).toBe('farmer-1');
              expect(data.credit_tier).toBe('new');
              expect(data.credit_limit_percentage).toBe(30.00);
              expect(data.max_credit_amount).toBe(50000.00);
              expect(data.current_credit_balance).toBe(0.00);
              expect(data.is_frozen).toBe(false);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ 
                  error: null, 
                  data: { 
                    id: 'profile-1',
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  } 
                })
              };
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

      const result = await CreditServiceEssentials.createDefaultCreditProfile('farmer-1');

      expect(result).toEqual(expect.objectContaining(expectedCreditProfile));
    });
  });

  describe('calculateCreditEligibility', () => {
    it('should calculate eligibility correctly based on farmer tier', async () => {
      // Mock farmer credit profile with new tier
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
      // Total pending payments: 15,000
      // 30% of 15,000 = 4,500
      // But since current_credit_balance is 0, availableCredit is 0

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

      const result = await CreditServiceEssentials.calculateCreditEligibility('farmer-1');

      expect(result.isEligible).toBe(true);
      expect(result.pendingPayments).toBe(15000);
      expect(result.creditLimit).toBe(4500); // 30% of 15,000
      expect(result.availableCredit).toBe(0); // No credit granted yet
    });

    it('should return zero eligibility for frozen credit profile', async () => {
      // Mock frozen farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 15000.00,
        total_credit_used: 20000.00,
        pending_deductions: 5000.00,
        is_frozen: true, // Frozen account
        freeze_reason: 'Overdue payments',
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
});