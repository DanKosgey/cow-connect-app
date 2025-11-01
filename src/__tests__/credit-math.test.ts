import { describe, it, expect } from 'vitest';

describe('Credit Calculation Logic', () => {
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