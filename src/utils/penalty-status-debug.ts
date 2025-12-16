import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Debug function to check and verify penalty status updates
 */
export async function debugPenaltyStatusUpdates(collectorId: string) {
  try {
    console.log(`=== DEBUGGING PENALTY STATUS UPDATES FOR COLLECTOR: ${collectorId} ===`);
    
    // Get all collections for this collector that are marked as paid
    const { data: paidCollections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, collection_date, liters, collection_fee_status')
      .eq('staff_id', collectorId)
      .eq('collection_fee_status', 'paid')
      .order('collection_date', { ascending: false });
    
    if (collectionsError) {
      console.error('Error fetching paid collections:', collectionsError);
      return;
    }
    
    console.log(`Found ${paidCollections?.length || 0} paid collections for this collector`);
    
    // Get the collection IDs
    const paidCollectionIds = paidCollections?.map(c => c.id) || [];
    
    if (paidCollectionIds.length === 0) {
      console.log('No paid collections found for this collector');
      return;
    }
    
    // Check milk approvals for these paid collections
    const { data: milkApprovals, error: approvalsError } = await supabase
      .from('milk_approvals')
      .select('id, collection_id, penalty_status, penalty_amount, variance_type, variance_percentage')
      .in('collection_id', paidCollectionIds)
      .order('created_at', { ascending: false });
    
    if (approvalsError) {
      console.error('Error fetching milk approvals:', approvalsError);
      return;
    }
    
    console.log(`Found ${milkApprovals?.length || 0} milk approvals for paid collections`);
    
    // Group by penalty status
    const pendingApprovals = milkApprovals?.filter(a => a.penalty_status === 'pending') || [];
    const paidApprovals = milkApprovals?.filter(a => a.penalty_status === 'paid') || [];
    
    console.log(`Pending approvals: ${pendingApprovals.length}`);
    console.log(`Paid approvals: ${paidApprovals.length}`);
    
    if (pendingApprovals.length > 0) {
      console.log('Pending approvals that should be paid:');
      pendingApprovals.forEach((approval, index) => {
        const collection = paidCollections?.find(c => c.id === approval.collection_id);
        console.log(`${index + 1}. Approval ID: ${approval.id}`);
        console.log(`   Collection ID: ${approval.collection_id}`);
        console.log(`   Collection Date: ${collection?.collection_date}`);
        console.log(`   Penalty Amount: ${approval.penalty_amount}`);
        console.log(`   Variance Type: ${approval.variance_type}`);
        console.log(`   Variance Percentage: ${approval.variance_percentage}`);
        console.log('---');
      });
    }
    
    return {
      totalPaidCollections: paidCollections?.length || 0,
      totalMilkApprovals: milkApprovals?.length || 0,
      pendingApprovals: pendingApprovals.length,
      paidApprovals: paidApprovals.length,
      pendingApprovalDetails: pendingApprovals
    };
    
  } catch (error) {
    console.error('Error in debugPenaltyStatusUpdates:', error);
    return null;
  }
}

/**
 * Force update penalty status for collections that are already marked as paid
 */
export async function forceUpdatePenaltyStatusForPaidCollections(collectorId: string) {
  try {
    console.log(`=== FORCE UPDATING PENALTY STATUS FOR PAID COLLECTIONS FOR COLLECTOR: ${collectorId} ===`);
    
    // Get all collections for this collector that are marked as paid
    const { data: paidCollections, error: collectionsError } = await supabase
      .from('collections')
      .select('id')
      .eq('staff_id', collectorId)
      .eq('collection_fee_status', 'paid');
    
    if (collectionsError) {
      console.error('Error fetching paid collections:', collectionsError);
      return false;
    }
    
    const paidCollectionIds = paidCollections?.map(c => c.id) || [];
    
    if (paidCollectionIds.length === 0) {
      console.log('No paid collections found for this collector');
      return true;
    }
    
    console.log(`Found ${paidCollectionIds.length} paid collections, updating their milk approval penalty statuses`);
    
    // Update all milk approvals for these collections to 'paid'
    const { error: updateError } = await supabase
      .from('milk_approvals')
      .update({ penalty_status: 'paid' })
      .in('collection_id', paidCollectionIds);
    
    if (updateError) {
      console.error('Error updating milk approvals:', updateError);
      return false;
    }
    
    console.log(`Successfully updated ${paidCollectionIds.length} milk approvals to paid status`);
    return true;
    
  } catch (error) {
    console.error('Error in forceUpdatePenaltyStatusForPaidCollections:', error);
    return false;
  }
}