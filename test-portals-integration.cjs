// Comprehensive test script for portal integration
const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials from .env file
const supabaseUrl = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPortalsIntegration() {
  console.log('🧪 Testing Portals Integration...\n');

  try {
    // 1. Test farmer portal access
    console.log('1. Testing farmer portal access...');
    
    // Check if we can access farmer data
    const { data: farmers, error: farmersError } = await supabase
      .from('farmers')
      .select('id, full_name')
      .limit(5);

    if (farmersError) {
      console.error('❌ Error accessing farmers table:', farmersError);
    } else {
      console.log(`✅ Farmers table accessible - found ${farmers?.length || 0} farmers`);
      if (farmers && farmers.length > 0) {
        farmers.forEach(farmer => {
          console.log(`   - ${farmer.full_name} (ID: ${farmer.id})`);
        });
      }
    }

    // 2. Test agrovet inventory access
    console.log('\n2. Testing agrovet inventory access...');
    
    const { data: inventory, error: inventoryError } = await supabase
      .from('agrovet_inventory')
      .select('id, name, is_credit_eligible')
      .limit(5);

    if (inventoryError) {
      console.error('❌ Error accessing agrovet inventory:', inventoryError);
    } else {
      console.log(`✅ Agrovet inventory accessible - found ${inventory?.length || 0} items`);
      if (inventory && inventory.length > 0) {
        inventory.forEach(item => {
          console.log(`   - ${item.name} (ID: ${item.id}) - Credit Eligible: ${item.is_credit_eligible}`);
        });
      }
    }

    // 3. Test product packaging access
    console.log('\n3. Testing product packaging access...');
    
    const { data: packaging, error: packagingError } = await supabase
      .from('product_packaging')
      .select('id, product_id, name, price')
      .limit(5);

    if (packagingError) {
      console.error('❌ Error accessing product packaging:', packagingError);
    } else {
      console.log(`✅ Product packaging accessible - found ${packaging?.length || 0} packaging options`);
      if (packaging && packaging.length > 0) {
        packaging.forEach(pkg => {
          console.log(`   - ${pkg.name} (ID: ${pkg.id}) - Price: ${pkg.price} (Product ID: ${pkg.product_id})`);
        });
      }
    }

    // 4. Test credit profiles access
    console.log('\n4. Testing farmer credit profiles access...');
    
    const { data: creditProfiles, error: profilesError } = await supabase
      .from('farmer_credit_profiles')
      .select('id, farmer_id, credit_tier, current_credit_balance, total_credit_used')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error accessing farmer credit profiles:', profilesError);
    } else {
      console.log(`✅ Farmer credit profiles accessible - found ${creditProfiles?.length || 0} profiles`);
      if (creditProfiles && creditProfiles.length > 0) {
        creditProfiles.forEach(profile => {
          console.log(`   - Farmer ID: ${profile.farmer_id}`);
          console.log(`     Tier: ${profile.credit_tier}`);
          console.log(`     Balance: ${profile.current_credit_balance}`);
          console.log(`     Used: ${profile.total_credit_used}`);
        });
      }
    }

    // 5. Test credit requests access
    console.log('\n5. Testing credit requests access...');
    
    const { data: creditRequests, error: requestsError } = await supabase
      .from('credit_requests')
      .select(`
        id, 
        farmer_id, 
        product_name, 
        quantity, 
        total_amount, 
        status,
        farmers(full_name)
      `)
      .limit(5);

    if (requestsError) {
      console.error('❌ Error accessing credit requests:', requestsError);
    } else {
      console.log(`✅ Credit requests accessible - found ${creditRequests?.length || 0} requests`);
      if (creditRequests && creditRequests.length > 0) {
        creditRequests.forEach(request => {
          console.log(`   - ${request.product_name} (${request.quantity}) - ${request.status}`);
          console.log(`     Amount: ${request.total_amount} - Farmer: ${request.farmers?.full_name || 'Unknown'}`);
        });
      }
    }

    // 6. Test credit transactions access
    console.log('\n6. Testing credit transactions access...');
    
    const { data: creditTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('id, farmer_id, transaction_type, amount, balance_after')
      .limit(5);

    if (transactionsError) {
      console.error('❌ Error accessing credit transactions:', transactionsError);
    } else {
      console.log(`✅ Credit transactions accessible - found ${creditTransactions?.length || 0} transactions`);
      if (creditTransactions && creditTransactions.length > 0) {
        creditTransactions.forEach(transaction => {
          console.log(`   - ${transaction.transaction_type}: ${transaction.amount} - Balance: ${transaction.balance_after}`);
        });
      }
    }

    // 7. Test agrovet purchases access
    console.log('\n7. Testing agrovet purchases access...');
    
    const { data: purchases, error: purchasesError } = await supabase
      .from('agrovet_purchases')
      .select('id, farmer_id, quantity, total_amount, payment_method, status')
      .limit(5);

    if (purchasesError) {
      console.error('❌ Error accessing agrovet purchases:', purchasesError);
    } else {
      console.log(`✅ Agrovet purchases accessible - found ${purchases?.length || 0} purchases`);
      if (purchases && purchases.length > 0) {
        purchases.forEach(purchase => {
          console.log(`   - ${purchase.quantity} items - ${purchase.total_amount} (${purchase.payment_method}) - ${purchase.status}`);
        });
      }
    }

    // 8. Test staff access
    console.log('\n8. Testing staff access...');
    
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, user_id, role')
      .limit(5);

    if (staffError) {
      console.error('❌ Error accessing staff table:', staffError);
    } else {
      console.log(`✅ Staff table accessible - found ${staff?.length || 0} staff members`);
      if (staff && staff.length > 0) {
        staff.forEach(member => {
          console.log(`   - User ID: ${member.user_id} - Role: ${member.role}`);
        });
      }
    }

    console.log('\n🎉 Portal Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Farmers Portal: ${farmersError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Agrovet Inventory: ${inventoryError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Product Packaging: ${packagingError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Credit Profiles: ${profilesError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Credit Requests: ${requestsError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Credit Transactions: ${transactionsError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Agrovet Purchases: ${purchasesError ? '❌ Failed' : '✅ Success'}`);
    console.log(`   - Staff Access: ${staffError ? '❌ Failed' : '✅ Success'}`);
    
  } catch (error) {
    console.error('💥 Unexpected error during portal integration test:', error);
  }
}

// Run the test
testPortalsIntegration();