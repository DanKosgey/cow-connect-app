import { supabase } from '@/integrations/supabase/client';

async function debugCollectorData() {
  console.log('Debugging collector data...');
  
  // Get collector payments
  const { data: payments, error: paymentsError } = await supabase
    .from('collector_payments')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  } else {
    console.log('Collector Payments:', payments);
  }
  
  // Get collector daily summaries
  const { data: summaries, error: summariesError } = await supabase
    .from('collector_daily_summaries')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (summariesError) {
    console.error('Error fetching summaries:', summariesError);
  } else {
    console.log('Collector Daily Summaries:', summaries);
  }
  
  // Get variance penalty config
  const { data: penaltyConfig, error: configError } = await supabase
    .from('variance_penalty_config')
    .select('*')
    .eq('is_active', true);
  
  if (configError) {
    console.error('Error fetching penalty config:', configError);
  } else {
    console.log('Penalty Config:', penaltyConfig);
  }
}

debugCollectorData();