import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Award, 
  Calendar, 
  Truck, 
  Users,
  Clock,
  Target,
  BarChart3,
  LineChart,
  Activity,
  Star
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DailyStats {
  date: string;
  collections: number;
  liters: number;
  farmers: number;
}

interface Stats {
  daily: DailyStats[];
  weekly: {
    collections: number;
    liters: number;
    farmers: number;
    trend: string;
  };
  monthly: {
    collections: number;
    liters: number;
    farmers: number;
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
  const [stats, setStats] = useState<Stats | null>(null);
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
          farmers: 0
        };
      }

      // Process collections
      const farmersSet = new Set<string>();

      collectionsData?.forEach(collection => {
        const date = format(new Date(collection.collection_date), 'yyyy-MM-dd');
        if (dailyStatsMap[date]) {
          dailyStatsMap[date].collections += 1;
          dailyStatsMap[date].liters += collection.liters || 0;
          farmersSet.add(collection.farmer_id);
        }
      });

      const dailyStats = Object.values(dailyStatsMap);
      
      // Calculate weekly stats
      const weeklyCollections = dailyStats.reduce((sum, day) => sum + day.collections, 0);
      const weeklyLiters = dailyStats.reduce((sum, day) => sum + day.liters, 0);
      const weeklyFarmers = farmersSet.size;
      
      // Calculate trend (compare first half vs second half of the week)
      const firstHalf = dailyStats.slice(0, 3);
      const secondHalf = dailyStats.slice(3, 7);
      const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.liters, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.liters, 0) / secondHalf.length;
      const trend = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'stable';
      
      // Calculate monthly stats (using a target of 1000L for example)
      const monthlyTarget = 1000;
      const monthlyAchievement = (weeklyLiters * 4.3) / monthlyTarget * 100; // Approximate monthly based on weekly
      
      // Performance rating (based on volume)
      const performanceRating = Math.min(5, Math.floor(weeklyLiters / 100));

      setStats({
        daily: dailyStats,
        weekly: {
          collections: weeklyCollections,
          liters: parseFloat(weeklyLiters.toFixed(1)),
          farmers: weeklyFarmers,
          trend
        },
        monthly: {
          collections: Math.round(weeklyCollections * 4.3),
          liters: parseFloat((weeklyLiters * 4.3).toFixed(1)),
          farmers: weeklyFarmers,
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
  const volumeDistribution = [
    { name: 'High Volume', value: stats?.daily.filter(d => d.liters >= 50).length || 0 },
    { name: 'Medium Volume', value: stats?.daily.filter(d => d.liters >= 25 && d.liters < 50).length || 0 },
    { name: 'Low Volume', value: stats?.daily.filter(d => d.liters < 25).length || 0 }
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
              Avg Volume per Collection
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.weekly.collections ? (stats.weekly.liters / stats.weekly.collections).toFixed(1) : '0.0'}L
            </div>
            <p className="text-xs text-muted-foreground">
              Average liters per collection
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
              {stats?.monthly.target_achievement?.toFixed(1) || '0.0'}%
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
        <Card>
          <CardHeader>
            <CardTitle>Daily Collections</CardTitle>
            <CardDescription>
              Collection volume trends for the current week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="collections" fill="#3b82f6" name="Collections" />
                  <Bar dataKey="liters" fill="#10b981" name="Liters" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Volume Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Volume Distribution</CardTitle>
            <CardDescription>
              Distribution of collection volumes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={volumeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {volumeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b'][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Performance Summary</CardTitle>
          <CardDescription>
            Key performance indicators for the current week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats?.weekly.collections || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Total Collections
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats?.weekly.liters?.toFixed(1) || '0.0'}L
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Total Volume
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {stats?.weekly.farmers || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Farmers Visited
              </div>
            </div>
          </div>
          
          {/* Performance Rating */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Performance Rating</span>
              <span className="text-sm font-medium">
                {stats?.monthly.performanceRating || 0}/5
              </span>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
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
        </CardContent>
      </Card>
    </div>
  );
}
