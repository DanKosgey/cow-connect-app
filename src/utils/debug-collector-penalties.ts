import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Debug function to check what's happening with collector penalties
 */
export async function debugCollectorPenalties(collectorId: string, collectorName: string) {
  try {
    console.log(`=== DEBUGGING PENALTIES FOR COLLECTOR: ${collectorName} (${collectorId}) ===`);
    
    // Check collections for this collector
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .eq('staff_id', collectorId)
      .order('collection_date', { ascending: false });
    
    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return;
    }
    
    console.log(`Found ${collections?.length || 0} collections for this collector`);
    
    // Check milk approvals for this collector
    const { data: milkApprovals, error: approvalsError } = await supabase
      .from('milk_approvals')
      .select('*')
      .eq('staff_id', collectorId)
      .order('approved_at', { ascending: false });
    
    if (approvalsError) {
      console.error('Error fetching milk approvals:', approvalsError);
      return;
    }
    
    console.log(`Found ${milkApprovals?.length || 0} milk approvals for this collector`);
    
    // Show approvals with penalties
    const penaltyApprovals = milkApprovals?.filter(approval => 
      approval.penalty_amount && approval.penalty_amount > 0
    ) || [];
    
    console.log(`Found ${penaltyApprovals.length} approvals with penalties`);
    
    let totalPendingPenalties = 0;
    let totalPaidPenalties = 0;
    
    penaltyApprovals.forEach((approval, index) => {
      console.log(`Approval ${index + 1}:`, {
        id: approval.id,
        collection_id: approval.collection_id,
        penalty_amount: approval.penalty_amount,
        penalty_status: approval.penalty_status,
        variance_type: approval.variance_type,
        variance_percentage: approval.variance_percentage,
        variance_liters: approval.variance_liters
      });
      
      if (approval.penalty_status === 'pending') {
        totalPendingPenalties += approval.penalty_amount;
      } else if (approval.penalty_status === 'paid') {
        totalPaidPenalties += approval.penalty_amount;
      }
    });
    
    console.log('=== SUMMARY ===');
    console.log(`Total Pending Penalties: Ksh ${totalPendingPenalties.toFixed(2)}`);
    console.log(`Total Paid Penalties: Ksh ${totalPaidPenalties.toFixed(2)}`);
    console.log(`Total Penalties: Ksh ${(totalPendingPenalties + totalPaidPenalties).toFixed(2)}`);
    
    // Check if there are any collections with pending fees
    const pendingCollections = collections?.filter(c => 
      c.approved_for_payment && c.collection_fee_status === 'pending'
    ) || [];
    
    const paidCollections = collections?.filter(c => 
      c.approved_for_payment && c.collection_fee_status === 'paid'
    ) || [];
    
    let pendingLiters = 0;
    let paidLiters = 0;
    
    pendingCollections.forEach(c => {
      pendingLiters += c.liters || 0;
    });
    
    paidCollections.forEach(c => {
      paidLiters += c.liters || 0;
    });
    
    console.log(`Pending Collections: ${pendingCollections.length} (${pendingLiters} liters)`);
    console.log(`Paid Collections: ${paidCollections.length} (${paidLiters} liters)`);
    
    return {
      totalPendingPenalties,
      totalPaidPenalties,
      pendingCollections: pendingCollections.length,
      paidCollections: paidCollections.length,
      pendingLiters,
      paidLiters
    };
    
  } catch (error) {
    console.error('Error in debugCollectorPenalties:', error);
    return null;
  }
}