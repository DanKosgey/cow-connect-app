import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RefreshButton from '@/components/ui/RefreshButton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  Filter,
  Download,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  Banknote,
  Printer
} from 'lucide-react';
import VarianceSummaryCard from '../VarianceSummaryCard';
import { EnhancedPieChart, EnhancedBarChart } from '../EnhancedVarianceCharts';
import { VarianceAnalysisInsights } from '../EnhancedDataInsights';
import SkeletonCard from '../SkeletonCard';
import SkeletonTableRow from '../SkeletonTableRow';

// Header section
export const HeaderSection = ({ 
  isLoading, 
  fetchVarianceData 
}: { 
  isLoading: boolean; 
  fetchVarianceData: () => void; 
}) => (
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
);

// Filters section
export const FiltersSection = ({ 
  searchTerm, 
  setSearchTerm, 
  dateRange, 
  setDateRange, 
  timeframe, 
  setTimeframe, 
  filterCollector, 
  setFilterCollector, 
  filterVarianceType, 
  setFilterVarianceType, 
  collectors 
}: any) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Filter className="h-5 w-5" />
        Filters
        {(searchTerm || filterCollector !== 'all' || filterVarianceType !== 'all') && (
          <Badge variant="secondary" className="ml-2">
            {[
              searchTerm && `Search: "${searchTerm}"`,
              filterCollector !== 'all' && `Collector: ${collectors.find((c: any) => c.id === filterCollector)?.full_name || 'Unknown'}`,
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
                // Reset date range to default (last 7 days)
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                setDateRange({
                  from: lastWeek.toISOString().split('T')[0],
                  to: today.toISOString().split('T')[0]
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
              {collectors.map((collector: any) => (
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
);

// Summary cards section
export const SummaryCardsSection = ({ 
  isLoading, 
  currentPeriodData, 
  previousPeriodData, 
  calculatePercentageChange 
}: any) => (
  <>
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
          changePercentage={calculatePercentageChange(currentPeriodData.total_variances, previousPeriodData.total_variances)}
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
          changePercentage={calculatePercentageChange(currentPeriodData.positive_variances, previousPeriodData.positive_variances)}
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
          changePercentage={calculatePercentageChange(currentPeriodData.negative_variances, previousPeriodData.negative_variances)}
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
          changePercentage={calculatePercentageChange(currentPeriodData.average_variance_percentage, previousPeriodData.average_variance_percentage)}
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
          changePercentage={calculatePercentageChange(currentPeriodData.total_penalty_amount, previousPeriodData.total_penalty_amount)}
          valueType="currency"
          icon={<Banknote className="h-5 w-5" />}
          colorScheme="negative"
          benchmarkValue={5000}
          benchmarkLabel="Budget Limit"
          isGood={currentPeriodData.total_penalty_amount <= 5000}
        />
      </div>
    )}
  </>
);

// Performance metrics section
export const PerformanceMetricsSection = ({ 
  isLoading, 
  performanceMetrics 
}: any) => (
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
);

// Charts section
export const ChartsSection = ({ 
  varianceTypeData, 
  collectorPerformanceData, 
  trendChartData, 
  varianceTypeChartKeys, 
  variancePercentageChartKeys, 
  penaltyChartKeys, 
  handlePieChartSegmentClick, 
  handleBarChartClick,
  currentPeriodData
}: any) => (
  <>
    {/* Charts - Responsive Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <EnhancedPieChart
          data={varianceTypeData}
          title="Variance Type Distribution"
          onSegmentClick={handlePieChartSegmentClick}
          showValue={true}
        />
        {/* Add explanatory note when there are no positive variances */}
        {currentPeriodData.positive_variances === 0 && currentPeriodData.negative_variances > 0 && (
          <div className="mt-2 text-sm text-muted-foreground italic">
            All variances are negative in the current period. This indicates consistent under-collection.
          </div>
        )}
        {currentPeriodData.positive_variances > 0 && currentPeriodData.negative_variances === 0 && (
          <div className="mt-2 text-sm text-muted-foreground italic">
            All variances are positive in the current period. This indicates consistent over-collection.
          </div>
        )}
        {currentPeriodData.positive_variances === 0 && currentPeriodData.negative_variances === 0 && (
          <div className="mt-2 text-sm text-muted-foreground italic">
            No variances recorded in the current period.
          </div>
        )}
      </div>
      
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
  </>
);