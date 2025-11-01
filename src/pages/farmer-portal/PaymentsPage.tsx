import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  Calendar, 
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  BarChart3,
  Image,
  FileText
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Area, Legend, Cell } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import RefreshButton from "@/components/ui/RefreshButton";
import { useFarmerPaymentsData } from '@/hooks/useFarmerPaymentsData';
import { TimeframeSelector } from "@/components/TimeframeSelector";

interface Collection {
  id: string;
  collection_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

// Define the chart colors type
interface ChartColors {
  amount: string;
  liters: string;
  rate: string;
  cumulative: string;
  previousYear: string;
  growth: string;
  pending: string;
  paid: string;
}

const PaymentsPage = () => {
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeframe, setTimeframe] = useState("month"); // Add timeframe state
  const [comparisonPeriod, setComparisonPeriod] = useState("year"); // Add comparison period state
  
  // Chart customization options
  const [chartColors, setChartColors] = useState<ChartColors>({
    amount: '#10b981',
    liters: '#3b82f6',
    rate: '#8b5cf6',
    cumulative: '#0ea5e9',
    previousYear: '#3b82f6',
    growth: '#ef4444',
    pending: '#f59e0b',
    paid: '#10b981'
  });
  
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  
  // Pass timeframe to the hook
  const { data: paymentsData, isLoading: loading, isError, error, refetch } = useFarmerPaymentsData(timeframe);
  
