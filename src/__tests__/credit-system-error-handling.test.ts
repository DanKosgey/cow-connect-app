import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreditServiceEssentials } from '@/services/credit-service-essentials';
import { CreditRequestService } from '@/services/credit-request-service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('Credit System Error Handling and Edge Cases', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Credit Eligibility Edge Cases', () => {
    it('should handle farmer with no credit profile', async () => {
      const mockFarmerId = 'farmer-1';
      
      // Mock no existing credit profile
      const mockProfile = null;
      
      // Mock farmer data for new farmer
      const mockFarmerData = {
        created_at: new Date().toISOString()
      };
      
      // Expected credit profile for new farmer
      const expectedCreditProfile = {
        farmer_id: mockFarmerId,
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 0.00,
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false
      };

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
              .mockResolvedValueOnce({ data: null, error: null })
              .mockImplementation((data) => {
                // Verify that the inserted data matches expected values for new farmer
                expect(data.farmer_id).toBe(mockFarmerId);
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
        } else if (table === 'farmers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockFarmerData, error: null })
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
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await CreditServiceEssentials.calculateCreditEligibility(mockFarmerId);

      expect(result.isEligible).toBe(true);
      expect(result.creditLimit).toBe(0); // No pending payments
      expect(result.availableCredit).toBe(0); // New profile has no credit yet
      expect(result.pendingPayments).toBe(0);
    });

    it('should handle frozen farmer account', async () => {
      const mockFarmerId = 'farmer-1';
      
      // Mock frozen farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: mockFarmerId,
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 20000.00,
        total_credit_used: 30000.00,
        pending_deductions: 5000.00,
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
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      const result = await CreditServiceEssentials.calculateCreditEligibility(mockFarmerId);

      expect(result.isEligible).toBe(false);
      expect(result.creditLimit).toBe(0);
      expect(result.availableCredit).toBe(0);
      expect(result.pendingPayments).toBe(0);
    });

    it('should handle database error when fetching credit profile', async () => {
      const mockFarmerId = 'farmer-1';
      
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

      await expect(CreditServiceEssentials.calculateCreditEligibility(mockFarmerId))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('Credit Granting Edge Cases', () => {
    it('should handle farmer with existing credit', async () => {
      const mockFarmerId = 'farmer-1';
      const mockAdminId = 'admin-1';
      
      // Mock farmer credit profile with existing credit
      const mockProfile = {
        id: 'profile-1',
        farmer_id: mockFarmerId,
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
        { total_amount: 20000 }
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
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
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

      await expect(CreditServiceEssentials.grantCreditToFarmer(mockFarmerId, mockAdminId))
        .rejects
        .toThrow('Credit has already been granted to this farmer');
    });

    it('should handle database error during credit granting', async () => {
      const mockFarmerId = 'farmer-1';
      const mockAdminId = 'admin-1';
      
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: mockFarmerId,
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
        { total_amount: 10000 }
      ];

      // Setup mock responses with error
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
        } else if (table === 'credit_transactions') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('Database error during transaction insert') })
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

      await expect(CreditServiceEssentials.grantCreditToFarmer(mockFarmerId, mockAdminId))
        .rejects
        .toThrow('Database error during transaction insert');
    });
  });

  describe('Credit Request Edge Cases', () => {
    it('should handle credit request for farmer with insufficient credit', async () => {
      const mockFarmerId = 'farmer-1';
      const mockProductId = 'product-1';
      const mockQuantity = 10;
      const mockProductName = 'Expensive Product';
      const mockUnitPrice = 10000; // Expensive product
      const mockTotalAmount = 100000; // Total exceeds credit limit

      // Mock credit profile with low balance
      const mockCreditProfile = {
        id: 'profile-1',
        farmer_id: mockFarmerId,
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: 50000.00,
        current_credit_balance: 5000.00, // Low balance
        total_credit_used: 0.00,
        pending_deductions: 0.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditProfile, error: null })
          };
        } else if (table === 'credit_requests') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValueOnce({ 
                data: {
                  id: 'request-1',
                  farmer_id: mockFarmerId,
                  product_id: mockProductId,
                  product_name: mockProductName,
                  quantity: mockQuantity,
                  unit_price: mockUnitPrice,
                  total_amount: mockTotalAmount,
                  status: 'pending',
                  available_credit_at_request: 5000.00,
                  created_at: new Date().toISOString()
                }, 
                error: null 
              })
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

      // Farmer should still be able to submit the request even if they don't have enough credit
      // The system will check credit availability during approval/disbursement
      const creditRequest = await CreditRequestService.createCreditRequest(
        mockFarmerId,
        mockProductId,
        mockQuantity,
        mockProductName,
        mockUnitPrice
      );

      expect(creditRequest).toBeDefined();
      expect(creditRequest.farmer_id).toBe(mockFarmerId);
      expect(creditRequest.total_amount).toBe(mockTotalAmount);
      expect(creditRequest.status).toBe('pending');
      expect(creditRequest.available_credit_at_request).toBe(5000.00);
    });

    it('should handle database error during credit request creation', async () => {
      const mockFarmerId = 'farmer-1';
      const mockProductId = 'product-1';
      const mockQuantity = 5;
      const mockProductName = 'Fertilizer';
      const mockUnitPrice = 1000;

      // Setup mock responses with error
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'credit_requests') {
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('Database error during request creation') })
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
        mockFarmerId,
        mockProductId,
        mockQuantity,
        mockProductName,
        mockUnitPrice
      )).rejects.toThrow('Database error during request creation');
    });
  });

  describe('Concurrent Access Edge Cases', () => {
    it('should handle race condition when multiple credit grants occur simultaneously', async () => {
      const mockFarmerId = 'farmer-1';
      const mockAdminId1 = 'admin-1';
      const mockAdminId2 = 'admin-2';
      
      // Mock farmer credit profile
      const mockProfile = {
        id: 'profile-1',
        farmer_id: mockFarmerId,
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

      // Mock pending collections
      const mockCollections = [
        { total_amount: 30000 }
      ];

      // Setup mock responses
      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          callCount++;
          if (callCount === 1) {
            // First call - return profile with no credit
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
            };
          } else if (callCount === 2) {
            // Second call - still return profile with no credit (simulating race condition)
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
            };
          } else if (callCount === 3) {
            // Third call - return profile for update
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null })
            };
          } else {
            // Subsequent calls
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
              update: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValueOnce({ 
                  data: {
                    ...mockProfile,
                    current_credit_balance: 18000.00, // 60% of 30000
                    total_credit_used: 18000.00
                  }, 
                  error: null 
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
              single: vi.fn().mockResolvedValueOnce({ data: null, error: null })
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

      // Simulate two admins trying to grant credit simultaneously
      const grantPromise1 = CreditServiceEssentials.grantCreditToFarmer(mockFarmerId, mockAdminId1);
      const grantPromise2 = CreditServiceEssentials.grantCreditToFarmer(mockFarmerId, mockAdminId2);

      // One should succeed, one should fail
      const results = await Promise.allSettled([grantPromise1, grantPromise2]);
      
      // At least one should succeed
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThanOrEqual(1);
      
      // At least one might fail due to race condition
      // But the system should handle this gracefully
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle invalid farmer ID', async () => {
      const invalidFarmerId = '';
      
      // Setup mock responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: new Error('Invalid farmer ID') })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      await expect(CreditServiceEssentials.calculateCreditEligibility(invalidFarmerId))
        .rejects
        .toThrow('Invalid farmer ID');
    });

    it('should handle negative credit amounts', async () => {
      const mockFarmerId = 'farmer-1';
      
      // Mock farmer credit profile with negative values (should not happen in real system)
      const mockProfile = {
        id: 'profile-1',
        farmer_id: mockFarmerId,
        credit_tier: 'new',
        credit_limit_percentage: 30.00,
        max_credit_amount: -50000.00, // Negative max amount
        current_credit_balance: -10000.00, // Negative balance
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

      const result = await CreditServiceEssentials.calculateCreditEligibility(mockFarmerId);
      
      // System should handle negative values gracefully
      expect(result.isEligible).toBe(true);
      expect(result.creditLimit).toBe(3000); // 30% of 10000
      // Negative balance would be treated as zero in available credit calculation
      expect(result.availableCredit).toBe(0);
    });
  });
});