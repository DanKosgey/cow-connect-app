import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreditDefaultManagementService } from '@/services/credit-default-management-service';
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
      getCreditProfile: vi.fn(),
      freezeUnfreezeCredit: vi.fn()
    }
  };
});

describe('Credit Defaults and Recovery Actions', () => {
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

  describe('identifyOverdueFarmers', () => {
    it('should identify farmers with overdue payments and create default records', async () => {
      // Mock credit profiles with overdue payments
      const mockCreditProfiles = [
        {
          id: 'profile-1',
          farmer_id: 'farmer-1',
          pending_deductions: 15000.00,
          last_settlement_date: '2023-09-01',
          next_settlement_date: '2023-10-01' // 30 days overdue
        },
        {
          id: 'profile-2',
          farmer_id: 'farmer-2',
          pending_deductions: 8000.00,
          last_settlement_date: '2023-09-15',
          next_settlement_date: '2023-10-15' // 15 days overdue
        }
      ];

      // Expected default records
      const expectedDefaults = [
        {
          farmer_id: 'farmer-1',
          overdue_amount: 15000.00,
          days_overdue: 30,
          status: 'past_due' // More than 15 days but less than 30
        },
        {
          farmer_id: 'farmer-2',
          overdue_amount: 8000.00,
          days_overdue: 15,
          status: 'overdue' // 15 days or less
        }
      ];

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditProfiles, error: null })
          };
        } else if (table === 'credit_defaults') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null }), // No existing defaults
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the default data matches expected values
              const expectedDefault = expectedDefaults.find(d => d.farmer_id === data.farmer_id);
              if (expectedDefault) {
                expect(data.overdue_amount).toBe(expectedDefault.overdue_amount);
                expect(data.days_overdue).toBe(expectedDefault.days_overdue);
                expect(data.status).toBe(expectedDefault.status);
              }
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: { id: `default-${data.farmer_id}`, ...data } })
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
          insert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          })),
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      });

      const result = await CreditDefaultManagementService.identifyOverdueFarmers();

      expect(result).toHaveLength(2);
      expect(insertCalled).toBe(true);
    });

    it('should update existing default records instead of creating new ones', async () => {
      // Mock credit profiles with overdue payments
      const mockCreditProfiles = [
        {
          id: 'profile-1',
          farmer_id: 'farmer-1',
          pending_deductions: 20000.00,
          last_settlement_date: '2023-08-01',
          next_settlement_date: '2023-09-01' // 60 days overdue
        }
      ];

      // Mock existing default record
      const mockExistingDefault = {
        id: 'default-1',
        farmer_id: 'farmer-1',
        overdue_amount: 15000.00,
        days_overdue: 45,
        status: 'past_due',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let updateCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditProfiles, error: null })
          };
        } else if (table === 'credit_defaults') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockExistingDefault, error: null }), // Existing default found
            update: vi.fn().mockImplementation((data) => {
              updateCalled = true;
              // Verify that the update data matches expected values
              expect(data.overdue_amount).toBe(20000.00);
              expect(data.days_overdue).toBe(60);
              expect(data.status).toBe('severely_overdue'); // More than 30 days
              
              return {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: { ...mockExistingDefault, ...data, updated_at: new Date().toISOString() } })
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
          insert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          })),
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      });

      const result = await CreditDefaultManagementService.identifyOverdueFarmers();

      expect(result).toHaveLength(1);
      expect(updateCalled).toBe(true);
    });
  });

  describe('createRecoveryAction', () => {
    it('should create recovery action with correct details', async () => {
      // Mock recovery action data
      const mockRecoveryAction = {
        id: 'action-1',
        default_id: 'default-1',
        action_type: 'schedule_visit',
        status: 'pending',
        notes: 'Schedule visit to discuss overdue payment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Expected recovery action
      const expectedRecoveryAction = {
        default_id: 'default-1',
        action_type: 'schedule_visit',
        status: 'pending',
        notes: 'Schedule visit to discuss overdue payment'
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'recovery_actions') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the inserted data matches expected values
              expect(data.default_id).toBe(expectedRecoveryAction.default_id);
              expect(data.action_type).toBe(expectedRecoveryAction.action_type);
              expect(data.status).toBe(expectedRecoveryAction.status);
              expect(data.notes).toBe(expectedRecoveryAction.notes);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: mockRecoveryAction })
              };
            })
          };
        } else if (table === 'credit_defaults') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { 
                id: 'default-1', 
                farmer_id: 'farmer-1', 
                overdue_amount: 15000.00 
              }, 
              error: null 
            })
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

      const result = await CreditDefaultManagementService.createRecoveryAction(
        'default-1',
        'schedule_visit',
        'Schedule visit to discuss overdue payment',
        'admin-1'
      );

      expect(result).toEqual(mockRecoveryAction);
      expect(insertCalled).toBe(true);
    });
  });

  describe('suspendCredit', () => {
    it('should suspend credit for a farmer with overdue payments', async () => {
      // Mock farmer credit profile
      const mockCreditProfile = {
        id: 'profile-1',
        farmer_id: 'farmer-1',
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 20000.00,
        total_credit_used: 55000.00,
        pending_deductions: 15000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Get the mocked supabase client and CreditServiceEssentials
      const { supabase } = require('@/integrations/supabase/client');
      const { CreditServiceEssentials } = require('@/services/credit-service-essentials');
      
      // Setup mock responses
      (CreditServiceEssentials.getCreditProfile as jest.Mock)
        .mockResolvedValueOnce(mockCreditProfile);
      
      (CreditServiceEssentials.freezeUnfreezeCredit as jest.Mock)
        .mockResolvedValueOnce(true);

      const result = await CreditDefaultManagementService.suspendCredit(
        'farmer-1',
        'Overdue payment of KES 15,000',
        'admin-1'
      );

      expect(result).toBe(true);
      expect(CreditServiceEssentials.getCreditProfile).toHaveBeenCalledWith('farmer-1');
      expect(CreditServiceEssentials.freezeUnfreezeCredit).toHaveBeenCalledWith(
        'farmer-1',
        true,
        'Credit suspended due to default: Overdue payment of KES 15,000',
        'admin-1'
      );
    });

    it('should throw error when credit profile is not found', async () => {
      // Get the mocked supabase client and CreditServiceEssentials
      const { CreditServiceEssentials } = require('@/services/credit-service-essentials');
      
      // Setup mock responses
      (CreditServiceEssentials.getCreditProfile as jest.Mock)
        .mockResolvedValueOnce(null); // No credit profile found

      await expect(CreditDefaultManagementService.suspendCredit(
        'farmer-1',
        'Overdue payment',
        'admin-1'
      )).rejects.toThrow('Credit profile not found for farmer');
    });
  });

  describe('resolveDefault', () => {
    it('should resolve a default and update its status', async () => {
      // Mock updated default record
      const mockUpdatedDefault = {
        id: 'default-1',
        farmer_id: 'farmer-1',
        overdue_amount: 15000.00,
        days_overdue: 30,
        status: 'resolved', // Updated status
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let updateCalled = false;
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'credit_defaults') {
          return {
            update: vi.fn().mockImplementation((data) => {
              updateCalled = true;
              // Verify that the update data matches expected values
              expect(data.status).toBe('resolved');
              
              return {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: mockUpdatedDefault })
              };
            })
          };
        } else if (table === 'contact_history') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the contact history data contains resolution notes
              expect(data.notes).toEqual(expect.stringContaining('Default resolved:'));
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: { id: 'contact-1', ...data } })
              };
            })
          };
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ 
              data: { user_id: 'user-1', profiles: { full_name: 'Test Farmer' } }, 
              error: null 
            })
          };
        } else if (table === 'notifications') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: null })
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
          })),
          insert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      });

      const result = await CreditDefaultManagementService.resolveDefault(
        'default-1',
        'Payment received and account brought current'
      );

      expect(result).toEqual(mockUpdatedDefault);
      expect(updateCalled).toBe(true);
      expect(insertCalled).toBe(true);
    });
  });

  describe('addContactHistory', () => {
    it('should add contact history for a default', async () => {
      // Mock contact history data
      const mockContactHistory = {
        id: 'contact-1',
        default_id: 'default-1',
        contact_method: 'sms',
        notes: 'Called farmer to discuss overdue payment',
        contacted_by: 'admin-1',
        created_at: new Date().toISOString()
      };

      // Expected contact history
      const expectedContactHistory = {
        default_id: 'default-1',
        contact_method: 'sms',
        notes: 'Called farmer to discuss overdue payment',
        contacted_by: 'admin-1'
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'contact_history') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify that the inserted data matches expected values
              expect(data.default_id).toBe(expectedContactHistory.default_id);
              expect(data.contact_method).toBe(expectedContactHistory.contact_method);
              expect(data.notes).toBe(expectedContactHistory.notes);
              expect(data.contacted_by).toBe(expectedContactHistory.contacted_by);
              
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: mockContactHistory })
              };
            })
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

      const result = await CreditDefaultManagementService.addContactHistory(
        'default-1',
        'sms',
        'Called farmer to discuss overdue payment',
        'admin-1'
      );

      expect(result).toEqual(mockContactHistory);
      expect(insertCalled).toBe(true);
    });
  });
});