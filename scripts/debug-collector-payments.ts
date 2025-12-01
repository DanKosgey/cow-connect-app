import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCollectorPayments() {
  console.log('=== DEBUGGING COLLECTOR PAYMENTS ===\n');
  
  try {
    // 1. Check collector payments
    console.log('1. Checking collector payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('collector_payments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return;
    }
    
    console.log(`Found ${payments.length} payments:`);
    payments.forEach((payment: any, index: number) => {
      console.log(`${index + 1}. Payment ID: ${payment.id}`);
      console.log(`   Collector ID: ${payment.collector_id}`);
      console.log(`   Period: ${payment.period_start} to ${payment.period_end}`);
      console.log(`   Collections: ${payment.total_collections}`);
      console.log(`   Liters: ${payment.total_liters}`);
      console.log(`   Rate: ${payment.rate_per_liter}`);
      console.log(`   Earnings: ${payment.total_earnings}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Created: ${payment.created_at}\n`);
    });
    
    // 2. Check milk approvals with penalties
    console.log('2. Checking milk approvals with penalties...');
    const { data: milkApprovals, error: approvalsError } = await supabase
      .from('milk_approvals')
      .select('*')
      .neq('penalty_amount', 0)
      .order('approved_at', { ascending: false });
    
    if (approvalsError) {
      console.error('Error fetching milk approvals:', approvalsError);
      return;
    }
    
    console.log(`Found ${milkApprovals.length} milk approvals with penalties:`);
    milkApprovals.forEach((approval: any, index: number) => {
      console.log(`${index + 1}. Approval ID: ${approval.id}`);
      console.log(`   Collection ID: ${approval.collection_id}`);
      console.log(`   Staff ID: ${approval.staff_id}`);
      console.log(`   Received Liters: ${approval.company_received_liters}`);
      console.log(`   Variance Liters: ${approval.variance_liters}`);
      console.log(`   Variance %: ${approval.variance_percentage}`);
      console.log(`   Variance Type: ${approval.variance_type}`);
      console.log(`   Penalty Amount: ${approval.penalty_amount}`);
      console.log(`   Approved At: ${approval.approved_at}\n`);
    });
    
    // 3. Check collector daily summaries with penalties
    console.log('3. Checking collector daily summaries with penalties...');
    const { data: dailySummaries, error: summariesError } = await supabase
      .from('collector_daily_summaries')
      .select('*')
      .neq('total_penalty_amount', 0)
      .order('collection_date', { ascending: false });
    
    if (summariesError) {
      console.error('Error fetching daily summaries:', summariesError);
      return;
    }
    
    console.log(`Found ${dailySummaries.length} daily summaries with penalties:`);
    dailySummaries.forEach((summary: any, index: number) => {
      console.log(`${index + 1}. Summary ID: ${summary.id}`);
      console.log(`   Collector ID: ${summary.collector_id}`);
      console.log(`   Collection Date: ${summary.collection_date}`);
      console.log(`   Collections: ${summary.total_collections}`);
      console.log(`   Liters Collected: ${summary.total_liters_collected}`);
      console.log(`   Liters Received: ${summary.total_liters_received}`);
      console.log(`   Variance Liters: ${summary.variance_liters}`);
      console.log(`   Variance %: ${summary.variance_percentage}`);
      console.log(`   Variance Type: ${summary.variance_type}`);
      console.log(`   Penalty Amount: ${summary.total_penalty_amount}`);
      console.log(`   Approved At: ${summary.approved_at}\n`);
    });
    
    // 4. Check collections that are approved for payment
    console.log('4. Checking collections approved for payment...');
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .eq('approved_for_payment', true)
      .order('collection_date', { ascending: false })
      .limit(10);
    
    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return;
    }
    
    console.log(`Found ${collections.length} collections approved for payment:`);
    collections.forEach((collection: any, index: number) => {
      console.log(`${index + 1}. Collection ID: ${collection.id}`);
      console.log(`   Staff ID: ${collection.staff_id}`);
      console.log(`   Liters: ${collection.liters}`);
      console.log(`   Collection Date: ${collection.collection_date}`);
      console.log(`   Status: ${collection.status}`);
      console.log(`   Approved for Payment: ${collection.approved_for_payment}`);
      console.log(`   Approved for Company: ${collection.approved_for_company}\n`);
    });
    
    console.log('=== DEBUG COMPLETE ===');
  } catch (error) {
    console.error('Error in debugCollectorPayments:', error);
  }
}

// Run the debug function
debugCollectorPayments();