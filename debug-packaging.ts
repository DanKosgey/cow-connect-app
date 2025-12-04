import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugPackagingData() {
  try {
    console.log('Fetching packaging data...');
    
    // Check the specific packaging option that's missing
    const missingPackagingOptionId = 'bbd550df-b17b-45b8-8e5d-b7c9ec0fba27';
    const productId = '673f15b1-c357-433d-a14f-b97adb64fe87';
    
    console.log(`Checking packaging option: ${missingPackagingOptionId}`);
    console.log(`For product: ${productId}`);
    
    // Fetch the product details
    const { data: product, error: productError } = await supabase
      .from('agrovet_inventory')
      .select('*')
      .eq('id', productId)
      .maybeSingle();
    
    if (productError) {
      console.error('Error fetching product:', productError);
    } else if (product) {
      console.log('Product details:', product);
    } else {
      console.log('Product not found');
    }
    
    // Fetch the specific packaging option
    const { data: specificPackaging, error: specificError } = await supabase
      .from('product_packaging')
      .select('*')
      .eq('id', missingPackagingOptionId)
      .maybeSingle();
    
    if (specificError) {
      console.error('Error fetching specific packaging option:', specificError);
    } else if (specificPackaging) {
      console.log('Found specific packaging option:', specificPackaging);
    } else {
      console.log('Specific packaging option not found in database');
    }
    
    // Fetch all packaging options for this product
    const { data: productPackaging, error: packagingError } = await supabase
      .from('product_packaging')
      .select('*')
      .eq('product_id', productId);
    
    if (packagingError) {
      console.error('Error fetching product packaging options:', packagingError);
    } else {
      console.log(`Found ${productPackaging?.length || 0} packaging options for product ${productId}:`);
      if (productPackaging) {
        productPackaging.forEach(option => {
          console.log(`  - ID: ${option.id}, Name: ${option.name}, Price: ${option.price}, Weight: ${option.weight} ${option.unit}`);
        });
      }
    }
    
    // Check the credit request that's failing
    const { data: creditRequest, error: requestError } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('id', 'c878827a-09b7-4f1b-82a5-d8bc5081a174')
      .maybeSingle();
    
    if (requestError) {
      console.error('Error fetching credit request:', requestError);
    } else if (creditRequest) {
      console.log('Credit request details:', creditRequest);
    } else {
      console.log('Credit request not found');
    }
    
    // Fetch all packaging options to check for 0 prices
    const { data, error } = await supabase
      .from('product_packaging')
      .select('*');
    
    if (error) {
      console.error('Error fetching packaging data:', error);
      return;
    }
    
    console.log(`Found ${data?.length || 0} packaging options in total`);
    
    // Check for packaging options with 0 or negative prices
    const zeroPriceOptions = data?.filter(p => p.price <= 0) || [];
    if (zeroPriceOptions.length > 0) {
      console.log(`Found ${zeroPriceOptions.length} packaging options with 0 or negative prices:`);
      zeroPriceOptions.forEach(option => {
        console.log(`  - ID: ${option.id}, Product ID: ${option.product_id}, Name: ${option.name}, Price: ${option.price}`);
      });
    } else {
      console.log('No packaging options with 0 or negative prices found');
    }
    
    // Check for packaging options with null prices
    const nullPriceOptions = data?.filter(p => p.price === null) || [];
    if (nullPriceOptions.length > 0) {
      console.log(`Found ${nullPriceOptions.length} packaging options with null prices:`);
      nullPriceOptions.forEach(option => {
        console.log(`  - ID: ${option.id}, Product ID: ${option.product_id}, Name: ${option.name}, Price: ${option.price}`);
      });
    } else {
      console.log('No packaging options with null prices found');
    }
    
  } catch (error) {
    console.error('Error in debugPackagingData:', error);
  }
}

debugPackagingData();