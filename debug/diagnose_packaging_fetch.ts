import { supabase } from '../src/integrations/supabase/client';

async function diagnosePackagingFetch() {
  console.log('Diagnosing packaging fetch issue...');
  
  try {
    // Test the exact product ID from your data
    const productId = '673f15b1-c357-433d-a14f-b97adb64fe87';
    
    console.log(`\n1. Testing packaging fetch for product ID: ${productId}`);
    
    // Direct query to product_packaging table
    const { data, error } = await supabase
      .from('product_packaging')
      .select('*')
      .eq('product_id', productId);
    
    if (error) {
      console.error('Error fetching packaging:', error);
      return;
    }
    
    console.log(`Found ${data?.length || 0} packaging records:`);
    if (data && data.length > 0) {
      data.forEach((pkg, index) => {
        console.log(`  ${index + 1}. ${pkg.name} - ${pkg.weight}${pkg.unit} @ Ksh${pkg.price}`);
        console.log(`     ID: ${pkg.id}`);
        console.log(`     Credit Eligible: ${pkg.is_credit_eligible}`);
      });
    }
    
    // Test with credit eligibility filter
    console.log('\n2. Testing with credit eligibility filter...');
    const { data: creditEligibleData, error: creditEligibleError } = await supabase
      .from('product_packaging')
      .select('*')
      .eq('product_id', productId)
      .eq('is_credit_eligible', true);
    
    if (creditEligibleError) {
      console.error('Error fetching credit-eligible packaging:', creditEligibleError);
      return;
    }
    
    console.log(`Found ${creditEligibleData?.length || 0} credit-eligible packaging records:`);
    if (creditEligibleData && creditEligibleData.length > 0) {
      creditEligibleData.forEach((pkg, index) => {
        console.log(`  ${index + 1}. ${pkg.name} - ${pkg.weight}${pkg.unit} @ Ksh${pkg.price}`);
      });
    }
    
    console.log('\nDiagnosis complete!');
  } catch (error) {
    console.error('Diagnosis failed:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnosePackagingFetch();
}