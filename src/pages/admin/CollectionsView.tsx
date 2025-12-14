import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeAllCollections } from '@/hooks/useRealtimeCollections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Milk, 
  Search, 
  Download, 
  AlertCircle,
  Eye,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Award,
  Target,
  Droplet
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { collectionsViewLogger } from '@/utils/logging-config';
import RefreshButton from '@/components/ui/RefreshButton';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { CACHE_KEYS } from '@/services/cache-utils';

// Types
interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  farmers?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
  staff?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface AnalyticsData {
  dailyTrends: any[];
  topFarmers: any[];
  staffPerformance: any[];
}

interface CollectionsData {
  collections: Collection[];
  farmers: any[];
  staff: any[];
}

// Constants
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'farmers', label: 'Farmers', icon: Users },
  { id: 'staff', label: 'Staff', icon: Award },
  { id: 'collections', label: 'All Collections', icon: Droplet }
] as const;

const DATE_RANGES = [
  { value: '7days', label: 'Last 7 Days', days: 7 },
  { value: '30days', label: 'Last 30 Days', days: 30 },
  { value: '90days', label: 'Last 90 Days', days: 90 },
  { value: '180days', label: 'Last 6 Months', days: 180 },
  { value: 'all', label: 'All Time', days: null }
] as const;

const STATUS_OPTIONS = ['Collected', 'Verified', 'Paid', 'Cancelled'] as const;

// Utility functions
const getDateFilter = (dateRange: string): Date | null => {
  const range = DATE_RANGES.find(r => r.value === dateRange);
  if (!range?.days) return null;
  
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - range.days, 0, 0, 0, 0);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
  }).format(amount);
};

const getStatusVariant = (status: string) => {
  const variants: Record<string, any> = {
    'Paid': 'default',
    'Verified': 'secondary',
    'Cancelled': 'destructive'
  };
  return variants[status] || 'outline';
};

