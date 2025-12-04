import { supabase } from '../src/integrations/supabase/client';
import { AgrovetInventoryService } from '../src/services/agrovet-inventory-service';
import { CreditServiceEssentials } from '../src/services/credit-service-essentials';

async function verifyPortalSynchronization() {
  console.log('Verifying synchronization between creditor and farmer portals...');
  
  try {
    // 1. Check all products from creditor perspective
    console.log('\n1. Checking all products (creditor perspective)...');
    const allProducts = await AgrovetInventoryService.getInventory();
    console.log(`Total products: ${allProducts.length}`);
    console.log('Sample products:', allProducts.slice(0, 3));

    // 2. Check credit-eligible products from farmer perspective
    console.log('\n2. Checking credit-eligible products (farmer perspective)...');
    const creditEligibleProducts = await CreditServiceEssentials.getAgrovetInventory();
    console.log(`Credit-eligible products: ${creditEligibleProducts.length}`);
    console.log('Sample credit-eligible products:', creditEligibleProducts.slice(0, 3));

    // 3. Verify consistency
    console.log('\n3. Verifying data consistency...');
    const creditEligibleCount = allProducts.filter(p => p.is_credit_eligible).length;
    console.log(`Expected credit-eligible count: ${creditEligibleCount}`);
    console.log(`Actual credit-eligible count: ${creditEligibleProducts.length}`);
    
    if (creditEligibleCount === creditEligibleProducts.length) {
      console.log('✅ Data consistency check PASSED');
    } else {
      console.log('❌ Data consistency check FAILED');
      console.log('Mismatch between creditor and farmer product counts');
    }

    // 4. Check product details consistency
    console.log('\n4. Checking product details consistency...');
    const allProductsMap = new Map(allProducts.map(p => [p.id, p]));
    let detailsConsistent = true;
    
    for (const farmerProduct of creditEligibleProducts) {
      const creditorProduct = allProductsMap.get(farmerProduct.id);
      if (!creditorProduct) {
        console.log(`❌ Product ${farmerProduct.id} exists in farmer view but not creditor view`);
        detailsConsistent = false;
        continue;
      }
      
      // Check key fields
      const fieldsToCheck = ['name', 'description', 'category', 'unit', 'selling_price', 'current_stock'];
      for (const field of fieldsToCheck) {
        if (farmerProduct[field as keyof typeof farmerProduct] !== creditorProduct[field as keyof typeof creditorProduct]) {
          console.log(`❌ Field ${field} mismatch for product ${farmerProduct.id}`);
          console.log(`   Farmer: ${farmerProduct[field as keyof typeof farmerProduct]}`);
          console.log(`   Creditor: ${creditorProduct[field as keyof typeof creditorProduct]}`);
          detailsConsistent = false;
        }
      }
    }
    
    if (detailsConsistent) {
      console.log('✅ Product details consistency check PASSED');
    } else {
      console.log('❌ Product details consistency check FAILED');
    }

    // 5. Summary
    console.log('\n5. Summary:');
    console.log(`Total products: ${allProducts.length}`);
    console.log(`Credit-eligible products: ${creditEligibleProducts.length}`);
    console.log(`Non-credit-eligible products: ${allProducts.length - creditEligibleCount}`);
    
    if (allProducts.length > 0) {
      const creditEligiblePercentage = ((creditEligibleCount / allProducts.length) * 100).toFixed(1);
      console.log(`Credit-eligible percentage: ${creditEligiblePercentage}%`);
    }

  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the verification
verifyPortalSynchronization().then(() => {
  console.log('\nVerification completed');
}).catch((error) => {
  console.error('Verification failed:', error);
});