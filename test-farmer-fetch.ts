import { createStaffDataService } from './src/services/staff-data-service';

async function testFarmerFetch() {
  console.log('Testing farmer fetch...');
  
  const service = createStaffDataService(null);
  
  // Clear cache to force fresh data fetch
  service.clearFarmerCache();
  console.log('Cache cleared');
  
  try {
    const farmers = await service.getApprovedFarmers();
    console.log('Farmers fetched:', farmers);
    console.log('Number of farmers:', farmers.length);
    
    if (farmers.length > 0) {
      console.log('First farmer:', farmers[0]);
    }
  } catch (error) {
    console.error('Error fetching farmers:', error);
  }
}

testFarmerFetch();