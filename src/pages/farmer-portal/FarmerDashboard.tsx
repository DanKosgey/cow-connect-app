import { useState } from "react";
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
  CalendarDays
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useFarmerDashboard } from '@/hooks/useFarmerDashboard';
import { format } from 'date-fns';
import RefreshButton from '@/components/ui/RefreshButton';

const FarmerDashboard = () => {
  const { stats, loading, error } = useFarmerDashboard();
  const [selectedPeriod, setSelectedPeriod] = useState('month');

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

  // Stats cards data
  const statsCards = [
    {
      title: "Today's Collection",
      value: `${stats.today.liters.toFixed(1)} L`,
      change: `${stats.today.collections} collections`,
      icon: <Droplets className="h-5 w-5" />,
    },
    {
      title: 'This Month',
      value: `${stats.thisMonth.liters.toFixed(1)} L`,
      change: `KSh ${stats.thisMonth.earnings.toFixed(0)}`,
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      title: 'Avg Quality',
      value: stats.today.avgQuality > 0 ? stats.today.avgQuality.toFixed(1) : 'N/A',
      change: 'This week',
      icon: <Award className="h-5 w-5" />,
    },
    {
      title: 'Total Earnings',
      value: `KSh ${stats.allTime.totalEarnings.toFixed(0)}`,
      change: 'All time',
      icon: <DollarSign className="h-5 w-5" />,
    }
  ];

  // Prepare data for charts
  const qualityDistributionData = Object.entries(stats.thisMonth.qualityDistribution).map(([grade, count]) => ({
    name: `Grade ${grade}`,
    value: count as number
  }));

  // Prepare data for the dual-axis line chart
  const collectionTrendData = stats.qualityTrend.map((item: any) => ({
    date: item.date,
    collections: item.liters, // Using liters as collections metric
    revenue: item.liters * 20 // Mock revenue calculation - you might want to adjust this
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your dairy operations</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <RefreshButton 
            isRefreshing={loading} 
            onRefresh={() => window.location.reload()} 
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
          <Button variant="outline" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
          <Button className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
            <Calendar className="h-4 w-4" />
            Schedule Collection
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
              <p className="text-xs text-gray-500 mt-1">{card.change}</p>
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
                    tickFormatter={(value) => `KSh${value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}`}
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
            </div>
          </CardContent>
        </Card>

        {/* Quality Distribution */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qualityDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {qualityDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Collections']} />
                </PieChart>
              </ResponsiveContainer>
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
              {stats.recentCollections.slice(0, 5).map((collection: any) => (
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
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      collection.quality_grade === 'A+' ? 'bg-green-100 text-green-800' :
                      collection.quality_grade === 'A' ? 'bg-blue-100 text-blue-800' :
                      collection.quality_grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Grade {collection.quality_grade}
                    </span>
                    <span className="text-lg font-bold text-gray-900">KSh {collection.total_amount}</span>
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

export default FarmerDashboard;