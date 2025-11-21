import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  DollarSign,
  Milk,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface DailyStats {
  date: string;
  collections: number;
  farmers: number;
  liters: number;
  amount: number;
  avgQuality: number;
}

interface WeeklyTrends {
  week: string;
  totalCollections: number;
  totalLiters: number;
  avgQuality: number;
  revenue: number;
}

interface QualityDistribution {
  grade: string;
  count: number;
  percentage: number;
}

interface FarmerRanking {
  farmer_id: string;
  farmer_name: string;
  totalLiters: number;
  collectionsCount: number;
  avgQuality: number;
  totalEarnings: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const DailyAnalytics = () => {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrends[]>([]);
  const [qualityDistribution, setQualityDistribution] = useState<QualityDistribution[]>([]);
  const [topFarmers, setTopFarmers] = useState<FarmerRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = selectedPeriod === '7d' 
        ? subDays(endDate, 7)
        : selectedPeriod === '30d'
        ? subDays(endDate, 30)
        : startOfMonth(endDate);

      // Fetch daily collections data
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          *,
          farmers!inner (
            farmer_id,
            profiles!inner (
              full_name
            )
          )
        `)
        .eq('approved_for_company', true) // Only fetch approved collections
        .gte('collection_date', startDate.toISOString())
        .lte('collection_date', endDate.toISOString())
        .order('collection_date');

      if (collectionsError) throw collectionsError;

      // Process daily stats
      const statsByDate = collectionsData?.reduce((acc: Record<string, DailyStats>, collection: any) => {
        const date = collection.collection_date.split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            collections: 0,
            farmers: 0,
            liters: 0,
            amount: 0,
            avgQuality: 0
          };
        }

        const qualityScore = collection.quality_grade === 'A+' ? 10 : 
                           collection.quality_grade === 'A' ? 8 :
                           collection.quality_grade === 'B' ? 6 : 4;

        acc[date].collections += 1;
        acc[date].liters += parseInt(collection.liters) || 0;
        acc[date].amount += parseInt(collection.total_amount) || 0;
        acc[date].avgQuality = ((acc[date].avgQuality * acc[date].collections) + qualityScore) / (acc[date].collections + 1);
        
        return acc;
      }, {});

      setDailyStats(Object.values(statsByDate || {}));

      // Calculate weekly trends
      const weeklyData = calculateWeeklyTrends(collectionsData || []);
      setWeeklyTrends(weeklyData);

      // Calculate quality distribution
      const qualityData = calculateQualityDistribution(collectionsData || []);
      setQualityDistribution(qualityData);

      // Calculate top farmers
      const farmerData = calculateTopFarmers(collectionsData || []);
      setTopFarmers(farmerData);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyTrends = (collections: any[]): WeeklyTrends[] => {
    const weeks: Record<string, {
      collections: any[];
      farmers: Set<string>;
    }> = {};

    collections.forEach(collection => {
      const date = new Date(collection.collection_date);
      const weekKey = `Week ${Math.ceil(date.getDate() / 7)}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { collections: [], farmers: new Set<string>() };
      }
      
