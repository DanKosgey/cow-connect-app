import { supabase } from '@/integrations/supabase/client';

/**
 * Debug function to check payment records and their actual data
 */
export const debugPaymentRecords = async () => {
  try {
    console.log('Debugging payment records...');
    
    // Get all collector payments
    const { data: payments, error: paymentsError } = await supabase
      .from('collector_payments')
      .select(`
        *,
        staff!inner (
          profiles (
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    if (paymentsError) {
      console.error('Error fetching collector payments:', paymentsError);
      return { error: paymentsError };
    }
    
    console.log('Collector payments:', payments);
    
    // Get milk approvals to check penalties
    const { data: milkApprovals, error: approvalsError } = await supabase
      .from('milk_approvals')
      .select('*')
      .neq('penalty_amount', 0)
      .order('approved_at', { ascending: false });
    
    if (approvalsError) {
      console.error('Error fetching milk approvals:', approvalsError);
      return { error: approvalsError };
    }
    
    console.log('Milk approvals with penalties:', milkApprovals);
    
    // Get collector daily summaries to check penalties
    const { data: dailySummaries, error: summariesError } = await supabase
      .from('collector_daily_summaries')
      .select('*')
      .neq('total_penalty_amount', 0)
      .order('collection_date', { ascending: false });
    
    if (summariesError) {
      console.error('Error fetching collector daily summaries:', summariesError);
      return { error: summariesError };
    }
    
    console.log('Collector daily summaries with penalties:', dailySummaries);
    
    // Get collections to check approval status
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .eq('approved_for_payment', true)
      .order('collection_date', { ascending: false });
    
    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return { error: collectionsError };
    }
    
    console.log('Approved collections:', collections.length, 'collections');
    
    return { payments, milkApprovals, dailySummaries, collections };
  } catch (error) {
    console.error('Error in debugPaymentRecords:', error);
    return { error };
  }
};

export default debugPaymentRecords;