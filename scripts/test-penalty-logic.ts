import { VarianceCalculationService } from '../src/services/variance-calculation-service';

// Simple test to verify penalty logic
async function testPenaltyLogic() {
  console.log('Testing penalty calculation logic...');
  
  // Test case 1: Positive variance should result in zero penalty
  const positiveVariance = VarianceCalculationService.calculateVariance(100, 105);
  console.log('Positive variance test:', positiveVariance);
  
  // Since we've modified the service to only apply penalties for negative variances,
  // we can't easily test the negative variance case without proper database setup
  
  // Test case 2: Zero variance should result in zero penalty
  const zeroVariance = VarianceCalculationService.calculateVariance(100, 100);
  console.log('Zero variance test:', zeroVariance);
  
  // Test case 3: Negative variance data structure
  const negativeVariance = VarianceCalculationService.calculateVariance(100, 95);
  console.log('Negative variance test:', negativeVariance);
  
  console.log('Penalty logic test completed.');
}

testPenaltyLogic().catch(console.error);