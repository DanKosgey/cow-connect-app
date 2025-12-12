import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Award, 
  Calendar, 
  Truck, 
  Beaker, 
  Users,
  Clock,
  Target,
  BarChart3,
  LineChart,
  Download,
  Milk,
  Droplets,
  Wallet
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useStaffInfo } from '@/hooks/useStaffData';

interface DailyStats {
  date: string;
  collections: number;
  liters: number;
  farmers: number;
  avg_quality_score: number;
  earnings: number;
}

interface PerformanceMetrics {
  daily: DailyStats[];
  weekly: {
    collections: number;
    liters: number;
    farmers: number;
    avg_quality_score: number;
    earnings: number;
    trend: 'up' | 'down' | 'stable';
  };
  monthly: {
    collections: number;
    liters: number;
    farmers: number;
    avg_quality_score: number;
    earnings: number;
    target_achievement: number;
    performanceRating: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DetailedAnalyticsDashboard = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');

  useEffect(() => {
    if (staffInfo) {
      loadData();
    }
  }, [staffInfo, timeRange]);

  const loadData = async () => {
    if (!staffInfo?.id) return;
    
    setLoading(true);
    try {
      // Calculate date ranges based on selected time range
      const today = new Date();
      let startDate: Date;
      let endDate: Date = today;
      
      switch (timeRange) {
        case 'week':
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
          endDate = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
          break;
        case 'month':
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
          break;
        case 'quarter':
          startDate = subMonths(today, 3);
          break;
        default:
          startDate = subDays(today, 7);
      }

      // Fetch collections for the selected time range
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          liters,
          quality_grade,
          collection_date,
          farmer_id,
          total_amount
        `)
        .eq('staff_id', staffInfo.id)
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', endDate.toISOString())
        .order('collection_date', { ascending: true });

      if (collectionsError) throw collectionsError;

      // Process data based on time range
      let dailyStats: DailyStats[] = [];
      let totalQualityScore = 0;
      let qualityCount = 0;
      
      if (timeRange === 'week') {
        // Process daily stats for the week
        const dailyStatsMap: { [key: string]: DailyStats } = {};
        
        // Initialize all days of the week
        for (let i = 0; i < 7; i++) {
          const date = format(subDays(endDate, 6 - i), 'yyyy-MM-dd');
          dailyStatsMap[date] = {
            date,
            collections: 0,
            liters: 0,
            farmers: 0,
            avg_quality_score: 0,
            earnings: 0
          };
        }

        // Process collections
        const farmersSet = new Set<string>();

        collectionsData?.forEach(collection => {
          const date = format(new Date(collection.collection_date), 'yyyy-MM-dd');
          if (dailyStatsMap[date]) {
            dailyStatsMap[date].collections += 1;
            dailyStatsMap[date].liters += collection.liters || 0;
            dailyStatsMap[date].earnings += collection.total_amount || 0;
            farmersSet.add(collection.farmer_id);
            
            // Calculate quality score
            if (collection.quality_grade) {
              const score = collection.quality_grade === 'A+' ? 10 : 
                           collection.quality_grade === 'A' ? 8 : 
                           collection.quality_grade === 'B' ? 6 : 4;
              totalQualityScore += score;
              qualityCount++;
              // For daily display, we'll use the last collection's quality score
              dailyStatsMap[date].avg_quality_score = score;
            }
          }
        });

        dailyStats = Object.values(dailyStatsMap);
      } else if (timeRange === 'month') {
        // Process daily stats for the month
        const dailyStatsMap: { [key: string]: DailyStats } = {};
        
        // Initialize all days of the month
        const daysInMonth = endDate.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dateObj = new Date(startDate);
          dateObj.setDate(i);
          const date = format(dateObj, 'yyyy-MM-dd');
          dailyStatsMap[date] = {
            date,
            collections: 0,
            liters: 0,
            farmers: 0,
            avg_quality_score: 0,
            earnings: 0
          };
        }

        // Process collections
        const farmersSet = new Set<string>();

        collectionsData?.forEach(collection => {
          const date = format(new Date(collection.collection_date), 'yyyy-MM-dd');
          if (dailyStatsMap[date]) {
            dailyStatsMap[date].collections += 1;
            dailyStatsMap[date].liters += collection.liters || 0;
            dailyStatsMap[date].earnings += collection.total_amount || 0;
            farmersSet.add(collection.farmer_id);
            
            // Calculate quality score
            if (collection.quality_grade) {
              const score = collection.quality_grade === 'A+' ? 10 : 
                           collection.quality_grade === 'A' ? 8 : 
                           collection.quality_grade === 'B' ? 6 : 4;
              totalQualityScore += score;
              qualityCount++;
              dailyStatsMap[date].avg_quality_score = score;
            }
          }
        });

        dailyStats = Object.values(dailyStatsMap);
      } else {
        // For quarter, group by weeks
        const weeklyStatsMap: { [key: string]: DailyStats } = {};
        
        // Initialize weeks
        for (let i = 0; i < 13; i++) { // ~13 weeks in a quarter
          const weekStart = subDays(today, (12 - i) * 7);
          const weekKey = `Week ${i + 1}`;
          weeklyStatsMap[weekKey] = {
            date: weekKey,
            collections: 0,
            liters: 0,
            farmers: 0,
            avg_quality_score: 0,
            earnings: 0
          };
        }

        // Process collections
        const farmersSet = new Set<string>();

        collectionsData?.forEach(collection => {
          const collectionDate = new Date(collection.collection_date);
          const weekDiff = Math.floor((collectionDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const weekIndex = Math.min(12, Math.max(0, weekDiff));
          const weekKey = `Week ${weekIndex + 1}`;
          
          if (weeklyStatsMap[weekKey]) {
            weeklyStatsMap[weekKey].collections += 1;
            weeklyStatsMap[weekKey].liters += collection.liters || 0;
            weeklyStatsMap[weekKey].earnings += collection.total_amount || 0;
            farmersSet.add(collection.farmer_id);
            
            // Calculate quality score
            if (collection.quality_grade) {
              const score = collection.quality_grade === 'A+' ? 10 : 
                           collection.quality_grade === 'A' ? 8 : 
                           collection.quality_grade === 'B' ? 6 : 4;
              totalQualityScore += score;
              qualityCount++;
              weeklyStatsMap[weekKey].avg_quality_score = score;
            }
          }
        });

        dailyStats = Object.values(weeklyStatsMap);
      }

      // Calculate aggregated stats
      const totalCollections = dailyStats.reduce((sum, day) => sum + day.collections, 0);
      const totalLiters = dailyStats.reduce((sum, day) => sum + day.liters, 0);
      const totalEarnings = dailyStats.reduce((sum, day) => sum + day.earnings, 0);
      const totalFarmers = new Set(collectionsData?.map(c => c.farmer_id)).size;
      const avgQualityScore = qualityCount > 0 ? totalQualityScore / qualityCount : 0;
      
      // Calculate trend (compare first half vs second half)
      const midpoint = Math.floor(dailyStats.length / 2);
      const firstHalf = dailyStats.slice(0, midpoint);
      const secondHalf = dailyStats.slice(midpoint);
      const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.liters, 0) / (firstHalf.length || 1);
      const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.liters, 0) / (secondHalf.length || 1);
      const trend = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'stable';
      
      // Calculate target achievement (using a target of 1000L for example)
      const monthlyTarget = 1000;
      const targetAchievement = timeRange === 'month' 
        ? (totalLiters / monthlyTarget) * 100 
        : (totalLiters / (monthlyTarget * 3)) * 100; // Adjust for quarter
      
      // Performance rating (simplified)
      const performanceRating = Math.min(5, Math.floor(avgQualityScore / 2));

      setMetrics({
        daily: dailyStats,
        weekly: {
          collections: totalCollections,
          liters: parseFloat(totalLiters.toFixed(1)),
          farmers: totalFarmers,
          avg_quality_score: parseFloat(avgQualityScore.toFixed(1)),
          earnings: parseFloat(totalEarnings.toFixed(2)),
          trend
        },
        monthly: {
          collections: totalCollections,
          liters: parseFloat(totalLiters.toFixed(1)),
          farmers: totalFarmers,
          avg_quality_score: parseFloat(avgQualityScore.toFixed(1)),
          earnings: parseFloat(totalEarnings.toFixed(2)),
          target_achievement: parseFloat(targetAchievement.toFixed(1)),
          performanceRating
        }
      });
    } catch (error: any) {
      console.error('Error loading data:', error);
      showError('Error', error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!metrics) return;
    
    // Create CSV content
    const headers = ['Date', 'Collections', 'Liters', 'Farmers', 'Avg Quality Score', 'Earnings'];
    const rows = metrics.daily.map(day => [
      day.date,
      day.collections,
      day.liters,
      day.farmers,
      day.avg_quality_score,
      day.earnings
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${timeRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    show({ title: 'Success', description: 'Analytics data exported successfully' });
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  if (loading || staffLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    // ... rest of the JSX remains the same ...
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detailed Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive performance metrics and trends
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value as 'week' | 'month' | 'quarter')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            className="flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Collections</CardTitle>
            <Milk className="h-6 w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {metrics?.weekly.collections || 0}
            </div>
            <div className="flex items-center mt-1">
              {getTrendIcon(metrics?.weekly.trend || 'stable')}
              <span className="text-xs text-gray-500 ml-1">
                {timeRange === 'week' ? 'vs last week' : timeRange === 'month' ? 'vs last month' : 'vs last quarter'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Liters</CardTitle>
            <Droplets className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {metrics?.weekly.liters?.toFixed(1) || '0.0'}L
            </div>
            <div className="flex items-center mt-1">
              {getTrendIcon(metrics?.weekly.trend || 'stable')}
              <span className="text-xs text-gray-500 ml-1">
                {timeRange === 'week' ? 'vs last week' : timeRange === 'month' ? 'vs last month' : 'vs last quarter'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
            <Wallet className="h-6 w-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              KSh {metrics?.weekly.earnings?.toFixed(2) || '0.00'}
            </div>
            <div className="flex items-center mt-1">
              {getTrendIcon(metrics?.weekly.trend || 'stable')}
              <span className="text-xs text-gray-500 ml-1">
                {timeRange === 'week' ? 'vs last week' : timeRange === 'month' ? 'vs last month' : 'vs last quarter'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Quality</CardTitle>
            <Award className="h-6 w-6 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {metrics?.weekly.avg_quality_score?.toFixed(1) || '0.0'}/10
            </div>
            <div className="flex items-center mt-1">
              {getTrendIcon(metrics?.weekly.trend || 'stable')}
              <span className="text-xs text-gray-500 ml-1">
                {timeRange === 'week' ? 'vs last week' : timeRange === 'month' ? 'vs last month' : 'vs last quarter'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections Trend Chart */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Collections Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="collections" fill="#3b82f6" name="Collections" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Liters Trend Chart */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              Liters Collected Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={metrics?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="liters" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Liters" 
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Earnings Trend Chart */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Earnings Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`KSh ${Number(value).toFixed(2)}`, 'Earnings']}
                />
                <Legend />
                <Bar dataKey="earnings" fill="#8b5cf6" name="Earnings (KSh)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quality Distribution Chart */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={[
                    { name: 'A+', value: metrics?.daily.filter(d => d.avg_quality_score >= 9).length || 0 },
                    { name: 'A', value: metrics?.daily.filter(d => d.avg_quality_score >= 7 && d.avg_quality_score < 9).length || 0 },
                    { name: 'B', value: metrics?.daily.filter(d => d.avg_quality_score >= 5 && d.avg_quality_score < 7).length || 0 },
                    { name: 'C', value: metrics?.daily.filter(d => d.avg_quality_score < 5).length || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {metrics?.monthly.collections || 0}
              </div>
              <div className="text-gray-600 mt-1">Total Collections</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {metrics?.monthly.liters?.toFixed(1) || '0.0'}L
              </div>
              <div className="text-gray-600 mt-1">Total Volume</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                KSh {metrics?.monthly.earnings?.toFixed(2) || '0.00'}
              </div>
              <div className="text-gray-600 mt-1">Total Earnings</div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Target Achievement</h3>
                <p className="text-sm text-gray-500">
                  {timeRange === 'month' ? 'Monthly target' : 'Quarterly target'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics?.monthly.target_achievement?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-sm text-gray-500">
                  of {timeRange === 'month' ? '1000L' : '3000L'} target
                </div>
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${Math.min(100, metrics?.monthly.target_achievement || 0)}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedAnalyticsDashboard;