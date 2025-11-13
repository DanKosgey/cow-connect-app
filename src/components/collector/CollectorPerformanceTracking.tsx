import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
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
import { Badge } from '@/components/ui/badge';
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
  Filter,
  FileText
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface DailyStats {
  date: string;
  collections: number;
  liters: number;
  farmers: number;
  avg_quality_score: number;
  earnings: number;
}

interface PerformanceStats {
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
  quarterly: {
    collections: number;
    liters: number;
    farmers: number;
    avg_quality_score: number;
    earnings: number;
    target_achievement: number;
    performanceRating: number;
  };
}

interface StaffInfo {
  id: string;
  full_name: string;
  employee_id: string;
}

interface CollectionRecord {
  id: string;
  collection_id: string;
  farmer_name: string;
  liters: number;
  quality_grade: string;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function StaffPerformanceTracking() {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [reportData, setReportData] = useState<CollectionRecord[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get staff info
      const { data: staffDataArray, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          employee_id,
          profiles (
            full_name
          )
        `)
        .eq('user_id', user?.id)
        .limit(1);

      if (staffError) throw staffError;
      
      // Check if we have any staff data
      if (!staffDataArray || staffDataArray.length === 0) {
        throw new Error('Staff record not found');
      }
      
      const staffData = staffDataArray[0];

      setStaffInfo({
        id: staffData.id,
        employee_id: staffData.employee_id,
        full_name: staffData.profiles?.full_name || 'Staff Member'
      });

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
          collection_id,
          liters,
          quality_grade,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          farmers!fk_collections_farmer_id (
            full_name
          )
        `)
        .eq('staff_id', staffData.id)
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', endDate.toISOString())
        .order('collection_date', { ascending: true });

      if (collectionsError) throw collectionsError;

      // Process data based on time range
      let dailyStats: DailyStats[] = [];
      
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
        let totalQualityScore = 0;
        let qualityCount = 0;
        let totalEarnings = 0;

        collectionsData?.forEach(collection => {
          const date = format(new Date(collection.collection_date), 'yyyy-MM-dd');
          if (dailyStatsMap[date]) {
            dailyStatsMap[date].collections += 1;
            dailyStatsMap[date].liters += collection.liters || 0;
            dailyStatsMap[date].earnings += collection.total_amount || 0;
            farmersSet.add(collection.farmers?.full_name || 'Unknown Farmer');
            
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
      } else {
        // For month/quarter, group by day
        const dailyStatsMap: { [key: string]: DailyStats } = {};
        
        collectionsData?.forEach(collection => {
          const date = format(new Date(collection.collection_date), 'yyyy-MM-dd');
          if (!dailyStatsMap[date]) {
            dailyStatsMap[date] = {
              date,
              collections: 0,
              liters: 0,
              farmers: 0,
              avg_quality_score: 0,
              earnings: 0
            };
          }
          
          dailyStatsMap[date].collections += 1;
          dailyStatsMap[date].liters += collection.liters || 0;
          dailyStatsMap[date].earnings += collection.total_amount || 0;
          
          // Calculate quality score for this collection
          if (collection.quality_grade) {
            const score = collection.quality_grade === 'A+' ? 10 : 
                         collection.quality_grade === 'A' ? 8 : 
                         collection.quality_grade === 'B' ? 6 : 4;
            dailyStatsMap[date].avg_quality_score = score;
          }
        });
        
        dailyStats = Object.values(dailyStatsMap);
      }

      // Calculate aggregated stats
      const totalCollections = dailyStats.reduce((sum, day) => sum + day.collections, 0);
      const totalLiters = dailyStats.reduce((sum, day) => sum + day.liters, 0);
      const totalEarnings = dailyStats.reduce((sum, day) => sum + day.earnings, 0);
      const uniqueFarmers = new Set(collectionsData?.map(c => c.farmers?.full_name)).size;
      
      // Calculate average quality score
      let totalQualityScore = 0;
      let qualityCount = 0;
      collectionsData?.forEach(collection => {
        if (collection.quality_grade) {
          const score = collection.quality_grade === 'A+' ? 10 : 
                       collection.quality_grade === 'A' ? 8 : 
                       collection.quality_grade === 'B' ? 6 : 4;
          totalQualityScore += score;
          qualityCount++;
        }
      });
      const avgQualityScore = qualityCount > 0 ? totalQualityScore / qualityCount : 0;
      
      // Calculate trend (compare first half vs second half)
      const midpoint = Math.floor(dailyStats.length / 2);
      const firstHalf = dailyStats.slice(0, midpoint);
      const secondHalf = dailyStats.slice(midpoint);
      const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.liters, 0) / (firstHalf.length || 1);
      const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.liters, 0) / (secondHalf.length || 1);
      const trend = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'stable';
      
      // Targets (these would typically come from the database)
      const weeklyTarget = 500; // Liters
      const monthlyTarget = 2000; // Liters
      const quarterlyTarget = 6000; // Liters
      
      let targetAchievement = 0;
      let performanceRating = 0;
      
      switch (timeRange) {
        case 'week':
          targetAchievement = (totalLiters / weeklyTarget) * 100;
          performanceRating = Math.min(5, Math.floor(avgQualityScore / 2));
          break;
        case 'month':
          targetAchievement = (totalLiters / monthlyTarget) * 100;
          performanceRating = Math.min(5, Math.floor(avgQualityScore / 2));
          break;
        case 'quarter':
          targetAchievement = (totalLiters / quarterlyTarget) * 100;
          performanceRating = Math.min(5, Math.floor(avgQualityScore / 2));
          break;
      }

      // Format the data for the charts
      const formattedDailyStats = dailyStats.map(stat => ({
        ...stat,
        date: stat.date
      }));

      setStats({
        daily: formattedDailyStats,
        weekly: {
          collections: totalCollections,
          liters: parseFloat(totalLiters.toFixed(1)),
          farmers: uniqueFarmers,
          avg_quality_score: parseFloat(avgQualityScore.toFixed(1)),
          earnings: parseFloat(totalEarnings.toFixed(2)),
          trend
        },
        monthly: {
          collections: Math.round(totalCollections * (30 / dailyStats.length)),
          liters: parseFloat((totalLiters * (30 / dailyStats.length)).toFixed(1)),
          farmers: uniqueFarmers,
          avg_quality_score: parseFloat(avgQualityScore.toFixed(1)),
          earnings: parseFloat((totalEarnings * (30 / dailyStats.length)).toFixed(2)),
          target_achievement: parseFloat(Math.min(100, (totalLiters / monthlyTarget) * 100).toFixed(1)),
          performanceRating
        },
        quarterly: {
          collections: Math.round(totalCollections * (90 / dailyStats.length)),
          liters: parseFloat((totalLiters * (90 / dailyStats.length)).toFixed(1)),
          farmers: uniqueFarmers,
          avg_quality_score: parseFloat(avgQualityScore.toFixed(1)),
          earnings: parseFloat((totalEarnings * (90 / dailyStats.length)).toFixed(2)),
          target_achievement: parseFloat(Math.min(100, (totalLiters / quarterlyTarget) * 100).toFixed(1)),
          performanceRating
        }
      });

      // Prepare report data
      const formattedReportData = collectionsData?.map(collection => ({
        id: collection.id,
        collection_id: collection.collection_id,
        farmer_name: collection.farmers?.full_name || 'Unknown Farmer',
        liters: collection.liters,
        quality_grade: collection.quality_grade,
        rate_per_liter: collection.rate_per_liter || 0,
        total_amount: collection.total_amount || 0,
        collection_date: collection.collection_date,
        status: collection.status
      })) || [];
      
      setReportData(formattedReportData);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      showError('Error', String(error?.message || 'Failed to load stats'));
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    setReportLoading(true);
    
    try {
      // Create CSV content
      const headers = ['Collection ID', 'Farmer Name', 'Date', 'Liters', 'Quality Grade', 'Rate per Liter', 'Total Amount', 'Status'];
      const rows = reportData.map(record => [
        record.collection_id,
        record.farmer_name,
        format(parseISO(record.collection_date), 'yyyy-MM-dd HH:mm'),
        record.liters,
        record.quality_grade,
        record.rate_per_liter,
        record.total_amount,
        record.status
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
      link.setAttribute('download', `performance_report_${timeRange}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      show('Success', 'Performance report exported successfully');
    } catch (error: any) {
      console.error('Error exporting report:', error);
      showError('Error', 'Failed to export performance report');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Prepare data for charts
  const qualityDistribution = [
    { name: 'A+', value: stats?.daily.filter(d => d.avg_quality_score >= 9).length || 0 },
    { name: 'A', value: stats?.daily.filter(d => d.avg_quality_score >= 8 && d.avg_quality_score < 9).length || 0 },
    { name: 'B', value: stats?.daily.filter(d => d.avg_quality_score >= 6 && d.avg_quality_score < 8).length || 0 },
    { name: 'C', value: stats?.daily.filter(d => d.avg_quality_score < 6).length || 0 },
  ];

  // Get current period stats based on selected time range
  const currentStats = timeRange === 'week' ? stats?.weekly : 
                      timeRange === 'month' ? stats?.monthly : 
                      stats?.quarterly;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Tracking & Reports</h1>
          <p className="text-muted-foreground">
            Track your performance metrics and generate detailed reports
          </p>
          {staffInfo && (
            <p className="text-sm text-muted-foreground mt-1">
              {staffInfo.full_name} • {staffInfo.employee_id}
            </p>
          )}
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={exportToCSV}
            disabled={reportLoading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Collections
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStats?.collections || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Volume
            </CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStats?.liters?.toFixed(1) || '0.0'}L
            </div>
            <p className="text-xs text-muted-foreground">
              Total volume collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Farmers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStats?.farmers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique farmers served
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quality
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStats?.avg_quality_score?.toFixed(1) || '0.0'}/10
            </div>
            <p className="text-xs text-muted-foreground">
              Average quality score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Earnings
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {currentStats?.earnings?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Collections Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={stats?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Liters']}
                  labelFormatter={(date) => format(new Date(date), 'EEEE, MMM d')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="liters" 
                  stroke="#3b82f6" 
                  name="Liters Collected" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="collections" 
                  stroke="#10b981" 
                  name="Collections" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quality Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={qualityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {qualityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Days']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Period Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'} Overview
              </CardTitle>
              <Badge variant={
                currentStats?.trend === 'up' ? 'default' :
                currentStats?.trend === 'down' ? 'destructive' : 'secondary'
              }>
                {currentStats?.trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
                {currentStats?.trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
                {currentStats?.trend === 'stable' && <Minus className="h-4 w-4 mr-1" />}
                {currentStats?.trend?.charAt(0).toUpperCase() + (currentStats?.trend?.slice(1) || 'No data')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg. Collections</p>
                  <p className="text-xl font-bold">
                    {currentStats?.collections ? Math.round(currentStats.collections / stats?.daily.length!) : 0}/day
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg. Volume</p>
                  <p className="text-xl font-bold">
                    {currentStats?.liters ? (currentStats.liters / stats?.daily.length!).toFixed(1) : 0}L/day
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Quality Score</p>
                  <p className="text-xl font-bold">
                    {currentStats?.avg_quality_score?.toFixed(1) || '0.0'}/10
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg. Earnings</p>
                  <p className="text-xl font-bold">
                    KSh {currentStats?.earnings ? (currentStats.earnings / stats?.daily.length!).toFixed(2) : '0.00'}/day
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Achievement */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Target Achievement
              </CardTitle>
              <Badge>
                <Calendar className="h-4 w-4 mr-1" />
                {timeRange === 'week' ? 'Weekly' : timeRange === 'month' ? 'Monthly' : 'Quarterly'} Target
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Target Progress</p>
                  <p className="text-xl font-bold">
                    {currentStats?.target_achievement?.toFixed(0) || 0}%
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Performance Rating</p>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Award
                        key={star}
                        className={`h-5 w-5 ${
                          star <= (currentStats?.performanceRating || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg col-span-2">
                  <p className="text-sm text-muted-foreground">Projected {timeRange === 'week' ? 'Monthly' : 'Annual'} Volume</p>
                  <p className="text-xl font-bold">
                    {currentStats?.liters ? (currentStats.liters * (timeRange === 'week' ? 4.3 : timeRange === 'month' ? 12 : 4)).toFixed(0) : 0}L
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Target Progress</span>
                  <span>{currentStats?.target_achievement?.toFixed(0) || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, currentStats?.target_achievement || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Recent Activity
            </div>
            <div className="text-sm text-muted-foreground">
              {reportData.length} records
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Liters']}
                  labelFormatter={(date) => format(new Date(date), 'EEEE, MMM d')}
                />
                <Legend />
                <Bar 
                  dataKey="liters" 
                  fill="#3b82f6" 
                  name="Liters Collected" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Report Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detailed Report Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Collection ID</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Farmer</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Liters</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Quality</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.slice(0, 10).map((record) => (
                  <tr key={record.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">{record.collection_id}</td>
                    <td className="p-3 text-sm">{record.farmer_name}</td>
                    <td className="p-3 text-sm">{format(parseISO(record.collection_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 text-sm">{record.liters}L</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        record.quality_grade === 'A+' ? 'default' :
                        record.quality_grade === 'A' ? 'secondary' :
                        record.quality_grade === 'B' ? 'outline' : 'destructive'
                      }>
                        {record.quality_grade}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">KSh {record.total_amount.toFixed(2)}</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        record.status === 'Collected' ? 'default' :
                        record.status === 'Verified' ? 'secondary' :
                        record.status === 'Paid' ? 'outline' : 'destructive'
                      }>
                        {record.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No collection data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {reportData.length > 10 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Showing 10 of {reportData.length} records. Export to CSV to see all data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}