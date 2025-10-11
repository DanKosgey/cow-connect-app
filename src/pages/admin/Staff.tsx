import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, Search, Filter, Plus } from '@/utils/iconImports';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/admin/StatsCard';
import { SearchAndFilter } from '@/components/admin/SearchAndFilter';
import { PageHeader } from '@/components/admin/PageHeader';
import { StaffSkeleton } from '@/components/admin/StaffSkeleton';
import { Pagination } from '@/components/admin/Pagination';
import { PaginatedResponse, paginateArray } from '@/utils/paginationUtils';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

const Staff = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Initialize performance monitoring
  const { measureOperation } = usePerformanceMonitor({ 
    componentName: 'StaffPage',
    enabled: process.env.NODE_ENV === 'development'
  });

  useEffect(() => {
    const fetch = async () => {
      await measureOperation('fetchStaff', async () => {
        setLoading(true);
        try {
          // For pagination, we need to get the total count first
          const { count, error: countError } = await supabase
            .from('staff')
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            console.error('Error fetching staff count:', countError);
            setLoading(false);
            return;
          }
          
          setTotalCount(count || 0);
          
          // Then fetch the paginated data with user roles in a single query
          // Fixed the query to properly fetch user roles without incorrect foreign key syntax
          const { data, error } = await supabase
            .from('staff')
            .select(`
              id, 
              employee_id, 
              user_id,
              profiles:user_id(full_name, email),
              user_roles:user_id(
                role
              )
            `)
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
          
          if (!error && data) {
            // Transform the data to match the expected structure
            // Filter out only staff and admin roles, not farmer roles
            const staffWithRoles = data.map(staffMember => {
              let roles = [];
              if (Array.isArray(staffMember.user_roles)) {
                roles = staffMember.user_roles
                  .filter((r: any) => r.role === 'staff' || r.role === 'admin')
                  .map((r: any) => r.role);
              } else if (staffMember.user_roles && (staffMember.user_roles.role === 'staff' || staffMember.user_roles.role === 'admin')) {
                roles = [staffMember.user_roles.role];
              }
              
              return {
                ...staffMember,
                roles: roles
              };
            });
            
            setStaff(staffWithRoles);
          } else if (error) {
            console.error('Error fetching staff data:', error);
            // Handle 400/401 errors by potentially refreshing the session
            if (error.status === 400 || error.status === 401) {
              console.warn('Authentication issue detected, may need to refresh session');
              // The app should handle session refresh automatically through the auth context
            }
          }
        } catch (error) {
          console.error('Error fetching staff:', error);
        } finally {
          setLoading(false);
        }
      });
    };
    fetch();
  }, [currentPage, pageSize]); // Remove measureOperation from dependencies to prevent infinite loops

  // Apply client-side filtering
  useEffect(() => {
    let filtered = [...staff];
    
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
    
    setFilteredStaff(filtered);
  }, [searchTerm, roleFilter, staff]);

  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Use server-side pagination, so we don't need to paginate again on the client
  const paginatedData = {
    data: filteredStaff,
    totalCount: totalCount,
    page: currentPage,
    pageSize: pageSize,
    totalPages: totalPages
  };

  const getStats = () => {
    return {
      total: totalCount,
      admins: staff.filter(s => {
        if (Array.isArray(s.roles)) {
          return s.roles.includes('admin');
        }
        return s.roles === 'admin';
      }).length,
      staff: staff.filter(s => {
        if (Array.isArray(s.roles)) {
          return s.roles.includes('staff');
        }
        return s.roles === 'staff';
      }).length,
      active: staff.filter(s => {
        if (Array.isArray(s.roles)) {
          // Only count as active if they have staff or admin roles, not farmer roles
          return s.roles.some(role => role === 'staff' || role === 'admin');
        }
        return s.roles !== undefined && s.roles !== null && (s.roles === 'staff' || s.roles === 'admin');
      }).length
    };
  };

  const stats = getStats();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  if (loading && staff.length === 0) {
    return (
      <DashboardLayout>
        <StaffSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <PageHeader
          title="Staff Management"
          description="Manage staff profiles, roles, and permissions"
          icon={<UserCog className="h-8 w-8" />}
          actions={
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          }
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Staff"
            value={stats.total}
            icon={<UserCog className="h-6 w-6 text-blue-500" />}
            color="border-l-blue-500"
          />
          
          <StatsCard
            title="Admins"
            value={stats.admins}
            icon={<UserCog className="h-6 w-6 text-green-500" />}
            color="border-l-green-500"
          />
          
          <StatsCard
            title="Staff"
            value={stats.staff}
            icon={<UserCog className="h-6 w-6 text-purple-500" />}
            color="border-l-purple-500"
          />
          
          <StatsCard
            title="Active"
            value={stats.active}
            icon={<UserCog className="h-6 w-6 text-amber-500" />}
            color="border-l-amber-500"
          />
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border-t-4 border-t-blue-500">
          <CardContent className="p-6">
            <SearchAndFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search staff by name, employee ID, or email..."
              onClearFilters={() => { setSearchTerm(''); setRoleFilter('all'); }}
            >
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </SearchAndFilter>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedData.data.length === 0 ? (
              <div className="text-center py-12">
                <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No staff members found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.data.map((staffMember) => (
                        <TableRow key={staffMember.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {staffMember.profiles?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>{staffMember.employee_id || 'N/A'}</TableCell>
                          <TableCell>{staffMember.profiles?.email || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(staffMember.roles) && staffMember.roles.map((role: string) => (
                                <Badge key={role} variant="secondary">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={staffMember.roles?.length > 0 ? "default" : "destructive"}>
                              {staffMember.roles?.length > 0 ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default React.memo(Staff);