      weeks[weekKey].collections.push(collection);
      weeks[weekKey].farmers.add(collection.farmer_id);
    });

    return Object.entries(weeks).map(([week, data]) => {
      const totalLiters = data.collections.reduce((sum, c) => sum + (parseFloat(c.liters) || 0), 0);
      const revenue = data.collections.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0);
      const avgQuality = data.collections.reduce((sum, c) => {
        const gradeScore = c.quality_grade === 'A+' ? 10 : c.quality_grade === 'A' ? 8 : c.quality_grade === 'B' ? 6 : 4;
        return sum + gradeScore;
      }, 0) / data.collections.length;

      return {
        week,
        totalCollections: data.collections.length,
        totalLiters,
        avgQuality: avgQuality || 0,
        revenue
      };
    });
  };

  const calculateQualityDistribution = (collections: any[]): QualityDistribution[] => {
    const distribution: Record<string, number> = {};
    
    collections.forEach(collection => {
      const grade = collection.quality_grade || 'Unknown';
      distribution[grade] = (distribution[grade] || 0) + 1;
    });

    const total = collections.length;
    return Object.entries(distribution).map(([grade, count]) => ({
      grade,
      count,
      percentage: (count / total) * 100
    }));
  };

  const calculateTopFarmers = (collections: any[]): FarmerRanking[] => {
    const farmerData: Record<string, {
      name: string;
      collections: any[];
      totalLiters: number;
      totalEarnings: number;
    }> = {};

    collections.forEach(collection => {
      const farmerId = collection.farmer_id;
      const farmerName = collection.farmers?.profiles?.full_name || 'Unknown';
      
      if (!farmerData[farmerId]) {
        farmerData[farmerId] = {
          name: farmerName,
          collections: [],
          totalLiters: 0,
          totalEarnings: 0
        };
      }

      farmerData[farmerId].collections.push(collection);
      farmerData[farmerId].totalLiters += parseFloat(collection.liters) || 0;
      farmerData[farmerId].totalEarnings += parseFloat(collection.total_amount) || 0;
    });

    return Object.entries(farmerData)
      .map(([farmerId, data]) => {
        const avgQuality = data.collections.reduce((sum, c) => {
          const gradeScore = c.quality_grade === 'A+' ? 10 : c.quality_grade === 'A' ? 8 : c.quality_grade === 'B' ? 6 : 4;
          return sum + gradeScore;
        }, 0) / data.collections.length;

        return {
          farmer_id: farmerId,
          farmer_name: data.name,
          totalLiters: data.totalLiters,
          collectionsCount: data.collections.length,
          avgQuality: avgQuality || 0,
          totalEarnings: data.totalEarnings
        };
      })
      .sort((a, b) => b.totalLiters - a.totalLiters)
      .slice(0, 10);
  };

  const getTrendDirection = (current: number, previous: number) => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'flat';
  };

  const exportAnalytics = () => {
    const csvContent = [
      ['Date', 'Collections', 'Farmers', 'Total Liters', 'Total Amount', 'Average Quality'],
      ...dailyStats.map(stat => [
        stat.date,
        stat.collections,
        stat.farmers,
        stat.liters.toFixed(2),
        stat.amount.toFixed(2),
        stat.avgQuality.toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_analytics_${selectedPeriod}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalCollections = dailyStats.reduce((sum, day) => sum + day.collections, 0);
  const totalLiters = dailyStats.reduce((sum, day) => sum + day.liters, 0);
  const totalAmount = dailyStats.reduce((sum, day) => sum + day.amount, 0);
  const avgQuality = dailyStats.length > 0 
    ? dailyStats.reduce((sum, day) => sum + day.avgQuality, 0) / dailyStats.length 
    : 0;

  const renderMetricCard = (title: string, value: number, icon: React.ReactNode, suffix?: string, trend?: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' 
            ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : value
          }{suffix}
        </div>
        {trend && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            ) : (
              <Activity className="h-3 w-3 text-gray-500 mr-1" />
            )}
            <span>{trend === 'up' ? '+' : trend === 'down' ? '-' : ''}comparison</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Analytics</h2>
          <p className="text-muted-foreground">Comprehensive view of daily performance metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="month">This Month</option>
          </select>
          <Button variant="outline" onClick={fetchAnalyticsData} disabled={loading}>
            {loading ? (
              <span className="mr-2 w-4 h-4 inline-block align-middle">
                <div className="bg-gray-200 rounded-full w-full h-full animate-pulse" />
              </span>
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        {renderMetricCard(
          'Total Collections',
          totalCollections,
          <Milk className="h-4 w-4 text-muted-foreground" />
        )}
        {renderMetricCard(
          'Total Liters',
          totalLiters,
          <Activity className="h-4 w-4 text-muted-foreground" />,
          ' L'
        )}
        {renderMetricCard(
          'Total Revenue',
          totalAmount,
          <DollarSign className="h-4 w-4 text-muted-foreground" />,
          ' ₹'
        )}
        {renderMetricCard(
          'Avg Quality Score',
          avgQuality,
          <TrendingUp className="h-4 w-4 text-muted-foreground" />,
          '/10'
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Collections Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Collections Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="liters" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="collections" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={qualityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ grade, percentage }) => `${grade}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {qualityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalLiters" fill="#8884d8" />
                <Bar dataKey="revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Farmers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Farmers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topFarmers.slice(0, 5).map((farmer, index) => (
                <div key={farmer.farmer_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{farmer.farmer_name}</div>
                      <div className="text-sm text-gray-500">
                        {farmer.collectionsCount} collections
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{farmer.totalLiters.toFixed(1)} L</div>
                    <div className="text-sm text-gray-500">
                      <Badge variant="secondary">{farmer.avgQuality.toFixed(1)}/10</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DailyAnalytics;