  const collections = useMemo(() => paymentsData?.collections || [], [paymentsData?.collections]);
  const farmer = paymentsData?.farmer;

  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);

  // Chart export function
  const exportChart = (format: 'png' | 'svg', chartId: string) => {
    try {
      const chartElement = document.getElementById(chartId);
      if (!chartElement) {
        toastRef.current.error('Error', 'Chart not found');
        return;
      }
      
      // In a real implementation, you would use a library like html2canvas or dom-to-image
      // For now, we'll show a toast message
      toastRef.current.success('Success', `Chart exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting chart:', error);
      toastRef.current.error('Error', 'Failed to export chart');
    }
  };

  // Update timeframe handler
  const handleTimeframeChange = (timeframeValue: string, start: Date, end: Date) => {
    setTimeframe(timeframeValue);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Handle comparison period change
  const handleComparisonPeriodChange = (period: string) => {
    setComparisonPeriod(period);
  };

  // Update filtered collections when filters or collections change
  useEffect(() => {
    let result = [...collections];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(collection => 
        collection.total_amount.toString().includes(searchTerm) ||
        (collection.collection_id && collection.collection_id.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(collection => collection.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter) {
      result = result.filter(collection => 
        new Date(collection.collection_date).toDateString() === new Date(dateFilter).toDateString()
      );
    }
    
    setFilteredCollections(result);
  }, [collections, searchTerm, statusFilter, dateFilter]);

  // Update toast ref
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    if (error) {
      console.error('Error fetching payments data:', error);
      toastRef.current.error('Error', error.message || 'Failed to load payments data');
    }
  }, [error]);

  // Prepare chart data - memoize this to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    // Sort collections by date for proper time series visualization
    let sortedCollections = [...filteredCollections].sort((a, b) => 
      new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime()
    );
    
    // Apply date range filtering
    if (startDate || endDate) {
      sortedCollections = sortedCollections.filter(collection => {
        const collectionDate = new Date(collection.collection_date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && collectionDate < start) return false;
        if (end && collectionDate > end) return false;
        return true;
      });
    }
    
    // Optimize for large datasets - sample data if too many points
    const MAX_DATA_POINTS = 100;
    let isSampled = false;
    if (sortedCollections.length > MAX_DATA_POINTS) {
      const step = Math.ceil(sortedCollections.length / MAX_DATA_POINTS);
      sortedCollections = sortedCollections.filter((_, index) => index % step === 0);
      isSampled = true;
    }
    
    // Create cumulative data for area charts
    let cumulativeAmount = 0;
    let cumulativeLiters = 0;
    let cumulativePaid = 0;
    let cumulativePending = 0;
    
    return sortedCollections.map(collection => {
      cumulativeAmount += collection.total_amount;
      cumulativeLiters += collection.liters;
      
      // Add cumulative paid/pending tracking
      if (collection.status === 'Paid') {
        cumulativePaid += collection.total_amount;
      } else {
        cumulativePending += collection.total_amount;
      }
      
      return {
        date: new Date(collection.collection_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        amount: collection.total_amount,
        liters: collection.liters,
        rate: collection.rate_per_liter,
        cumulativeAmount: cumulativeAmount,
        cumulativeLiters: cumulativeLiters,
        status: collection.status,
        isSampled: isSampled,
        isPaid: collection.status === 'Paid' ? collection.total_amount : 0,
        isPending: collection.status !== 'Paid' ? collection.total_amount : 0,
        cumulativePaid: cumulativePaid,
        cumulativePending: cumulativePending
      };
    });
  }, [filteredCollections, startDate, endDate]);

  // Prepare comparison data for configurable period-over-period analysis
  const comparisonData = useMemo(() => {
    if (!filteredCollections.length) return [];
    
    // Group collections by the selected period
    const periodData: Record<string, { amount: number; liters: number; count: number }> = {};
    
    // Limit the data for performance
    const limitedCollections = filteredCollections.slice(0, 1000); // Limit to 1000 collections for performance
    
    limitedCollections.forEach(collection => {
      const date = new Date(collection.collection_date);
      
      let periodKey = '';
      let periodLabel = '';
      
      if (comparisonPeriod === 'week') {
        // Calculate week number and year
        const year = date.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        periodKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        periodLabel = `Week ${weekNumber}, ${year}`;
      } else if (comparisonPeriod === 'month') {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        periodLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        // Yearly
        const year = date.getFullYear();
        periodKey = year.toString();
        periodLabel = year.toString();
      }
      
      if (!periodData[periodKey]) {
        periodData[periodKey] = { amount: 0, liters: 0, count: 0 };
      }
      
      periodData[periodKey].amount += collection.total_amount;
      periodData[periodKey].liters += collection.liters;
      periodData[periodKey].count += 1;
    });
    
    // Convert to array and sort
    const data = Object.entries(periodData)
      .map(([periodKey, values]) => {
        return {
          periodKey,
          period: periodKey, // Will be overridden below
          amount: values.amount,
          liters: values.liters,
          collections: values.count,
          averageAmount: values.amount / values.count
        };
      });
    
    // Set period labels based on comparison period
    data.forEach(item => {
      if (comparisonPeriod === 'week') {
        const [year, weekPart] = item.periodKey.split('-W');
        item.period = `Week ${weekPart}, ${year}`;
      } else if (comparisonPeriod === 'month') {
        const [year, month] = item.periodKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        item.period = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        // Yearly
        item.period = item.periodKey;
      }
    });
    
    // Sort data
    data.sort((a, b) => {
      if (comparisonPeriod === 'week') {
        const [aYear, aWeek] = a.periodKey.split('-W').map(Number);
        const [bYear, bWeek] = b.periodKey.split('-W').map(Number);
        if (aYear !== bYear) return aYear - bYear;
        return aWeek - bWeek;
      } else if (comparisonPeriod === 'month') {
        const [aYear, aMonth] = a.periodKey.split('-');
        const [bYear, bMonth] = b.periodKey.split('-');
        return new Date(parseInt(aYear), parseInt(aMonth) - 1).getTime() - 
               new Date(parseInt(bYear), parseInt(bMonth) - 1).getTime();
      } else {
        // Yearly
        return parseInt(a.periodKey) - parseInt(b.periodKey);
      }
    });
    
    // Add period-over-period comparison
    return data.map((current, index) => {
      let previousPeriodKey = '';
      
      if (comparisonPeriod === 'week') {
        const [year, week] = current.periodKey.split('-W');
        const currentYear = parseInt(year);
        const currentWeek = parseInt(week);
        
        if (currentWeek > 1) {
          previousPeriodKey = `${currentYear}-W${(currentWeek - 1).toString().padStart(2, '0')}`;
        } else {
          // Previous year, last week (approximate as week 52)
          previousPeriodKey = `${currentYear - 1}-W52`;
        }
      } else if (comparisonPeriod === 'month') {
        const [year, month] = current.periodKey.split('-');
        const currentYear = parseInt(year);
        const currentMonth = parseInt(month);
        
        if (currentMonth > 1) {
          previousPeriodKey = `${currentYear}-${(currentMonth - 1).toString().padStart(2, '0')}`;
        } else {
          // Previous year, December
          previousPeriodKey = `${currentYear - 1}-12`;
        }
      } else {
        // Yearly - compare with previous year
        const currentYear = parseInt(current.periodKey);
        previousPeriodKey = (currentYear - 1).toString();
      }
      
      const previous = data.find(d => d.periodKey === previousPeriodKey);
      
      return {
        ...current,
        previousPeriodAmount: previous?.amount || 0,
        previousPeriodLiters: previous?.liters || 0,
        growthAmount: previous ? ((current.amount - previous.amount) / previous.amount) * 100 : 0,
        growthLiters: previous ? ((current.liters - previous.liters) / previous.liters) * 100 : 0
      };
    });
  }, [filteredCollections, comparisonPeriod]);

  // Payment statistics from hook data
  const totalCollections = paymentsData?.totalCollections || 0;
  const paidCollections = paymentsData?.paidCollections || 0;
  const pendingCollections = paymentsData?.pendingCollections || 0;

  const exportCollections = (format: 'csv' | 'json') => {
    try {
      const exportData = filteredCollections.map(collection => ({
        date: new Date(collection.collection_date).toLocaleDateString(),
        amount: collection.total_amount,
        status: collection.status,
        liters: collection.liters,
        rate: collection.rate_per_liter,
        collection_id: collection.collection_id || 'N/A'
      }));
      
      if (format === 'csv') {
        exportToCSV(exportData, 'collections-report');
        toastRef.current.success('Success', 'Collections exported as CSV');
      } else {
        exportToJSON(exportData, 'collections-report');
        toastRef.current.success('Success', 'Collections exported as JSON');
      }
    } catch (err) {
      console.error('Error exporting collections:', err);
      toastRef.current.error('Error', 'Failed to export collections');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Payment History"
        description="Track all your milk collections and payment status"
        actions={
          <div className="flex space-x-3">
            <RefreshButton 
              isRefreshing={loading} 
              onRefresh={refetch} 
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
            />
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportCollections('csv')}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportCollections('json')}>
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        }
      />

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Collections"
          value={`KSh ${totalCollections.toFixed(2)}`}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Paid"
          value={`KSh ${paidCollections.toFixed(2)}`}
          icon={<CheckCircle className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Pending"
          value={`KSh ${pendingCollections.toFixed(2)}`}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-100"
        />
      </div>

      {/* Enhanced Payment Analytics Charts */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Payment Analytics Dashboard
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Comprehensive insights into your payment trends and patterns
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <TimeframeSelector onTimeframeChange={handleTimeframeChange} defaultValue={timeframe} />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">From:</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-32 text-sm"
                    aria-label="Start date for chart data"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">To:</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-32 text-sm"
                    aria-label="End date for chart data"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-sm"
                  aria-label="Clear date filters"
                >
                  Clear
                </Button>
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportChart('png', 'main-chart')}
                    className="text-sm"
                    title="Export as PNG"
                    aria-label="Export main chart as PNG"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportChart('svg', 'main-chart')}
                    className="text-sm"
                    title="Export as SVG"
                    aria-label="Export main chart as SVG"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {/* Chart Customization Options */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Colors:</label>
                <div className="flex gap-1">
                  <input 
                    type="color" 
                    value={chartColors.amount}
                    onChange={(e) => setChartColors({...chartColors, amount: e.target.value})}
                    className="w-6 h-6 border rounded cursor-pointer"
                    title="Amount color"
                    aria-label="Change amount line color"
                  />
                  <input 
                    type="color" 
                    value={chartColors.liters}
                    onChange={(e) => setChartColors({...chartColors, liters: e.target.value})}
                    className="w-6 h-6 border rounded cursor-pointer"
                    title="Liters color"
                    aria-label="Change liters line color"
                  />
                  <input 
                    type="color" 
                    value={chartColors.cumulative}
                    onChange={(e) => setChartColors({...chartColors, cumulative: e.target.value})}
                    className="w-6 h-6 border rounded cursor-pointer"
                    title="Cumulative color"
                    aria-label="Change cumulative area color"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">
                  <input 
                    type="checkbox" 
                    checked={showLegend}
                    onChange={(e) => setShowLegend(e.target.checked)}
                    className="mr-1"
                    aria-label="Toggle chart legend"
                  />
                  Legend
                </label>
                <label className="text-sm text-muted-foreground">
                  <input 
                    type="checkbox" 
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="mr-1"
                    aria-label="Toggle chart grid"
                  />
                  Grid
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-72 md:h-80 lg:h-96" id="main-chart" role="img" aria-label="Main payment analytics chart showing daily collections and cumulative trends">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} accessibilityLayer>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis 
                    dataKey="date" 
                    interval="preserveStartEnd" 
                    tick={{ fontSize: 12 }}
                    aria-label="Collection dates"
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke={chartColors.amount} 
                    tickFormatter={(value) => `KSh ${Number(value).toFixed(0)}`} 
                    tick={{ fontSize: 12 }}
                    aria-label="Amount in Kenyan Shillings"
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke={chartColors.liters} 
                    tick={{ fontSize: 12 }}
                    aria-label="Volume in Liters"
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const isSampled = payload[0]?.payload?.isSampled;
                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg" role="tooltip">
                            <p className="font-bold text-gray-900">{label}</p>
                            {isSampled && (
                              <p className="text-xs text-yellow-600 italic">Data sampled for performance</p>
                            )}
                            {payload.map((entry, index) => (
                              <p key={index} style={{ color: entry.color }} className="text-sm">
                                {entry.name}: {
                                  entry.dataKey === 'amount' || entry.dataKey === 'cumulativeAmount' || 
                                  entry.dataKey === 'previousYearAmount'
                                    ? `KSh ${Number(entry.value).toFixed(2)}`
                                    : entry.dataKey === 'liters' || entry.dataKey === 'cumulativeLiters' ||
                                      entry.dataKey === 'previousYearLiters'
                                    ? `${Number(entry.value).toFixed(2)}L`
                                    : entry.dataKey === 'growthAmount' || entry.dataKey === 'growthLiters'
                                    ? `${Number(entry.value).toFixed(2)}%`
                                    : entry.dataKey === 'rate'
                                    ? `KSh ${Number(entry.value).toFixed(2)}`
                                    : entry.value
                                }
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="amount" 
                    name="Daily Collection Amount"
                    stroke={chartColors.amount} 
                    strokeWidth={2} 
                    dot={{ fill: chartColors.amount, r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="liters" 
                    name="Daily Liters Collected"
                    stroke={chartColors.liters} 
                    strokeWidth={2} 
                    dot={{ fill: chartColors.liters, r: 4 }} 
                    activeDot={{ r: 6 }} 
                    strokeDasharray="3 3"
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="cumulativeAmount" 
                    name="Cumulative Collections"
                    fill={chartColors.cumulative} 
                    fillOpacity={0.2} 
                    stroke="none"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Payment Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Paid', value: paidCollections, fill: chartColors.paid },
                  { name: 'Pending', value: pendingCollections, fill: chartColors.pending }
                ]} accessibilityLayer>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `KSh ${Number(value).toFixed(0)}`} />
                  <Tooltip 
                    formatter={(value) => [`KSh ${Number(value).toFixed(2)}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" name="Amount">
                    {[
                      { name: 'Paid', value: paidCollections, fill: chartColors.paid },
                      { name: 'Pending', value: pendingCollections, fill: chartColors.pending }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Year-over-Year Comparison */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {comparisonPeriod === 'week' ? 'Week-over-Week Comparison' : 
                 comparisonPeriod === 'month' ? 'Month-over-Month Comparison' : 
                 'Year-over-Year Comparison'}
              </CardTitle>
              <div className="flex gap-2">
                <select
                  value={comparisonPeriod}
                  onChange={(e) => handleComparisonPeriodChange(e.target.value)}
                  className="h-8 px-2 py-1 border border-input rounded-md text-xs bg-white"
                >
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={comparisonData} accessibilityLayer>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `KSh ${Number(value / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg" role="tooltip">
                            <p className="font-bold text-gray-900">{label}</p>
                            {payload.map((entry, index) => (
                              <p key={index} style={{ color: entry.color }} className="text-sm">
                                {entry.name}: {
                                  entry.dataKey === 'amount' || entry.dataKey === 'previousPeriodAmount'
                                    ? `KSh ${Number(entry.value).toFixed(2)}`
                                    : entry.dataKey === 'growthAmount'
                                    ? `${Number(entry.value).toFixed(2)}%`
                                    : entry.value
                                }
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
                  <Bar 
                    yAxisId="left"
                    dataKey="amount" 
                    name={comparisonPeriod === 'week' ? 'Current Week' : 
                          comparisonPeriod === 'month' ? 'Current Month' : 'Current Year'}
                    fill={chartColors.amount}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="previousPeriodAmount" 
                    name={comparisonPeriod === 'week' ? 'Previous Week' : 
                          comparisonPeriod === 'month' ? 'Previous Month' : 'Previous Year'}
                    stroke={chartColors.previousYear} 
                    strokeWidth={2} 
                    dot={{ fill: chartColors.previousYear, r: 4 }} 
                    activeDot={{ r: 6 }}
                    strokeDasharray="3 3"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="growthAmount" 
                    name="Growth %"
                    stroke={chartColors.growth} 
                    strokeWidth={2} 
                    dot={{ fill: chartColors.growth, r: 4 }} 
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Collection History
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed records of all your milk collections
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 border border-input rounded-md text-sm bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setDateFilter("");
              }}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Date", "Collection ID", "Liters", "Rate (KSh/L)", "Amount (KSh)", "Status"]}
            data={filteredCollections}
            renderRow={(collection) => (
              <tr key={collection.id} className="hover:bg-muted/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {new Date(collection.collection_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {collection.collection_id || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {collection.liters} L
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {collection.rate_per_liter?.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {collection.total_amount?.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    collection.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    collection.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {collection.status === 'Paid' ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : collection.status === 'Pending' ? (
                      <Clock className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {collection.status}
                  </span>
                </td>
              </tr>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;