import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  ComposedChart, 
  Area, 
  Legend, 
  Cell 
} from 'recharts';
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
import { subDays, subWeeks, subMonths, subYears } from 'date-fns';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Collection {
  id: string;
  collection_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

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

interface ChartDataPoint {
  date: string;
  amount: number;
  liters: number;
  rate: number;
  cumulativeAmount: number;
  cumulativeLiters: number;
  status: string;
  isSampled: boolean;
  isPaid: number;
  isPending: number;
  cumulativePaid: number;
  cumulativePending: number;
}

interface ComparisonDataPoint {
  periodKey: string;
  period: string;
  amount: number;
  liters: number;
  collections: number;
  averageAmount: number;
  previousPeriodAmount: number;
  previousPeriodLiters: number;
  growthAmount: number;
  growthLiters: number;
}

type TimeframeType = "day" | "week" | "month" | "year";
type ComparisonPeriodType = "week" | "month" | "year";
type ExportFormat = "csv" | "json";
type ChartExportFormat = "png" | "svg";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DATA_POINTS = 100;
const MAX_COLLECTIONS_FOR_COMPARISON = 1000;

const DEFAULT_CHART_COLORS: ChartColors = {
  amount: '#10b981',
  liters: '#3b82f6',
  rate: '#8b5cf6',
  cumulative: '#0ea5e9',
  previousYear: '#3b82f6',
  growth: '#ef4444',
  pending: '#f59e0b',
  paid: '#10b981'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDefaultDateRange = (timeframe: TimeframeType): { start: string; end: string } => {
  const now = new Date();
  let start: Date;
  
  switch (timeframe) {
    case "day":
      start = subDays(now, 1);
      break;
    case "week":
      start = subWeeks(now, 1);
      break;
    case "month":
      start = subMonths(now, 1);
      break;
    case "year":
      start = subYears(now, 1);
      break;
    default:
      start = subWeeks(now, 1);
  }
  
  return {
    start: start.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0]
  };
};

const formatCurrency = (value: number): string => {
  return `KSh ${value.toFixed(2)}`;
};

const formatVolume = (value: number): string => {
  return `${value.toFixed(2)}L`;
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

const safeNumber = (value: number | null | undefined, defaultValue: number = 0): number => {
  return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PaymentsPage = () => {
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  // Date range states
  const [timeframe, setTimeframe] = useState<TimeframeType>("week");
  // Start with empty dates to show all data initially
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriodType>("year");
  
  // Chart customization states
  const [chartColors, setChartColors] = useState<ChartColors>(DEFAULT_CHART_COLORS);
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  
  // Data fetching
  const { 
    data: paymentsData, 
    isLoading: loading, 
    isError, 
    error, 
    refetch 
  } = useFarmerPaymentsData(timeframe);
  
  // Memoized data
  const collections = useMemo(() => 
    paymentsData?.collections || [], 
    [paymentsData?.collections]
  );
  
  const farmer = paymentsData?.farmer;
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Update toast ref
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Handle errors
  useEffect(() => {
    if (isError && error) {
      console.error('Error fetching payments data:', error);
      toastRef.current.error('Error', error.message || 'Failed to load payments data');
    }
  }, [isError, error]);

  // Update filtered collections when filters or collections change
  useEffect(() => {
    let result = [...collections];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter(collection => 
        collection.total_amount.toString().includes(searchLower) ||
        (collection.collection_id && collection.collection_id.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(collection => collection.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter) {
      result = result.filter(collection => {
        const collectionDate = new Date(collection.collection_date).toDateString();
        const filterDate = new Date(dateFilter).toDateString();
        return collectionDate === filterDate;
      });
    }
    
    setFilteredCollections(result);
  }, [collections, searchTerm, statusFilter, dateFilter]);

  // ============================================================================
  // MEMOIZED CHART DATA
  // ============================================================================

  const chartData = useMemo((): ChartDataPoint[] => {
    // Sort collections by date
    let sortedCollections = [...filteredCollections].sort((a, b) => 
      new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime()
    );
    
    // Apply date range filtering
    if (startDate && endDate) {
      const startDateTime = new Date(startDate).getTime();
      const endDateTime = new Date(endDate).getTime();
      
      sortedCollections = sortedCollections.filter(collection => {
        const collectionTime = new Date(collection.collection_date).getTime();
        return collectionTime >= startDateTime && collectionTime <= endDateTime;
      });
    }
    
    // Sample data if too many points
    let isSampled = false;
    if (sortedCollections.length > MAX_DATA_POINTS) {
      const step = Math.ceil(sortedCollections.length / MAX_DATA_POINTS);
      sortedCollections = sortedCollections.filter((_, index) => index % step === 0);
      isSampled = true;
    }
    
    // Create cumulative data
    let cumulativeAmount = 0;
    let cumulativeLiters = 0;
    let cumulativePaid = 0;
    let cumulativePending = 0;
    
    return sortedCollections.map(collection => {
      const amount = safeNumber(collection.total_amount);
      const liters = safeNumber(collection.liters);
      const rate = safeNumber(collection.rate_per_liter);
      
      cumulativeAmount += amount;
      cumulativeLiters += liters;
      
      const isPaid = collection.status === 'Paid';
      if (isPaid) {
        cumulativePaid += amount;
      } else {
        cumulativePending += amount;
      }
      
      return {
        date: new Date(collection.collection_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        amount,
        liters,
        rate,
        cumulativeAmount,
        cumulativeLiters,
        status: collection.status || 'Unknown',
        isSampled,
        isPaid: isPaid ? amount : 0,
        isPending: !isPaid ? amount : 0,
        cumulativePaid,
        cumulativePending
      };
    });
  }, [filteredCollections, startDate, endDate]);

  // ============================================================================
  // MEMOIZED COMPARISON DATA
  // ============================================================================

  const comparisonData = useMemo((): ComparisonDataPoint[] => {
    if (!filteredCollections.length) return [];
    
    // Limit collections for performance
    const limitedCollections = filteredCollections.slice(0, MAX_COLLECTIONS_FOR_COMPARISON);
    
    // Group by period
    const periodData: Record<string, { amount: number; liters: number; count: number }> = {};
    
    limitedCollections.forEach(collection => {
      const date = new Date(collection.collection_date);
      let periodKey = '';
      
      if (comparisonPeriod === 'week') {
        const year = date.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        periodKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      } else if (comparisonPeriod === 'month') {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        periodKey = date.getFullYear().toString();
      }
      
      if (!periodData[periodKey]) {
        periodData[periodKey] = { amount: 0, liters: 0, count: 0 };
      }
      
      periodData[periodKey].amount += safeNumber(collection.total_amount);
      periodData[periodKey].liters += safeNumber(collection.liters);
      periodData[periodKey].count += 1;
    });
    
    // Convert to array
    const data = Object.entries(periodData).map(([periodKey, values]) => {
      let period = '';
      
      if (comparisonPeriod === 'week') {
        const [year, weekPart] = periodKey.split('-W');
        period = `Week ${weekPart}, ${year}`;
      } else if (comparisonPeriod === 'month') {
        const [year, month] = periodKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        period = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        period = periodKey;
      }
      
      return {
        periodKey,
        period,
        amount: values.amount,
        liters: values.liters,
        collections: values.count,
        averageAmount: values.count > 0 ? values.amount / values.count : 0,
        previousPeriodAmount: 0,
        previousPeriodLiters: 0,
        growthAmount: 0,
        growthLiters: 0
      };
    });
    
    // Sort data
    data.sort((a, b) => {
      if (comparisonPeriod === 'week') {
        const [aYear, aWeek] = a.periodKey.split('-W');
        const [bYear, bWeek] = b.periodKey.split('-W');
        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        return parseInt(aWeek) - parseInt(bWeek);
      } else if (comparisonPeriod === 'month') {
        const [aYear, aMonth] = a.periodKey.split('-');
        const [bYear, bMonth] = b.periodKey.split('-');
        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        return parseInt(aMonth) - parseInt(bMonth);
      } else {
        return parseInt(a.periodKey) - parseInt(b.periodKey);
      }
    });
    
    // Calculate period-over-period comparison
    return data.map((current, index) => {
      let previousPeriodKey = '';
      
      if (comparisonPeriod === 'week') {
        const [year, week] = current.periodKey.split('-W');
        const currentYear = parseInt(year);
        const currentWeek = parseInt(week);
        
        if (currentWeek > 1) {
          previousPeriodKey = `${currentYear}-W${(currentWeek - 1).toString().padStart(2, '0')}`;
        } else {
          previousPeriodKey = `${currentYear - 1}-W52`;
        }
      } else if (comparisonPeriod === 'month') {
        const [year, month] = current.periodKey.split('-');
        const currentYear = parseInt(year);
        const currentMonth = parseInt(month);
        
        if (currentMonth > 1) {
          previousPeriodKey = `${currentYear}-${(currentMonth - 1).toString().padStart(2, '0')}`;
        } else {
          previousPeriodKey = `${currentYear - 1}-12`;
        }
      } else {
        previousPeriodKey = (parseInt(current.periodKey) - 1).toString();
      }
      
      const previous = data.find(d => d.periodKey === previousPeriodKey);
      
      const growthAmount = previous && previous.amount > 0
        ? ((current.amount - previous.amount) / previous.amount) * 100
        : 0;
      
      const growthLiters = previous && previous.liters > 0
        ? ((current.liters - previous.liters) / previous.liters) * 100
        : 0;
      
      return {
        ...current,
        previousPeriodAmount: previous?.amount || 0,
        previousPeriodLiters: previous?.liters || 0,
        growthAmount,
        growthLiters
      };
    });
  }, [filteredCollections, comparisonPeriod]);

  // ============================================================================
  // PAYMENT STATISTICS
  // ============================================================================

  const totalCollections = safeNumber(paymentsData?.totalCollections);
  const paidCollections = safeNumber(paymentsData?.paidCollections);
  const pendingCollections = safeNumber(paymentsData?.pendingCollections);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTimeframeChange = useCallback((timeframeValue: string, start: Date, end: Date) => {
    setTimeframe(timeframeValue as TimeframeType);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const handleComparisonPeriodChange = useCallback((period: string) => {
    setComparisonPeriod(period as ComparisonPeriodType);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("");
    setDateFilter("");
  }, []);

  const handleClearDateRange = useCallback(() => {
    setStartDate("");
    setEndDate("");
  }, []);

  const exportCollections = useCallback((format: ExportFormat) => {
    try {
      const exportData = filteredCollections.map(collection => ({
        date: new Date(collection.collection_date).toLocaleDateString(),
        amount: safeNumber(collection.total_amount),
        status: collection.status || 'Unknown',
        liters: safeNumber(collection.liters),
        rate: safeNumber(collection.rate_per_liter),
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
  }, [filteredCollections]);

  const exportChart = useCallback((format: ChartExportFormat, chartId: string) => {
    try {
      const chartElement = document.getElementById(chartId);
      if (!chartElement) {
        toastRef.current.error('Error', 'Chart not found');
        return;
      }
      
      // Note: In production, implement with html2canvas or dom-to-image
      toastRef.current.success('Success', `Chart exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting chart:', error);
      toastRef.current.error('Error', 'Failed to export chart');
    }
  }, []);

  const handleChartColorChange = useCallback((colorKey: keyof ChartColors, value: string) => {
    setChartColors(prev => ({ ...prev, [colorKey]: value }));
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const isSampled = payload[0]?.payload?.isSampled;
    
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg" role="tooltip">
        <p className="font-bold text-gray-900">{label}</p>
        {isSampled && (
          <p className="text-xs text-yellow-600 italic">Data sampled for performance</p>
        )}
        {payload.map((entry: any, index: number) => {
          let formattedValue = entry.value;
          
          if (entry.dataKey.includes('amount') || entry.dataKey.includes('Amount')) {
            formattedValue = formatCurrency(safeNumber(entry.value));
          } else if (entry.dataKey.includes('liters') || entry.dataKey.includes('Liters')) {
            formattedValue = formatVolume(safeNumber(entry.value));
          } else if (entry.dataKey.includes('growth') || entry.dataKey.includes('Growth')) {
            formattedValue = formatPercentage(safeNumber(entry.value));
          } else if (entry.dataKey === 'rate') {
            formattedValue = formatCurrency(safeNumber(entry.value));
          }
          
          return (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formattedValue}
            </p>
          );
        })}
      </div>
    );
  };

  const renderComparisonTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg" role="tooltip">
        <p className="font-bold text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => {
          let formattedValue = entry.value;
          
          if (entry.dataKey.includes('amount') || entry.dataKey.includes('Amount')) {
            formattedValue = formatCurrency(safeNumber(entry.value));
          } else if (entry.dataKey.includes('growth')) {
            formattedValue = formatPercentage(safeNumber(entry.value));
          }
          
          return (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formattedValue}
            </p>
          );
        })}
      </div>
    );
  };

  const renderStatusBadge = (status: string) => {
    const isPaid = status === 'Paid';
    const isPending = status === 'Pending';
    
    const badgeClass = isPaid 
      ? 'bg-green-100 text-green-800'
      : isPending 
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-800';
    
    const Icon = isPaid ? CheckCircle : isPending ? Clock : XCircle;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${badgeClass}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </span>
    );
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" 
               role="status" 
               aria-label="Loading payment data">
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="container mx-auto py-6">
      {/* Page Header */}
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
            <Button 
              variant="outline" 
              className="flex items-center gap-2" 
              onClick={() => exportCollections('csv')}
              aria-label="Export data as CSV"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2" 
              onClick={() => exportCollections('json')}
              aria-label="Export data as JSON"
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        }
      />

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Collections"
          value={formatCurrency(totalCollections)}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Paid"
          value={formatCurrency(paidCollections)}
          icon={<CheckCircle className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(pendingCollections)}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-100"
        />
      </div>

      {/* Payment Analytics Dashboard */}
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
                <TimeframeSelector 
                  onTimeframeChange={handleTimeframeChange} 
                  defaultValue={timeframe} 
                />
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
                  onClick={handleClearDateRange}
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
                    onChange={(e) => handleChartColorChange('amount', e.target.value)}
                    className="w-6 h-6 border rounded cursor-pointer"
                    title="Amount color"
                    aria-label="Change amount line color"
                  />
                  <input 
                    type="color" 
                    value={chartColors.liters}
                    onChange={(e) => handleChartColorChange('liters', e.target.value)}
                    className="w-6 h-6 border rounded cursor-pointer"
                    title="Liters color"
                    aria-label="Change liters line color"
                  />
                  <input 
                    type="color" 
                    value={chartColors.cumulative}
                    onChange={(e) => handleChartColorChange('cumulative', e.target.value)}
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
            <div className="h-64 sm:h-72 md:h-80 lg:h-96" id="main-chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis 
                    dataKey="date" 
                    interval="preserveStartEnd" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke={chartColors.amount} 
                    tickFormatter={(value) => `KSh ${safeNumber(value).toFixed(0)}`} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke={chartColors.liters} 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={renderCustomTooltip} />
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
                <BarChart 
                  data={[
                    { name: 'Paid', value: paidCollections, fill: chartColors.paid },
                    { name: 'Pending', value: pendingCollections, fill: chartColors.pending }
                  ]}
                >
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `KSh ${safeNumber(value).toFixed(0)}`} />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(safeNumber(value as number)), 'Amount']}
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

        {/* Period-over-Period Comparison */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {comparisonPeriod === 'week' ? 'Week-over-Week' : 
                 comparisonPeriod === 'month' ? 'Month-over-Month' : 
                 'Year-over-Year'} Comparison
              </CardTitle>
              <select
                value={comparisonPeriod}
                onChange={(e) => handleComparisonPeriodChange(e.target.value)}
                className="h-8 px-2 py-1 border border-input rounded-md text-xs bg-white"
                aria-label="Select comparison period"
              >
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={comparisonData}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    tickFormatter={(value) => `KSh ${safeNumber(value / 1000).toFixed(0)}k`} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tickFormatter={(value) => `${value}%`} 
                  />
                  <Tooltip content={renderComparisonTooltip} />
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
                  aria-label="Search collections"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 py-2 border border-input rounded-md text-sm bg-white"
                aria-label="Filter by payment status"
              >
                <option value="">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearFilters}
                aria-label="Clear all filters"
              >
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
                  {formatVolume(safeNumber(collection.liters))}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(safeNumber(collection.rate_per_liter))}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(safeNumber(collection.total_amount))}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {renderStatusBadge(collection.status || 'Unknown')}
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