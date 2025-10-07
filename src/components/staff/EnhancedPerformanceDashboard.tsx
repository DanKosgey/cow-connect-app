import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  LineChart
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DailyStats {
  date: string;
  collections: number;
  liters: number;
  farmers: number;
  avg_quality_score: number;
}

interface PerformanceStats {
  daily: DailyStats[];
  weekly: {
    collections: number;
    liters: number;
    farmers: number;
    avg_quality_score: number;
    trend: 'up' | 'down' | 'stable';
  };
  monthly: {
    collections: number;
    liters: number;
    farmers: number;
    avg_quality_score: number;
    target_achievement: number;
    performanceRating: number;
  };
}

interface StaffInfo {
  id: string;
  full_name: string;
  employee_id: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function EnhancedPerformanceDashboard() {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadData();
  }, []);

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

      // Calculate date ranges
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      // Fetch collections for the current week
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          liters,
          quality_grade,
          collection_date,
          farmer_id
        `)
        .eq('staff_id', staffData.id)
        .gte('collection_date', weekStart.toISOString())
        .lte('collection_date', weekEnd.toISOString())
        .order('collection_date', { ascending: true });

      if (collectionsError) throw collectionsError;

      // Process daily stats
      const dailyStatsMap: { [key: string]: DailyStats } = {};
      
      // Initialize all days of the week
      for (let i = 0; i < 7; i++) {
        const date = format(subDays(weekEnd, 6 - i), 'yyyy-MM-dd');
        dailyStatsMap[date] = {
          date,
          collections: 0,
          liters: 0,
          farmers: 0,
          avg_quality_score: 0
        };
      }

      // Process collections
      const farmersSet = new Set<string>();
      let totalQualityScore = 0;
      let qualityCount = 0;

      collectionsData?.forEach(collection => {
        const date = format(new Date(collection.collection_date), 'yyyy-MM-dd');
        if (dailyStatsMap[date]) {
          dailyStatsMap[date].collections += 1;
          dailyStatsMap[date].liters += collection.liters || 0;
          farmersSet.add(collection.farmer_id);
          
          // Calculate quality score
          if (collection.quality_grade) {
            const score = collection.quality_grade === 'A+' ? 10 : 
                         collection.quality_grade === 'A' ? 8 : 
                         collection.quality_grade === 'B' ? 6 : 4;
            totalQualityScore += score;
            qualityCount++;
            dailyStatsMap[date].avg_quality_score = score; // For daily display
          }
        }
      });

      const dailyStats = Object.values(dailyStatsMap);
      
      // Calculate weekly stats
      const weeklyCollections = dailyStats.reduce((sum, day) => sum + day.collections, 0);
      const weeklyLiters = dailyStats.reduce((sum, day) => sum + day.liters, 0);
      const weeklyFarmers = farmersSet.size;
      const weeklyAvgQuality = qualityCount > 0 ? totalQualityScore / qualityCount : 0;
      
      // Calculate trend (compare first half vs second half of the week)
      const firstHalf = dailyStats.slice(0, 3);
      const secondHalf = dailyStats.slice(3, 7);
      const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.liters, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.liters, 0) / secondHalf.length;
      const trend = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'stable';
      
      // Calculate monthly stats (using a target of 1000L for example)
      const monthlyTarget = 1000;
      const monthlyAchievement = (weeklyLiters * 4.3) / monthlyTarget * 100; // Approximate monthly based on weekly
      
      // Performance rating (simplified)
      const performanceRating = Math.min(5, Math.floor(weeklyAvgQuality / 2));

      setStats({
        daily: dailyStats,
        weekly: {
          collections: weeklyCollections,
          liters: parseFloat(weeklyLiters.toFixed(1)),
          farmers: weeklyFarmers,
          avg_quality_score: parseFloat(weeklyAvgQuality.toFixed(1)),
          trend
        },
        monthly: {
          collections: Math.round(weeklyCollections * 4.3),
          liters: parseFloat((weeklyLiters * 4.3).toFixed(1)),
          farmers: weeklyFarmers,
          avg_quality_score: parseFloat(weeklyAvgQuality.toFixed(1)),
          target_achievement: parseFloat(Math.min(100, monthlyAchievement).toFixed(1)),
          performanceRating
        }
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
      showError('Error', String(error?.message || 'Failed to load stats'));
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Track your collection performance and productivity metrics
          </p>
          {staffInfo && (
            <p className="text-sm text-muted-foreground mt-1">
              {staffInfo.full_name} • {staffInfo.employee_id}
            </p>
          )}
        </div>
        <div className="mt-4 md:mt-0">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(), 'MMMM yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Weekly Collections
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.weekly.collections || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.weekly.liters?.toFixed(1) || 0}L total volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quality Score
            </CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.weekly.avg_quality_score?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average quality rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Farmers Served
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.weekly.farmers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique farmers visited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Target Progress
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.monthly.target_achievement?.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly target achievement
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
                  tickFormatter={(date) => format(new Date(date), 'EEE')}
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

      {/* Weekly & Monthly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Overview
              </CardTitle>
              <Badge variant={
                stats?.weekly.trend === 'up' ? 'default' :
                stats?.weekly.trend === 'down' ? 'destructive' : 'secondary'
              }>
                {stats?.weekly.trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
                {stats?.weekly.trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
                {stats?.weekly.trend === 'stable' && <Minus className="h-4 w-4 mr-1" />}
                {stats?.weekly.trend?.charAt(0).toUpperCase() + stats?.weekly.trend?.slice(1) || 'No data'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg. Collections</p>
                  <p className="text-xl font-bold">
                    {stats?.weekly.collections ? Math.round(stats.weekly.collections / 7) : 0}/day
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg. Volume</p>
                  <p className="text-xl font-bold">
                    {stats?.weekly.liters ? (stats.weekly.liters / 7).toFixed(1) : 0}L/day
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Quality Score</p>
                  <p className="text-xl font-bold">
                    {stats?.weekly.avg_quality_score?.toFixed(1) || '0.0'}/10
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Farmers/Day</p>
                  <p className="text-xl font-bold">
                    {stats?.weekly.farmers ? (stats.weekly.farmers / 7).toFixed(1) : 0}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Monthly Projection
              </CardTitle>
              <Badge>
                <Calendar className="h-4 w-4 mr-1" />
                {new Date().toLocaleString('default', { month: 'long' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Projected Collections</p>
                  <p className="text-xl font-bold">
                    {stats?.monthly.collections || 0}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Projected Volume</p>
                  <p className="text-xl font-bold">
                    {stats?.monthly.liters?.toFixed(0) || 0}L
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Target Achievement</p>
                  <p className="text-xl font-bold">
                    {stats?.monthly.target_achievement?.toFixed(0) || 0}%
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Performance Rating</p>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Award
                        key={star}
                        className={`h-5 w-5 ${
                          star <= (stats?.monthly.performanceRating || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Monthly Target Progress</span>
                  <span>{stats?.monthly.target_achievement?.toFixed(0) || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, stats?.monthly.target_achievement || 0)}%` }}
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
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'EEE')}
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
    </div>
  );
}