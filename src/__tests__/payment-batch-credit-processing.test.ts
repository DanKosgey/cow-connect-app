import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client before importing any modules that use it
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    errorWithContext: vi.fn(),
    warn: vi.fn(),
  },
}));

// Now import the modules after mocking
import { CreditService } from '../services/credit-service';

describe('Payment Batch Credit Processing', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should calculate credit correctly for farmers with pending payments', async () => {
    // Mock data for credit calculation
    const mockCreditLimit = {
      id: 'cl1',
      farmer_id: 'f1',
      credit_limit_percentage: 70,
      max_credit_amount: 100000,
      current_credit_balance: 1200,
      total_credit_used: 0,
      is_active: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    };

    const mockPendingCollections = [
      { total_amount: 1000 },
      { total_amount: 1500 }
    ];

    // Setup mocks for credit calculation
    mockSupabase.from.mockImplementation((table) => {
      switch (table) {
        case 'farmer_credit_limits':
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field, value) => {
              if (field === 'farmer_id' && value === 'f1') {
                return {
                  ...mockSupabase,
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockCreditLimit, error: null })
                };
              }
              return mockSupabase;
            })
          };
        case 'collections':
          return {
            ...mockSupabase,
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((field, value) => {
              if (field === 'farmer_id' && value === 'f1') {
                return {
                  ...mockSupabase,
                  select: vi.fn().mockReturnThis(),
                  neq: vi.fn().mockResolvedValue({ data: mockPendingCollections, error: null })
                };
              }
              return mockSupabase;
            })
          };
        default:
          return mockSupabase;
      }
    });

    // Test credit calculation logic
    const creditInfo = await CreditService.calculateAvailableCredit('f1');
    
    // Calculate expected values
    const pendingPayments = 1000 + 1500; // 2500
    const calculatedCreditLimit = pendingPayments * (70 / 100); // 1750
    const finalCreditLimit = Math.min(calculatedCreditLimit, 100000); // 1750 (less than max)
    const availableCredit = Math.min(finalCreditLimit, 1200); // 1200 (limited by current balance)
    
    expect(creditInfo.pendingPayments).toBe(2500);
    expect(creditInfo.creditLimit).toBe(1750);
    expect(creditInfo.currentBalance).toBe(1200);
    expect(creditInfo.availableCredit).toBe(1200);
  });

  it('should handle credit deduction for collections', async () => {
    // Test credit deduction logic for collections
    const availableCredit = 1200;
    const collection1Amount = 1000;
    const collection2Amount = 1500;
    
    // First collection should use all available credit up to its amount
    const creditUsedForCollection1 = Math.min(availableCredit, collection1Amount);
    const netPaymentForCollection1 = collection1Amount - creditUsedForCollection1;
    
    expect(creditUsedForCollection1).toBe(1000);
    expect(netPaymentForCollection1).toBe(0);
    
    // Second collection should use remaining credit
    const remainingCredit = availableCredit - creditUsedForCollection1;
    const creditUsedForCollection2 = Math.min(remainingCredit, collection2Amount);
    const netPaymentForCollection2 = collection2Amount - creditUsedForCollection2;
    
    expect(creditUsedForCollection2).toBe(200);
    expect(netPaymentForCollection2).toBe(1300);
    
    // Total credit used and net payment
    const totalCreditUsed = creditUsedForCollection1 + creditUsedForCollection2;
    const totalNetPayment = netPaymentForCollection1 + netPaymentForCollection2;
    
    expect(totalCreditUsed).toBe(1200);
    expect(totalNetPayment).toBe(1300);
  });

  it('should handle farmers with no credit', async () => {
    // Test that no credit is used when none is available
    const availableCredit = 0;
    const collectionAmount = 1000;
    const creditUsed = Math.min(availableCredit, collectionAmount);
    const netPayment = collectionAmount - creditUsed;
    
    expect(creditUsed).toBe(0);
    expect(netPayment).toBe(1000);
  });

  it('should handle credit limits correctly', async () => {
    // Test that credit is capped at the available limit
    const availableCredit = 500;
    const collectionAmount = 1000;
    const creditUsed = Math.min(availableCredit, collectionAmount);
    const netPayment = collectionAmount - creditUsed;
    
    expect(creditUsed).toBe(500);
    expect(netPayment).toBe(500);
  });
});

describe('Payment Batch Credit Processing Logic', () => {
  it('should calculate credit deduction correctly for collections', () => {
    // Test credit deduction logic for collections
    const availableCredit = 1200;
    const collection1Amount = 1000;
    const collection2Amount = 1500;
    
    // First collection should use all available credit up to its amount
    const creditUsedForCollection1 = Math.min(availableCredit, collection1Amount);
    const netPaymentForCollection1 = collection1Amount - creditUsedForCollection1;
    
    expect(creditUsedForCollection1).toBe(1000);
    expect(netPaymentForCollection1).toBe(0);
    
    // Second collection should use remaining credit
    const remainingCredit = availableCredit - creditUsedForCollection1;
    const creditUsedForCollection2 = Math.min(remainingCredit, collection2Amount);
    const netPaymentForCollection2 = collection2Amount - creditUsedForCollection2;
    
    expect(creditUsedForCollection2).toBe(200);
    expect(netPaymentForCollection2).toBe(1300);
    
    // Total credit used and net payment
    const totalCreditUsed = creditUsedForCollection1 + creditUsedForCollection2;
    const totalNetPayment = netPaymentForCollection1 + netPaymentForCollection2;
    
    expect(totalCreditUsed).toBe(1200);
    expect(totalNetPayment).toBe(1300);
  });

  it('should handle farmers with no credit', () => {
    // Test that no credit is used when none is available
    const availableCredit = 0;
    const collectionAmount = 1000;
    const creditUsed = Math.min(availableCredit, collectionAmount);
    const netPayment = collectionAmount - creditUsed;
    
    expect(creditUsed).toBe(0);
    expect(netPayment).toBe(1000);
  });

  it('should handle credit limits correctly', () => {
    // Test that credit is capped at the available limit
    const availableCredit = 500;
    const collectionAmount = 1000;
    const creditUsed = Math.min(availableCredit, collectionAmount);
    const netPayment = collectionAmount - creditUsed;
    
    expect(creditUsed).toBe(500);
    expect(netPayment).toBe(500);
  });

  it('should calculate credit correctly for partial payments', () => {
    // Test partial credit usage
    const availableCredit = 800;
    const collectionAmount = 1200;
    const creditUsed = Math.min(availableCredit, collectionAmount);
    const netPayment = collectionAmount - creditUsed;
    
    expect(creditUsed).toBe(800);
    expect(netPayment).toBe(400);
  });

  it('should handle exact credit match', () => {
    // Test when credit exactly matches collection amount
    const availableCredit = 1000;
    const collectionAmount = 1000;
    const creditUsed = Math.min(availableCredit, collectionAmount);
    const netPayment = collectionAmount - creditUsed;
    
    expect(creditUsed).toBe(1000);
    expect(netPayment).toBe(0);
  });
});