// Custom hook for collections data
const useCollectionsData = () => {
  return useQuery<CollectionsData>({
    queryKey: [CACHE_KEYS.ADMIN_COLLECTIONS],
    queryFn: async () => {
      // Fetch collections with farmer and staff data
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          staff_id,
          liters,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          approved_for_company,
          gps_latitude,
          gps_longitude,
          farmers!inner (
            id,
            user_id,
            profiles (
              full_name,
              phone
            )
          ),
          staff (
            id,
            user_id,
            profiles (
              full_name
            )
          )
        `)
        .eq('approved_for_company', true) // Only fetch approved collections
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }

      // Fetch farmers for dropdown
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select('id, profiles(full_name)')
        .eq('kyc_status', 'approved');

      if (farmersError) {
        throw farmersError;
      }

      // Fetch staff for dropdown
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, profiles(full_name)');

      if (staffError) {
        throw staffError;
      }

      return {
        collections: collectionsData || [],
        farmers: farmersData || [],
        staff: staffData || []
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};

// Memoized metric card component
const MetricCard = memo(({ icon: Icon, title, value, subtitle, gradient }: any) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-lg shadow-lg p-6 text-white`}>
    <div className="flex items-center justify-between mb-4">
      <Icon className="h-10 w-10 opacity-80" />
    </div>
    <p className="text-sm opacity-90 mb-1">{title}</p>
    <p className="text-3xl font-bold">{value}</p>
    <p className="text-xs opacity-75 mt-2">{subtitle}</p>
  </div>
));

MetricCard.displayName = 'MetricCard';

const CollectionsAnalyticsDashboard = () => {
  const toast = useToastNotifications();
  const queryClient = useQueryClient();
  const { collections: realtimeCollections, isLoading: realtimeLoading } = useRealtimeAllCollections();
  const { data: collectionsData, isLoading: collectionsLoading, isError, error, refetch } = useCollectionsData();
  
  // State
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [dateRange, setDateRange] = useState('all');
  const [selectedFarmer, setSelectedFarmer] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [currentView, setCurrentView] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Log component mount
  useEffect(() => {
    collectionsViewLogger.info('Component mounted');
    return () => {
      collectionsViewLogger.info('Component unmounted');
    };
  }, []);

  // Update initial loading state when data is loaded
  useEffect(() => {
    if (collectionsData) {
      setInitialLoading(false);
    }
  }, [collectionsData]);

  // Log realtime collections updates
  useEffect(() => {
    collectionsViewLogger.info('Realtime collections updated', {
      count: realtimeCollections.length,
      isLoading: realtimeLoading
    });
    
    // Debug: Check if we're getting any collections
    if (realtimeCollections.length > 0) {
      collectionsViewLogger.debug('First collection sample', {
        id: realtimeCollections[0].id,
        farmer_id: realtimeCollections[0].farmer_id,
        liters: realtimeCollections[0].liters,
        date: realtimeCollections[0].collection_date
      });
    }
  }, [realtimeCollections, realtimeLoading]);

  // Memoized filtered collections
  const filteredCollections = useMemo(() => {
    collectionsViewLogger.debug('Filtering collections', {
      totalCollections: realtimeCollections.length,
      searchTerm,
      filterStatus,
      selectedFarmer,
      selectedStaff,
      dateRange
    });

    let filtered = realtimeCollections;

    // Date filter
    const cutoffDate = getDateFilter(dateRange);
    if (cutoffDate) {
      filtered = filtered.filter(c => new Date(c.collection_date) >= cutoffDate);
      collectionsViewLogger.debug('Applied date filter', { cutoffDate, countAfterFilter: filtered.length });
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.farmers?.profiles?.full_name?.toLowerCase().includes(term) ||
        c.collection_id?.toLowerCase().includes(term) ||
        c.staff?.profiles?.full_name?.toLowerCase().includes(term)
      );
      collectionsViewLogger.debug('Applied search filter', { searchTerm, countAfterFilter: filtered.length });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
      collectionsViewLogger.debug('Applied status filter', { filterStatus, countAfterFilter: filtered.length });
    }

    // Farmer filter
    if (selectedFarmer !== 'all') {
      filtered = filtered.filter(c => c.farmer_id === selectedFarmer);
      collectionsViewLogger.debug('Applied farmer filter', { selectedFarmer, countAfterFilter: filtered.length });
    }

    // Staff filter
    if (selectedStaff !== 'all') {
      filtered = filtered.filter(c => c.staff?.id === selectedStaff);
      collectionsViewLogger.debug('Applied staff filter', { selectedStaff, countAfterFilter: filtered.length });
    }

    collectionsViewLogger.info('Filtered collections result', { finalCount: filtered.length });
    return filtered;
  }, [realtimeCollections, searchTerm, filterStatus, selectedFarmer, selectedStaff, dateRange]);

  // Debug: Log when filtered collections change
  useEffect(() => {
    collectionsViewLogger.debug('Filtered collections changed', {
      count: filteredCollections.length,
      dateRange,
      filterStatus
    });
  }, [filteredCollections, dateRange, filterStatus]);

  // Memoized analytics calculations
  const analyticsData = useMemo<AnalyticsData>(() => {
    collectionsViewLogger.info('Starting analytics calculation', { collectionCount: filteredCollections.length });
    
    // Daily trends
    const dailyData = filteredCollections.reduce((acc, c) => {
      const date = new Date(c.collection_date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, collections: 0, liters: 0, amount: 0 };
      }
      acc[date].collections += 1;
      acc[date].liters += Number(c.liters) || 0;
      acc[date].amount += Number(c.total_amount) || 0;
      return acc;
    }, {} as Record<string, any>);

    const dailyTrends = Object.values(dailyData)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    collectionsViewLogger.debug('Daily trends calculated', { count: dailyTrends.length });

    // Top farmers
    const farmerStats = filteredCollections.reduce((acc, c) => {
      const id = c.farmer_id;
      if (!acc[id]) {
        acc[id] = {
          id,
          name: c.farmers?.profiles?.full_name || 'Unknown',
          collections: 0,
          liters: 0,
          amount: 0
        };
      }
      acc[id].collections += 1;
      acc[id].liters += Number(c.liters) || 0;
      acc[id].amount += Number(c.total_amount) || 0;
      return acc;
    }, {} as Record<string, any>);

    const topFarmers = Object.values(farmerStats)
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 10);

    collectionsViewLogger.debug('Top farmers calculated', { count: topFarmers.length });

    // Staff performance
    const staffStats = filteredCollections.reduce((acc, c) => {
      const id = c.staff?.id;
      if (!id) return acc;
      if (!acc[id]) {
        acc[id] = {
          id,
          name: c.staff?.profiles?.full_name || 'Unknown',
          collections: 0,
          liters: 0,
          farmers: new Set()
        };
      }
      acc[id].collections += 1;
      acc[id].liters += Number(c.liters) || 0;
      acc[id].farmers.add(c.farmer_id);
      return acc;
    }, {} as Record<string, any>);

    const staffPerformance = Object.values(staffStats)
      .map(s => ({
        ...s,
        farmers: s.farmers.size
      }))
      .sort((a, b) => b.collections - a.collections)
      .slice(0, 10);

    collectionsViewLogger.debug('Staff performance calculated', { count: staffPerformance.length });

    const result = { dailyTrends, topFarmers, staffPerformance };
    collectionsViewLogger.info('Analytics calculation completed');
    return result;
  }, [filteredCollections]);

  // Memoized key metrics
  const metrics = useMemo(() => {
    collectionsViewLogger.info('Calculating key metrics', { collectionCount: filteredCollections.length });

    const totalCollections = filteredCollections.length;
    const totalLiters = filteredCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
    const totalAmount = filteredCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const avgRate = totalLiters > 0 ? totalAmount / totalLiters : 0;
    const uniqueFarmers = new Set(filteredCollections.map(c => c.farmer_id)).size;
    const uniqueStaff = new Set(filteredCollections.map(c => c.staff?.id)).size;

    const result = {
      totalCollections,
      totalLiters,
      totalAmount,
      avgRate,
      uniqueFarmers,
      uniqueStaff
    };

    collectionsViewLogger.info('Key metrics calculated', result);
    return result;
  }, [filteredCollections]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    collectionsViewLogger.info('Export to CSV initiated', { collectionCount: filteredCollections.length });
    
    if (filteredCollections.length === 0) {
      collectionsViewLogger.warn('Export cancelled - no data');
      toast.show({ title: 'Warning', description: 'No data to export' });
      return;
    }

    const csvData = filteredCollections.map(c => [
      c.collection_id,
      new Date(c.collection_date).toLocaleDateString(),
      c.farmers?.profiles?.full_name || 'N/A',
      c.staff?.profiles?.full_name || 'N/A',
      c.liters,
      c.rate_per_liter,
      c.total_amount,
      c.status,
      c.gps_latitude || 'N/A',
      c.gps_longitude || 'N/A'
    ]);

    const headers = ['Collection ID', 'Date', 'Farmer', 'Staff', 'Liters',
      'Rate per Liter', 'Total Amount', 'Status', 'GPS Latitude', 'GPS Longitude'];
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collections_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    collectionsViewLogger.info('Export completed successfully');
  }, [filteredCollections, toast]);

  // Handle farmer selection
  const handleFarmerChange = useCallback((value: string) => {
    collectionsViewLogger.info('Farmer selection changed', { value, previousValue: selectedFarmer });
    setSelectedFarmer(value);
    if (value !== 'all') {
      setSelectedStaff('all');
      collectionsViewLogger.info('Staff selection reset due to farmer selection');
    }
  }, [selectedFarmer]);

  // Handle staff selection
  const handleStaffChange = useCallback((value: string) => {
    collectionsViewLogger.info('Staff selection changed', { value, previousValue: selectedStaff });
    setSelectedStaff(value);
    if (value !== 'all') {
      setSelectedFarmer('all');
      collectionsViewLogger.info('Farmer selection reset due to staff selection');
    }
  }, [selectedStaff]);

  // Log view changes
  const handleViewChange = useCallback((viewId: string) => {
    collectionsViewLogger.info('View changed', { from: currentView, to: viewId });
    setCurrentView(viewId);
  }, [currentView]);

  // Log filter changes
  const handleDateRangeChange = useCallback((value: string) => {
    collectionsViewLogger.info('Date range changed', { from: dateRange, to: value });
    setDateRange(value);
  }, [dateRange]);

  const handleStatusFilterChange = useCallback((value: string) => {
    collectionsViewLogger.info('Status filter changed', { from: filterStatus, to: value });
    setFilterStatus(value);
  }, [filterStatus]);

  const handleSearchChange = useCallback((value: string) => {
    collectionsViewLogger.info('Search term changed', { from: searchTerm, to: value });
    setSearchTerm(value);
  }, [searchTerm]);

  // Get farmers and staff from cached data
  const farmers = collectionsData?.farmers || [];
  const staff = collectionsData?.staff || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCollections = filteredCollections.slice(startIndex, endIndex);

  // Render views
  const renderView = useCallback(() => {
    collectionsViewLogger.info('Rendering view', { currentView });
    
    switch (currentView) {
      case 'overview':
        collectionsViewLogger.info('Rendering overview view');
        return (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <MetricCard
                icon={Droplet}
                title="Total Collections"
                value={metrics.totalCollections}
                subtitle={`${metrics.uniqueFarmers} active farmers`}
                gradient="from-blue-500 to-blue-600"
              />
              <MetricCard
                icon={Activity}
                title="Total Volume"
                value={`${metrics.totalLiters.toFixed(0)}L`}
                subtitle={`Avg ${(metrics.totalLiters / (metrics.totalCollections || 1)).toFixed(1)}L per collection`}
                gradient="from-green-500 to-green-600"
              />
              <MetricCard
                icon={DollarSign}
                title="Total Revenue"
                value={formatCurrency(metrics.totalAmount)}
                subtitle={`Avg rate ${formatCurrency(metrics.avgRate)}/L`}
                gradient="from-emerald-500 to-emerald-600"
              />
              <MetricCard
                icon={Users}
                title="Active Participants"
                value={metrics.uniqueFarmers + metrics.uniqueStaff}
                subtitle={`${metrics.uniqueFarmers} farmers, ${metrics.uniqueStaff} staff`}
                gradient="from-purple-500 to-purple-600"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Collection Trends</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsData.dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'liters') return [`${value}L`, 'Liters'];
                          if (name === 'amount') return [formatCurrency(Number(value)), 'Revenue'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="liters" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.3} name="Liters" />
                      <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} name="Revenue" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Farmers</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.topFarmers.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}L`, 'Liters']} />
                      <Bar dataKey="liters" fill="#3b82f6" name="Liters" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        );

      case 'trends':
        collectionsViewLogger.info('Rendering trends view');
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Trends Over Time</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'liters') return [`${value}L`, 'Liters'];
                      if (name === 'amount') return [formatCurrency(Number(value)), 'Revenue'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="liters" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Liters" />
                  <Area type="monotone" dataKey="amount" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'farmers':
      case 'staff':
        collectionsViewLogger.info('Rendering farmers/staff view', { viewType: currentView });
        const data = currentView === 'farmers' ? analyticsData.topFarmers : analyticsData.staffPerformance;
        const title = currentView === 'farmers' ? 'Top Performing Farmers' : 'Staff Performance';
        const columns = currentView === 'farmers'
          ? ['Rank', 'Farmer Name', 'Collections', 'Total Liters', 'Revenue']
          : ['Rank', 'Staff Name', 'Collections', 'Total Liters', 'Farmers Served'];

        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map(col => (
                      <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((item: any, idx: number) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className={`text-sm font-bold ${idx < 3 ? ['text-yellow-500', 'text-gray-400', 'text-orange-600'][idx] : 'text-gray-900'}`}>
                          {idx + 1}
                          {idx < 3 && <Award className="inline h-4 w-4 ml-1" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.collections}</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.liters.toFixed(2)}L</td>
                      {currentView === 'farmers' ? (
                        <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(item.amount)}</td>
                      ) : (
                        <td className="px-6 py-4 text-sm text-gray-900">{item.farmers}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No data available for the selected filters
                </div>
              )}
            </div>
          </div>
        );

      case 'collections':
        collectionsViewLogger.info('Rendering collections view');
        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">All Collections</h3>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collection ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Liters</TableHead>
                    <TableHead>Rate/L</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCollections.map((c) => (
                    <TableRow key={c.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{c.collection_id}</TableCell>
                      <TableCell>{new Date(c.collection_date).toLocaleDateString()}</TableCell>
                      <TableCell>{c.farmers?.profiles?.full_name || 'N/A'}</TableCell>
                      <TableCell>{c.staff?.profiles?.full_name || 'N/A'}</TableCell>
                      <TableCell>{c.liters}L</TableCell>
                      <TableCell>{formatCurrency(c.rate_per_liter)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(c.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(c.status)}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCollection(c)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Collection Details</DialogTitle>
                            </DialogHeader>
                            {selectedCollection && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Basic Information</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">ID:</span> {selectedCollection.collection_id}</div>
                                    <div><span className="font-medium">Date:</span> {new Date(selectedCollection.collection_date).toLocaleString()}</div>
                                    <div><span className="font-medium">Status:</span> <Badge variant={getStatusVariant(selectedCollection.status)}>{selectedCollection.status}</Badge></div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Financial Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Liters:</span> {selectedCollection.liters}L</div>
                                    <div><span className="font-medium">Rate:</span> {formatCurrency(selectedCollection.rate_per_liter)}/L</div>
                                    <div><span className="font-medium">Total:</span> {formatCurrency(selectedCollection.total_amount)}</div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Participants</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Farmer:</span> {selectedCollection.farmers?.profiles?.full_name || 'N/A'}</div>
                                    <div><span className="font-medium">Phone:</span> {selectedCollection.farmers?.profiles?.phone || 'N/A'}</div>
                                    <div><span className="font-medium">Staff:</span> {selectedCollection.staff?.profiles?.full_name || 'N/A'}</div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Location</h4>
                                  <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Latitude:</span> {selectedCollection.gps_latitude || 'N/A'}</div>
                                    <div><span className="font-medium">Longitude:</span> {selectedCollection.gps_longitude || 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredCollections.length)} of {filteredCollections.length} collections
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        );
        
      default:
        collectionsViewLogger.warn('Unknown view requested', { view: currentView });
        return (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Unknown view</h3>
            <p className="mt-1 text-sm text-gray-500">The requested view could not be found.</p>
          </div>
        );
    }
  }, [currentView, filteredCollections, realtimeCollections, analyticsData, metrics, selectedCollection]);

  // Check if we're still loading (either initial data or realtime data)
  const isLoading = initialLoading || collectionsLoading || (realtimeLoading && realtimeCollections.length === 0);

  if (isLoading) {
    collectionsViewLogger.info('Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading collections analytics...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    collectionsViewLogger.error('Error loading collections data', error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">Failed to load collections data. Please try again.</p>
          <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  collectionsViewLogger.info('Rendering main dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Collections Analytics</h1>
              <p className="text-gray-600">Advanced insights and performance metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton 
                isRefreshing={isLoading} 
                onRefresh={() => refetch()} 
                className="bg-white border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm"
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow">
                <Activity className="h-5 w-5 text-green-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700">Live Data</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 border-b bg-white rounded-t-lg px-4">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleViewChange(id)}
                className={`px-4 py-3 font-medium transition flex items-center gap-2 ${
                  currentView === id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {DATE_RANGES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={selectedFarmer}
              onChange={(e) => handleFarmerChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Farmers ({farmers.length})</option>
              {farmers.map(f => (
                <option key={f.id} value={f.id}>
                  {f.profiles?.full_name || 'Unknown'}
                </option>
              ))}
            </select>

            <select
              value={selectedStaff}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Staff ({staff.length})</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.profiles?.full_name || 'Unknown'}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <Button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Render active view */}
        {renderView()}
      </div>
    </div>
  );
};

export default CollectionsAnalyticsDashboard;