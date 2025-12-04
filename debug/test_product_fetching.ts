import { AgrovetInventoryService } from '../src/services/agrovet-inventory-service';

async function testProductFetching() {
  console.log('Testing product fetching...');
  
  try {
    // Test getCreditEligibleProducts
    console.log('\n1. Testing getCreditEligibleProducts...');
    const creditEligibleProducts = await AgrovetInventoryService.getCreditEligibleProducts();
    console.log(`Found ${creditEligibleProducts.length} credit-eligible products`);
    
    // Log details of the first product
    if (creditEligibleProducts.length > 0) {
      const firstProduct = creditEligibleProducts[0];
      console.log('\nFirst product details:');
      console.log(`  ID: ${firstProduct.id}`);
      console.log(`  Name: ${firstProduct.name}`);
      console.log(`  Cost Price: ${firstProduct.cost_price} (type: ${typeof firstProduct.cost_price})`);
      console.log(`  Is Credit Eligible: ${firstProduct.is_credit_eligible}`);
      
      // Test getProductPackaging for this product
      console.log('\n2. Testing getProductPackaging for this product...');
      const packaging = await AgrovetInventoryService.getProductPackaging(firstProduct.id);
      console.log(`Found ${packaging.length} packaging options`);
      
      if (packaging.length > 0) {
        console.log('\nPackaging options:');
        packaging.forEach((pkg, index) => {
          console.log(`  ${index + 1}. ${pkg.name}`);
          console.log(`     ID: ${pkg.id}`);
          console.log(`     Weight: ${pkg.weight} ${pkg.unit} (type: ${typeof pkg.weight})`);
          console.log(`     Price: ${pkg.price} (type: ${typeof pkg.price})`);
          console.log(`     Is Credit Eligible: ${pkg.is_credit_eligible}`);
        });
      }
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testProductFetching().then(() => {
  console.log('Script finished');
}).catch((error) => {
  console.error('Script failed:', error);
});