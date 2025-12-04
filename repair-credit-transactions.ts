import { supabase } from './src/integrations/supabase/client';

async function repairCreditTransactions() {
  console.log('🔧 Repairing Credit Transactions...\n');

  try {
    // 1. Find credit transactions with invalid approved_by references
    console.log('1. Finding credit transactions with invalid approved_by references...');
    
    const { data: invalidTransactions, error: fetchError } = await supabase
      .from('credit_transactions')
      .select('id, approved_by')
      .not('approved_by', 'is', null)
      .limit(100);

    if (fetchError) {
      console.error('❌ Error fetching credit transactions:', fetchError);
      return;
    }

    console.log(`✅ Found ${invalidTransactions?.length || 0} transactions with approved_by values`);

    let repairedCount = 0;
    if (invalidTransactions && invalidTransactions.length > 0) {
      // Check each approved_by value to see if it references a valid staff record
      for (const transaction of invalidTransactions) {
        if (transaction.approved_by) {
          const { data: staffRecord, error: staffError } = await supabase
            .from('staff')
            .select('id')
            .eq('id', transaction.approved_by)
            .maybeSingle();

          if (staffError) {
            console.error(`❌ Error checking staff record for transaction ${transaction.id}:`, staffError);
          } else if (!staffRecord) {
            // This approved_by value doesn't reference a valid staff record
            console.log(`🔧 Repairing transaction ${transaction.id}: Setting approved_by to NULL (was ${transaction.approved_by})`);
            
            const { error: updateError } = await supabase
              .from('credit_transactions')
              .update({ approved_by: null })
              .eq('id', transaction.id);

            if (updateError) {
              console.error(`❌ Error updating transaction ${transaction.id}:`, updateError);
            } else {
              console.log(`✅ Successfully repaired transaction ${transaction.id}`);
              repairedCount++;
            }
          }
        }
      }
    }

    console.log(`\n📊 Repair Summary:`);
    console.log(`   - Repaired ${repairedCount} invalid credit transactions`);
    
    // 2. Check for any credit requests that are approved but don't have corresponding transactions
    console.log('\n2. Checking for orphaned approved credit requests...');
    
    const { data: approvedRequests, error: requestsError } = await supabase
      .from('credit_requests')
      .select('id')
      .eq('status', 'approved')
      .limit(100);

    if (requestsError) {
      console.error('❌ Error fetching approved credit requests:', requestsError);
      return;
    }

    console.log(`✅ Found ${approvedRequests?.length || 0} approved credit requests`);
    
    // For each approved request, check if there's a corresponding transaction
    let orphanedRequests = 0;
    if (approvedRequests && approvedRequests.length > 0) {
      for (const request of approvedRequests) {
        const { data: transaction, error: transactionError } = await supabase
          .from('credit_transactions')
          .select('id')
          .eq('reference_id', request.id)
          .maybeSingle();

        if (transactionError) {
          console.error(`❌ Error checking transaction for request ${request.id}:`, transactionError);
        } else if (!transaction) {
          console.log(`⚠️  Orphaned approved request found: ${request.id}`);
          orphanedRequests++;
        }
      }
    }
    
    console.log(`📊 Orphaned Requests Check:`);
    console.log(`   - Found ${orphanedRequests} orphaned approved requests`);
    
    console.log('\n🎉 Repair process complete!');
  } catch (error) {
    console.error('💥 Unexpected error during repair:', error);
  }
}

// Run the repair
repairCreditTransactions();