import { createClient } from '@supabase/supabase-js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function debugCollectors() {
  console.log('=== DEBUGGING COLLECTORS ===');
  
  // Get all user roles with collector role
  const { data: userRolesData, error: userRolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'collector')
    .eq('active', true);
  
  console.log('User Roles Error:', userRolesError);
  console.log('User Roles Data:', userRolesData);
  
  const collectorUserIds = userRolesData?.map(role => role.user_id) || [];
  console.log('Collector User IDs:', collectorUserIds);
  
  if (collectorUserIds.length === 0) {
    console.log('No collector user IDs found');
    return;
  }
  
  // Get staff records for those users
  const { data: collectors, error: collectorsError } = await supabase
    .from('staff')
    .select(`
      id,
      user_id,
      profiles (
        full_name
      )
    `)
    .in('user_id', collectorUserIds);
  
  console.log('Collectors Error:', collectorsError);
  console.log('Collectors Data:', collectors);
  
  // Get all milk approvals
  const { data: allMilkApprovals, error: approvalsError } = await supabase
    .from('milk_approvals')
    .select('*')
    .neq('penalty_amount', 0)
    .order('approved_at', { ascending: false });
  
  console.log('Approvals Error:', approvalsError);
  console.log('Total Approvals:', allMilkApprovals?.length);
  
  // Check if our specific collector has approvals
  const specificCollectorId = 'f695826b-c5f1-4d12-b338-95e34a3165ea';
  const collectorApprovals = allMilkApprovals?.filter(approval => approval.staff_id === specificCollectorId);
  console.log(`Approvals for collector ${specificCollectorId}:`, collectorApprovals?.length);
  
  if (collectorApprovals && collectorApprovals.length > 0) {
    const totalPenalties = collectorApprovals.reduce((sum, approval) => sum + (approval.penalty_amount || 0), 0);
    console.log(`Total penalties for collector: ${totalPenalties}`);
  }
}

debugCollectors();