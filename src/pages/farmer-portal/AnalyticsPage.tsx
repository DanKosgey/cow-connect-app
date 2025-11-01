import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter, 
  Target,
  Award,
  Clock,
  Milk,
  Users,
  Wallet,
  BarChart3,
  LineChart,
  PieChart,
  Star,
  Zap,
  ChevronDown,
  ChevronUp,
  Droplets,
  Thermometer,
  Beaker,
  AlertTriangle,
  TrendingDown
} from "lucide-react";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  ScatterChart,
  Scatter
} from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear, differenceInDays } from 'date-fns';
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import { StatCard } from "@/components/StatCard";

// Types
interface CollectionData {
  id: string;
  date: string;
  collection_date: string;
  liters: number;
  total_amount: number;
  rate_per_liter: number;
}

interface AnalyticsData {
  totalCollections: number;
  totalLiters: number;
  totalEarnings: number;
  avgDailyProduction: number;
  avgQualityScore: number;
  bestCollectionDay: string;
  collectionsGrowth: number;
  earningsGrowth: number;
  qualityGrowth: number;
  // New predictive insights
  predictedNextCollection: number;
  predictedNextEarnings: number;
  productionTrend: 'increasing' | 'decreasing' | 'stable';
  qualityTrend: 'improving' | 'declining' | 'stable';
}

interface TimeSeriesData {
  date: string;
  liters: number;
  earnings: number;
  collections: number;
  qualityScore: number;
  // Moving averages for trend analysis
  litersMA7: number;
  earningsMA7: number;
}

