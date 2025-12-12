import { PaymentService } from './payment-service';

// Mock data for testing
const mockCollections = [
  {
    id: 'coll_1',
    farmer_id: 'farmer_1',
    total_amount: 1000,
    rate_per_liter: 50,
    status: 'Verified',
    approved_for_payment: true,
    liters: 20
  },
  {
    id: 'coll_2',
    farmer_id: 'farmer_1',
    total_amount: 1500,
    rate_per_liter: 50,
    status: 'Verified',
    approved_for_payment: true,
    liters: 30
  },
  {
    id: 'coll_3',
    farmer_id: 'farmer_1',
    total_amount: 2000,
    rate_per_liter: 50,
    status: 'Verified',
    approved_for_payment: true,
    liters: 40
  },
  {
    id: 'coll_4',
    farmer_id: 'farmer_1',
    total_amount: 2500,
    rate_per_liter: 50,
    status: 'Verified',
    approved_for_payment: true,
    liters: 50
  },
  {
    id: 'coll_5',
    farmer_id: 'farmer_1',
    total_amount: 3000,
    rate_per_liter: 50,
    status: 'Verified',
    approved_for_payment: true,
    liters: 60
  }
];

// Performance test function
async function runPerformanceTest() {
  console.log('Starting payment processing performance test...');
  
  // Test the new optimized batch processing
  console.log('\n--- Testing Optimized Batch Processing ---');
  const startTime = Date.now();
  
  try {
    const result: any = await PaymentService.batchProcessFarmerPayments('farmer_1', mockCollections as any);
    const endTime = Date.now();
    
    console.log(`Batch processing completed in ${endTime - startTime}ms`);
    console.log(`Processed ${mockCollections.length} collections`);
    console.log(`Average time per collection: ${(endTime - startTime) / mockCollections.length}ms`);
    console.log('Result:', result.success ? 'SUCCESS' : 'FAILED');
    
    if (result.failedOperations && result.failedOperations.length > 0) {
      console.log('Failed operations:', result.failedOperations);
    }
  } catch (error) {
    const endTime = Date.now();
    console.log(`Batch processing failed after ${endTime - startTime}ms`);
    console.error('Error:', error);
  }
  
  // Test the parallel processing
  console.log('\n--- Testing Parallel Processing ---');
  const startTime2 = Date.now();
  
  try {
    const result: any = await PaymentService.markAllFarmerPaymentsAsPaid('farmer_1', mockCollections as any);
    const endTime2 = Date.now();
    
    console.log(`Parallel processing completed in ${endTime2 - startTime2}ms`);
    console.log(`Processed ${mockCollections.length} collections`);
    console.log(`Average time per collection: ${(endTime2 - startTime2) / mockCollections.length}ms`);
    console.log('Result:', result.success ? 'SUCCESS' : 'FAILED');
    
    if (result.failedOperations && result.failedOperations.length > 0) {
      console.log('Failed operations:', result.failedOperations);
    }
  } catch (error) {
    const endTime2 = Date.now();
    console.log(`Parallel processing failed after ${endTime2 - startTime2}ms`);
    console.error('Error:', error);
  }
  
  console.log('\n--- Performance Test Completed ---');
}

// Run the test
if (require.main === module) {
  runPerformanceTest().then(() => {
    console.log('Test completed');
  }).catch((error) => {
    console.error('Test failed:', error);
  });
}

export { runPerformanceTest };