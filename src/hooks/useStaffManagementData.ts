import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';
import { StaffMember } from '@/types/staff.types';

interface StaffManagementData {
  staff: StaffMember[];
  totalCount: number;
}

export const useStaffManagementData = (currentPage: number, pageSize: number, searchTerm: string, roleFilter: string) => {
  return useQuery<StaffManagementData>({
    queryKey: [CACHE_KEYS.ADMIN_STAFF, currentPage, pageSize, searchTerm, roleFilter],
    queryFn: async () => {
      // Calculate offset for pagination
      const offset = (currentPage - 1) * pageSize;
      
      // First get the total count (without filters for accurate count)
      const { count: totalCount, error: countError } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }

      // Then fetch the paginated data - FIX: Use correct query syntax
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id, 
          employee_id, 
          user_id,
          profiles!inner(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        throw error;
      }
      
      // Fetch user roles separately since there's no direct relationship between staff and user_roles
      const userIds = (data || []).map(staffMember => staffMember.user_id);
      let userRolesData = [];
      
      // DEBUG: Log user IDs before querying
      console.log('DEBUG: Fetching roles for user IDs:', userIds);
      
      if (userIds.length > 0) {
        // Use service role key or ensure proper RLS policies are in place
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role, active')
          .in('user_id', userIds);
        
        // DEBUG: Log the response
        console.log('DEBUG: User roles query result:', { rolesData, rolesError });
        
        if (rolesError) {
          console.error('DEBUG: Error fetching user roles:', rolesError);
          // Try alternative approach with RPC if direct query fails
          try {
            // Check if we have an authenticated session before proceeding
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
              console.warn('No authenticated session available for getting user roles via RPC');
              throw rolesError; // Re-throw original error
            }
            
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_roles_batch', { user_ids: userIds });
            if (!rpcError && rpcData) {
              userRolesData = rpcData;
              console.log('DEBUG: Fetched user roles via RPC:', rpcData);
            } else {
              throw rolesError; // Re-throw original error if RPC also fails
            }
          } catch (rpcAttemptError) {
            console.error('DEBUG: RPC attempt also failed:', rpcAttemptError);
            throw rolesError;
          }
        } else {
          userRolesData = rolesData || [];
        }
        
        // DEBUG: Log the processed data
        console.log('DEBUG: Processed userRolesData:', userRolesData);
      }
      
      // DEBUG: Log before processing
      console.log('DEBUG: Processing staff with roles:', { staffData: data, userRolesData });
      
      // Combine staff data with user roles
      const staffWithRoles = (data || []).map(staffMember => {
        const userRoles = userRolesData.filter(role => role.user_id === staffMember.user_id);
        let roles = [];
        let activeRoles = [];
        
        // DEBUG: Log each comparison
        console.log('DEBUG: Comparing role.user_id:', userRoles.map(r => r.user_id), 'with staffMember.user_id:', staffMember.user_id);
        
        if (Array.isArray(userRoles)) {
          // Include all relevant staff-related roles
          roles = userRoles
            .filter((r: any) => r.role === 'staff' || r.role === 'admin' || r.role === 'collector' || r.role === 'creditor')
            .map((r: any) => r.role);
          
          activeRoles = userRoles
            .filter((r: any) => (r.role === 'staff' || r.role === 'admin' || r.role === 'collector' || r.role === 'creditor') && r.active)
            .map((r: any) => r.role);
        }
        
        const result = {
          ...staffMember,
          roles: roles,
          activeRoles: activeRoles,
          hasAnyRoles: Array.isArray(userRoles) && userRoles.length > 0,
          allRolesInactive: roles.length > 0 && activeRoles.length === 0
        };
        
        // DEBUG: Log the result for this staff member
        console.log('DEBUG: Processed staff member result:', result);
        
        return result;
      });
      
      // Apply client-side filtering
      let filtered = [...staffWithRoles];
      
      if (searchTerm) {
        filtered = filtered.filter(staffMember => 
          staffMember.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          staffMember.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          staffMember.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (roleFilter !== 'all') {
        filtered = filtered.filter(staffMember => 
          staffMember.roles?.includes(roleFilter)
        );
      }
      
      return {
        staff: filtered,
        totalCount: totalCount || 0
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};