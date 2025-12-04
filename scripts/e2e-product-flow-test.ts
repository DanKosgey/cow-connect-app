import { supabase } from '../src/integrations/supabase/client';
import { AgrovetInventoryService } from '../src/services/agrovet-inventory-service';
import { CreditServiceEssentials } from '../src/services/credit-service-essentials';

async function runEndToEndProductFlowTest() {
  console.log('Running end-to-end product flow test...');
  
  // Test data
  const testProduct = {
    name: 'Test Product E2E',
    description: 'Product for end-to-end testing',
    category: 'Test Category',
    unit: 'units',
    current_stock: 50,
    reorder_level: 10,
    supplier: 'Test Supplier',
    cost_price: 100,
    selling_price: 150,
    is_credit_eligible: true
  };

  try {
    console.log('\n--- STEP 1: Creating product in creditor portal ---');
    const createdProduct = await AgrovetInventoryService.createInventoryItem(testProduct);
    console.log('✅ Product created successfully');
    console.log('Product ID:', createdProduct.id);

    console.log('\n--- STEP 2: Verifying product exists in creditor view ---');
    const creditorProducts = await AgrovetInventoryService.getInventory();
    const foundInCreditor = creditorProducts.find(p => p.id === createdProduct.id);
    if (foundInCreditor) {
      console.log('✅ Product found in creditor view');
      console.log('Product details:', {
        name: foundInCreditor.name,
        is_credit_eligible: foundInCreditor.is_credit_eligible
      });
    } else {
      console.log('❌ Product NOT found in creditor view');
      return;
    }

    console.log('\n--- STEP 3: Verifying product exists in farmer view ---');
    const farmerProducts = await CreditServiceEssentials.getAgrovetInventory();
    const foundInFarmer = farmerProducts.find(p => p.id === createdProduct.id);
    if (foundInFarmer) {
      console.log('✅ Product found in farmer view (credit-eligible)');
      console.log('Product details:', {
        name: foundInFarmer.name,
        is_credit_eligible: foundInFarmer.is_credit_eligible
      });
    } else {
      console.log('❌ Product NOT found in farmer view');
      // This might be expected if the product is not credit-eligible
      if (foundInCreditor.is_credit_eligible) {
        console.log('❌ ERROR: Product is credit-eligible but not found in farmer view');
        return;
      } else {
        console.log('ℹ️  Product is not credit-eligible, so not appearing in farmer view is expected');
      }
    }

    console.log('\n--- STEP 4: Testing product update ---');
    const updatedProductData = {
      name: 'Updated Test Product E2E',
      selling_price: 200,
      is_credit_eligible: true
    };
    
    const updatedProduct = await AgrovetInventoryService.updateInventoryItem(createdProduct.id, updatedProductData);
    console.log('✅ Product updated successfully');
    
    // Wait a bit for any potential async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n--- STEP 5: Verifying updated product in both views ---');
    const updatedCreditorProducts = await AgrovetInventoryService.getInventory();
    const updatedFoundInCreditor = updatedCreditorProducts.find(p => p.id === createdProduct.id);
    
    if (updatedFoundInCreditor && updatedFoundInCreditor.name === 'Updated Test Product E2E') {
      console.log('✅ Updated product found in creditor view');
    } else {
      console.log('❌ Updated product NOT found in creditor view');
      return;
    }

    const updatedFarmerProducts = await CreditServiceEssentials.getAgrovetInventory();
    const updatedFoundInFarmer = updatedFarmerProducts.find(p => p.id === createdProduct.id);
    
    if (updatedFoundInFarmer && updatedFoundInFarmer.name === 'Updated Test Product E2E') {
      console.log('✅ Updated product found in farmer view');
    } else {
      console.log('❌ Updated product NOT found in farmer view');
      return;
    }

    console.log('\n--- STEP 6: Testing credit eligibility toggle ---');
    const toggledProduct = await AgrovetInventoryService.updateInventoryItem(createdProduct.id, {
      is_credit_eligible: false
    });
    console.log('✅ Product credit eligibility toggled to false');
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    const nonCreditEligibleProducts = await CreditServiceEssentials.getAgrovetInventory();
    const shouldBeMissingFromFarmer = nonCreditEligibleProducts.find(p => p.id === createdProduct.id);
    
    if (!shouldBeMissingFromFarmer) {
      console.log('✅ Non-credit-eligible product correctly hidden from farmer view');
    } else {
      console.log('❌ Non-credit-eligible product still visible in farmer view');
      return;
    }

    console.log('\n--- STEP 7: Cleanup ---');
    await AgrovetInventoryService.deleteInventoryItem(createdProduct.id);
    console.log('✅ Test product cleaned up');

    console.log('\n--- TEST RESULTS ---');
    console.log('✅ All end-to-end tests PASSED');
    console.log('✅ Product flow from creditor to farmer portal working correctly');
    console.log('✅ Credit eligibility filtering working correctly');

  } catch (error) {
    console.error('❌ End-to-end test FAILED:', error);
    
    // Try to cleanup any leftover test data
    try {
      const { data } = await supabase
        .from('agrovet_inventory')
        .select('id')
        .ilike('name', '%Test Product E2E%');
      
      if (data && data.length > 0) {
        for (const product of data) {
          await AgrovetInventoryService.deleteInventoryItem(product.id);
        }
        console.log('✅ Cleanup completed');
      }
    } catch (cleanupError) {
      console.log('⚠️  Cleanup failed:', cleanupError);
    }
  }
}

// Run the test
runEndToEndProductFlowTest().then(() => {
  console.log('\nEnd-to-end test completed');
}).catch((error) => {
  console.error('End-to-end test failed:', error);
});