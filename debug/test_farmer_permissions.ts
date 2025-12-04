import { supabase } from '../src/integrations/supabase/client';

async function testFarmerPermissions() {
  console.log('Testing farmer permissions for agrovet tables...');
  
  try {
    // Test agrovet_inventory access
    console.log('\n1. Testing agrovet_inventory access...');
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('agrovet_inventory')
      .select('*')
      .limit(5);
    
    if (inventoryError) {
      console.error('❌ Error accessing agrovet_inventory:', inventoryError);
    } else {
      console.log(`✅ Successfully accessed agrovet_inventory: ${inventoryData?.length || 0} records`);
    }
    
    // Test product_packaging access
    console.log('\n2. Testing product_packaging access...');
    const { data: packagingData, error: packagingError } = await supabase
      .from('product_packaging')
      .select('*')
      .limit(5);
    
    if (packagingError) {
      console.error('❌ Error accessing product_packaging:', packagingError);
    } else {
      console.log(`✅ Successfully accessed product_packaging: ${packagingData?.length || 0} records`);
    }
    
    // Test specific product packaging access
    console.log('\n3. Testing specific product packaging access...');
    // Using the product ID from your data
    const productId = '673f15b1-c357-433d-a14f-b97adb64fe87';
    
    const { data: specificPackagingData, error: specificPackagingError } = await supabase
      .from('product_packaging')
      .select('*')
      .eq('product_id', productId);
    
    if (specificPackagingError) {
      console.error('❌ Error accessing specific product packaging:', specificPackagingError);
    } else {
      console.log(`✅ Successfully accessed packaging for product ${productId}: ${specificPackagingData?.length || 0} records`);
      if (specificPackagingData && specificPackagingData.length > 0) {
        specificPackagingData.forEach((pkg, index) => {
          console.log(`   ${index + 1}. ${pkg.name} - ${pkg.weight}${pkg.unit} @ Ksh${pkg.price}`);
        });
      }
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testFarmerPermissions().then(() => {
  console.log('Script finished');
}).catch((error) => {
  console.error('Script failed:', error);
});