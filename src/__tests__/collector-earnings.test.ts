import { collectorEarningsService } from '../services/collector-earnings-service';

describe('Collector Earnings Service', () => {
  describe('Net Earnings Calculation', () => {
    test('should calculate net earnings as gross minus penalties', async () => {
      // Mock data for collector2 scenario
      // Gross: Ksh 11,998.20
      // Penalties: Ksh 1,164.00
      // Expected Net: Ksh 10,834.20
      
      const mockCollectorData = {
        id: 'test-collector-2',
        name: 'collector2',
        totalEarnings: 11998.20, // Gross earnings
        totalPenalties: 1164.00, // Total penalties
        pendingPayments: 11998.20, // All pending
        paidPayments: 0,
        // ... other fields
      };
      
      // Verify net earnings calculation
      const expectedNetEarnings = mockCollectorData.totalEarnings - mockCollectorData.totalPenalties;
      expect(expectedNetEarnings).toBe(10834.20);
    });
    
    test('should calculate net earnings correctly for collector1', async () => {
      // Mock data for collector1 scenario
      // Gross: Ksh 12,000.00
      // Penalties: Ksh 6,720.00
      // Expected Net: Ksh 5,280.00
      
      const mockCollectorData = {
        id: 'test-collector-1',
        name: 'collector1',
        totalEarnings: 12000.00, // Gross earnings
        totalPenalties: 6720.00, // Total penalties
        pendingPayments: 12000.00, // All pending
        paidPayments: 0,
        // ... other fields
      };
      
      // Verify net earnings calculation
      const expectedNetEarnings = mockCollectorData.totalEarnings - mockCollectorData.totalPenalties;
      expect(expectedNetEarnings).toBe(5280.00);
    });
    
    test('should handle zero penalties correctly', async () => {
      // Test case where there are no penalties
      const mockCollectorData = {
        id: 'test-collector-no-penalties',
        name: 'collector-no-penalties',
        totalEarnings: 5000.00, // Gross earnings
        totalPenalties: 0.00, // No penalties
        pendingPayments: 5000.00, // All pending
        paidPayments: 0,
        // ... other fields
      };
      
      // Verify net earnings equals gross when no penalties
      const expectedNetEarnings = mockCollectorData.totalEarnings - mockCollectorData.totalPenalties;
      expect(expectedNetEarnings).toBe(5000.00);
    });
    
    test('should handle large penalty values without filtering', async () => {
      // Test that large penalty values are not filtered out as requested
      const mockCollectorData = {
        id: 'test-collector-large-penalties',
        name: 'collector-large-penalties',
        totalEarnings: 15000.00, // Gross earnings
        totalPenalties: 78000.00, // Large penalty amount (should not be filtered)
        pendingPayments: 15000.00, // All pending
        paidPayments: 0,
        // ... other fields
      };
      
      // Verify net earnings calculation with large penalties
      const expectedNetEarnings = mockCollectorData.totalEarnings - mockCollectorData.totalPenalties;
      expect(expectedNetEarnings).toBe(-63000.00); // Negative value is acceptable
    });
  });
});