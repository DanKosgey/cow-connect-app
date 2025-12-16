import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Debug RLS permissions for milk approvals
 */
export async function debugMilkApprovalsRLS() {
  try {
    console.log('=== DEBUGGING MILK APPROVALS RLS PERMISSIONS ===');
    
    // Get current user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return;
    }
    
    console.log('Current user:', user?.id);
    
    // Get user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user?.id || '');
    
    if (rolesError) {
      console.error('Error getting user roles:', rolesError);
      return;
    }
    
    console.log('User roles:', userRoles);
    
    // Get staff info if user is staff
    const { data: staffInfo, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', user?.id || '');
    
    if (staffError) {
      console.error('Error getting staff info:', staffError);
      return;
    }
    
    console.log('Staff info:', staffInfo);
    
    // Test SELECT permission
    console.log('Testing SELECT permission...');
    const { data: selectData, error: selectError } = await supabase
      .from('milk_approvals')
      .select('id, collection_id, staff_id, penalty_status')
      .limit(5);
    
    if (selectError) {
      console.error('SELECT permission denied:', selectError);
    } else {
      console.log(`Successfully selected ${selectData?.length || 0} milk approvals`);
    }
    
    return {
      user,
      userRoles,
      staffInfo,
      selectPermission: !selectError,
      selectData: selectData || []
    };
    
  } catch (error) {
    console.error('Error in debugMilkApprovalsRLS:', error);
    return null;
  }
}

/**
 * Check if user can update specific milk approvals
 */
export async function checkMilkApprovalUpdatePermission(approvalIds: string[]) {
  try {
    console.log(`=== CHECKING UPDATE PERMISSION FOR ${approvalIds.length} APPROVALS ===`);
    
    // Get current user staff ID
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');
    
    if (staffError) {
      console.error('Error getting staff data:', staffError);
      return false;
    }
    
    if (!staffData || staffData.length === 0) {
      console.log('User is not a staff member');
      return false;
    }
    
    const currentUserStaffId = staffData[0].id;
    console.log('Current user staff ID:', currentUserStaffId);
    
    // Get the approvals and their staff IDs
    const { data: approvals, error: approvalsError } = await supabase
      .from('milk_approvals')
      .select('id, staff_id, collection_id')
      .in('id', approvalIds);
    
    if (approvalsError) {
      console.error('Error getting approvals:', approvalsError);
      return false;
    }
    
    console.log('Approvals to check:', approvals);
    
    // Check permissions
    const unauthorized = approvals.filter(approval => 
      approval.staff_id !== currentUserStaffId
    );
    
    if (unauthorized.length > 0) {
      console.log(`User cannot update ${unauthorized.length} approvals for other collectors:`, unauthorized);
      return false;
    }
    
    console.log('User has permission to update all selected approvals');
    return true;
    
  } catch (error) {
    console.error('Error in checkMilkApprovalUpdatePermission:', error);
    return false;
  }
}