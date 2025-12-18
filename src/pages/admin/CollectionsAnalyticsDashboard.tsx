import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  Droplet,
  Search,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Calendar,
  Filter,
  RefreshCcw,
  User,
  FileText,
  MapPin,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  Award,
  Clock,
  DollarSign,
  Users,
  ArrowRight
} from 'lucide-react';

// Hooks & Logic
import { useCollectionAnalyticsData } from '@/hooks/useCollectionAnalyticsData';
import useToastNotifications from '@/hooks/useToastNotifications';
import { CollectionsSkeleton } from '@/components/admin/CollectionsSkeleton';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useDebounce } from '@/hooks/useDebounce';
import { useLoadingDelay } from '@/hooks/useLoadingDelay';

// ---------- Math Helpers ----------

const safeNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const calculateMean = (data: number[]) => {
  if (!data.length) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
};

const calculateStdDev = (data: number[], mean: number) => {
  if (!data.length) return 0;
  const squareDiffs = data.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

const calculateLinearTrend = (data: number[]) => {
  if (data.length < 2) return 0;
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
};

const calculateSMA = (data: number[], windowSize: number) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(data[i]); 
      continue;
    }
    const window = data.slice(i - windowSize + 1, i + 1);
    result.push(calculateMean(window));
  }
  return result;
};

