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
  CheckCircle,
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
              className={`${isPositive
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

// ---------- Advanced Forecasting Helpers ----------

const calculateSeasonality = (data: any[]) => {
  if (data.length < 14) return null; // Need at least 2 weeks for seasonality

  const dayTotals = new Array(7).fill(0);
  const dayCounts = new Array(7).fill(0);
  let globalSum = 0;
  let globalCount = 0;

  data.forEach(d => {
    const day = new Date(d.date).getDay(); // 0 = Sun, 6 = Sat
    dayTotals[day] += safeNumber(d.liters);
    dayCounts[day] += 1;
    globalSum += safeNumber(d.liters);
    globalCount += 1;
  });

  const globalAvg = globalSum / globalCount;
  const indices = dayTotals.map((total, i) => {
    const dayAvg = dayCounts[i] > 0 ? total / dayCounts[i] : 0;
    return globalAvg > 0 ? dayAvg / globalAvg : 1;
  });

  return indices;
};

const PredictiveAnalyticsView: React.FC<{ data: any[], stats: any }> = ({ data, stats }) => {
  const [forecastDays, setForecastDays] = useState(30);
  const [useSeasonality, setUseSeasonality] = useState(true);
  const [growthScenario, setGrowthScenario] = useState(0); // -50 to +50 percent adjustment

  const seasonalityIndices = useMemo(() => calculateSeasonality(data), [data]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Process historical data
    const historical = data.map(d => ({
      date: d.dateShort,
      actual: d.liters,
      forecast: null, // Don't overlay simple forecast on history in this advanced view
      lowerBound: null,
      upperBound: null,
      isPredicted: false
    }));

    const lastPoint = data[data.length - 1];
    if (!lastPoint) return historical;

    const lastDate = new Date(lastPoint.date);
    // Use SMA of last 3 days as baseline to smooth out single-day spikes
    const baseline = data.slice(-3).reduce((sum, d) => sum + d.liters, 0) / 3;

    // Determine base slope from stats
    // Apply scenario adjustment: growthScenario is a % change over the forecast period/trend
    // If stats.trendSlope is volume/day. 
    // We treat growthScenario as an ADDITIONAL percentage modifier to the slope.
    // e.g., if slope is 10L/day, and we want +10% acceleration, we might scale it.
    // Simpler: Adjust the monthly growth rate. 

    // Existing daily trend
    const baseSlope = stats.trendSlope || 0;

    // Scenario bias: Add (Baseline * (Percentage/100)) / 30 days to the daily slope
    // e.g. If we want 10% growth over a month, that's Baseline * 0.1 total increase, spread over 30 days.
    const scenarioReviewSlope = (baseline * (growthScenario / 100)) / 30;

    const finalSlope = baseSlope + scenarioReviewSlope;

    const future = [];
    for (let i = 1; i <= forecastDays; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i);

      // 1. Linear Trend Projection
      let predictedValue = Math.max(0, baseline + (finalSlope * i));

      // 2. Apply Seasonality
      if (useSeasonality && seasonalityIndices) {
        const dayOfWeek = nextDate.getDay();
        const seasonalFactor = seasonalityIndices[dayOfWeek];
        // Blend linear prediction with seasonal factor
        // We apply the factor to the predicted value
        predictedValue = predictedValue * seasonalFactor;
      }

      // 3. Uncertainty (Width of shadow)
      // Increases with time and with the magnitude of scenario adjustment
      const uncertaintyBase = stats.stdDev * 1.5;
      const timePenalty = i * 0.05 * stats.stdDev;
      const scenarioUncertainty = Math.abs(growthScenario) * 0.5; // More manual tweaking = more uncertainty

      const totalUncertainty = uncertaintyBase + timePenalty + scenarioUncertainty;

      future.push({
        date: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: null,
        forecast: predictedValue,
        lowerBound: Math.max(0, predictedValue - totalUncertainty),
        upperBound: predictedValue + totalUncertainty,
        isPredicted: true
      });
    }

    return [...historical, ...future];
  }, [data, stats, forecastDays, useSeasonality, growthScenario, seasonalityIndices]);

  const projectedGrowth = useMemo(() => {
    if (!chartData.length) return 0;
    const start = chartData.find(d => d.isPredicted)?.forecast || 0;
    const end = chartData[chartData.length - 1]?.forecast || 0;
    return start > 0 ? ((end - start) / start) * 100 : 0;
  }, [chartData]);

  const hasSeasonalityData = data.length >= 14;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Controls Bar */}
      <Card className="bg-slate-50 dark:bg-slate-900 border-indigo-100 dark:border-indigo-900">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">

            {/* Horizon Controls */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Forecast Horizon</label>
              <div className="flex bg-white dark:bg-black rounded-lg border p-1">
                {[7, 14, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setForecastDays(days)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${forecastDays === days
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Slider */}
            <div className="flex-1 w-full max-w-sm space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                  What-If Growth Scenario
                  {growthScenario !== 0 && (
                    <Badge variant={growthScenario > 0 ? 'default' : 'destructive'} className="h-5 px-1.5 text-[10px]">
                      {growthScenario > 0 ? '+' : ''}{growthScenario}%
                    </Badge>
                  )}
                </label>
                <span className="text-xs text-gray-500">{growthScenario}%</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                value={growthScenario}
                onChange={(e) => setGrowthScenario(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Conservative (-30%)</span>
                <span>Neutral</span>
                <span>Aggressive (+30%)</span>
              </div>
            </div>

            {/* Seasonality Toggle */}
            <div className={`flex items-center gap-3 bg-white dark:bg-black p-2 rounded-lg border ${!hasSeasonalityData ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className={`p-2 rounded-md ${useSeasonality && hasSeasonalityData ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Seasonality</span>
                <span className="text-[10px] text-gray-500">
                  {!hasSeasonalityData ? 'Insuff. Data' : (useSeasonality ? 'On' : 'Off')}
                </span>
              </div>
              <div
                onClick={() => hasSeasonalityData && setUseSeasonality(!useSeasonality)}
                className={`w-10 h-5 rounded-full relative transition-colors ${!hasSeasonalityData ? 'cursor-not-allowed bg-gray-200' : 'cursor-pointer'} ${useSeasonality && hasSeasonalityData ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${useSeasonality && hasSeasonalityData ? 'left-5.5' : 'left-0.5'}`} style={{ transform: useSeasonality && hasSeasonalityData ? 'translateX(100%)' : 'translateX(0)' }} />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Metric Cards Updated for Scenario Context */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Projected Volume (End)</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {safeNumber(chartData[chartData.length - 1]?.forecast).toFixed(0)} <span className="text-sm font-normal text-gray-500">L</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Scenario Impact</p>
            <div className="flex items-end gap-2 mt-1">
              <p className={`text-2xl font-bold ${projectedGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {projectedGrowth > 0 ? '+' : ''}{projectedGrowth.toFixed(1)}%
              </p>
              <TrendingUp className={`h-5 w-5 mb-1 ${projectedGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Model Certainty</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(Math.max(0, 100 - (forecastDays * 0.5) - Math.abs(growthScenario))).toFixed(0)}%
              </p>
              <Target className="h-5 w-5 mb-1 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Seasonality Factor</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {useSeasonality && hasSeasonalityData ? 'Active' : 'Disabled'}
              </p>
              <Activity className={`h-5 w-5 mb-1 ${useSeasonality && hasSeasonalityData ? 'text-indigo-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-1 lg:col-span-2 shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
        <CardHeader className="border-b dark:border-gray-800 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-purple-500" />
            Predictive Model: {forecastDays} Day Outlook
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {useSeasonality && hasSeasonalityData ? 'Seasonality Adjusted' : 'Linear Trend'}
            </Badge>
            {growthScenario !== 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Scenario: {growthScenario > 0 ? '+' : ''}{growthScenario}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[400px] w-full" key={`${forecastDays}-${growthScenario}-${useSeasonality}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                <defs>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                {/* Confidence Interval Area */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="url(#confidenceGradient)"
                  fillOpacity={1}
                  name="Confidence Range"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="#fff"
                  fillOpacity={1}
                />

                {/* Historical Line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                  name="Historical Data"
                  connectNulls
                />

                {/* Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="url(#forecastLineGradient)"
                  strokeWidth={3}
                  dot={false}
                  name="Scenario Forecast"
                  strokeDasharray="4 4"
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Explanation / insights panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900">
          <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Seasonality Detected
          </h4>
          <p className="text-sm text-indigo-700 dark:text-indigo-400">
            {useSeasonality && seasonalityIndices
              ? "The model is currently adjusting predictions based on day-of-week patterns found in your historical data."
              : "Seasonality adjustments are currently disabled. Identify weekly patterns by enabling seasonality."}
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900">
          <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Scenario Modeling
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {growthScenario !== 0
              ? `You are modeling a ${growthScenario > 0 ? 'positive' : 'negative'} ${Math.abs(growthScenario)}% deviation from the current baseline trend.`
              : "Simulate market changes, marketing campaigns, or adverse weather by adjusting the growth slider above."}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" /> Confidence Score
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Prediction confidence naturally decreases over longer time horizons. The shaded area represents the probable range of values (95% confidence interval).
          </p>
        </div>
      </div>

    </div>
  );
};

const PerformanceView: React.FC<{ collections: Collection[] }> = ({ collections }) => {
  const [filter, setFilter] = useState<'all' | 'top' | 'risk'>('all');

  const performanceData = useMemo(() => {
    if (!collections.length) return { leaders: [], dragging: [], all: [], stats: {} };

    // 1. Timebox Analysis
    const dates = collections.map(c => new Date(c.collection_date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const timeSpan = maxDate - minDate;
    const midPoint = maxDate - (timeSpan / 2); // Split time range in half for trend analysis

    const farmerMap: Record<string, {
      id: string;
      name: string;
      totalVol: number;
      revenue: number;
      count: number;
      volPeriodA: number; // Older half
      volPeriodB: number; // Newer half
      lastSeen: number;
    }> = {};

    collections.forEach(c => {
      const id = c.farmer_id;
      const date = new Date(c.collection_date).getTime();

      if (!farmerMap[id]) {
        farmerMap[id] = {
          id,
          name: c.farmers?.profiles?.full_name || `Farmer ${id.slice(0, 6)}`,
          totalVol: 0,
          revenue: 0,
          count: 0,
          volPeriodA: 0,
          volPeriodB: 0,
          lastSeen: 0
        };
      }

      const f = farmerMap[id];
      f.totalVol += safeNumber(c.liters);
      f.revenue += safeNumber(c.total_amount);
      f.count += 1;
      f.lastSeen = Math.max(f.lastSeen, date);

      if (date >= midPoint) {
        f.volPeriodB += safeNumber(c.liters);
      } else {
        f.volPeriodA += safeNumber(c.liters);
      }
    });

    // 2. Metric Calculation
    const analyzed = Object.values(farmerMap).map(f => {
      // Normalize trend: Compare average volume per half-period (approx)
      // Simple trend: VolB vs VolA. 
      // Note: If VolA is 0 (new farmer), trend is 100%. 
      let trend = 0;
      if (f.volPeriodA > 0) {
        trend = ((f.volPeriodB - f.volPeriodA) / f.volPeriodA) * 100;
      } else if (f.volPeriodB > 0) {
        trend = 100; // New growth
      }

      // Classification
      let status: 'top' | 'good' | 'stable' | 'risk' | 'critical' = 'stable';

      if (trend < -20) status = 'critical';
      else if (trend < -5) status = 'risk';
      else if (trend > 20) status = 'top';
      else if (trend > 5) status = 'good';

      return { ...f, trend, status };
    });

    // 3. Sorting & Segmentation
    const sortedByVol = [...analyzed].sort((a, b) => b.totalVol - a.totalVol);
    const sortedByTrend = [...analyzed].sort((a, b) => b.trend - a.trend);
    const sortedByDrop = [...analyzed].sort((a, b) => a.trend - b.trend);

    const leaders = sortedByVol.slice(0, 5);
    const topGainers = sortedByTrend.slice(0, 3);
    const biggestDrops = sortedByDrop.filter(f => f.trend < 0).slice(0, 5);

    // Most consistent? (High count)
    const mostConsistent = [...analyzed].sort((a, b) => b.count - a.count)[0];

    return {
      all: sortedByVol,
      leaders,
      topGainers,
      biggestDrops, // "Doing Bad"
      stats: {
        topGainer: topGainers[0],
        biggestDrop: biggestDrops[0],
        mostConsistent,
        totalActive: analyzed.length
      }
    };
  }, [collections]);

  const { leaders, biggestDrops, all, stats } = performanceData;

  const filteredList = useMemo(() => {
    if (filter === 'top') return all.filter(f => ['top', 'good'].includes(f.status));
    if (filter === 'risk') return all.filter(f => ['risk', 'critical'].includes(f.status));
    return all;
  }, [all, filter]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. High-Level Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Top Gainer</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[140px]">
                  {stats.topGainer?.name || 'N/A'}
                </h3>
                <Badge className="bg-green-600 mt-2">+{stats.topGainer?.trend.toFixed(0)}% Growth</Badge>
              </div>
              <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-700 dark:text-green-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950 dark:to-orange-900 border-red-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">Biggest Drop</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[140px]">
                  {stats.biggestDrop?.name || 'N/A'}
                </h3>
                {stats.biggestDrop && (
                  <Badge variant="destructive" className="mt-2">{stats.biggestDrop.trend.toFixed(0)}% Decline</Badge>
                )}
              </div>
              <div className="p-2 bg-red-200 dark:bg-red-800 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-700 dark:text-red-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Most Consistent</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[140px]">
                  {stats.mostConsistent?.name || 'N/A'}
                </h3>
                <div className="flex items-center gap-1 mt-2 text-xs text-blue-700 dark:text-blue-300 font-medium">
                  <CheckCircle className="h-3 w-3" /> {stats.mostConsistent?.count} Collections
                </div>
              </div>
              <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                <Target className="h-5 w-5 text-blue-700 dark:text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Total Active</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalActive}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 mt-4 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: '100%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 2. Top Performers Visual */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Performing Farmers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaders.map((farmer, idx) => (
                <div key={farmer.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm
                                ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-indigo-500'}
                            `}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{farmer.name}</p>
                      <p className="text-xs text-gray-500">Vol: {farmer.totalVol.toLocaleString()}L</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">KES {farmer.revenue.toLocaleString()}</p>
                    <div className="flex items-center justify-end gap-1 text-xs text-green-600 font-medium">
                      <TrendingUp className="h-3 w-3" />
                      {farmer.trend > 0 ? '+' : ''}{farmer.trend.toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. At Risk / Needs Attention */}
        <Card className="shadow-lg border-0 border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Needs Attention (Declining Trend)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {biggestDrops.length === 0 ? (
              <div className="text-center py-10">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-gray-600 font-medium">All Clean!</p>
                <p className="text-xs text-gray-400">No significant declines detected recently.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {biggestDrops.map((farmer) => (
                  <div key={farmer.id} className="group p-3 rounded-lg border border-red-100 bg-red-50 dark:bg-red-900/10 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{farmer.name}</span>
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {farmer.trend.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Prev Vol: {farmer.volPeriodA.toFixed(0)}L</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">Curr Vol: {farmer.volPeriodB.toFixed(0)}L</span>
                    </div>
                    <div className="w-full bg-red-200 dark:bg-red-900 h-1 mt-2 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (farmer.volPeriodB / Math.max(1, farmer.volPeriodA)) * 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Detailed Data Table */}
      <Card className="shadow-xl border-0 overflow-hidden">
        <CardHeader className="bg-gray-50 dark:bg-gray-900/50 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Detailed Farmer Performance</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="h-8 text-xs"
            >
              All
            </Button>
            <Button
              variant={filter === 'top' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('top')}
              className={`h-8 text-xs ${filter === 'top' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              Top Performers
            </Button>
            <Button
              variant={filter === 'risk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('risk')}
              className={`h-8 text-xs ${filter === 'risk' ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              At Risk
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-black/20">
              <tr>
                <th className="px-6 py-3 font-medium">Farmer</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Total Volume</th>
                <th className="px-6 py-3 font-medium text-right">Trend</th>
                <th className="px-6 py-3 font-medium text-right">Revenue</th>
                <th className="px-6 py-3 font-medium text-center">Collections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredList.slice(0, 10).map((row) => (
                <tr key={row.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="px-6 py-4">
                    {row.status === 'top' && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">Star</Badge>}
                    {row.status === 'good' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">Growing</Badge>}
                    {row.status === 'stable' && <Badge variant="outline" className="text-gray-500">Stable</Badge>}
                    {row.status === 'risk' && <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-0">Declining</Badge>}
                    {row.status === 'critical' && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0">Critical</Badge>}
                  </td>
                  <td className="px-6 py-4 text-right font-bold">{row.totalVol.toLocaleString()} L</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`flex items-center justify-end gap-1 ${row.trend > 0 ? 'text-green-600' : row.trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {row.trend > 0 ? <ArrowUp className="h-3 w-3" /> : row.trend < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {Math.abs(row.trend).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">KES {row.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-gray-500">{row.count}</td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No farmers found matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredList.length > 10 && (
          <div className="p-4 border-t text-center text-xs text-gray-500">
            Showing top 10 of {filteredList.length} results
          </div>
        )}
      </Card>

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
      if (!exportToCSV || !analyticsData?.collections) throw new Error("Export unavailable");
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
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="dateShort"
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          minTickGap={30}
                        />
                        <YAxis
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
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
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.9} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                          <XAxis
                            dataKey="dateShort"
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: '#6b7280', fontSize: 11 }}
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
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: '#6b7280', fontSize: 11 }}
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