// Simple diagnostic script to check credit approval issues
const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials from .env file
const supabaseUrl = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseCreditApproval() {
  console.log('🔍 Diagnosing Credit Approval Issues...\n');

  try {
    // 1. Check if we can fetch product packaging data
    console.log('1. Checking product packaging data...');
    const { data: packagingData, error: packagingError } = await supabase
      .from('product_packaging')
      .select('*')
      .limit(5);

    if (packagingError) {
      console.error('❌ Error fetching product packaging:', packagingError);
    } else {
      console.log(`✅ Successfully fetched ${packagingData?.length || 0} packaging records`);
      if (packagingData && packagingData.length > 0) {
        console.log('Sample packaging data:');
        packagingData.slice(0, 2).forEach(pkg => {
          console.log(`  - ID: ${pkg.id}, Product ID: ${pkg.product_id}, Name: ${pkg.name}, Price: ${pkg.price}`);
        });
      }
    }

    // 2. Check if we can fetch agrovet inventory data
    console.log('\n2. Checking agrovet inventory data...');
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('agrovet_inventory')
      .select('*')
      .limit(5);

    if (inventoryError) {
      console.error('❌ Error fetching agrovet inventory:', inventoryError);
    } else {
      console.log(`✅ Successfully fetched ${inventoryData?.length || 0} inventory records`);
      if (inventoryData && inventoryData.length > 0) {
        console.log('Sample inventory data:');
        inventoryData.slice(0, 2).forEach(item => {
          console.log(`  - ID: ${item.id}, Name: ${item.name}, Credit Eligible: ${item.is_credit_eligible}`);
        });
      }
    }

    // 3. Check credit requests with packaging options
    console.log('\n3. Checking credit requests with packaging options...');
    const { data: creditRequests, error: requestsError } = await supabase
      .from('credit_requests')
      .select(`
        *,
        farmers(full_name, phone_number)
      `)
      .not('packaging_option_id', 'is', null)
      .limit(3);

    if (requestsError) {
      console.error('❌ Error fetching credit requests:', requestsError);
    } else {
      console.log(`✅ Found ${creditRequests?.length || 0} credit requests with packaging options`);
      if (creditRequests && creditRequests.length > 0) {
        console.log('Sample credit requests:');
        creditRequests.forEach(req => {
          console.log(`  - Request ID: ${req.id}`);
          console.log(`    Product: ${req.product_name}`);
          console.log(`    Packaging Option ID: ${req.packaging_option_id}`);
          console.log(`    Amount: ${req.total_amount}`);
          console.log(`    Farmer: ${req.farmers?.full_name || 'Unknown'}`);
        });

        // 4. Try to verify packaging options for these requests
        console.log('\n4. Verifying packaging options for credit requests...');
        for (const req of creditRequests) {
          if (req.packaging_option_id && req.product_id) {
            console.log(`\n  Checking packaging option ${req.packaging_option_id} for product ${req.product_id}...`);
            
            const { data: pkgData, error: pkgError } = await supabase
              .from('product_packaging')
              .select('*')
              .eq('id', req.packaging_option_id)
              .eq('product_id', req.product_id)
              .maybeSingle();

            if (pkgError) {
              console.error(`    ❌ Error verifying packaging option:`, pkgError);
            } else if (pkgData) {
              console.log(`    ✅ Packaging option found: ${pkgData.name}, Price: ${pkgData.price}`);
            } else {
              console.log(`    ⚠️  Packaging option not found`);
            }
          }
        }
      }
    }

    console.log('\n🎉 Diagnosis complete!');
  } catch (error) {
    console.error('💥 Unexpected error during diagnosis:', error);
  }
}

// Run the diagnosis
diagnoseCreditApproval();