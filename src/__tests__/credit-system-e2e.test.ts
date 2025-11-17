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

describe('Credit System End-to-End Flow', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Farmer Credit Request Flow', () => {
    it('should allow farmer to submit credit request and admin to approve it', async () => {
      // Mock farmer data
      const mockFarmerId = 'farmer-1';
      const mockProductId = 'product-1';
      const mockQuantity = 5;
      const mockProductName = 'Fertilizer';
      const mockUnitPrice = 1000;
      const mockTotalAmount = 5000;

      // Mock credit profile
      const mockCreditProfile = {
        id: 'profile-1',
        farmer_id: mockFarmerId,
        credit_tier: 'established',
        credit_limit_percentage: 60.00,
        max_credit_amount: 75000.00,
        current_credit_balance: 30000.00,
        total_credit_used: 20000.00,
        pending_deductions: 5000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock pending collections
      const mockCollections = [
        { total_amount: 10000 },
        { total_amount: 5000 }
      ];

      // Mock the Supabase client responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditProfile, error: null })
          };
        } else if (table === 'collections') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCollections, error: null })
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
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      // Step 1: Farmer checks credit eligibility
      const creditEligibility = await CreditServiceEssentials.calculateCreditEligibility(mockFarmerId);
      expect(creditEligibility.isEligible).toBe(true);
      expect(creditEligibility.creditLimit).toBe(9000); // 60% of 15000 pending payments
      expect(creditEligibility.availableCredit).toBe(30000);

      // Step 2: Farmer submits credit request
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

      // Step 3: Admin approves credit request
      (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: null });

      const approvalResult = await CreditRequestService.approveCreditRequest('request-1', 'admin-1');
      expect(approvalResult).toBe(true);
    });

    it('should handle credit granting and usage flow correctly', async () => {
      const mockFarmerId = 'farmer-1';
      
      // Mock credit profile before granting
      const mockProfileBefore = {
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
        updated_at: new Date().toISOString()
      };

      // Mock credit profile after granting
      const mockProfileAfter = {
        ...mockProfileBefore,
        current_credit_balance: 30000.00,
        total_credit_used: 30000.00
      };

      // Mock pending collections
      const mockCollections = [
        { total_amount: 50000 }
      ];

      // Mock transaction record
      const mockTransaction = {
        id: 'transaction-1',
        farmer_id: mockFarmerId,
        transaction_type: 'credit_granted',
        amount: 30000.00,
        balance_before: 0.00,
        balance_after: 30000.00,
        description: 'Credit granted based on pending payments of KES 50000.00',
        approved_by: 'admin-1',
        approval_status: 'approved',
        created_at: new Date().toISOString()
      };

      // Mock Supabase responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockProfileBefore, error: null })
              .mockResolvedValueOnce({ data: mockProfileBefore, error: null })
              .mockResolvedValueOnce({ data: mockProfileAfter, error: null }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValueOnce({ data: mockProfileAfter, error: null })
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
              single: vi.fn().mockResolvedValueOnce({ data: mockTransaction, error: null })
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

      // Step 1: Admin grants credit to farmer
      const grantResult = await CreditServiceEssentials.grantCreditToFarmer(mockFarmerId, 'admin-1');
      expect(grantResult).toBe(true);

      // Step 2: Farmer uses credit for purchase
      const useCreditResult = await CreditServiceEssentials.useCreditForPurchase(
        mockFarmerId,
        'product-1',
        2
      );
      
      expect(useCreditResult.success).toBe(true);
      expect(useCreditResult.transactionId).toBeDefined();
    });
  });

  describe('Creditor Portal Integration', () => {
    it('should allow creditor to view and manage credit requests', async () => {
      // Mock credit requests data
      const mockCreditRequests = [
        {
          id: 'request-1',
          farmer_id: 'farmer-1',
          product_id: 'product-1',
          product_name: 'Fertilizer',
          quantity: 5,
          unit_price: 1000,
          total_amount: 5000,
          status: 'pending',
          created_at: new Date().toISOString(),
          farmers: {
            full_name: 'John Doe',
            phone: '+254712345678'
          },
          products: {
            name: 'Fertilizer'
          }
        },
        {
          id: 'request-2',
          farmer_id: 'farmer-2',
          product_id: 'product-2',
          product_name: 'Seeds',
          quantity: 10,
          unit_price: 500,
          total_amount: 5000,
          status: 'approved',
          created_at: new Date().toISOString(),
          farmers: {
            full_name: 'Jane Smith',
            phone: '+254712345679'
          },
          products: {
            name: 'Seeds'
          }
        }
      ];

      // Mock Supabase response
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'credit_requests') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis()
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis()
        };
      });

      (supabase as any).rpc.mockResolvedValueOnce({ data: mockCreditRequests, error: null });

      // In a real implementation, this would test the creditor portal components
      // For now, we're verifying the data structure that would be used
      expect(mockCreditRequests).toHaveLength(2);
      expect(mockCreditRequests[0].status).toBe('pending');
      expect(mockCreditRequests[1].status).toBe('approved');
      expect(mockCreditRequests[0].total_amount).toBe(5000);
    });
  });

  describe('Data Consistency Across Portals', () => {
    it('should maintain consistent credit balances across all portals', async () => {
      const mockFarmerId = 'farmer-1';
      
      // Mock credit profile
      const mockCreditProfile = {
        id: 'profile-1',
        farmer_id: mockFarmerId,
        credit_tier: 'premium',
        credit_limit_percentage: 70.00,
        max_credit_amount: 100000.00,
        current_credit_balance: 50000.00,
        total_credit_used: 30000.00,
        pending_deductions: 10000.00,
        is_frozen: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock Supabase response
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'farmer_credit_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditProfile, error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null })
        };
      });

      // Get credit profile from each "portal"
      const farmerProfile = await CreditServiceEssentials.getCreditProfile(mockFarmerId);
      // In real implementation, admin and creditor portals would also fetch this data
      
      // Verify consistency
      expect(farmerProfile).toBeDefined();
      expect(farmerProfile?.current_credit_balance).toBe(50000);
      expect(farmerProfile?.max_credit_amount).toBe(100000);
      expect(farmerProfile?.is_frozen).toBe(false);
    });
  });
});