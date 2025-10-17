import React, { memo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { Droplet, Users, DollarSign, Award, TrendingUp, BarChart3, Calendar } from '@/utils/iconImports';
import { useWindowResize } from '@/hooks/useWindowResize';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface OverviewViewProps {
  dailyTrends: any[];
  qualityDistribution: any[];
  topFarmers: any[];
  staffPerformance: any[];
  totalCollections: number;
  totalLiters: number;
  totalAmount: number;
  avgQuality: number;
  collections: any[]; // Add this line to include collections data
  // Add trend data props
  collectionsTrend?: { value: number; isPositive: boolean };
  litersTrend?: { value: number; isPositive: boolean };
  revenueTrend?: { value: number; isPositive: boolean };
  qualityTrend?: { value: number; isPositive: boolean };
}

// Memoized chart components to prevent unnecessary re-renders
const DailyTrendsChart = memo(({ data, chartKey }: { data: any[]; chartKey: number }) => {
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%" key={chartKey}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} 
          formatter={(value) => [value, '']}
          labelStyle={{ color: '#f3f4f6' }}
        />
        <Legend />
        <Bar dataKey="collections" fill="#3b82f6" name="Collections" radius={[4, 4, 0, 0]} />
        <Line 
          type="monotone" 
          dataKey="amount" 
          stroke="#10b981" 
          strokeWidth={3} 
          dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }} 
          activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }} 
          name="Revenue (KES)"
          yAxisId="right"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

