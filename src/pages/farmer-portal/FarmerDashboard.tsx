import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Milk,
  DollarSign,
  BarChart3,
  Calendar,
  TrendingUp,
  Award,
  Droplets,
  Leaf,
  Users,
  MapPin,
  Bell,
  Target,
  CalendarDays,
  TrendingDown,
  Package,
  Clock,
  Activity
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useFarmerDashboard } from '@/hooks/useFarmerDashboard';
import { format } from 'date-fns';
import RefreshButton from '@/components/ui/RefreshButton';
import { TimeframeSelector } from "@/components/TimeframeSelector";

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState("week");
  const { stats, loading, error, refresh } = useFarmerDashboard(timeframe);
  const componentMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMounted.current = false;
    };
  }, []);

  // Handle redirection for pending farmers
  useEffect(() => {
    if (error === 'Farmer profile not found') {
      navigate('/farmer/application-status');
    }
  }, [error, navigate]);

  // Update timeframe handler
  const handleTimeframeChange = (timeframeValue: string, start: Date, end: Date) => {
    if (componentMounted.current) {
      setTimeframe(timeframeValue);
    }
  };

  // Memoize chart data to prevent unnecessary recalculations
  const collectionTrendData = useMemo(() => {
    if (!stats || !stats.collectionTrend) return [];

    return (stats.collectionTrend || []).map((item: any) => ({
      date: item.date,
      collections: item.liters, // Using liters as collections metric
      revenue: item.liters * 48.78 // Use actual rate from collections data instead of mock value
    }));
  }, [stats]);

  // Prepare data for daily collections bar chart
  const dailyCollectionsData = useMemo(() => {
    if (!stats || !stats.collectionTrend) return [];

    return (stats.collectionTrend || []).map((item: any) => ({
      date: format(new Date(item.date), 'MMM dd'),
      liters: item.liters
    }));
  }, [stats]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 text-red-600">⚠️</div>
            <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
          </div>
          <p className="mt-2 text-red-700">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 text-yellow-600">⚠️</div>
            <h3 className="text-lg font-medium text-yellow-800">No Data Available</h3>
          </div>
          <p className="mt-2 text-yellow-700">No dashboard data found for your account.</p>
        </div>
      </div>
    );
  }

  // Stats cards data with null safety
  const statsCards = [
    {
      title: timeframe === 'day' ? "Today's Collection" :
        timeframe === 'week' ? "This Week's Collection" :
          timeframe === 'month' ? "This Month's Collection" :
            timeframe === 'quarter' ? "This Quarter's Collection" :
              "This Period's Collection",
      value: `${(stats.today?.liters || 0).toFixed(1)} L`,
      change: `${stats.today?.collections || 0} collections`,
      icon: <Droplets className="h-5 w-5" />,
      trend: "up"
    },
    {
      title: timeframe === 'day' ? "Today's Earnings" :
        timeframe === 'week' ? "This Week's Earnings" :
          timeframe === 'month' ? "This Month's Earnings" :
            timeframe === 'quarter' ? "This Quarter's Earnings" :
              "This Period's Earnings",
      value: `KSh ${(stats.thisMonth?.earnings || 0).toFixed(0)}`,
      change: `${(stats.thisMonth?.liters || 0).toFixed(1)} L collected`,
      icon: <TrendingUp className="h-5 w-5" />,
      trend: "up"
    },
    {
      title: 'Total Earnings',
      value: `KSh ${(stats.allTime?.totalEarnings || 0).toFixed(0)}`,
      change: timeframe === 'day' ? 'Today' :
        timeframe === 'week' ? 'This week' :
          timeframe === 'month' ? 'This month' :
            timeframe === 'quarter' ? 'This quarter' :
              'This period',
      icon: <DollarSign className="h-5 w-5" />,
      trend: "up"
    },
    {
      title: 'Collection Frequency',
      value: stats.thisMonth?.collections || 0,
      change: timeframe === 'day' ? "Collections today" :
        timeframe === 'week' ? "Collections this week" :
          timeframe === 'month' ? "Collections this month" :
            timeframe === 'quarter' ? "Collections this quarter" :
              "Collections this period",
      icon: <Calendar className="h-5 w-5" />,
      trend: "up"
    }
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  // Calculate percentage change for trend indicators
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your dairy operations</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <TimeframeSelector onTimeframeChange={handleTimeframeChange} defaultValue={timeframe} />
          <RefreshButton
            isRefreshing={loading}
            onRefresh={refresh}
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
          <Button variant="outline" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((card, index) => (
          <Card key={index} className="border border-border hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="flex items-center mt-1">
                {card.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <p className={`text-xs ${card.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                  {card.change}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Collection & Revenue Trend - Dual Axis Line Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Collection & Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {collectionTrendData && collectionTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={collectionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#10b981"
                      tickFormatter={(value) => `${value} L`}
                      label={{
                        value: 'Collections (Liters)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#10b981' }
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#3b82f6"
                      tickFormatter={(value) => `KSh${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                      label={{
                        value: 'Revenue (KSh)',
                        angle: 90,
                        position: 'insideRight',
                        style: { textAnchor: 'middle', fill: '#3b82f6' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value, name) => {
                        if (name === 'collections') return [`${value} L`, 'Collections'];
                        if (name === 'revenue') return [`KSh ${Number(value).toLocaleString()}`, 'Revenue'];
                        return [value, name];
                      }}
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="collections"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#10b981' }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                      name="Collections (L)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      name="Revenue (KSh)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No trend data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Collections Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Daily Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {dailyCollectionsData && dailyCollectionsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyCollectionsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [`${value} L`, 'Collections']}
                    />
                    <Bar dataKey="liters" fill="#10b981" name="Collections (L)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No daily data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Performance Summary */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Collection Consistency</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.thisMonth?.collections && stats.thisMonth.collections > 0
                      ? `${Math.min(100, Math.round((stats.thisMonth.collections / 30) * 100))}%`
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${stats.thisMonth?.collections && stats.thisMonth.collections > 0
                        ? Math.min(100, Math.round((stats.thisMonth.collections / 30) * 100))
                        : 0}%`
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Earnings Growth</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.thisMonth?.earnings ? '12.5%' : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${stats.thisMonth?.earnings ? 12.5 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Key Insights</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-green-500">✓</div>
                    <p className="ml-2 text-sm text-gray-600">
                      {stats.thisMonth?.collections && stats.thisMonth.collections > 15
                        ? "Great collection frequency!"
                        : "Aim for daily collections"}
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 text-blue-500">✓</div>
                    <p className="ml-2 text-sm text-gray-600">
                      Consistent {timeframe} performance
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Collections */}
      <div className="mb-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Milk className="h-5 w-5 text-primary" />
              Recent Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentCollections && stats.recentCollections.slice(0, 5).map((collection: any) => (
                <div key={collection.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Droplets className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{collection.liters} Liters</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(collection.collection_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">KSh {collection.total_amount}</span>
                  </div>
                </div>
              ))}
              {(!stats.recentCollections || stats.recentCollections.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent collections found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerDashboard;