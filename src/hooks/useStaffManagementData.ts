import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';

interface StaffMember {
  id: string;
  employee_id: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  roles: string[];
  activeRoles: string[];
}

interface StaffManagementData {
  staff: StaffMember[];
  totalCount: number;
}

export const useStaffManagementData = (currentPage: number, pageSize: number, searchTerm: string, roleFilter: string) => {
  return useQuery<StaffManagementData>({
    queryKey: [CACHE_KEYS.ADMIN_STAFF, currentPage, pageSize, searchTerm, roleFilter],
    queryFn: async () => {
      // For pagination, we need to get the total count first
      const { count, error: countError } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      const totalCount = count || 0;
      
      // Then fetch the paginated data with user roles in a single query
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id, 
          employee_id, 
          user_id,
          profiles:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
      
      if (error) {
        throw error;
      }
      
      // Fetch user roles separately since there's no direct relationship between staff and user_roles
      const userIds = (data || []).map(staffMember => staffMember.user_id);
      let userRolesData = [];
      
      if (userIds.length > 0) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role, active')
          .in('user_id', userIds);
        
        if (rolesError) {
          throw rolesError;
        }
        
        userRolesData = rolesData || [];
      }
      
      // Combine staff data with user roles
      const staffWithRoles = (data || []).map(staffMember => {
        const userRoles = userRolesData.filter(role => role.user_id === staffMember.user_id);
        let roles = [];
        let activeRoles = [];
        
        if (Array.isArray(userRoles)) {
          roles = userRoles
            .filter((r: any) => r.role === 'staff' || r.role === 'admin')
            .map((r: any) => r.role);
          
          activeRoles = userRoles
            .filter((r: any) => (r.role === 'staff' || r.role === 'admin') && r.active)
            .map((r: any) => r.role);
        }
        
        return {
          ...staffMember,
          roles: roles,
          activeRoles: activeRoles
        };
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
        totalCount: totalCount
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};