const AnalyticsPage = () => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<any>(null);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [dateRange, setDateRange] = useState('month');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    trends: true,
    earnings: true
  });
  // Real-time subscription references
  const collectionsSubscriptionRef = useRef<any>(null);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate moving averages for trend analysis
  const calculateMovingAverages = (data: TimeSeriesData[], windowSize: number = 7): TimeSeriesData[] => {
    return data.map((item, index) => {
      if (index < windowSize - 1) {
        return { ...item, litersMA7: item.liters, earningsMA7: item.earnings };
      }
      
      const slice = data.slice(index - windowSize + 1, index + 1);
      const litersSum = slice.reduce((sum, d) => sum + d.liters, 0);
      const earningsSum = slice.reduce((sum, d) => sum + d.earnings, 0);
      
      return {
        ...item,
        litersMA7: litersSum / windowSize,
        earningsMA7: earningsSum / windowSize
      };
    });
  };

  // Calculate standard deviation for quality metrics
  const calculateStandardDeviation = (values: number[]): number => {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, value) => sum + value, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  };

  // Predict next values using linear regression
  const predictNextValue = (data: number[]): number => {
    if (data.length < 2) return data[data.length - 1] || 0;
    
    // Simple linear regression
    const n = data.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = data;
    
    // Calculate means
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
    
    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;
    
    // Predict next value
    return slope * n + intercept;
  };

  // Fetch farmer data and analytics
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch farmer profile
        const { data: farmerData, error: farmerError } = await supabase
          .from('farmers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (farmerError) throw farmerError;
        if (!farmerData) {
          toast.error('Error', 'Farmer profile not found. Please complete your registration.');
          return;
        }
        setFarmer(farmerData);

        // Calculate date range
        const now = new Date();
        let startDate: Date;
        
        switch (dateRange) {
          case 'week':
            startDate = subDays(now, 7);
            break;
          case 'month':
            startDate = subDays(now, 30);
            break;
          case 'quarter':
            startDate = subDays(now, 90);
            break;
          case 'year':
            startDate = subDays(now, 365);
            break;
          default:
            startDate = subDays(now, 30);
        }

        // Fetch collections data for the farmer
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .eq('farmer_id', farmerData.id)
          .gte('collection_date', startDate.toISOString())
          .order('collection_date', { ascending: true });

        if (collectionsError) throw collectionsError;
        setCollections(collectionsData || []);

        // Process analytics data
        processAnalyticsData(collectionsData || []);

      } catch (err) {
        console.error('Error fetching analytics data:', err);
        toast.error('Error', 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [dateRange]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!farmer?.id) return;

    // Subscribe to real-time collection updates
    collectionsSubscriptionRef.current = supabase
      .channel('collections-analytics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collections',
          filter: `farmer_id=eq.${farmer.id}`
        },
        (payload) => {
          // Add new collection to state
          setCollections(prev => [...prev, payload.new as CollectionData]);
          // Re-process analytics
          processAnalyticsData([...collections, payload.new as CollectionData]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collections',
          filter: `farmer_id=eq.${farmer.id}`
        },
        (payload) => {
          // Update existing collection in state
          setCollections(prev => 
            prev.map(collection => 
              collection.id === payload.new.id ? payload.new as CollectionData : collection
            )
          );
          // Re-process analytics
          const updatedCollections = collections.map(collection => 
            collection.id === payload.new.id ? payload.new as CollectionData : collection
          );
          processAnalyticsData(updatedCollections);
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      if (collectionsSubscriptionRef.current) {
        supabase.removeChannel(collectionsSubscriptionRef.current);
      }
    };
  }, [farmer?.id, collections]);

  // Process analytics data with enhanced insights
  const processAnalyticsData = (collectionsData: CollectionData[]) => {
    // Basic metrics
    const totalCollections = collectionsData.length;
    const totalLiters = collectionsData.reduce((sum, collection) => sum + (collection.liters || 0), 0);
    const totalEarnings = collectionsData.reduce((sum, collection) => sum + (collection.total_amount || 0), 0);
    const avgDailyProduction = totalCollections > 0 ? totalLiters / totalCollections : 0;

    // Best collection day
    const bestCollection = collectionsData.reduce((best, current) => 
      (current.liters || 0) > (best.liters || 0) ? current : best, 
      { liters: 0 } as CollectionData
    );
    const bestCollectionDay = bestCollection.collection_date ? format(new Date(bestCollection.collection_date), 'MMM dd, yyyy') : 'N/A';

    // Growth calculations with trend analysis
    const midpoint = Math.floor(collectionsData.length / 2);
    const firstHalf = collectionsData.slice(0, midpoint);
    const secondHalf = collectionsData.slice(midpoint);
    
    const firstHalfEarnings = firstHalf.reduce((sum, collection) => sum + (collection.total_amount || 0), 0);
    const secondHalfEarnings = secondHalf.reduce((sum, collection) => sum + (collection.total_amount || 0), 0);
    const earningsGrowth = firstHalfEarnings > 0 ? ((secondHalfEarnings - firstHalfEarnings) / firstHalfEarnings) * 100 : 0;
    
    const firstHalfCollections = firstHalf.length;
    const secondHalfCollections = secondHalf.length;
    const collectionsGrowth = firstHalfCollections > 0 ? ((secondHalfCollections - firstHalfCollections) / firstHalfCollections) * 100 : 0;

    // Predictive insights
    const dailyLiters = collectionsData.map(c => c.liters || 0);
    const dailyEarnings = collectionsData.map(c => c.total_amount || 0);
    const predictedNextCollection = predictNextValue(dailyLiters);
    const predictedNextEarnings = predictNextValue(dailyEarnings);

    // Production trend analysis
    let productionTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (collectionsGrowth > 5) productionTrend = 'increasing';
    else if (collectionsGrowth < -5) productionTrend = 'decreasing';

    setAnalytics({
      totalCollections,
      totalLiters,
      totalEarnings,
      avgDailyProduction,
      avgQualityScore: 0,
      bestCollectionDay,
      collectionsGrowth,
      earningsGrowth,
      qualityGrowth: 0,
      predictedNextCollection,
      predictedNextEarnings,
      productionTrend,
      qualityTrend: 'stable'
    });

    // Time series data with moving averages
    const timeSeries: TimeSeriesData[] = [];
    const dateMap = new Map<string, { liters: number; earnings: number; collections: number; qualityScores: number[] }>();
    
    // Group collections by date
    collectionsData.forEach(collection => {
      const dateKey = format(new Date(collection.collection_date), 'yyyy-MM-dd');
      const existing = dateMap.get(dateKey) || { liters: 0, earnings: 0, collections: 0, qualityScores: [] };
      dateMap.set(dateKey, {
        liters: existing.liters + (collection.liters || 0),
        earnings: existing.earnings + (collection.total_amount || 0),
        collections: existing.collections + 1,
        qualityScores: existing.qualityScores
      });
    });
    
    // Convert to time series format
    Array.from(dateMap.entries()).forEach(([date, data]) => {
      const avgQualityScore = data.qualityScores.length > 0 
        ? data.qualityScores.reduce((sum, score) => sum + score, 0) / data.qualityScores.length 
        : 0;
      
      timeSeries.push({
        date,
        liters: data.liters,
        earnings: data.earnings,
        collections: data.collections,
        qualityScore: avgQualityScore,
        litersMA7: 0, // Will be calculated with moving averages
        earningsMA7: 0 // Will be calculated with moving averages
      });
    });
    
    // Sort by date
    timeSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate moving averages
    const timeSeriesWithMA = calculateMovingAverages(timeSeries);
    setTimeSeriesData(timeSeriesWithMA);
  };

  // Export analytics data
  const exportAnalytics = (format: 'csv' | 'json') => {
    try {
      const exportData = {
        summary: analytics,
        timeSeries: timeSeriesData
      };
      
      if (format === 'csv') {
        exportToCSV([exportData.summary], 'analytics-summary');
        exportToCSV(exportData.timeSeries, 'analytics-trends');
        toast.success('Success', 'Analytics data exported as CSV');
      } else {
        exportToJSON([exportData], 'farmer-analytics');
        toast.success('Success', 'Analytics data exported as JSON');
      }
    } catch (err) {
      console.error('Error exporting analytics data:', err);
      toast.error('Error', 'Failed to export analytics data');
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: number, size: number = 16) => {
    if (trend > 0) return <TrendingUp className={`h-${size} w-${size} text-green-500`} />;
    if (trend < 0) return <TrendingUp className={`h-${size} w-${size} text-red-500 rotate-180`} />;
    return <div className={`h-${size} w-${size}`}></div>;
  };

  // Get trend color
  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
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
        title="Analytics Dashboard"
        description="Comprehensive insights into your dairy operations and performance"
        actions={
          <div className="flex space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="h-10 px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportAnalytics('csv')}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportAnalytics('json')}>
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        }
      />

      {/* Key Metrics with Predictive Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Collections"
          value={analytics?.totalCollections || 0}
          description={`${analytics?.collectionsGrowth > 0 ? '+' : ''}${analytics?.collectionsGrowth?.toFixed(1)}% from last period`}
          icon={<Milk className="h-6 w-6 text-blue-500" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Total Liters"
          value={`${formatNumber(analytics?.totalLiters || 0)} L`}
          description="Total milk collected"
          icon={<Droplets className="h-6 w-6 text-green-500" />}
          color="bg-green-100"
        />
        <StatCard
          title="Total Earnings"
          value={formatCurrency(analytics?.totalEarnings || 0)}
          description={`${analytics?.earningsGrowth > 0 ? '+' : ''}${analytics?.earningsGrowth?.toFixed(1)}% from last period`}
          icon={<Wallet className="h-6 w-6 text-yellow-500" />}
          color="bg-yellow-100"
        />
      </div>

      {/* Predictive Insights */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Predictive Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Predicted Next Collection"
              value={`${analytics?.predictedNextCollection?.toFixed(1) || "0.0"} L`}
              description={
                analytics?.productionTrend === 'increasing' ? "Production increasing" : 
                analytics?.productionTrend === 'decreasing' ? "Production decreasing" : "Production stable"
              }
              icon={
                analytics?.productionTrend === 'increasing' ? <TrendingUp className="h-6 w-6 text-green-500" /> : 
                analytics?.productionTrend === 'decreasing' ? <TrendingDown className="h-6 w-6 text-red-500" /> : 
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              }
              color={
                analytics?.productionTrend === 'increasing' ? "bg-green-100" : 
                analytics?.productionTrend === 'decreasing' ? "bg-red-100" : "bg-yellow-100"
              }
            />
            <StatCard
              title="Predicted Next Earnings"
              value={formatCurrency(analytics?.predictedNextEarnings || 0)}
              description="Based on trend analysis"
              icon={<Wallet className="h-6 w-6 text-blue-500" />}
              color="bg-blue-100"
            />
            <StatCard
              title="Production Trend"
              value={
                analytics?.productionTrend === 'increasing' ? "Increasing" : 
                analytics?.productionTrend === 'decreasing' ? "Decreasing" : "Stable"
              }
              description={
                analytics?.productionTrend === 'increasing' ? "Positive growth trend" : 
                analytics?.productionTrend === 'decreasing' ? "Declining trend" : "Consistent production"
              }
              icon={
                analytics?.productionTrend === 'increasing' ? <TrendingUp className="h-6 w-6 text-green-500" /> : 
                analytics?.productionTrend === 'decreasing' ? <TrendingDown className="h-6 w-6 text-red-500" /> : 
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              }
              color={
                analytics?.productionTrend === 'increasing' ? "bg-green-100" : 
                analytics?.productionTrend === 'decreasing' ? "bg-red-100" : "bg-yellow-100"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Section with Dual-Axis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Collection & Earnings Trend - Dual Axis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Collection & Earnings Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis 
                    yAxisId="left" 
                    stroke="#10b981" 
                    tickFormatter={(value) => `${value}L`}
                    label={{ 
                      value: 'Liters', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: '#10b981' }
                    }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#f59e0b" 
                    tickFormatter={(value) => `KSh${value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}`}
                    label={{ 
                      value: 'Earnings', 
                      angle: 90, 
                      position: 'insideRight',
                      style: { textAnchor: 'middle', fill: '#f59e0b' }
                    }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'liters') return [`${value} L`, 'Liters'];
                      if (name === 'earnings') return [`KSh ${Number(value).toLocaleString()}`, 'Earnings'];
                      if (name === 'litersMA7') return [`${value} L`, '7-Day Avg Liters'];
                      if (name === 'earningsMA7') return [`KSh ${Number(value).toLocaleString()}`, '7-Day Avg Earnings'];
                      return [value, name];
                    }}
                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="liters" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={{ fill: '#10b981', r: 2 }} 
                    activeDot={{ r: 4 }} 
                    name="Liters Collected"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="litersMA7" 
                    stroke="#10b981" 
                    strokeWidth={1} 
                    strokeDasharray="3 3"
                    dot={false}
                    name="7-Day Avg Liters"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    dot={{ fill: '#f59e0b', r: 2 }} 
                    activeDot={{ r: 4 }} 
                    name="Earnings (KSh)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="earningsMA7" 
                    stroke="#f59e0b" 
                    strokeWidth={1} 
                    strokeDasharray="3 3"
                    dot={false}
                    name="7-Day Avg Earnings"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default AnalyticsPage;