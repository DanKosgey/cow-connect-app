import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import RefreshButton from '@/components/ui/RefreshButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  AlertTriangle,
  Filter,
  Download
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from 'xlsx';

interface VarianceRecord {
  id: string;
  collection_id: string;
  collection_details: {
    collection_id: string;
    liters: number;
    collection_date: string;
    farmers: {
      full_name: string;
    } | null;
  } | null;
  staff_id: string;
  staff_details: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: string;
  penalty_amount: number;
  approval_notes: string | null;
  approved_at: string;
}

interface CollectorPerformance {
  collector_id: string;
  collector_name: string;
  total_collections: number;
  total_variance: number;
  average_variance_percentage: number;
  total_penalty_amount: number;
  positive_variances: number;
  negative_variances: number;
  performance_score: number; // Add this new field
  last_collection_date: string; // Add this new field
}

interface VarianceSummary {
  total_variances: number;
  positive_variances: number;
  negative_variances: number;
  total_penalty_amount: number;
  average_variance_percentage: number;
}

interface VarianceTrendData {
  date: string;
  positive_variance_count: number;
  negative_variance_count: number;
  average_positive_variance: number;
  average_negative_variance: number;
  total_penalty_amount: number;
}

const VarianceReportingDashboard: React.FC = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  
  const [variances, setVariances] = useState<VarianceRecord[]>([]);
  const [collectorPerformance, setCollectorPerformance] = useState<CollectorPerformance[]>([]);
  const [varianceSummary, setVarianceSummary] = useState<VarianceSummary>({
    total_variances: 0,
    positive_variances: 0,
    negative_variances: 0,
    total_penalty_amount: 0,
    average_variance_percentage: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
  }>({
    from: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  const [comparisonPeriod, setComparisonPeriod] = useState<{
    from: string;
    to: string;
  }>({
    from: format(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  });

  const [currentPeriodData, setCurrentPeriodData] = useState<VarianceSummary>({
    total_variances: 0,
    positive_variances: 0,
    negative_variances: 0,
    total_penalty_amount: 0,
    average_variance_percentage: 0
  });

  const [previousPeriodData, setPreviousPeriodData] = useState<VarianceSummary>({
    total_variances: 0,
    positive_variances: 0,
    negative_variances: 0,
    total_penalty_amount: 0,
    average_variance_percentage: 0
  });

  const [filterCollector, setFilterCollector] = useState<string>('');
  const [filterVarianceType, setFilterVarianceType] = useState<string>('all');
  
  const [collectors, setCollectors] = useState<{id: string, full_name: string}[]>([]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('approved_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [trendData, setTrendData] = useState<VarianceTrendData[]>([]);

  const [selectedVariance, setSelectedVariance] = useState<VarianceRecord | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

  useEffect(() => {
    fetchCollectors();
    fetchTrendData();
    fetchComparisonData();
  }, []);

  useEffect(() => {
    fetchVarianceData();
    fetchTrendData();
    fetchComparisonData();
  }, [currentPage, pageSize, dateRange, comparisonPeriod, filterCollector, filterVarianceType]);

  const fetchCollectors = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, profiles (full_name)')
        .order('full_name', { foreignTable: 'profiles' });

      if (error) {
        console.error('Error fetching collectors:', error);
        // Set empty array instead of throwing error
        setCollectors([]);
        return;
      }

      const collectorData = (data || []).map((staff: any) => ({
        id: staff.id,
        full_name: staff.profiles?.full_name || 'Unknown Collector'
      }));

      setCollectors(collectorData);
    } catch (error: any) {
      console.error('Error fetching collectors:', error);
      // Set empty array instead of throwing error
      setCollectors([]);
    }
  };

  const fetchVarianceData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Calculate the range for pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build the query
      let query = supabase
        .from('milk_approvals')
        .select(`
          id,
          collection_id,
          staff_id,
          company_received_liters,
          variance_liters,
          variance_percentage,
          variance_type,
          penalty_amount,
          approval_notes,
          approved_at,
          collections!milk_approvals_collection_id_fkey (
            collection_id,
            liters,
            collection_date,
            farmers (
              full_name
            )
          ),
          staff!milk_approvals_staff_id_fkey (
            profiles (
              full_name
            )
          )
        `, { count: 'exact' })
        .gte('approved_at', `${dateRange.from}T00:00:00Z`)
        .lte('approved_at', `${dateRange.to}T23:59:59Z`)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply filters
      if (filterCollector && filterCollector !== 'all') {
        query = query.eq('staff_id', filterCollector);
      }
      
      if (filterVarianceType && filterVarianceType !== 'all') {
        query = query.eq('variance_type', filterVarianceType);
      }
      
      // Apply search term filter
      if (searchTerm) {
        // We'll filter on the client side since Supabase doesn't support text search across related tables easily
      }

      // Apply pagination
      const { data, error, count } = await query.range(from, to);

      if (error) {
        throw error;
      }

      // Transform the data to match our interface
      let transformedData = (data || []).map((item: any) => ({
        ...item,
        collection_details: item.collections || null,
        staff_details: item.staff || null
      }));

      // Apply search term filter on client side
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        transformedData = transformedData.filter((variance: VarianceRecord) => 
          (variance.collection_details?.collection_id?.toLowerCase().includes(term)) ||
          (variance.collection_details?.farmers?.full_name?.toLowerCase().includes(term)) ||
          (variance.staff_details?.profiles?.full_name?.toLowerCase().includes(term))
        );
      }

      setVariances(transformedData);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      
      // Fetch summary data
      await fetchSummaryData();
      await fetchCollectorPerformance();
    } catch (error: any) {
      console.error('Error fetching variances:', error);
      showError('Error', String(error?.message || 'Failed to fetch variances'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummaryData = async () => {
    try {
      // Get summary statistics
      let summaryQuery = supabase
        .from('milk_approvals')
        .select('variance_type, variance_percentage, penalty_amount')
        .gte('approved_at', `${dateRange.from}T00:00:00Z`)
        .lte('approved_at', `${dateRange.to}T23:59:59Z`);

      if (filterCollector && filterCollector !== 'all') {
        summaryQuery = summaryQuery.eq('staff_id', filterCollector);
      }
      
      if (filterVarianceType && filterVarianceType !== 'all') {
        summaryQuery = summaryQuery.eq('variance_type', filterVarianceType);
      }

      const { data, error } = await summaryQuery;

      if (error) throw error;

      const summary: VarianceSummary = {
        total_variances: data?.length || 0,
        positive_variances: data?.filter((v: any) => v.variance_type === 'positive').length || 0,
        negative_variances: data?.filter((v: any) => v.variance_type === 'negative').length || 0,
        total_penalty_amount: data?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0,
        average_variance_percentage: data?.length ? 
          data.reduce((sum: number, v: any) => sum + Math.abs(v.variance_percentage || 0), 0) / data.length : 0
      };

      setVarianceSummary(summary);
    } catch (error: any) {
      console.error('Error fetching summary data:', error);
      showError('Error', String(error?.message || 'Failed to fetch summary data'));
    }
  };

  const fetchCollectorPerformance = async () => {
    try {
      // First check if the collector_performance table exists by trying a simple query
      const { error: testError } = await supabase
        .from('collector_performance')
        .select('staff_id')
        .limit(1);

      // If table doesn't exist, return early
      if (testError && testError.code === 'PGRST205') {
        console.warn('Collector performance table not found, skipping performance data');
        setCollectorPerformance([]);
        return;
      }

      // If we get here, the table exists, so try to fetch data
      const { data, error } = await supabase
        .from('collector_performance')
        .select(`
          staff_id,
          total_collections,
          total_variance,
          average_variance_percentage,
          total_penalty_amount,
          positive_variances,
          negative_variances,
          performance_score,
          created_at
        `)
        .gte('created_at', `${dateRange.from}T00:00:00Z`)
        .lte('created_at', `${dateRange.to}T23:59:59Z`);

      if (error) {
        // If there's an error fetching data, it might be RLS related, so skip performance data
        console.warn('Error fetching collector performance data, skipping:', error);
        setCollectorPerformance([]);
        return;
      }

      // Get staff names separately to avoid complex joins
      const staffIds = [...new Set(data?.map(item => item.staff_id) || [])];
      let staffData: any[] = [];
      
      if (staffIds.length > 0) {
        const { data: staffResult, error: staffError } = await supabase
          .from('staff')
          .select('id, profiles (full_name)')
          .in('id', staffIds);
        
        if (!staffError) {
          staffData = staffResult || [];
        }
      }

      const staffMap = staffData.reduce((acc, staff) => {
        acc[staff.id] = staff.profiles?.full_name || 'Unknown Collector';
        return acc;
      }, {} as Record<string, string>);

      const performanceData = (data || []).map((item: any) => ({
        collector_id: item.staff_id,
        collector_name: staffMap[item.staff_id] || 'Unknown Collector',
        total_collections: item.total_collections || 0,
        total_variance: item.total_variance || 0,
        average_variance_percentage: item.average_variance_percentage || 0,
        total_penalty_amount: item.total_penalty_amount || 0,
        positive_variances: item.positive_variances || 0,
        negative_variances: item.negative_variances || 0,
        performance_score: item.performance_score || 0,
        last_collection_date: item.created_at || ''
      }));

      setCollectorPerformance(performanceData);
    } catch (error: any) {
      console.error('Error fetching collector performance:', error);
      // Don't show error to user for this optional data
      setCollectorPerformance([]);
    }
  };

  const fetchTrendData = async () => {
    try {
      // Get trend data grouped by date
      const { data, error } = await supabase
        .rpc('get_variance_trend_data', {
          start_date: dateRange.from,
          end_date: dateRange.to
        });

      if (error) throw error;

      setTrendData(data || []);
    } catch (error) {
      console.error('Error fetching trend data:', error);
      showError('Error', String(error?.message || 'Failed to fetch trend data'));
    }
  };

  const fetchPeriodData = async (fromDate: string, toDate: string) => {
    try {
      // Get summary statistics for a period
      let summaryQuery = supabase
        .from('milk_approvals')
        .select('variance_type, variance_percentage, penalty_amount')
        .gte('approved_at', `${fromDate}T00:00:00Z`)
        .lte('approved_at', `${toDate}T23:59:59Z`);

      if (filterCollector && filterCollector !== 'all') {
        summaryQuery = summaryQuery.eq('staff_id', filterCollector);
      }
      
      if (filterVarianceType && filterVarianceType !== 'all') {
        summaryQuery = summaryQuery.eq('variance_type', filterVarianceType);
      }

      const { data, error } = await summaryQuery;

      if (error) throw error;

      const summary: VarianceSummary = {
        total_variances: data?.length || 0,
        positive_variances: data?.filter((v: any) => v.variance_type === 'positive').length || 0,
        negative_variances: data?.filter((v: any) => v.variance_type === 'negative').length || 0,
        total_penalty_amount: data?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0,
        average_variance_percentage: data?.length ? 
          data.reduce((sum: number, v: any) => sum + Math.abs(v.variance_percentage || 0), 0) / data.length : 0
      };

      return summary;
    } catch (error) {
      console.error('Error fetching period data:', error);
      return {
        total_variances: 0,
        positive_variances: 0,
        negative_variances: 0,
        total_penalty_amount: 0,
        average_variance_percentage: 0
      };
    }
  };

  const fetchComparisonData = async () => {
    const currentData = await fetchPeriodData(dateRange.from, dateRange.to);
    const previousData = await fetchPeriodData(comparisonPeriod.from, comparisonPeriod.to);
    
    setCurrentPeriodData(currentData);
    setPreviousPeriodData(previousData);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getVarianceTypeColor = (varianceType: string) => {
    switch (varianceType) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVarianceIcon = (varianceType: string) => {
    switch (varianceType) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getVarianceSeverityColor = (percentage: number) => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage >= 10) return 'bg-red-500 text-white';
    if (absPercentage >= 5) return 'bg-orange-500 text-white';
    if (absPercentage > 0) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  const openDrillDown = (variance: VarianceRecord) => {
    setSelectedVariance(variance);
    setIsDrillDownOpen(true);
  };

  const exportToCSV = () => {
    // Prepare data for export
    const exportData = variances.map(variance => ({
      'Collection ID': variance.collection_details?.collection_id || 'N/A',
      'Farmer': variance.collection_details?.farmers?.full_name || 'Unknown Farmer',
      'Collection Date': variance.collection_details?.collection_date 
        ? format(new Date(variance.collection_details.collection_date), 'MMM dd, yyyy')
        : 'N/A',
      'Collector': variance.staff_details?.profiles?.full_name || 'Unknown Staff',
      'Collected (L)': variance.collection_details?.liters?.toFixed(2) || '0.00',
      'Received (L)': variance.company_received_liters?.toFixed(2) || '0.00',
      'Variance (L)': variance.variance_liters?.toFixed(2) || '0.00',
      'Variance (%)': variance.variance_percentage?.toFixed(2) || '0.00',
      'Variance Type': variance.variance_type 
        ? variance.variance_type.charAt(0).toUpperCase() + variance.variance_type.slice(1)
        : 'None',
      'Penalty (KSh)': variance.penalty_amount?.toFixed(2) || '0.00',
      'Approved At': variance.approved_at 
        ? format(new Date(variance.approved_at), 'MMM dd, yyyy HH:mm')
        : 'N/A'
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => 
          `"${String(row[header as keyof typeof row] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `variance-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    // Prepare data for export
    const exportData = variances.map(variance => ({
      'Collection ID': variance.collection_details?.collection_id || 'N/A',
      'Farmer': variance.collection_details?.farmers?.full_name || 'Unknown Farmer',
      'Collection Date': variance.collection_details?.collection_date 
        ? format(new Date(variance.collection_details.collection_date), 'MMM dd, yyyy')
        : 'N/A',
      'Collector': variance.staff_details?.profiles?.full_name || 'Unknown Staff',
      'Collected (L)': variance.collection_details?.liters?.toFixed(2) || '0.00',
      'Received (L)': variance.company_received_liters?.toFixed(2) || '0.00',
      'Variance (L)': variance.variance_liters?.toFixed(2) || '0.00',
      'Variance (%)': variance.variance_percentage?.toFixed(2) || '0.00',
      'Variance Type': variance.variance_type 
        ? variance.variance_type.charAt(0).toUpperCase() + variance.variance_type.slice(1)
        : 'None',
      'Penalty (KSh)': variance.penalty_amount?.toFixed(2) || '0.00',
      'Approved At': variance.approved_at 
        ? format(new Date(variance.approved_at), 'MMM dd, yyyy HH:mm')
        : 'N/A'
    }));

    // Create worksheet
    const ws = XLSXUtils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Variance Report');
    
    // Export to Excel
    XLSXWriteFile(wb, `variance-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Prepare data for charts
  const varianceTypeData = [
    { name: 'Positive', value: varianceSummary.positive_variances },
    { name: 'Negative', value: varianceSummary.negative_variances }
  ];

  const COLORS = ['#10B981', '#EF4444'];

  const collectorPerformanceData = collectorPerformance
    .sort((a, b) => b.average_variance_percentage - a.average_variance_percentage)
    .slice(0, 10);

  // Prepare data for trend charts
  const trendChartData = trendData.map(item => ({
    date: format(new Date(item.date), 'MMM dd'),
    'Positive Variances': item.positive_variance_count,
    'Negative Variances': item.negative_variance_count,
    'Avg. Positive Variance %': item.average_positive_variance,
    'Avg. Negative Variance %': Math.abs(item.average_negative_variance),
    'Total Penalties': item.total_penalty_amount
  }));

  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const totalVariancesChange = calculatePercentageChange(
    currentPeriodData.total_variances,
    previousPeriodData.total_variances
  );

  const positiveVariancesChange = calculatePercentageChange(
    currentPeriodData.positive_variances,
    previousPeriodData.positive_variances
  );

  const negativeVariancesChange = calculatePercentageChange(
    currentPeriodData.negative_variances,
    previousPeriodData.negative_variances
  );

  const totalPenaltyChange = calculatePercentageChange(
    currentPeriodData.total_penalty_amount,
    previousPeriodData.total_penalty_amount
  );

  const avgVarianceChange = calculatePercentageChange(
    currentPeriodData.average_variance_percentage,
    previousPeriodData.average_variance_percentage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Variance Reporting Dashboard</h1>
          <p className="text-muted-foreground">Monitor and analyze milk collection variances</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <RefreshButton 
            isRefreshing={isLoading} 
            onRefresh={fetchVarianceData} 
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={exportToExcel}
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Search</label>
              <input
                type="text"
                placeholder="Search collections, farmers, collectors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Compare With</label>
              <select
                value="previous_period"
                onChange={(e) => {
                  // For simplicity, we'll just use the previous period
                  // In a more complex implementation, you could have different comparison options
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="previous_period">Previous Period</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Collector</label>
              <select
                value={filterCollector}
                onChange={(e) => setFilterCollector(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Collectors</option>
                {collectors.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Comparison Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Variances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{currentPeriodData.total_variances}</div>
              <Badge 
                variant={totalVariancesChange >= 0 ? 'destructive' : 'default'}
                className="flex items-center gap-1"
              >
                {totalVariancesChange >= 0 ? '↑' : '↓'} {Math.abs(totalVariancesChange).toFixed(1)}%
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Previous: {previousPeriodData.total_variances}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positive Variances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">{currentPeriodData.positive_variances}</div>
              <Badge 
                variant={positiveVariancesChange >= 0 ? 'destructive' : 'default'}
                className="flex items-center gap-1"
              >
                {positiveVariancesChange >= 0 ? '↑' : '↓'} {Math.abs(positiveVariancesChange).toFixed(1)}%
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Previous: {previousPeriodData.positive_variances}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Negative Variances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-600">{currentPeriodData.negative_variances}</div>
              <Badge 
                variant={negativeVariancesChange >= 0 ? 'destructive' : 'default'}
                className="flex items-center gap-1"
              >
                {negativeVariancesChange >= 0 ? '↑' : '↓'} {Math.abs(negativeVariancesChange).toFixed(1)}%
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Previous: {previousPeriodData.negative_variances}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Variance %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{currentPeriodData.average_variance_percentage.toFixed(2)}%</div>
              <Badge 
                variant={avgVarianceChange >= 0 ? 'destructive' : 'default'}
                className="flex items-center gap-1"
              >
                {avgVarianceChange >= 0 ? '↑' : '↓'} {Math.abs(avgVarianceChange).toFixed(1)}%
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Previous: {previousPeriodData.average_variance_percentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Penalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">KSh {currentPeriodData.total_penalty_amount.toFixed(2)}</div>
              <Badge 
                variant={totalPenaltyChange >= 0 ? 'destructive' : 'default'}
                className="flex items-center gap-1"
              >
                {totalPenaltyChange >= 0 ? '↑' : '↓'} {Math.abs(totalPenaltyChange).toFixed(1)}%
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Previous: KSh {previousPeriodData.total_penalty_amount.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Variance Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={varianceTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {varianceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Collectors by Avg. Variance %</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={collectorPerformanceData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="collector_name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average_variance_percentage" name="Avg. Variance %" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Collector Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collector Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collector</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Total Variance (L)</TableHead>
                  <TableHead>Avg. Variance %</TableHead>
                  <TableHead>Positive</TableHead>
                  <TableHead>Negative</TableHead>
                  <TableHead>Penalties (KSh)</TableHead>
                  <TableHead>Performance Score</TableHead> {/* Add this column */}
                  <TableHead>Last Collection</TableHead> {/* Add this column */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {collectorPerformance.length > 0 ? (
                  collectorPerformance.map((collector) => (
                    <TableRow key={collector.collector_id}>
                      <TableCell className="font-medium">{collector.collector_name}</TableCell>
                      <TableCell>{collector.total_collections}</TableCell>
                      <TableCell>
                        <span className={collector.total_variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {collector.total_variance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getVarianceSeverityColor(collector.average_variance_percentage)}>
                          {collector.average_variance_percentage.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-600">{collector.positive_variances}</TableCell>
                      <TableCell className="text-red-600">{collector.negative_variances}</TableCell>
                      <TableCell className="font-medium text-red-600">
                        {collector.total_penalty_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={collector.performance_score >= 80 ? 'default' : collector.performance_score >= 60 ? 'secondary' : 'destructive'}
                        >
                          {collector.performance_score.toFixed(0)}/100
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {collector.last_collection_date 
                          ? format(new Date(collector.last_collection_date), 'MMM dd, yyyy')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <p className="text-muted-foreground">No collector performance data found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Variances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Variances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('collections.collection_id')}>
                    Collection ID {sortBy === 'collections.collection_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('collections.farmers.full_name')}>
                    Farmer {sortBy === 'collections.farmers.full_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('collections.collection_date')}>
                    Date {sortBy === 'collections.collection_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('staff.profiles.full_name')}>
                    Collector {sortBy === 'staff.profiles.full_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('collections.liters')}>
                    Collected (L) {sortBy === 'collections.liters' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('company_received_liters')}>
                    Received (L) {sortBy === 'company_received_liters' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('variance_type')}>
                    Type {sortBy === 'variance_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('penalty_amount')}>
                    Penalty (KSh) {sortBy === 'penalty_amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('approved_at')}>
                    Approved {sortBy === 'approved_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : variances.length > 0 ? (
                  variances.map((variance) => (
                    <TableRow 
                      key={variance.id} 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => openDrillDown(variance)}
                    >
                      <TableCell className="font-mono">
                        {variance.collection_details?.collection_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {variance.collection_details?.farmers?.full_name || 'Unknown Farmer'}
                      </TableCell>
                      <TableCell>
                        {variance.collection_details?.collection_date 
                          ? format(new Date(variance.collection_details.collection_date), 'MMM dd, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {variance.staff_details?.profiles?.full_name || 'Unknown Staff'}
                      </TableCell>
                      <TableCell>
                        {variance.collection_details?.liters?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        {variance.company_received_liters?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getVarianceIcon(variance.variance_type || 'none')}
                          <span className={variance.variance_liters >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {variance.variance_liters?.toFixed(2) || '0.00'}L
                          </span>
                          <Badge className={getVarianceSeverityColor(variance.variance_percentage || 0)}>
                            {variance.variance_percentage?.toFixed(2) || '0.00'}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getVarianceTypeColor(variance.variance_type || 'none')}>
                          {variance.variance_type 
                            ? variance.variance_type.charAt(0).toUpperCase() + variance.variance_type.slice(1)
                            : 'None'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {variance.penalty_amount > 0 ? (
                          <span className="font-medium text-red-600">
                            {variance.penalty_amount?.toFixed(2) || '0.00'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.00</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {variance.approved_at 
                          ? format(new Date(variance.approved_at), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">No variances found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>

            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-light dark:border-border-dark mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} variances
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                    const page = startPage + i;
                    return (
                      <Button
                        key={page}
                        onClick={() => goToPage(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : ""
                        }
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded-md px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Variance Count Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={trendChartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Positive Variances" fill="#10B981" />
                <Bar dataKey="Negative Variances" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Average Variance % Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={trendChartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Avg. Positive Variance %" fill="#10B981" name="Avg. Positive Variance %" />
                <Bar dataKey="Avg. Negative Variance %" fill="#EF4444" name="Avg. Negative Variance %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Penalty Amount Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={trendChartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 40,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip formatter={(value) => [`KSh ${value}`, 'Penalty Amount']} />
              <Legend />
              <Bar dataKey="Total Penalties" fill="#8B5CF6" name="Total Penalties (KSh)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Variance Drill-Down Dialog */}
      <Dialog open={isDrillDownOpen} onOpenChange={setIsDrillDownOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variance Details</DialogTitle>
          </DialogHeader>
          {selectedVariance && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Collection ID</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{selectedVariance.collection_details?.collection_id || 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Farmer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{selectedVariance.collection_details?.farmers?.full_name || 'Unknown Farmer'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Collector</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{selectedVariance.staff_details?.profiles?.full_name || 'Unknown Staff'}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Variance Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Variance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-blue-800 mb-1">Collected</h3>
                      <p className="text-2xl font-bold">{selectedVariance.collection_details?.liters?.toFixed(2) || '0.00'}L</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h3 className="font-medium text-green-800 mb-1">Received</h3>
                      <p className="text-2xl font-bold">{selectedVariance.company_received_liters?.toFixed(2) || '0.00'}L</p>
                    </div>
                    <div className={`p-4 rounded-lg ${selectedVariance.variance_liters >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <h3 className={`font-medium mb-1 ${selectedVariance.variance_liters >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        Variance (L)
                      </h3>
                      <p className={`text-2xl font-bold ${selectedVariance.variance_liters >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedVariance.variance_liters?.toFixed(2) || '0.00'}L
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${
                      getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('red') ? 'bg-red-50' : 
                      getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('orange') ? 'bg-orange-50' : 
                      getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('yellow') ? 'bg-yellow-50' : 'bg-green-50'
                    }`}>
                      <h3 className={`font-medium mb-1 ${
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('red') ? 'text-red-800' : 
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('orange') ? 'text-orange-800' : 
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('yellow') ? 'text-yellow-800' : 'text-green-800'
                      }`}>
                        Variance (%)
                      </h3>
                      <p className={`text-2xl font-bold ${
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('red') ? 'text-red-600' : 
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('orange') ? 'text-orange-600' : 
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('yellow') ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {selectedVariance.variance_percentage?.toFixed(2) || '0.00'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Penalty Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Penalty Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Variance Type</h3>
                      <Badge className={getVarianceTypeColor(selectedVariance.variance_type || 'none')}>
                        {selectedVariance.variance_type 
                          ? selectedVariance.variance_type.charAt(0).toUpperCase() + selectedVariance.variance_type.slice(1)
                          : 'None'}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Penalty Amount</h3>
                      <p className="text-2xl font-bold text-red-600">
                        KSh {selectedVariance.penalty_amount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Approved At</h3>
                      <p className="text-lg">
                        {selectedVariance.approved_at 
                          ? format(new Date(selectedVariance.approved_at), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Collection Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Collection Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Collection Date</h3>
                      <p className="text-lg">
                        {selectedVariance.collection_details?.collection_date 
                          ? format(new Date(selectedVariance.collection_details.collection_date), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Quality Grade</h3>
                      <p className="text-lg">
                        N/A
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedVariance.approval_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Approval Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{selectedVariance.approval_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Variance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Variance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Positive Variances</h3>
              <p className="text-sm text-green-700">
                Occur when the company receives more milk than was collected by the collector. 
                This could indicate measurement errors or other factors.
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Negative Variances</h3>
              <p className="text-sm text-red-700">
                Occur when the company receives less milk than was collected by the collector. 
                This could indicate spillage, theft, or measurement errors.
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Penalty System</h3>
              <p className="text-sm text-blue-700">
                Penalties are automatically calculated based on variance percentages and applied 
                according to the configured penalty rates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VarianceReportingDashboard;