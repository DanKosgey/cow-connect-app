import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import useToastNotifications from '@/hooks/useToastNotifications';
import { format } from 'date-fns';

// Import modular components
import * as dataFetching from './modules/dataFetching';
import * as helpers from './modules/helpers';
import * as dashboardSections from './modules/dashboardSections';

// Import existing components
import VarianceSummaryCard from './VarianceSummaryCard';
import { EnhancedPieChart, EnhancedBarChart } from './EnhancedVarianceCharts';
import { VarianceAnalysisInsights } from './EnhancedDataInsights';
import SkeletonCard from './SkeletonCard';
import SkeletonTableRow from './SkeletonTableRow';

const EnhancedVarianceReportingDashboard: React.FC = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  
  // State management
  const [variances, setVariances] = useState<any[]>([]);
  const [collectorPerformance, setCollectorPerformance] = useState<any[]>([]);
  const [currentPeriodData, setCurrentPeriodData] = useState<any>({
    total_variances: 0,
    positive_variances: 0,
    negative_variances: 0,
    total_penalty_amount: 0,
    average_variance_percentage: 0
  });
  const [previousPeriodData, setPreviousPeriodData] = useState<any>({
    total_variances: 0,
    positive_variances: 0,
    negative_variances: 0,
    total_penalty_amount: 0,
    average_variance_percentage: 0
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    collection_accuracy: 0,
    penalty_rate: 0,
    variance_consistency: 0,
    collector_efficiency: 0
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
    from: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  const [comparisonPeriod, setComparisonPeriod] = useState<{
    from: string;
    to: string;
  }>({
    from: format(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  });

  const [filterCollector, setFilterCollector] = useState<string>('all');
  const [filterVarianceType, setFilterVarianceType] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('weekly');
  const [collectors, setCollectors] = useState<{id: string, full_name: string}[]>([]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('approved_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [collectorSortBy, setCollectorSortBy] = useState<string>('performance_score');
  const [collectorSortOrder, setCollectorSortOrder] = useState<'asc' | 'desc'>('desc');

  const [trendData, setTrendData] = useState<any[]>([]);

  const [selectedVariance, setSelectedVariance] = useState<any | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [farmerHistory, setFarmerHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      const fetchedCollectors = await dataFetching.fetchCollectors();
      setCollectors(fetchedCollectors);
      
      // Fetch trend and comparison data
      const trendData = await dataFetching.fetchTrendData(dateRange, showError);
      setTrendData(trendData);
      
      const { currentSummary, previousSummary } = await dataFetching.fetchComparisonData(
        dateRange, 
        comparisonPeriod, 
        showError
      );
      setCurrentPeriodData(currentSummary);
      setPreviousPeriodData(previousSummary);
    };
    
    initializeData();
  }, []);

  // Fetch variance data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch variance data
        const { data, count } = await dataFetching.fetchVarianceData(
          user,
          currentPage,
          pageSize,
          dateRange,
          filterCollector,
          filterVarianceType,
          searchTerm,
          showError
        );
        
        setVariances(data);
        setTotalCount(count);
        setTotalPages(Math.ceil((count || 0) / pageSize));
        
        // Fetch summary data
        const { summary, performanceMetrics } = await dataFetching.fetchSummaryData(
          dateRange,
          filterCollector,
          filterVarianceType,
          collectorPerformance,
          showError
        );
        
        setCurrentPeriodData(summary);
        setPerformanceMetrics(performanceMetrics);
        
        // Fetch collector performance
        const collectorData = await dataFetching.fetchCollectorPerformance(
          dateRange,
          timeframe,
          filterCollector,
          filterVarianceType,
          collectorSortBy,
          collectorSortOrder,
          showError
        );
        
        setCollectorPerformance(collectorData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentPage, pageSize, dateRange, comparisonPeriod, filterCollector, filterVarianceType, timeframe, searchTerm]);

  // Handle drill down
  const handleDrillDown = async (variance: any) => {
    setSelectedVariance(variance);
    setIsDrillDownOpen(true);
    
    try {
      setIsLoadingHistory(true);
      const historyData = await dataFetching.fetchFarmerHistory(
        variance.collection_details?.collection_id || '',
        showError
      );
      setFarmerHistory(historyData);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Prepare chart data using helper functions
  const varianceTypeData = helpers.prepareChartData.varianceTypeData(currentPeriodData);
  const collectorPerformanceData = helpers.prepareChartData.collectorPerformanceData(collectorPerformance);
  const trendChartData = helpers.prepareChartData.trendChartData(trendData);
  
  const varianceTypeChartKeys = helpers.prepareChartData.chartKeys.varianceType;
  const variancePercentageChartKeys = helpers.prepareChartData.chartKeys.variancePercentage;
  const penaltyChartKeys = helpers.prepareChartData.chartKeys.penalty;

  // Calculate percentage changes using helper function
  const totalVariancesChange = helpers.calculatePercentageChange(
    currentPeriodData.total_variances,
    previousPeriodData.total_variances
  );

  const positiveVariancesChange = helpers.calculatePercentageChange(
    currentPeriodData.positive_variances,
    previousPeriodData.positive_variances
  );

  const negativeVariancesChange = helpers.calculatePercentageChange(
    currentPeriodData.negative_variances,
    previousPeriodData.negative_variances
  );

  const totalPenaltyChange = helpers.calculatePercentageChange(
    currentPeriodData.total_penalty_amount,
    previousPeriodData.total_penalty_amount
  );

  const avgVarianceChange = helpers.calculatePercentageChange(
    currentPeriodData.average_variance_percentage,
    previousPeriodData.average_variance_percentage
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      {/* Header Section */}
      if (performanceError) {
        console.warn('Error calculating collector performance:', performanceError);
        setCollectorPerformance([]);
        return;
      }

      // Transform the data to match our interface
      let transformedData = (performanceData || []).map((item: any) => ({
        collector_id: item.collector_id,
        collector_name: item.collector_name || 'Unknown Collector',
        total_collections: item.total_collections || 0,
        total_variance: parseFloat(item.total_variance?.toFixed(2) || '0.00'),
        average_variance_percentage: parseFloat(item.average_variance_percentage?.toFixed(2) || '0.00'),
        total_penalty_amount: parseFloat(item.total_penalty_amount?.toFixed(2) || '0.00'),
        positive_variances: item.positive_variances || 0,
        negative_variances: item.negative_variances || 0,
        performance_score: parseFloat(item.performance_score?.toFixed(0) || '0'),
        last_collection_date: item.last_collection_date || ''
      }));

      // Sort the data based on collectorSortBy and collectorSortOrder
      if (collectorSortBy) {
        transformedData.sort((a, b) => {
          let aValue: any = a[collectorSortBy as keyof CollectorPerformance];
          let bValue: any = b[collectorSortBy as keyof CollectorPerformance];
          
          // Handle special cases for sorting
          if (collectorSortBy === 'collector_name') {
            aValue = aValue?.toString().toLowerCase();
            bValue = bValue?.toString().toLowerCase();
          }
          
          if (aValue < bValue) {
            return collectorSortOrder === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return collectorSortOrder === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      setCollectorPerformance(transformedData);
      
      // Update performance metrics when collector performance changes
      if (transformedData.length > 0 && varianceSummary.total_variances > 0) {
        const collectorEfficiency = (transformedData.reduce((sum, c) => sum + c.performance_score, 0) / transformedData.length);
        setPerformanceMetrics(prev => ({
          ...prev,
          collector_efficiency: parseFloat(collectorEfficiency.toFixed(2))
        }));
      }
    } catch (error: any) {
      console.error('Error calculating collector performance:', error);
      setCollectorPerformance([]);
    }
  };

  const fetchTrendData = async () => {
    try {
      const { data, error } = await supabase
        .from('milk_approvals')
        .select(`
          approved_at,
          variance_type,
          variance_liters,
          penalty_amount
        `, { count: 'exact' })
        .gte('approved_at', `${dateRange.from}T00:00:00Z`)
        .lte('approved_at', `${dateRange.to}T23:59:59Z`);

      if (error) throw error;

      const dailyData = data.reduce((acc: any, item: any) => {
        const date = format(new Date(item.approved_at), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = {
            date,
            positive_variance_count: 0,
            negative_variance_count: 0,
            average_positive_variance: 0,
            average_negative_variance: 0,
            total_penalty_amount: 0,
            positive_variance_sum: 0,
            negative_variance_sum: 0,
          };
        }

        if (item.variance_type === 'positive') {
          acc[date].positive_variance_count += 1;
          acc[date].positive_variance_sum += item.variance_liters;
        } else if (item.variance_type === 'negative') {
          acc[date].negative_variance_count += 1;
          acc[date].negative_variance_sum += item.variance_liters;
        }

        acc[date].total_penalty_amount += item.penalty_amount;

        return acc;
      }, {});

      const trendData = Object.values(dailyData).map((item: any) => ({
        date: item.date,
        positive_variance_count: item.positive_variance_count,
        negative_variance_count: item.negative_variance_count,
        average_positive_variance: item.positive_variance_count > 0 ? 
          item.positive_variance_sum / item.positive_variance_count : 0,
        average_negative_variance: item.negative_variance_count > 0 ? 
          item.negative_variance_sum / item.negative_variance_count : 0,
        total_penalty_amount: item.total_penalty_amount,
      }));

      setTrendData(trendData);
    } catch (error: any) {
      console.error('Error fetching trend data:', error);
      showError('Error', String(error?.message || 'Failed to fetch trend data'));
    }
  };

  const fetchComparisonData = async () => {
    try {
      const { data: currentData, error } = await supabase
        .from('milk_approvals')
        .select(`
          variance_type,
          variance_liters,
          penalty_amount
        `, { count: 'exact' })
        .gte('approved_at', `${dateRange.from}T00:00:00Z`)
        .lte('approved_at', `${dateRange.to}T23:59:59Z`);

      if (error) throw error;

      const currentSummary: VarianceSummary = {
        total_variances: currentData?.length || 0,
        positive_variances: currentData?.filter((v: any) => v.variance_type === 'positive').length || 0,
        negative_variances: currentData?.filter((v: any) => v.variance_type === 'negative').length || 0,
        total_penalty_amount: currentData?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0,
        average_variance_percentage: currentData?.length ? 
          currentData.reduce((sum: number, v: any) => sum + (v.variance_percentage || 0), 0) / currentData.length : 0
      };

      setCurrentPeriodData(currentSummary);

      const { data: previousData, error: previousError } = await supabase
        .from('milk_approvals')
        .select(`
          variance_type,
          variance_liters,
          penalty_amount
        `, { count: 'exact' })
        .gte('approved_at', `${comparisonPeriod.from}T00:00:00Z`)
        .lte('approved_at', `${comparisonPeriod.to}T23:59:59Z`);

      if (previousError) throw previousError;

      const previousSummary: VarianceSummary = {
        total_variances: previousData?.length || 0,
        positive_variances: previousData?.filter((v: any) => v.variance_type === 'positive').length || 0,
        negative_variances: previousData?.filter((v: any) => v.variance_type === 'negative').length || 0,
        total_penalty_amount: previousData?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0,
        average_variance_percentage: previousData?.length ? 
          previousData.reduce((sum: number, v: any) => sum + (v.variance_percentage || 0), 0) / previousData.length : 0
      };

      setPreviousPeriodData(previousSummary);
    } catch (error: any) {
      console.error('Error fetching comparison data:', error);
      showError('Error', String(error?.message || 'Failed to fetch comparison data'));
    }
  };

  const handleDrillDown = (variance: VarianceRecord) => {
    setSelectedVariance(variance);
    setIsDrillDownOpen(true);
    fetchFarmerHistory(variance.collection_details?.collection_id || '');
  };

  const fetchFarmerHistory = async (collectionId: string) => {
    try {
      setIsLoadingHistory(true);
      const { data, error } = await supabase
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
            staff_id,
            staff!collections_staff_id_fkey (
              profiles (
                full_name
              )
            ),
            farmers (
              full_name
            )
          ),
          staff!milk_approvals_staff_id_fkey (
            profiles (
              full_name
            )
          )
        `)
        .eq('collection_id', collectionId);

      if (error) {
        throw error;
      }

      // Transform the data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        collection_details: item.collections || null,
        staff_details: item.staff || null
      }));

      setFarmerHistory(transformedData);
    } catch (error: any) {
      console.error('Error fetching farmer history:', error);
      showError('Error', String(error?.message || 'Failed to fetch farmer history'));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const exportToExcel = () => {
    try {
      const worksheet = XLSXUtils.json_to_sheet(variances);
      const workbook = XLSXUtils.book_new();
      XLSXUtils.book_append_sheet(workbook, worksheet, 'VarianceData');
      XLSXWriteFile(workbook, 'variance_data.xlsx');
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      showError('Error', 'Failed to export data to Excel');
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm:ss');
  };

  const formatNumber = (num: number, decimalPlaces: number = 2) => {
    return num.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
  };

  const renderVarianceType = (type: string) => {
    switch (type) {
      case 'positive':
        return <Badge variant="success">Positive</Badge>;
      case 'negative':
        return <Badge variant="destructive">Negative</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const renderVarianceIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="text-green-500" />;
      case 'negative':
        return <TrendingDown className="text-red-500" />;
      default:
        return <Minus />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Variance Reporting Dashboard</h1>
        <Button onClick={exportToExcel} variant="outline">
          <Download className="mr-2" />
          Export to Excel
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <VarianceSummaryCard
          title="Total Variances"
          value={formatNumber(varianceSummary.total_variances)}
          icon={<AlertTriangle />}
        />
        <VarianceSummaryCard
          title="Positive Variances"
          value={formatNumber(varianceSummary.positive_variances)}
          icon={<TrendingUp />}
        />
        <VarianceSummaryCard
          title="Negative Variances"
          value={formatNumber(varianceSummary.negative_variances)}
          icon={<TrendingDown />}
        />
        <VarianceSummaryCard
          title="Total Penalty Amount"
          value={formatNumber(varianceSummary.total_penalty_amount, 2)}
          icon={<Banknote />}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <VarianceSummaryCard
          title="Collection Accuracy"
          value={`${formatNumber(performanceMetrics.collection_accuracy, 2)}%`}
          icon={<BarChart3 />}
        />
        <VarianceSummaryCard
          title="Penalty Rate"
          value={`${formatNumber(performanceMetrics.penalty_rate, 2)}%`}
          icon={<PieChart />}
        />
        <VarianceSummaryCard
          title="Variance Consistency"
          value={`${formatNumber(performanceMetrics.variance_consistency, 2)}%`}
          icon={<Calendar />}
        />
        <VarianceSummaryCard
          title="Collector Efficiency"
          value={`${formatNumber(performanceMetrics.collector_efficiency, 2)}%`}
          icon={<Users />}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm">Timeframe:</p>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline">
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTimeframe('daily')}>Daily</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeframe('weekly')}>Weekly</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeframe('monthly')}>Monthly</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm">Date Range:</p>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="border border-gray-300 px-2 py-1"
          />
          <p className="text-sm">to</p>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="border border-gray-300 px-2 py-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <EnhancedBarChart data={trendData} />
        <EnhancedPieChart data={collectorPerformance} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm">Filter by Collector:</p>
          <select
            value={filterCollector}
            onChange={(e) => setFilterCollector(e.target.value)}
            className="border border-gray-300 px-2 py-1"
          >
            <option value="all">All</option>
            {collectors.map((collector) => (
              <option key={collector.id} value={collector.id}>
                {collector.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm">Filter by Variance Type:</p>
          <select
            value={filterVarianceType}
            onChange={(e) => setFilterVarianceType(e.target.value)}
            className="border border-gray-300 px-2 py-1"
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm">Search:</p>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 px-2 py-1"
          />
        </div>
        <div className="flex items-center space-x-2">
          <RefreshButton onClick={fetchVarianceData} />
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline">
                Sort by {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('approved_at')}>
                Approved At
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('variance_liters')}>
                Variance Liters
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('penalty_amount')}>
                Penalty Amount
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Collection ID</TableHead>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead className="w-[150px]">Farmer</TableHead>
              <TableHead className="w-[150px]">Collector</TableHead>
              <TableHead className="w-[100px]">Liters</TableHead>
              <TableHead className="w-[100px]">Variance Liters</TableHead>
              <TableHead className="w-[100px]">Variance Type</TableHead>
              <TableHead className="w-[100px]">Penalty Amount</TableHead>
              <TableHead className="w-[100px]">Approval Notes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonTableRow />
            ) : (
              variances.map((variance) => (
                <TableRow key={variance.id}>
                  <TableCell>{variance.collection_details?.collection_id}</TableCell>
                  <TableCell>{formatDate(variance.collection_details?.collection_date || '')}</TableCell>
                  <TableCell>{variance.collection_details?.farmers?.full_name}</TableCell>
                  <TableCell>{variance.collection_details?.staff?.profiles?.full_name}</TableCell>
                  <TableCell>{formatNumber(variance.collection_details?.liters || 0)}</TableCell>
                  <TableCell>{formatNumber(variance.variance_liters)}</TableCell>
                  <TableCell>{renderVarianceType(variance.variance_type)}</TableCell>
                  <TableCell>{formatNumber(variance.penalty_amount, 2)}</TableCell>
                  <TableCell>{variance.approval_notes}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleDrillDown(variance)} variant="ghost">
                      <FileText className="mr-2" />
                      Drill Down
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm">Page {currentPage} of {totalPages}</p>
          <p className="text-sm">Total {totalCount} records</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            <ChevronsLeft />
          </Button>
          <Button variant="outline" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
            <ChevronRight />
          </Button>
          <Button variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
            <ChevronsRight />
          </Button>
        </div>
      </div>
      <Dialog open={isDrillDownOpen} onOpenChange={setIsDrillDownOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Farmer History</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Collection ID</TableHead>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead className="w-[150px]">Farmer</TableHead>
                  <TableHead className="w-[150px]">Collector</TableHead>
                  <TableHead className="w-[100px]">Liters</TableHead>
                  <TableHead className="w-[100px]">Variance Liters</TableHead>
                  <TableHead className="w-[100px]">Variance Type</TableHead>
                  <TableHead className="w-[100px]">Penalty Amount</TableHead>
                  <TableHead className="w-[100px]">Approval Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  <SkeletonTableRow />
                ) : (
                  farmerHistory.map((variance) => (
                    <TableRow key={variance.id}>
                      <TableCell>{variance.collection_details?.collection_id}</TableCell>
                      <TableCell>{formatDate(variance.collection_details?.collection_date || '')}</TableCell>
                      <TableCell>{variance.collection_details?.farmers?.full_name}</TableCell>
                      <TableCell>{variance.collection_details?.staff?.profiles?.full_name}</TableCell>
                      <TableCell>{formatNumber(variance.collection_details?.liters || 0)}</TableCell>
                      <TableCell>{formatNumber(variance.variance_liters)}</TableCell>
                      <TableCell>{renderVarianceType(variance.variance_type)}</TableCell>
                      <TableCell>{formatNumber(variance.penalty_amount, 2)}</TableCell>
                      <TableCell>{variance.approval_notes}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
import { Button, Dialog, DialogContent, DialogTrigger } from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import VarianceAnalysisInsights from "@/components/VarianceAnalysisInsights";

const EnhancedVarianceReportingDashboard = ({ data }) => {
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [currentPeriodData, setCurrentPeriodData] = useState([]);
  const [previousPeriodData, setPreviousPeriodData] = useState([]);

  useEffect(() => {
    const processedData = data.map((entry) => ({
      date: entry.date,
      collector_efficiency: parseFloat(collectorEfficiency.toFixed(2))
    }));
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Variance Reporting Dashboard</h1>
        <Dialog open={isDrillDownOpen} onOpenChange={setIsDrillDownOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Drill Down</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold">Drill Down Data</h1>
            </div>
            <div className="flex items-center justify-end mt-4">
              <Button onClick={() => setIsDrillDownOpen(false)} variant="outline">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      <VarianceAnalysisInsights
        currentPeriodData={currentPeriodData}
        previousPeriodData={previousPeriodData}
      />
    </div>
  );
};

export default EnhancedVarianceReportingDashboard;

      }
    } catch (error: any) {
      console.error('Error calculating collector performance:', error);
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
          data.reduce((sum: number, v: any) => sum + (v.variance_percentage || 0), 0) / data.length : 0
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

  const handleCollectorSort = (column: string) => {
    if (collectorSortBy === column) {
      setCollectorSortOrder(collectorSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCollectorSortBy(column);
      setCollectorSortOrder('asc');
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

  const openDrillDown = async (variance: VarianceRecord) => {
    setSelectedVariance(variance);
    setIsDrillDownOpen(true);
    
    // Fetch historical data for this farmer
    if (variance.collection_details?.farmers?.full_name) {
      await fetchFarmerHistory(variance);
    }
  };

  const fetchFarmerHistory = async (variance: VarianceRecord) => {
    if (!user?.id || !variance.collection_details?.farmers?.full_name) return;
    
    setIsLoadingHistory(true);
    try {
      // Fetch historical variances for this farmer
      const { data, error } = await supabase
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
            staff_id,
            staff!collections_staff_id_fkey (
              profiles (
                full_name
              )
            ),
            farmers (
              full_name
            )
          ),
          staff!milk_approvals_staff_id_fkey (
            profiles (
              full_name
            )
          )
        `)
        .eq('collections.farmers.full_name', variance.collection_details.farmers.full_name)
        .limit(10)
        .order('approved_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        collection_details: item.collections || null,
        staff_details: item.staff || null
      }));

      setFarmerHistory(transformedData);
    } catch (error: any) {
      console.error('Error fetching farmer history:', error);
      setFarmerHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
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

  // Chart data keys
  const varianceTypeChartKeys = [
    { key: 'Positive Variances', name: 'Positive Variances', color: '#10B981' },
    { key: 'Negative Variances', name: 'Negative Variances', color: '#EF4444' }
  ];

  const variancePercentageChartKeys = [
    { key: 'Avg. Positive Variance %', name: 'Avg. Positive Variance %', color: '#10B981' },
    { key: 'Avg. Negative Variance %', name: 'Avg. Negative Variance %', color: '#EF4444' }
  ];

  const penaltyChartKeys = [
    { key: 'Total Penalties', name: 'Total Penalties (KSh)', color: '#8B5CF6' }
  ];

  // Handle chart interactions
  const handlePieChartSegmentClick = (data: any) => {
    console.log('Pie chart segment clicked:', data);
    // In a real implementation, you might filter the data based on the clicked segment
  };

  const handleBarChartClick = (data: any) => {
    console.log('Bar chart clicked:', data);
    // In a real implementation, you might drill down into the data
  };

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
      {/* Header with responsive layout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Variance Reporting Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Monitor and analyze milk collection variances
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshButton 
            isRefreshing={isLoading} 
            onRefresh={fetchVarianceData} 
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={exportToCSV} className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  window.print();
                }} 
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Filters with Active State Indicators */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {(searchTerm || filterCollector !== 'all' || filterVarianceType !== 'all') && (
              <Badge variant="secondary" className="ml-2">
                {[
                  searchTerm && `Search: "${searchTerm}"`,
                  filterCollector !== 'all' && `Collector: ${collectors.find(c => c.id === filterCollector)?.full_name || 'Unknown'}`,
                  filterVarianceType !== 'all' && `Type: ${filterVarianceType}`
                ].filter(Boolean).join(', ')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  Search
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search collections, farmers, collectors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {searchTerm && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSearchTerm('')}
                      className="px-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex items-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterCollector('all');
                    setFilterVarianceType('all');
                    setDateRange({
                      from: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                      to: format(new Date(), 'yyyy-MM-dd')
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Reset Filters
                </Button>
              </div>
            </div>
            
            {/* Date Range Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Timeframe
                </label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            
            {/* Additional Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Collector
                </label>
                <select
                  value={filterCollector}
                  onChange={(e) => setFilterCollector(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm transition-all duration-200 ${filterCollector !== 'all' ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-input'}`}
                >
                  <option value="all">All Collectors</option>
                  {collectors.map((collector) => (
                    <option key={collector.id} value={collector.id}>
                      {collector.full_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 12a1 1 0 011 1v2h8v-2a1 1 0 112 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Variance Type
                </label>
                <select
                  value={filterVarianceType}
                  onChange={(e) => setFilterVarianceType(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm transition-all duration-200 ${filterVarianceType !== 'all' ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-input'}`}
                >
                  <option value="all">All Types</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Comparison Summary Cards with Benchmarks - Improved Responsive Layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <VarianceSummaryCard
            title="Total Variances"
            value={currentPeriodData.total_variances}
            previousValue={previousPeriodData.total_variances}
            changePercentage={totalVariancesChange}
            icon={<AlertTriangle className="h-5 w-5" />}
            colorScheme="primary"
            benchmarkValue={50}
            benchmarkLabel="Target"
            isGood={currentPeriodData.total_variances <= 50}
          />
          <VarianceSummaryCard
            title="Positive Variances"
            value={currentPeriodData.positive_variances}
            previousValue={previousPeriodData.positive_variances}
            changePercentage={positiveVariancesChange}
            icon={<TrendingUp className="h-5 w-5" />}
            colorScheme="positive"
            benchmarkValue={30}
            benchmarkLabel="Target"
            isGood={currentPeriodData.positive_variances >= 30}
          />
          <VarianceSummaryCard
            title="Negative Variances"
            value={currentPeriodData.negative_variances}
            previousValue={previousPeriodData.negative_variances}
            changePercentage={negativeVariancesChange}
            icon={<TrendingDown className="h-5 w-5" />}
            colorScheme="negative"
            benchmarkValue={10}
            benchmarkLabel="Max Target"
            isGood={currentPeriodData.negative_variances <= 10}
          />
          <VarianceSummaryCard
            title="Avg. Variance %"
            value={currentPeriodData.average_variance_percentage}
            previousValue={previousPeriodData.average_variance_percentage}
            changePercentage={avgVarianceChange}
            valueType="percentage"
            icon={<BarChart3 className="h-5 w-5" />}
            colorScheme={currentPeriodData.average_variance_percentage >= 0 ? "positive" : "negative"}
            benchmarkValue={2.5}
            benchmarkLabel="Industry Std"
            isGood={Math.abs(currentPeriodData.average_variance_percentage) <= 2.5}
          />
          <VarianceSummaryCard
            title="Total Penalties"
            value={currentPeriodData.total_penalty_amount}
            previousValue={previousPeriodData.total_penalty_amount}
            changePercentage={totalPenaltyChange}
            valueType="currency"
            icon={<Banknote className="h-5 w-5" />}
            colorScheme="negative"
            benchmarkValue={5000}
            benchmarkLabel="Budget Limit"
            isGood={currentPeriodData.total_penalty_amount <= 5000}
          />
        </div>
      )}

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.707 7.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L13 8.586V5a1 1 0 10-2 0v3.586l-1.293-1.293z" />
              <path d="M5 12a1 1 0 011 1v2h8v-2a1 1 0 112 0v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a1 1 0 011-1z" />
            </svg>
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={index} className="p-4" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30">
                <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-1 dark:text-blue-200 truncate">Collection Accuracy</h3>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate">{performanceMetrics.collection_accuracy}%</p>
                <p className="text-[0.6rem] sm:text-xs text-muted-foreground mt-1 dark:text-gray-400 truncate">Target: &gt;95%</p>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800/30">
                <h3 className="text-xs sm:text-sm font-medium text-purple-800 mb-1 dark:text-purple-200 truncate">Avg. Penalty Rate</h3>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate">KSh {performanceMetrics.penalty_rate.toFixed(2)}</p>
                <p className="text-[0.6rem] sm:text-xs text-muted-foreground mt-1 dark:text-gray-400 truncate">Target: &lt;KSh 50.00</p>
              </div>
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-100 dark:bg-green-900/20 dark:border-green-800/30">
                <h3 className="text-xs sm:text-sm font-medium text-green-800 mb-1 dark:text-green-200 truncate">Variance Consistency</h3>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 truncate">{performanceMetrics.variance_consistency >= 0 ? '+' : ''}{performanceMetrics.variance_consistency}%</p>
                <p className="text-[0.6rem] sm:text-xs text-muted-foreground mt-1 dark:text-gray-400 truncate">Target: ±2.5%</p>
              </div>
              <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30">
                <h3 className="text-xs sm:text-sm font-medium text-amber-800 mb-1 dark:text-amber-200 truncate">Collector Efficiency</h3>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400 truncate">{performanceMetrics.collector_efficiency}/100</p>
                <p className="text-[0.6rem] sm:text-xs text-muted-foreground mt-1 dark:text-gray-400 truncate">Target: &gt;80</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      {/* Charts - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedPieChart
          data={varianceTypeData}
          title="Variance Type Distribution"
          onSegmentClick={handlePieChartSegmentClick}
        />
        
        <EnhancedBarChart
          data={collectorPerformanceData}
          dataKeys={[
            { key: 'average_variance_percentage', name: 'Avg. Variance %', color: '#3B82F6' }
          ]}
          title="Top 10 Collectors by Avg. Variance %"
          xAxisKey="collector_name"
          onDataPointClick={handleBarChartClick}
        />
      </div>

      {/* Collector Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collector Performance ({timeframe.charAt(0).toUpperCase() + timeframe.slice(1)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('collector_name')}
                    >
                      Collector {collectorSortBy === 'collector_name' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('total_collections')}
                    >
                      Collections {collectorSortBy === 'total_collections' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('total_variance')}
                    >
                      Total Variance (L) {collectorSortBy === 'total_variance' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('average_variance_percentage')}
                    >
                      Avg. Variance % {collectorSortBy === 'average_variance_percentage' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('positive_variances')}
                    >
                      Positive {collectorSortBy === 'positive_variances' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('negative_variances')}
                    >
                      Negative {collectorSortBy === 'negative_variances' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('total_penalty_amount')}
                    >
                      Penalties (KSh) {collectorSortBy === 'total_penalty_amount' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('performance_score')}
                    >
                      Performance Score {collectorSortBy === 'performance_score' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCollectorSort('last_collection_date')}
                    >
                      Last Collection {collectorSortBy === 'last_collection_date' && (collectorSortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <SkeletonTableRow key={index} columns={9} />
                    ))}
                  </>
                ) : collectorPerformance.length > 0 ? (
                  collectorPerformance.map((collector) => (
                    <TableRow 
                      key={collector.collector_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                    >
                      <TableCell className="font-medium whitespace-nowrap py-3 px-4 border-b border-gray-100 dark:border-gray-800">{collector.collector_name}</TableCell>
                      <TableCell className="whitespace-nowrap py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">{collector.total_collections}</TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">
                        <span className={`font-medium ${collector.total_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {collector.total_variance >= 0 ? '+' : ''}{collector.total_variance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">
                        <Badge className={`${getVarianceSeverityColor(collector.average_variance_percentage)} font-medium`}>
                          {collector.average_variance_percentage >= 0 ? '+' : ''}{collector.average_variance_percentage.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-600 whitespace-nowrap py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">{collector.positive_variances}</TableCell>
                      <TableCell className="text-red-600 whitespace-nowrap py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">{collector.negative_variances}</TableCell>
                      <TableCell className="font-medium text-red-600 py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">
                        {collector.total_penalty_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">
                        <Badge 
                          variant={collector.performance_score >= 80 ? 'default' : collector.performance_score >= 60 ? 'secondary' : 'destructive'}
                          className="font-medium"
                        >
                          {collector.performance_score.toFixed(0)}/100
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">
                        {collector.last_collection_date 
                          ? format(new Date(collector.last_collection_date), 'MMM dd, yyyy')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-muted-foreground text-lg">No collector performance data found</p>
                        <p className="text-muted-foreground text-sm">Try adjusting your filters or select a different timeframe</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
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
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                    onClick={() => handleSort('collections.collection_id')}
                  >
                    Collection ID {sortBy === 'collections.collection_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                    onClick={() => handleSort('collections.farmers.full_name')}
                  >
                    Farmer {sortBy === 'collections.farmers.full_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                    onClick={() => handleSort('collections.collection_date')}
                  >
                    Date {sortBy === 'collections.collection_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                    onClick={() => handleSort('collections.staff.profiles.full_name')}
                  >
                    Collector {sortBy === 'collections.staff.profiles.full_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                    onClick={() => handleSort('staff.profiles.full_name')}
                  >
                    Approved By {sortBy === 'staff.profiles.full_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-right"
                    onClick={() => handleSort('collections.liters')}
                  >
                    Collected (L) {sortBy === 'collections.liters' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-right"
                    onClick={() => handleSort('company_received_liters')}
                  >
                    Received (L) {sortBy === 'company_received_liters' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-center"
                    onClick={() => handleSort('variance_type')}
                  >
                    Type {sortBy === 'variance_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-right"
                    onClick={() => handleSort('penalty_amount')}
                  >
                    Penalty (KSh) {sortBy === 'penalty_amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                    onClick={() => handleSort('approved_at')}
                  >
                    Approved {sortBy === 'approved_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <SkeletonTableRow key={index} columns={10} />
                    ))}
                  </>
                ) : variances.length > 0 ? (
                  variances.map((variance) => (
                    <TableRow 
                      key={variance.id} 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                      onClick={() => openDrillDown(variance)}
                    >
                      <TableCell className="font-mono py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        {variance.collection_details?.collection_id || 'N/A'}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        {variance.collection_details?.farmers?.full_name || 'Unknown Farmer'}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        {variance.collection_details?.collection_date 
                          ? format(new Date(variance.collection_details.collection_date), 'MMM dd, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        {variance.collection_details?.staff?.profiles?.full_name || 'Unknown Collector'}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        {variance.staff_details?.profiles?.full_name || 'Unknown Staff'}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-right">
                        {variance.collection_details?.liters?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-right">
                        {variance.company_received_liters?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">
                        <Badge className={`${getVarianceTypeColor(variance.variance_type || 'none')} font-medium`}>
                          {variance.variance_type 
                            ? variance.variance_type.charAt(0).toUpperCase() + variance.variance_type.slice(1)
                            : 'None'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-right">
                        {variance.penalty_amount > 0 ? (
                          <span className="font-medium text-red-600">
                            {variance.penalty_amount?.toFixed(2) || '0.00'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.00</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        {variance.approved_at 
                          ? format(new Date(variance.approved_at), 'MMM dd, yyyy HH:mm')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-muted-foreground text-lg">No variances found</p>
                        <p className="text-muted-foreground text-sm">Try adjusting your filters to see more results</p>
                      </div>
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
                <span className="text-sm text-muted-foreground dark:text-gray-400">
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
                <span className="text-sm text-muted-foreground dark:text-gray-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded-md px-2 py-1 text-sm bg-background dark:bg-gray-800 border-input dark:border-gray-700"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedBarChart
          data={trendChartData}
          dataKeys={varianceTypeChartKeys}
          title="Variance Count Trend"
          xAxisKey="date"
          onDataPointClick={handleBarChartClick}
        />
        
        <EnhancedBarChart
          data={trendChartData}
          dataKeys={variancePercentageChartKeys}
          title="Average Variance % Trend"
          xAxisKey="date"
          onDataPointClick={handleBarChartClick}
        />
      </div>

      <EnhancedBarChart
        data={trendChartData}
        dataKeys={penaltyChartKeys}
        title="Penalty Amount Trend"
        xAxisKey="date"
        onDataPointClick={handleBarChartClick}
      />

      {/* Variance Drill-Down Dialog */}
      <Dialog open={isDrillDownOpen} onOpenChange={(open) => {
        setIsDrillDownOpen(open);
        if (!open) {
          setFarmerHistory([]);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Variance Details</span>
              {selectedVariance && (
                <Badge className={getVarianceTypeColor(selectedVariance.variance_type || 'none')}>
                  {selectedVariance.variance_type 
                    ? selectedVariance.variance_type.charAt(0).toUpperCase() + selectedVariance.variance_type.slice(1)
                    : 'None'} Variance
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedVariance && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Collection ID</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold font-mono">{selectedVariance.collection_details?.collection_id || 'N/A'}</div>
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
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Collection Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {selectedVariance.collection_details?.collection_date 
                        ? format(new Date(selectedVariance.collection_details.collection_date), 'MMM dd, yyyy')
                        : 'N/A'}
                    </div>
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
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h3 className="font-medium text-blue-800 mb-1 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                        </svg>
                        Collected
                      </h3>
                      <p className="text-2xl font-bold">{selectedVariance.collection_details?.liters?.toFixed(2) || '0.00'}L</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <h3 className="font-medium text-green-800 mb-1 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Received
                      </h3>
                      <p className="text-2xl font-bold">{selectedVariance.company_received_liters?.toFixed(2) || '0.00'}L</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${selectedVariance.variance_liters >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <h3 className={`font-medium mb-1 flex items-center gap-2 ${selectedVariance.variance_liters >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        {selectedVariance.variance_liters >= 0 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        Variance (L)
                      </h3>
                      <p className={`text-2xl font-bold ${selectedVariance.variance_liters >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedVariance.variance_liters >= 0 ? '+' : ''}{selectedVariance.variance_liters?.toFixed(2) || '0.00'}L
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('red') ? 'bg-red-50 border-red-100' : 
                      getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('orange') ? 'bg-orange-50 border-orange-100' : 
                      getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('yellow') ? 'bg-yellow-50 border-yellow-100' : 'bg-green-50 border-green-100'
                    }`}>
                      <h3 className={`font-medium mb-1 flex items-center gap-2 ${
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('red') ? 'text-red-800' : 
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('orange') ? 'text-orange-800' : 
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('yellow') ? 'text-yellow-800' : 'text-green-800'
                      }`}>
                        {selectedVariance.variance_percentage >= 0 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                          </svg>
                        )}
                        Variance (%)
                      </h3>
                      <p className={`text-2xl font-bold ${
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('red') ? 'text-red-600' : 
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('orange') ? 'text-orange-600' : 
                        getVarianceSeverityColor(selectedVariance.variance_percentage || 0).includes('yellow') ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {selectedVariance.variance_percentage >= 0 ? '+' : ''}{selectedVariance.variance_percentage?.toFixed(2) || '0.00'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Penalty Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 13.047 14.01c-.04.3-.068.598-.068.99 0 1.654 1.346 3 3 3s3-1.346 3-3c0-.392-.029-.69-.068-.99L17.854 7.2l1.179-4.456A1 1 0 0119 2h-7zm2 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Penalty Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Variance Type</h3>
                      <Badge className={`${getVarianceTypeColor(selectedVariance.variance_type || 'none')} text-sm`}>
                        {selectedVariance.variance_type 
                          ? selectedVariance.variance_type.charAt(0).toUpperCase() + selectedVariance.variance_type.slice(1)
                          : 'None'}
                      </Badge>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Penalty Amount</h3>
                      <p className="text-2xl font-bold text-red-600">
                        KSh {selectedVariance.penalty_amount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
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

              {/* Farmer History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Recent Collections for {selectedVariance.collection_details?.farmers?.full_name || 'this farmer'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : farmerHistory.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-800">
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Collection ID</TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Date</TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-right">Collected (L)</TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-right">Received (L)</TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-right">Variance (L)</TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-right">Variance (%)</TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Type</TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-right">Penalty (KSh)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {farmerHistory.map((historyItem) => (
                            <TableRow 
                              key={historyItem.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                            >
                              <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 font-mono">
                                {historyItem.collection_details?.collection_id || 'N/A'}
                              </TableCell>
                              <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                                {historyItem.collection_details?.collection_date 
                                  ? format(new Date(historyItem.collection_details.collection_date), 'MMM dd, yyyy')
                                  : 'N/A'}
                              </TableCell>
                              <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-right">
                                {historyItem.collection_details?.liters?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-right">
                                {historyItem.company_received_liters?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className={`py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-right ${historyItem.variance_liters >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {historyItem.variance_liters >= 0 ? '+' : ''}{historyItem.variance_liters?.toFixed(2) || '0.00'}
                              </TableCell>
                              <TableCell className={`py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-right ${
                                getVarianceSeverityColor(historyItem.variance_percentage || 0).includes('red') ? 'text-red-600' : 
                                getVarianceSeverityColor(historyItem.variance_percentage || 0).includes('orange') ? 'text-orange-600' : 
                                getVarianceSeverityColor(historyItem.variance_percentage || 0).includes('yellow') ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {historyItem.variance_percentage >= 0 ? '+' : ''}{historyItem.variance_percentage?.toFixed(2) || '0.00'}%
                              </TableCell>
                              <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-center">
                                <Badge className={`${getVarianceTypeColor(historyItem.variance_type || 'none')} text-xs`}>
                                  {historyItem.variance_type 
                                    ? historyItem.variance_type.charAt(0).toUpperCase() + historyItem.variance_type.slice(1)
                                    : 'None'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 px-4 border-b border-gray-100 dark:border-gray-800 text-right text-red-600 font-medium">
                                {historyItem.penalty_amount?.toFixed(2) || '0.00'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent collection history found for this farmer
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedVariance.approval_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Approval Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground bg-gray-50 p-4 rounded-lg">{selectedVariance.approval_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VarianceAnalysisInsights />
    </div>
  );
};

export default EnhancedVarianceReportingDashboard;








