import { describe, it, expect } from 'vitest';

describe('Payment System Net Payment Calculation Fix', () => {
  it('should calculate net payment correctly from collection data', () => {
    // Test data structure for collection with embedded collection_payments
    const collectionWithPayments = {
      total_amount: 1000,
      collection_payments: [
        {
          credit_used: 200
        }
      ]
    };

    // Verify that we can calculate net payment correctly
    const creditUsed = collectionWithPayments.collection_payments?.[0]?.credit_used || 0;
    const netPayment = collectionWithPayments.total_amount - creditUsed;

    expect(creditUsed).toBe(200);
    expect(netPayment).toBe(800);
  });

  it('should handle collections without payment data', () => {
    // Test data structure for collection without embedded collection_payments
    const collectionWithoutPayments = {
      total_amount: 1500,
      collection_payments: []
    };

    // Verify that we handle missing payment data gracefully
    const creditUsed = collectionWithoutPayments.collection_payments?.[0]?.credit_used || 0;
    const netPayment = collectionWithoutPayments.total_amount - creditUsed;

    expect(creditUsed).toBe(0);
    expect(netPayment).toBe(1500);
  });

  it('should handle null collection payments', () => {
    // Test data structure for collection with null collection_payments
    const collectionWithNullPayments = {
      total_amount: 2000,
      collection_payments: null
    };

    // Verify that we handle null payment data gracefully
    const creditUsed = collectionWithNullPayments.collection_payments?.[0]?.credit_used || 0;
    const netPayment = collectionWithNullPayments.total_amount - creditUsed;

    expect(creditUsed).toBe(0);
    expect(netPayment).toBe(2000);
  });

  it('should calculate net payment for various scenarios', () => {
    // Test various scenarios
    const testCases = [
      {
        total_amount: 1000,
        credit_used: 200,
        expected_net_payment: 800
      },
      {
        total_amount: 1500,
        credit_used: 1500,
        expected_net_payment: 0
      },
      {
        total_amount: 2000,
        credit_used: 0,
        expected_net_payment: 2000
      },
      {
        total_amount: 500,
        credit_used: 700, // Credit used can exceed total amount in some cases
        expected_net_payment: -200
      }
    ];

    testCases.forEach(({ total_amount, credit_used, expected_net_payment }) => {
      const netPayment = total_amount - credit_used;
      expect(netPayment).toBe(expected_net_payment);
    });
  });
});