const calculatePercentile = (data: number[], percentile: number) => {
  const sorted = [...data].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

// ---------- Types ----------
interface Collection {
  id: string;
  collection_id?: string;
  farmer_id: string;
  liters: number;
  rate_per_liter?: number;
  total_amount: number;
  collection_date: string;
  status?: string;
  farmers?: { profiles?: { full_name?: string } };
  staff?: { id?: string; profiles?: { full_name?: string } };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  severity?: 'critical' | 'warning' | 'normal' | 'success';
  loading?: boolean;
}

// ---------- Enhanced UI Components ----------

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change = 0,
  icon: Icon,
  subtitle,
  severity = 'normal',
  loading = false
}) => {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  const styles = {
    critical: { 
      gradient: 'from-red-500 to-red-600', 
      bg: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800'
    },
    warning: { 
      gradient: 'from-amber-500 to-amber-600', 
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800'
    },
    success: { 
      gradient: 'from-green-500 to-emerald-600', 
      bg: 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-green-900',
      icon: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800'
    },
    normal: { 
      gradient: 'from-blue-500 to-indigo-600', 
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
  }[severity];

  const TrendIcon = isNeutral ? Minus : isPositive ? ArrowUp : ArrowDown;

  return (
    <Card className={`border ${styles.border} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <CardContent className="p-6 relative">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${styles.bg} shadow-md`}>
            <Icon className={`h-6 w-6 ${styles.icon}`} />
          </div>
          {change !== 0 && (
            <Badge 
              variant="outline" 
              className={`${
                isPositive 
                  ? 'text-green-700 bg-green-100 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' 
                  : 'text-red-700 bg-red-100 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
              } font-semibold`}
            >
              <TrendIcon className="h-3 w-3 mr-1" />
              {Math.abs(change).toFixed(1)}%
            </Badge>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {loading ? (
              <span className="inline-block h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              value
            )}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 backdrop-blur-sm">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-bold" style={{ color: entry.color }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ---------- Enhanced View Components ----------

const PredictiveAnalyticsView: React.FC<{ data: any[], stats: any }> = ({ data, stats }) => {
  const chartData = useMemo(() => {
    return data.map(d => ({
      date: d.dateShort,
      actual: d.liters,
      forecast: d.forecast,
      lowerBound: Math.max(0, d.forecast - (stats.stdDev * 1.5)),
      upperBound: d.forecast + (stats.stdDev * 1.5),
    }));
  }, [data, stats]);

  const confidence = useMemo(() => {
    const mape = data.reduce((sum, d, i) => {
      if (i === 0 || !d.forecast) return sum;
      return sum + Math.abs((d.liters - d.forecast) / d.liters);
    }, 0) / Math.max(1, data.length - 1);
    return Math.max(0, Math.min(100, (1 - mape) * 100));
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Model Accuracy</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{confidence.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Forecast Horizon</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">3 Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Anomalies Detected</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.anomalies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Growth Rate</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {(stats.trendSlope * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
          <CardHeader className="border-b dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-purple-500" />
              Volume Forecast & Confidence Interval
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                  <defs>
                    <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={{ stroke: '#e5e7eb' }}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={{ stroke: '#e5e7eb' }}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="upperBound" 
                    stroke="none" 
                    fill="url(#confidenceGradient)" 
                    fillOpacity={1}
                    name="Confidence Band"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lowerBound" 
                    stroke="none" 
                    fill="#fff" 
                    fillOpacity={1}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecast" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    dot={false} 
                    name="Forecast"
                    strokeDasharray="5 5"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                    name="Actual Volume"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
          <CardHeader className="border-b dark:border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Anomaly Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3 max-h-[352px] overflow-y-auto">
              {stats.anomalies.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Award className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No anomalies detected</p>
                  <p className="text-xs text-gray-400 mt-1">All collections within normal range</p>
                </div>
              ) : (
                stats.anomalies.slice(0, 8).map((anomaly: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="group flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50 rounded-lg border border-red-200 dark:border-red-900/50 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {new Date(anomaly.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {Math.abs(anomaly.zScore).toFixed(2)}σ deviation
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-red-700 dark:text-red-300 text-sm">
                        {safeNumber(anomaly.liters).toFixed(0)}L
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-0 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="border-b dark:border-gray-700">
          <CardTitle className="text-lg">Statistical Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">Mean Volume</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {safeNumber(stats.meanVolume).toFixed(0)}L
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase mb-1">Std Deviation</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {safeNumber(stats.stdDev).toFixed(1)}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase mb-1">Variance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {safeNumber(stats.variance).toFixed(0)}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase mb-1">Trend Slope</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {safeNumber(stats.trendSlope).toFixed(3)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.trendSlope > 0 ? "↗ Growing" : "↘ Declining"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const PerformanceView: React.FC<{ collections: Collection[] }> = ({ collections }) => {
    const farmerPerformance = useMemo(() => {
        const stats: Record<string, { name: string; total: number; count: number; revenue: number }> = {};
        collections.forEach(c => {
            const id = c.farmer_id;
            if(!stats[id]) stats[id] = { name: c.farmers?.profiles?.full_name || `Farmer ${id.slice(0,6)}`, total: 0, count: 0, revenue: 0 };
            stats[id].total += safeNumber(c.liters);
            stats[id].count += 1;
            stats[id].revenue += safeNumber(c.total_amount);
        });
        return Object.values(stats)
            .sort((a,b) => b.total - a.total)
            .slice(0, 10); 
    }, [collections]);

    const topFarmer = farmerPerformance[0];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {topFarmer && (
            <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950 dark:via-yellow-950 dark:to-orange-950 border-2 border-amber-200 dark:border-amber-800 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg">
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Top Performer</p>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{topFarmer.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {topFarmer.count} collections • KES {topFarmer.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">{topFarmer.total.toLocaleString()}L</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                <CardHeader className="border-b dark:border-gray-800">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-indigo-500" />
                        Top Producing Farmers
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              layout="vertical" 
                              data={farmerPerformance} 
                              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <defs>
                                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                                <XAxis type="number" hide />
                                <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={120} 
                                  tick={{fontSize: 12, fill: '#6b7280'}}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar 
                                  dataKey="total" 
                                  fill="url(#barGradient)" 
                                  radius={[0, 8, 8, 0]} 
                                  barSize={24} 
                                  name="Liters"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                <CardHeader className="border-b dark:border-gray-800">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      Farmer Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {farmerPerformance.slice(0, 5).map((farmer, idx) => {
                            const percentage = (farmer.total / farmerPerformance[0].total) * 100;
                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                                idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                                idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                                idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                                'bg-gradient-to-br from-blue-400 to-indigo-500'
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                                {farmer.name}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {farmer.total.toLocaleString()}L
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
);
};

// ---------- Main Component ----------

const CollectionsAnalyticsDashboard: React.FC = () => {
  const toast = useToastNotifications();
  useSessionRefresh({ refreshInterval: 90 * 60 * 1000 });

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30days');
  const [statusFilter, setStatusFilter] = useState('all');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { 
    useCollections, 
    exportToCSV,
    refreshCollections 
  } = useCollectionAnalyticsData() || {};

  const filterDate = useMemo(() => {
    const d = new Date();
    if (dateRange === '7days') d.setDate(d.getDate() - 7);
    if (dateRange === '30days') d.setDate(d.getDate() - 30);
    if (dateRange === '90days') d.setDate(d.getDate() - 90);
    if (dateRange === 'all') return '2020-01-01'; 
    return d.toISOString();
  }, [dateRange]);

  const { 
    data: rawCollections = [], 
    isLoading, 
    error 
  } = useCollections?.(filterDate) || { data: [], isLoading: false, error: null };

  // Log for debugging
  console.log('CollectionsAnalyticsDashboard state:', { rawCollections, isLoading, error });

  const showLoading = useLoadingDelay(isLoading, 300);

  // Advanced Memoized Analytics Processing
  const analyticsData = useMemo(() => {
    if (!rawCollections || rawCollections.length === 0) return null;

    // 1. Filtering
    let filtered = rawCollections.filter((c: Collection) => {
      const matchesSearch = !debouncedSearchTerm || 
        c.farmers?.profiles?.full_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        c.collection_id?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || c.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });

    // 2. Aggregations
    const dailyMap = filtered.reduce((acc: any, curr: Collection) => {
        const dateKey = new Date(curr.collection_date).toISOString().split('T')[0];
        if (!acc[dateKey]) {
            acc[dateKey] = { date: curr.collection_date, dateShort: dateKey, liters: 0, revenue: 0, count: 0 };
        }
        acc[dateKey].liters += safeNumber(curr.liters);
        acc[dateKey].revenue += safeNumber(curr.total_amount);
        acc[dateKey].count += 1;
        return acc;
    }, {});

    const sortedDaily = Object.values(dailyMap).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    ) as any[];

    // 3. Statistical Calculations
    const litersArray = sortedDaily.map(d => d.liters);
    const meanVolume = calculateMean(litersArray);
    const stdDev = calculateStdDev(litersArray, meanVolume);
    const variance = Math.pow(stdDev, 2);
    const trendSlope = calculateLinearTrend(litersArray);

    // 4. SMA Forecast & Anomaly Detection
    const sma = calculateSMA(litersArray, 3);
    
    const processedDaily = sortedDaily.map((d, i) => {
        const zScore = stdDev === 0 ? 0 : (d.liters - meanVolume) / stdDev;
        return {
            ...d,
            forecast: sma[i] || d.liters,
            zScore,
            isAnomaly: Math.abs(zScore) > 2
        };
    });

    const anomalies = processedDaily.filter(d => d.isAnomaly);
    const totalRevenue = filtered.reduce((s: number, c: Collection) => s + safeNumber(c.total_amount), 0);
    const totalLiters = filtered.reduce((s: number, c: Collection) => s + safeNumber(c.liters), 0);

    // Calculate previous period for comparison
    const halfPoint = Math.floor(sortedDaily.length / 2);
    const recentPeriod = sortedDaily.slice(halfPoint);
    const previousPeriod = sortedDaily.slice(0, halfPoint);
    
    const recentAvg = calculateMean(recentPeriod.map(d => d.liters));
    const previousAvg = calculateMean(previousPeriod.map(d => d.liters));
    const volumeChange = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    const recentRevenue = recentPeriod.reduce((s, d) => s + d.revenue, 0);
    const previousRevenue = previousPeriod.reduce((s, d) => s + d.revenue, 0);
    const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
        collections: filtered,
        daily: processedDaily,
        totalRevenue,
        totalLiters,
        totalCount: filtered.length,
        volumeChange,
        revenueChange,
        stats: { meanVolume, stdDev, variance, trendSlope, anomalies }
    };

  }, [rawCollections, debouncedSearchTerm, statusFilter]);

  const handleExport = useCallback(async () => {
    try {
        if(!exportToCSV || !analyticsData?.collections) throw new Error("Export unavailable");
        await exportToCSV.mutateAsync(analyticsData.collections);
        toast.success('Export Successful', 'CSV has been downloaded.');
    } catch (err) {
        toast.error('Export Failed', 'Could not generate CSV.');
    }
  }, [exportToCSV, analyticsData, toast]);

  const handleRefresh = () => {
    refreshCollections?.mutate ? refreshCollections.mutate() : window.location.reload();
  };

  if (error) {
    console.error('CollectionsAnalyticsDashboard error:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Error Loading Analytics</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {error.message || 'Failed to load analytics data. Please try again later.'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show loading skeleton even if we have data but still loading
  if (showLoading) return <div className="p-6"><CollectionsSkeleton /></div>;
  
  // If we're not loading but have no data, show skeleton or empty state
  if (!analyticsData) return <div className="p-6"><CollectionsSkeleton /></div>;

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                        <BarChart3 className="h-7 w-7 text-white" />
                    </div>
                    Analytics Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 ml-1">
                    Real-time collection insights and statistical modeling
                </p>
                <Link to="/admin/farmer-collections" className="inline-flex items-center mt-2 ml-1 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                    View Farmer Collections <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    className="border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleExport} 
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
                >
                    <Download className="mr-2 h-4 w-4" /> Export Report
                </Button>
            </div>
        </div>

        {/* Filters Bar */}
        <Card className="border-0 shadow-md bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                        placeholder="Search farmers, collection IDs..." 
                        className="pl-10 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last Quarter</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

        {/* View Tabs */}
        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 max-w-[450px] h-12 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
                    Overview
                </TabsTrigger>
                <TabsTrigger value="predictive" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
                    Predictive
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
                    Performance
                </TabsTrigger>
            </TabsList>

            {/* Overview Content */}
            <div className="mt-6 space-y-6">
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard 
                                title="Total Volume" 
                                value={`${analyticsData.totalLiters.toLocaleString()} L`} 
                                change={analyticsData.volumeChange} 
                                icon={Droplet}
                                severity="normal"
                                subtitle="Last period comparison"
                            />
                            <MetricCard 
                                title="Revenue" 
                                value={`KES ${analyticsData.totalRevenue.toLocaleString()}`} 
                                change={analyticsData.revenueChange} 
                                icon={DollarSign}
                                severity="success"
                                subtitle="Total collections value"
                            />
                            <MetricCard 
                                title="Collections" 
                                value={analyticsData.totalCount} 
                                change={0} 
                                icon={FileText}
                                severity="normal"
                                subtitle="Total transactions"
                            />
                            <MetricCard 
                                title="Avg Daily Vol" 
                                value={`${analyticsData.stats.meanVolume.toFixed(0)} L`} 
                                subtitle={`σ: ${analyticsData.stats.stdDev.toFixed(1)}`}
                                icon={Activity}
                                severity="normal"
                            />
                        </div>

                        <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                            <CardHeader className="border-b dark:border-gray-800">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                                    Collection Trends Over Time
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsData.daily} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                                            <defs>
                                                <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis 
                                                dataKey="dateShort" 
                                                axisLine={{ stroke: '#e5e7eb' }} 
                                                tickLine={false} 
                                                tick={{fill: '#6b7280', fontSize: 12}} 
                                                minTickGap={30} 
                                            />
                                            <YAxis 
                                                axisLine={{ stroke: '#e5e7eb' }} 
                                                tickLine={false}
                                                tick={{fill: '#6b7280', fontSize: 12}}
                                            />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area 
                                                type="monotone" 
                                                dataKey="liters" 
                                                stroke="#6366f1" 
                                                fillOpacity={1} 
                                                fill="url(#colorLiters)" 
                                                strokeWidth={3}
                                                name="Volume (L)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                                <CardHeader className="border-b dark:border-gray-800">
                                    <CardTitle className="text-lg">Daily Revenue</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.daily} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                                                <defs>
                                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                                                        <stop offset="95%" stopColor="#059669" stopOpacity={0.9}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                                <XAxis 
                                                    dataKey="dateShort" 
                                                    tick={{fill: '#6b7280', fontSize: 11}} 
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    tick={{fill: '#6b7280', fontSize: 11}}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    tickLine={false}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar 
                                                    dataKey="revenue" 
                                                    fill="url(#revenueGradient)" 
                                                    radius={[8, 8, 0, 0]}
                                                    name="Revenue (KES)"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                                <CardHeader className="border-b dark:border-gray-800">
                                    <CardTitle className="text-lg">Collection Frequency</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={analyticsData.daily} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                                                <XAxis 
                                                    dataKey="dateShort" 
                                                    tick={{fill: '#6b7280', fontSize: 11}}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    tick={{fill: '#6b7280', fontSize: 11}}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    tickLine={false}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="count" 
                                                    stroke="#f59e0b" 
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                                                    name="Collections"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'predictive' && (
                    <PredictiveAnalyticsView data={analyticsData.daily} stats={analyticsData.stats} />
                )}

                {activeTab === 'performance' && (
                    <PerformanceView collections={analyticsData.collections} />
                )}
            </div>
        </Tabs>

      </div>
  );
};

export default CollectionsAnalyticsDashboard;