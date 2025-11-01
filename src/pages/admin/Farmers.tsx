// DashboardLayout provided by AdminPortalLayout; avoid duplicate wrapper here
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Filter } from '@/utils/iconImports';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/admin/StatsCard';
import { SearchAndFilter } from '@/components/admin/SearchAndFilter';
import { PageHeader } from '@/components/admin/PageHeader';
import { FarmersSkeleton } from '@/components/admin/FarmersSkeleton';
import { Pagination } from '@/components/admin/Pagination';
import { PaginatedResponse, paginateArray } from '@/utils/paginationUtils';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import RefreshButton from '@/components/ui/RefreshButton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CACHE_KEYS } from '@/services/cache-utils';

const useFarmersData = (currentPage: number, pageSize: number) => {
  return useQuery({
    queryKey: [CACHE_KEYS.ADMIN_FARMERS, currentPage, pageSize],
    queryFn: async () => {
      console.log('Fetching farmers data from cache or API...');
      
      // For pagination, we need to get the total count first
      const { count, error: countError } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      // Then fetch the paginated data
      const { data, error } = await supabase
        .from('farmers')
        .select('id, registration_number, full_name, phone_number, kyc_status')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
        
      if (error) {
        throw error;
      }
      
      return {
        farmers: data as any[],
        totalCount: count || 0
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};

const Farmers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Initialize performance monitoring
  const { measureOperation } = usePerformanceMonitor({ 
    componentName: 'FarmersPage',
    enabled: process.env.NODE_ENV === 'development'
  });

  const { data, isLoading, isError, error: queryError, refetch } = useFarmersData(currentPage, pageSize);

  const farmers = data?.farmers || [];
  const totalCount = data?.totalCount || 0;
  const loading = isLoading;

  // Apply client-side filtering
  const filteredFarmers = useMemo(() => {
    let filtered = [...farmers];
    
    if (searchTerm) {
      filtered = filtered.filter(farmer => 
        farmer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(farmer => farmer.kyc_status === statusFilter);
    }
    
    return filtered;
  }, [searchTerm, statusFilter, farmers]);

  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Use server-side pagination, so we don't need to paginate again on the client
  const paginatedData = {
    data: filteredFarmers,
    totalCount: totalCount,
    page: currentPage,
    pageSize: pageSize,
    totalPages: totalPages
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getStats = () => {
    return {
      total: totalCount,
      approved: farmers.filter(f => f.kyc_status === 'approved').length,
      pending: farmers.filter(f => f.kyc_status === 'pending').length,
      rejected: farmers.filter(f => f.kyc_status === 'rejected').length
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

  if (loading && farmers.length === 0) {
    return <FarmersSkeleton />;
  }

  if (isError || error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Farmers Data</h3>
          <p className="text-red-700 mb-4">{error || queryError?.message}</p>
          <Button onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
      <div className="container mx-auto py-6">
        {/* Header */}
        <PageHeader
          title="Farmers Management"
          description="View and manage farmer profiles, KYC status, and registrations"
          icon={<Users className="h-8 w-8" />}
          actions={
            <RefreshButton 
              isRefreshing={loading} 
              onRefresh={refetch} 
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm"
            />
          }
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Farmers"
            value={stats.total}
            icon={<Users className="h-6 w-6 text-blue-500" />}
            color="border-l-blue-500"
          />
          
          <StatsCard
            title="Approved"
            value={stats.approved}
            icon={<Users className="h-6 w-6 text-green-500" />}
            color="border-l-green-500"
          />
          
          <StatsCard
            title="Pending"
            value={stats.pending}
            icon={<Users className="h-6 w-6 text-yellow-500" />}
            color="border-l-yellow-500"
          />
          
          <StatsCard
            title="Rejected"
            value={stats.rejected}
            icon={<Users className="h-6 w-6 text-red-500" />}
            color="border-l-red-500"
          />
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border-t-4 border-t-blue-500">
          <CardContent className="p-6">
            <SearchAndFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search farmers by name, registration number, or phone..."
              onClearFilters={() => { setSearchTerm(''); setStatusFilter('all'); }}
            >
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </SearchAndFilter>
          </CardContent>
        </Card>

        {/* Farmers Table */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Farmers List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedData.data.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No farmers found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Registration Number</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>KYC Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.data.map((farmer) => (
                        <TableRow key={farmer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="font-medium">{farmer.registration_number || 'N/A'}</TableCell>
                          <TableCell>{farmer.full_name || 'N/A'}</TableCell>
                          <TableCell>{farmer.phone_number || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(farmer.kyc_status)}>
                              {farmer.kyc_status || 'N/A'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
  );
};

export default React.memo(Farmers);