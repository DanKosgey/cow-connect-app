// DashboardLayout provided by Staff/Admin portal layout; avoid duplicate wrapper
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
import { StaffInviteDialog } from '@/components/admin/StaffInviteDialog';
import { PaginatedResponse, paginateArray } from '@/utils/paginationUtils';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import RefreshButton from '@/components/ui/RefreshButton';
import { useStaffManagementData } from '@/hooks/useStaffManagementData';
import { StaffEditDialog } from '@/components/admin/StaffEditDialog';

const Staff = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingStaffMember, setEditingStaffMember] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Initialize performance monitoring
  const { measureOperation } = usePerformanceMonitor({ 
    componentName: 'StaffPage',
    enabled: process.env.NODE_ENV === 'development'
  });

  const { data: staffData, isLoading, isError, error, refetch } = useStaffManagementData(currentPage, pageSize, searchTerm, roleFilter);
  
  const staff = staffData?.staff || [];
  const totalCount = staffData?.totalCount || 0;
  const [filteredStaff, setFilteredStaff] = useState<any[]>(staff);
  const loading = isLoading;

  useEffect(() => {
    setFilteredStaff(staff);
  }, [staff]);

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
      admins: staff.filter(s => s.roles?.includes('admin')).length,
      staff: staff.filter(s => s.roles?.includes('staff')).length,
      active: staff.filter(s => s.activeRoles?.length > 0).length
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

  const handleInviteSent = async () => {
    // Refresh the staff list to show updated counts
    await refetch();
  };

  const handleEditClick = (staffMember: any) => {
    setEditingStaffMember(staffMember);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    await refetch();
    setEditingStaffMember(null);
  };

  if (loading && staff.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <StaffSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <PageHeader
        title="Staff Management"
        description="Manage staff profiles, roles, and permissions"
        icon={<UserCog className="h-8 w-8" />}
        actions={
          <div className="flex items-center space-x-2">
            <RefreshButton 
              isRefreshing={loading} 
              onRefresh={refetch} 
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm"
            />
            <StaffInviteDialog onInviteSent={handleInviteSent} />
          </div>
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
                          <Badge variant={staffMember.activeRoles?.length > 0 ? "default" : "destructive"}>
                            {staffMember.activeRoles?.length > 0 ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditClick(staffMember)}
                          >
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
      <StaffEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        staffMember={editingStaffMember}
        onSave={handleEditSave}
      />
    </div>
  );
};

export default React.memo(Staff);