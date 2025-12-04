// Script to verify agrovet purchases are properly recorded when credit is approved
const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials from .env file
const supabaseUrl = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyAgrovetPurchases() {
  console.log('🔍 Verifying Agrovet Purchases Recording...\n');

  try {
    // 1. Check recent agrovet purchases
    console.log('1. Checking recent agrovet purchases...');
    
    const { data: recentPurchases, error: purchasesError } = await supabase
      .from('agrovet_purchases')
      .select(`
        *,
        agrovet_inventory(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (purchasesError) {
      console.error('❌ Error fetching agrovet purchases:', purchasesError);
      return;
    }

    console.log(`✅ Found ${recentPurchases?.length || 0} recent agrovet purchases`);
    
    if (recentPurchases && recentPurchases.length > 0) {
      console.log('\nRecent purchases:');
      recentPurchases.forEach((purchase, index) => {
        console.log(`  ${index + 1}. Purchase ID: ${purchase.id}`);
        console.log(`     Product: ${purchase.agrovet_inventory?.name || 'Unknown'}`);
        console.log(`     Quantity: ${purchase.quantity}`);
        console.log(`     Total Amount: ${purchase.total_amount}`);
        console.log(`     Payment Method: ${purchase.payment_method}`);
        console.log(`     Status: ${purchase.status}`);
        console.log(`     Credit Transaction ID: ${purchase.credit_transaction_id || 'None'}`);
        console.log(`     Created: ${purchase.created_at}`);
        console.log('');
      });
    }

    // 2. Check if purchases with credit payment method have credit transaction IDs
    console.log('2. Checking credit purchases linkage...');
    
    const creditPurchases = recentPurchases?.filter(p => p.payment_method === 'credit') || [];
    console.log(`✅ Found ${creditPurchases.length} credit purchases`);
    
    let missingLinks = 0;
    creditPurchases.forEach(purchase => {
      if (!purchase.credit_transaction_id) {
        console.log(`⚠️  Credit purchase ${purchase.id} missing credit transaction ID`);
        missingLinks++;
      }
    });
    
    console.log(`📊 Credit Purchase Linkage:`);
    console.log(`   - Total credit purchases: ${creditPurchases.length}`);
    console.log(`   - Missing transaction links: ${missingLinks}`);
    console.log(`   - Properly linked: ${creditPurchases.length - missingLinks}`);
    
    // 3. Verify credit transactions exist for linked purchases
    console.log('\n3. Verifying credit transactions for linked purchases...');
    
    let validLinks = 0;
    let invalidLinks = 0;
    
    for (const purchase of creditPurchases) {
      if (purchase.credit_transaction_id) {
        const { data: transaction, error: transactionError } = await supabase
          .from('credit_transactions')
          .select('id')
          .eq('id', purchase.credit_transaction_id)
          .maybeSingle();
          
        if (transactionError) {
          console.error(`❌ Error checking transaction ${purchase.credit_transaction_id}:`, transactionError);
        } else if (transaction) {
          console.log(`✅ Purchase ${purchase.id} correctly linked to transaction ${purchase.credit_transaction_id}`);
          validLinks++;
        } else {
          console.log(`❌ Purchase ${purchase.id} linked to non-existent transaction ${purchase.credit_transaction_id}`);
          invalidLinks++;
        }
      }
    }
    
    console.log(`\n📊 Transaction Verification:`);
    console.log(`   - Valid links: ${validLinks}`);
    console.log(`   - Invalid links: ${invalidLinks}`);
    
    console.log('\n🎉 Verification complete!');
  } catch (error) {
    console.error('💥 Unexpected error during verification:', error);
  }
}

// Run the verification
verifyAgrovetPurchases();