const QualityDistributionChart = memo(({ data, chartKey }: { data: any[]; chartKey: number }) => {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%" key={chartKey}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percentage }) => `${name}: ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [value, 'Collections']} 
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} 
          labelStyle={{ color: '#f3f4f6' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
});

// Today's Collections Card Component
const TodaysCollectionsCard = memo(({ collections }: { collections: any[] }) => {
  // Filter collections for today
  const todaysCollections = collections.filter(collection => {
    const collectionDate = new Date(collection.collection_date);
    const today = new Date();
    return collectionDate.getDate() === today.getDate() &&
           collectionDate.getMonth() === today.getMonth() &&
           collectionDate.getFullYear() === today.getFullYear();
  });

  // Calculate today's metrics
  const totalCollections = todaysCollections.length;
  const totalLiters = todaysCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
  const totalAmount = todaysCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border border-indigo-100 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl transform hover:-translate-y-1 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Today's Collections</CardTitle>
        <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="grid grid-cols-3 gap-2 flex-grow">
          <div className="flex flex-col items-center justify-center p-2 bg-white/50 dark:bg-gray-700/50 rounded-lg shadow-sm">
            <div className="text-xl font-bold text-indigo-900 dark:text-indigo-100 truncate">{totalCollections}</div>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 text-center">Collections</p>
          </div>
          <div className="flex flex-col items-center justify-center p-2 bg-white/50 dark:bg-gray-700/50 rounded-lg shadow-sm">
            <div className="text-xl font-bold text-indigo-900 dark:text-indigo-100 truncate">{totalLiters.toFixed(0)}L</div>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 text-center">Volume</p>
          </div>
          <div className="flex flex-col items-center justify-center p-2 bg-white/50 dark:bg-gray-700/50 rounded-lg shadow-sm">
            <div className="text-xl font-bold text-indigo-900 dark:text-indigo-100 truncate">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 text-center">Revenue</p>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-tight">
            {todaysCollections.length > 0 
              ? `Last collection: ${new Date(Math.max(...todaysCollections.map(c => new Date(c.collection_date).getTime()))).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
              : 'No collections yet today'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

const OverviewView: React.FC<OverviewViewProps> = ({
  dailyTrends,
  qualityDistribution,
  topFarmers,
  staffPerformance,
  totalCollections,
  totalLiters,
  totalAmount,
  avgQuality,
  collections, // Add this line to destructure collections
  // Destructure trend data props
  collectionsTrend,
  litersTrend,
  revenueTrend,
  qualityTrend
}) => {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  // Performance monitoring
  const { measureOperation } = usePerformanceMonitor({ 
    componentName: 'OverviewView',
    enabled: process.env.NODE_ENV === 'development'
  });

  // Use debounced window resize for chart optimization
  const windowSize = useWindowResize(200);
  const [chartKey, setChartKey] = useState(0);
  const prevWindowSize = useRef({ width: window.innerWidth, height: window.innerHeight });

  // Update chart key when window size changes significantly
  useEffect(() => {
    // Only update if window size changed significantly (more than 10 pixels)
    if (
      Math.abs(windowSize.width - prevWindowSize.current.width) > 10 ||
      Math.abs(windowSize.height - prevWindowSize.current.height) > 10
    ) {
      measureOperation('windowResize', () => {
        setChartKey(prev => prev + 1);
        prevWindowSize.current = { ...windowSize };
      });
    }
  }, [windowSize, measureOperation]);

  // Memoized Key Metrics Cards
  const KeyMetricsCards = memo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <TodaysCollectionsCard collections={collections} />
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl transform hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Collections</CardTitle>
          <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalCollections}</div>
          {collectionsTrend ? (
            <p className={`text-xs ${collectionsTrend.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <span className="mr-1">{collectionsTrend.isPositive ? '↗' : '↘'}</span>
              {collectionsTrend.isPositive ? '↑' : '↓'} {collectionsTrend.value}% from last period
            </p>
          ) : (
            <p className="text-xs text-blue-700 dark:text-blue-300">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 border border-green-100 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl transform hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Total Volume</CardTitle>
          <Droplet className="h-5 w-5 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">{totalLiters.toFixed(0)}L</div>
          {litersTrend ? (
            <p className={`text-xs ${litersTrend.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <span className="mr-1">{litersTrend.isPositive ? '↗' : '↘'}</span>
              {litersTrend.isPositive ? '↑' : '↓'} {litersTrend.value}% from last period
            </p>
          ) : (
            <p className="text-xs text-green-700 dark:text-green-300">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 border border-amber-100 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl transform hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Total Revenue</CardTitle>
          <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(totalAmount)}</div>
          {revenueTrend ? (
            <p className={`text-xs ${revenueTrend.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <span className="mr-1">{revenueTrend.isPositive ? '↗' : '↘'}</span>
              {revenueTrend.isPositive ? '↑' : '↓'} {revenueTrend.value}% from last period
            </p>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-300">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 border border-purple-100 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl transform hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">Avg Quality</CardTitle>
          <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{avgQuality.toFixed(1)}</div>
          {qualityTrend ? (
            <p className={`text-xs ${qualityTrend.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
              <span className="mr-1">{qualityTrend.isPositive ? '↗' : '↘'}</span>
              {qualityTrend.isPositive ? '↑' : '↓'} {qualityTrend.value}% from last period
            </p>
          ) : (
            <p className="text-xs text-purple-700 dark:text-purple-300">No data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  ));

  // Memoized Charts Grid
  const ChartsGrid = memo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Trends */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Daily Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <DailyTrendsChart data={dailyTrends} chartKey={chartKey} />
        </CardContent>
      </Card>

      {/* Quality Distribution */}
      {/* Removed as per user request */}
    </div>
  ));

  // Memoized Top Performers
  const TopPerformers = memo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Farmers */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-green-500" />
            Top Farmers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topFarmers.map((farmer, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">#{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{farmer.name}</p>
                    <p className="text-xs text-subtle-text-light dark:text-subtle-text-dark">
                      {farmer.collections} collections • {farmer.liters.toFixed(0)}L
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{formatCurrency(farmer.amount)}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    Grade {farmer.avgQuality.toFixed(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Staff Performance */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Staff Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {staffPerformance.map((staff, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">#{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{staff.name}</p>
                    <p className="text-xs text-subtle-text-light dark:text-subtle-text-dark">
                      {staff.collections} collections • {staff.farmers} farmers
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-light dark:text-text-dark">{staff.liters.toFixed(0)}L</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {staff.collections} collections
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  ));

  return (
    <div className="space-y-8 p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl">
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Collections Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor and analyze milk collection data, farmer performance, and quality metrics
        </p>
      </div>
      
      <KeyMetricsCards />
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">Analytics Overview</h2>
        <ChartsGrid />
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">Performance Metrics</h2>
        <TopPerformers />
      </div>
    </div>
  );
};

export default memo(OverviewView);