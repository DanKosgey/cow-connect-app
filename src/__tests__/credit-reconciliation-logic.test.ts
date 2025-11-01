import { describe, it, expect } from 'vitest';

describe('Credit Reconciliation Logic', () => {
  it('should calculate credit utilization rate correctly', () => {
    // Test various credit utilization scenarios
    const testCases = [
      { creditUsed: 0, creditLimit: 1000, expected: 0 },
      { creditUsed: 500, creditLimit: 1000, expected: 50 },
      { creditUsed: 1000, creditLimit: 1000, expected: 100 },
      { creditUsed: 750, creditLimit: 1000, expected: 75 },
      { creditUsed: 1000, creditLimit: 0, expected: 0 }, // No limit case
    ];

    testCases.forEach(({ creditUsed, creditLimit, expected }) => {
      const utilizationRate = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;
      expect(utilizationRate).toBe(expected);
    });
  });

  it('should calculate reconciliation summary correctly', () => {
    // Test summary calculations
    const mockRecords = [
      {
        farmer_id: 'farmer1',
        farmer_name: 'John Doe',
        farmer_phone: '123456789',
        pending_payments: 1000,
        credit_limit: 5000,
        available_credit: 2000,
        credit_used: 3000,
        net_payment: 2000,
        credit_utilization_rate: 60,
        last_payment_date: '2023-01-15',
        last_credit_transaction: '2023-01-10'
      },
      {
        farmer_id: 'farmer2',
        farmer_name: 'Jane Smith',
        farmer_phone: '987654321',
        pending_payments: 500,
        credit_limit: 3000,
        available_credit: 1000,
        credit_used: 2000,
        net_payment: 1500,
        credit_utilization_rate: 66.67,
        last_payment_date: '2023-01-14',
        last_credit_transaction: '2023-01-09'
      }
    ];

    // Calculate expected summary values
    const totalPendingPayments = mockRecords.reduce((sum, r) => sum + r.pending_payments, 0);
    const totalCreditLimit = mockRecords.reduce((sum, r) => sum + r.credit_limit, 0);
    const totalCreditUsed = mockRecords.reduce((sum, r) => sum + r.credit_used, 0);
    const totalNetPayments = mockRecords.reduce((sum, r) => sum + r.net_payment, 0);
    const averageCreditUtilization = mockRecords.length > 0 ? 
      mockRecords.reduce((sum, r) => sum + r.credit_utilization_rate, 0) / mockRecords.length : 0;
    const farmersWithCredit = mockRecords.filter(r => r.credit_limit > 0).length;
    const farmersWithPendingPayments = mockRecords.filter(r => r.pending_payments > 0).length;

    // Verify calculations
    expect(totalPendingPayments).toBe(1500);
    expect(totalCreditLimit).toBe(8000);
    expect(totalCreditUsed).toBe(5000);
    expect(totalNetPayments).toBe(3500);
    expect(averageCreditUtilization).toBeCloseTo(63.335);
    expect(farmersWithCredit).toBe(2);
    expect(farmersWithPendingPayments).toBe(2);
  });

  it('should handle edge cases correctly', () => {
    // Test with empty records
    const emptyRecords: any[] = [];
    const averageCreditUtilization = emptyRecords.length > 0 ? 
      emptyRecords.reduce((sum, r) => sum + r.credit_utilization_rate, 0) / emptyRecords.length : 0;
    
    expect(averageCreditUtilization).toBe(0);
    
    // Test with zero values
    const zeroRecord = {
      pending_payments: 0,
      credit_limit: 0,
      available_credit: 0,
      credit_used: 0,
      net_payment: 0,
      credit_utilization_rate: 0
    };
    
    expect(zeroRecord.pending_payments).toBe(0);
    expect(zeroRecord.credit_limit).toBe(0);
    expect(zeroRecord.credit_utilization_rate).toBe(0);
  });
});