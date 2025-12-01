import { supabase } from '@/integrations/supabase/client';

/**
 * Debug function to check penalty data in milk_approvals table
 */
export const debugPenaltyData = async () => {
  try {
    console.log('Debugging penalty data...');
    
    // Get all milk approvals with penalties
    const { data: approvals, error: approvalsError } = await supabase
      .from('milk_approvals')
      .select('*')
      .neq('penalty_amount', 0)
      .order('approved_at', { ascending: false })
      .limit(10);
    
    if (approvalsError) {
      console.error('Error fetching milk approvals:', approvalsError);
      return { error: approvalsError };
    }
    
    console.log('Milk approvals with penalties:', approvals);
    
    // Get collector payments to check date ranges
    const { data: payments, error: paymentsError } = await supabase
      .from('collector_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      console.error('Error fetching collector payments:', paymentsError);
      return { error: paymentsError };
    }
    
    console.log('Collector payments:', payments);
    
    // For each payment, check if we can find matching penalties
    for (const payment of payments) {
      console.log(`\nChecking payment ${payment.id} for collector ${payment.collector_id}`);
      console.log(`Period: ${payment.period_start} to ${payment.period_end}`);
      
      // Try different date formats
      const dateFormats = [
        `${payment.period_start}T00:00:00Z`,
        `${payment.period_start}`,
        `${payment.period_start} 00:00:00`
      ];
      
      for (const dateFormat of dateFormats) {
        console.log(`Trying date format: ${dateFormat}`);
        
        const { data: penaltyData, error: penaltyError } = await supabase
          .from('milk_approvals')
          .select('penalty_amount, approved_at, staff_id')
          .eq('staff_id', payment.collector_id)
          .gte('approved_at', dateFormat)
          .lte('approved_at', `${payment.period_end}T23:59:59Z`)
          .neq('penalty_amount', 0);
        
        if (!penaltyError && penaltyData && penaltyData.length > 0) {
          console.log(`Found ${penaltyData.length} penalties with format ${dateFormat}:`, penaltyData);
          const totalPenalties = penaltyData.reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
          console.log(`Total penalties: ${totalPenalties}`);
          break;
        } else if (penaltyError) {
          console.log(`Error with format ${dateFormat}:`, penaltyError);
        } else {
          console.log(`No penalties found with format ${dateFormat}`);
        }
      }
    }
    
    return { approvals, payments };
  } catch (error) {
    console.error('Error in debugPenaltyData:', error);
    return { error };
  }
};

export default debugPenaltyData;