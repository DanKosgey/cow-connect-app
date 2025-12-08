import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
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

const ModularEnhancedVarianceReportingDashboard: React.FC = () => {
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
      <dashboardSections.HeaderSection 
        isLoading={isLoading} 
        fetchVarianceData={() => {
          // Trigger data refresh
          setCurrentPage(1);
        }} 
      />
      
      {/* Filters Section */}
      <dashboardSections.FiltersSection 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateRange={dateRange}
        setDateRange={setDateRange}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        filterCollector={filterCollector}
        setFilterCollector={setFilterCollector}
        filterVarianceType={filterVarianceType}
        setFilterVarianceType={setFilterVarianceType}
        collectors={collectors}
      />
      
      {/* Summary Cards Section */}
      <dashboardSections.SummaryCardsSection 
        isLoading={isLoading}
        currentPeriodData={currentPeriodData}
        previousPeriodData={previousPeriodData}
        calculatePercentageChange={helpers.calculatePercentageChange}
      />
      
      {/* Performance Metrics Section */}
      <dashboardSections.PerformanceMetricsSection 
        isLoading={isLoading}
        performanceMetrics={performanceMetrics}
      />
      
      {/* Charts Section */}
      <dashboardSections.ChartsSection 
        varianceTypeData={varianceTypeData}
        collectorPerformanceData={collectorPerformanceData}
        trendChartData={trendChartData}
        varianceTypeChartKeys={varianceTypeChartKeys}
        variancePercentageChartKeys={variancePercentageChartKeys}
        penaltyChartKeys={penaltyChartKeys}
        handlePieChartSegmentClick={helpers.handleChartInteractions.pieChartSegmentClick}
        handleBarChartClick={helpers.handleChartInteractions.barChartClick}
        currentPeriodData={currentPeriodData}
      />
    </div>
  );
};

export default ModularEnhancedVarianceReportingDashboard;