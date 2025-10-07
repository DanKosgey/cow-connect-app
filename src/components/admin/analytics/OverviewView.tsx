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
import { Droplet, Users, DollarSign, Award, TrendingUp, BarChart3 } from '@/utils/iconImports';
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
  // Add trend data props
  collectionsTrend?: { value: number; isPositive: boolean };
  litersTrend?: { value: number; isPositive: boolean };
  revenueTrend?: { value: number; isPositive: boolean };
  qualityTrend?: { value: number; isPositive: boolean };
}

const OverviewView: React.FC<OverviewViewProps> = ({
  dailyTrends,
  qualityDistribution,
  topFarmers,
  staffPerformance,
  totalCollections,
  totalLiters,
  totalAmount,
  avgQuality,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Collections</CardTitle>
          <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalCollections}</div>
          {collectionsTrend ? (
            <p className={`text-xs ${collectionsTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {collectionsTrend.isPositive ? '↑' : '↓'} {collectionsTrend.value}% from last period
            </p>
          ) : (
            <p className="text-xs text-blue-700 dark:text-blue-300">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 border border-green-100 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Total Volume</CardTitle>
          <Droplet className="h-5 w-5 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">{totalLiters.toFixed(0)}L</div>
          {litersTrend ? (
            <p className={`text-xs ${litersTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {litersTrend.isPositive ? '↑' : '↓'} {litersTrend.value}% from last period
            </p>
          ) : (
            <p className="text-xs text-green-700 dark:text-green-300">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 border border-amber-100 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Total Revenue</CardTitle>
          <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(totalAmount)}</div>
          {revenueTrend ? (
            <p className={`text-xs ${revenueTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {revenueTrend.isPositive ? '↑' : '↓'} {revenueTrend.value}% from last period
            </p>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-300">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 border border-purple-100 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">Avg Quality</CardTitle>
          <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{avgQuality.toFixed(1)}</div>
          {qualityTrend ? (
            <p className={`text-xs ${qualityTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
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
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Daily Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%" key={chartKey}>
            <ComposedChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} 
                formatter={(value) => [value, '']}
              />
              <Legend />
              <Bar dataKey="collections" fill="#3b82f6" name="Collections" />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ fill: '#10b981', r: 5 }} 
                activeDot={{ r: 8 }} 
                name="Revenue (KES)"
                yAxisId="right"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quality Distribution */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Quality Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%" key={chartKey}>
            <PieChart>
              <Pie
                data={qualityDistribution}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {qualityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [value, 'Collections']} 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  ));

  // Memoized Top Performers
  const TopPerformers = memo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Farmers */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            Top Farmers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topFarmers.map((farmer, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-800 dark:text-blue-200">#{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{farmer.name}</p>
                    <p className="text-xs text-subtle-text-light dark:text-subtle-text-dark">
                      {farmer.collections} collections • {farmer.liters.toFixed(0)}L
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">{formatCurrency(farmer.amount)}</p>
                  <Badge variant="secondary" className="text-xs">
                    Grade {farmer.avgQuality.toFixed(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Staff Performance */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Staff Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {staffPerformance.map((staff, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <span className="text-xs font-medium text-purple-800 dark:text-purple-200">#{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{staff.name}</p>
                    <p className="text-xs text-subtle-text-light dark:text-subtle-text-dark">
                      {staff.collections} collections • {staff.farmers} farmers
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">{staff.liters.toFixed(0)}L</p>
                  <Badge variant="outline" className="text-xs">
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
    <div className="space-y-6">
      <KeyMetricsCards />
      <ChartsGrid />
      <TopPerformers />
    </div>
  );
};

export default memo(OverviewView);