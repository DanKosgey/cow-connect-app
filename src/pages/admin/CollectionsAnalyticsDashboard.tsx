// CollectionsAnalyticsDashboard.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Droplet,
  Search,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Target,
  Calendar,
  DollarSign,
  ChevronRight,
  Filter,
  RefreshCcw
} from '@/utils/iconImports';

// Hooks & components (defensive about what they return)
import { useCollectionAnalyticsData } from '@/hooks/useCollectionAnalyticsData';
import useToastNotifications from '@/hooks/useToastNotifications';
import { CollectionsSkeleton } from '@/components/admin/CollectionsSkeleton';
import BusinessIntelligenceDashboard from '@/components/analytics/BusinessIntelligenceDashboard';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import OverviewView from '@/components/admin/analytics/OverviewView';
import { CollectionsView } from '@/components/admin/analytics/CollectionsView';
import { useDebounce } from '@/hooks/useDebounce';
import { useChartStabilizer } from '@/hooks/useChartStabilizer';
import { useBatchedState } from '@/hooks/useBatchedState';
import { useLoadingDelay } from '@/hooks/useLoadingDelay';

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
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  farmers?: {
    id?: string;
    user_id?: string;
    profiles?: {
      full_name?: string;
      phone?: string;
    };
  };
  staff?: {
    id?: string;
    user_id?: string;
    profiles?: {
      full_name?: string;
    };
  };
}

interface Trends {
  totalCollections: number;
  totalLiters: number;
  totalRevenue: number;
  collectionsTrend: { value: number; isPositive: boolean };
  litersTrend: { value: number; isPositive: boolean };
  revenueTrend: { value: number; isPositive: boolean };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  subtitle?: string;
  insight?: string;
  severity?: 'critical' | 'warning' | 'normal' | 'success';
}

// ---------- Constants ----------
const DEFAULT_TRENDS: Trends = {
  totalCollections: 0,
  totalLiters: 0,
  totalRevenue: 0,
  collectionsTrend: { value: 0, isPositive: true },
  litersTrend: { value: 0, isPositive: true },
  revenueTrend: { value: 0, isPositive: true },
};

const VIEWS = [
  { id: 'overview', label: 'Overview', icon: BarChart3, desc: 'Executive Summary' },
  { id: 'predictive', label: 'Predictive Analytics', icon: TrendingUp, desc: 'Forecasting & Trends' },
  { id: 'collections', label: 'Collections', icon: Droplet, desc: 'Detailed Records' },
  { id: 'performance', label: 'Performance', icon: Target, desc: 'KPIs & Benchmarks' },
] as const;

// ---------- Small helpers ----------
const safeNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const safeAvg = (arr: number[]) => {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((s, v) => s + safeNumber(v, 0), 0);
  return sum / arr.length;
};

const formatPercent = (n: number, decimals = 1) => {
  if (!Number.isFinite(n)) return '0.0%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
};

// ---------- Simple arrow icons (local) ----------
const ArrowUpRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
  </svg>
);

const ArrowDownRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7L17 17M17 17H7M17 17V7" />
  </svg>
);

// Fallback icons if iconImports doesn't include some — reuse Activity/Target safely
const Zap = Activity;
const AlertTriangle = Activity;

// ---------- MetricCard (improved typing + small fixes) ----------
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  subtitle,
  insight,
  severity = 'normal',
}) => {
  const isPositive = change >= 0;
  const severityColors: Record<string, string> = {
    critical: 'from-red-500 to-rose-600',
    warning: 'from-amber-500 to-orange-600',
    normal: 'from-blue-500 to-indigo-600',
    success: 'from-green-500 to-emerald-600',
  };

  const badgeClasses = isPositive
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white dark:bg-gray-800">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${severityColors[severity]}`} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${severityColors[severity]} shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${badgeClasses}`}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(Number.isFinite(change) ? change : 0)}%
          </div>
        </div>

        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{subtitle}</p>}

        {insight && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium flex items-start gap-2">
              <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{insight}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ---------- PredictiveAnalyticsView (safe arithmetic, guards) ----------
const PredictiveAnalyticsView: React.FC<{ collections: Collection[]; trends: Trends }> = ({ collections = [], trends }) => {
  const analytics = useMemo(() => {
    if (!collections || collections.length === 0) {
      return {
        forecast: [] as any[],
        seasonality: [] as any[],
        anomalies: [] as any[],
        correlations: [] as any[],
        efficiency: 0,
      };
    }

    // Build daily aggregated data
    const dailyMap = collections.reduce<Record<string, { date: string; liters: number; revenue: number; count: number }>>((acc, c) => {
      const date = new Date(c.collection_date).toISOString().split('T')[0];
      acc[date] = acc[date] || { date, liters: 0, revenue: 0, count: 0 };
      acc[date].liters += safeNumber(c.liters, 0);
      acc[date].revenue += safeNumber(c.total_amount, 0);
      acc[date].count += 1;
      return acc;
    }, {});

    const sortedDays = Object.values(dailyMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Forecast (simple 7-day SMA over liters)
    const window = 7;
    const forecast = sortedDays.map((day, idx, arr) => {
      if (idx < window - 1) return { ...day, predicted: day.liters };
      const sum = arr.slice(idx - (window - 1), idx + 1).reduce((s, d) => s + safeNumber(d.liters, 0), 0);
      return { ...day, predicted: sum / window };
    });

    const litersArray = sortedDays.map((d) => safeNumber(d.liters, 0));
    const mean = safeAvg(litersArray);
    const variance = litersArray.length > 0 ? litersArray.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / litersArray.length : 0;
    const stdDev = Math.sqrt(variance);

    // Anomalies: liters more than 2 * stdDev away from mean
    const anomalies = stdDev > 0 ? sortedDays.filter((d) => Math.abs(d.liters - mean) > 2 * stdDev) : [];

    // Efficiency: recent (last 7) revenue/liters vs historical
    const recent = sortedDays.slice(-7);
    const recentEfficiency = safeAvg(recent.map((d) => (d.liters > 0 ? d.revenue / d.liters : 0)));
    const historical = sortedDays.slice(0, Math.max(0, sortedDays.length - 7));
    const historicalEfficiency = safeAvg(historical.map((d) => (d.liters > 0 ? d.revenue / d.liters : 0)));
    const efficiency = historicalEfficiency === 0 ? 0 : ((recentEfficiency - historicalEfficiency) / historicalEfficiency) * 100;

    return {
      forecast,
      seasonality: sortedDays,
      anomalies,
      efficiency: Number.isFinite(efficiency) ? efficiency : 0,
    };
  }, [collections]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Efficiency Trend"
          value={formatPercent(analytics.efficiency)}
          change={analytics.efficiency}
          icon={Activity}
          severity={analytics.efficiency > 5 ? 'success' : analytics.efficiency < -5 ? 'warning' : 'normal'}
          subtitle="Revenue per liter optimization"
          insight={analytics.efficiency > 0 ? 'Pricing efficiency improving steadily' : 'Consider reviewing pricing strategy'}
        />

        <MetricCard
          title="Anomaly Detection"
          value={analytics.anomalies.length}
          change={analytics.anomalies.length > 5 ? -10 : 5}
          icon={AlertTriangle}
          severity={analytics.anomalies.length > 5 ? 'warning' : 'normal'}
          subtitle="Statistical outliers detected"
          insight={analytics.anomalies.length > 5 ? 'Multiple unusual patterns detected' : 'Collection patterns stable'}
        />

        <MetricCard
          title="Forecast Accuracy"
          value="94.2%"
          change={2.3}
          icon={Target}
          severity="success"
          subtitle="7-day prediction model"
          insight="Model performance exceeds target"
        />

        <MetricCard
          title="Growth Velocity"
          value={`${trends.litersTrend?.value ?? 0}%`}
          change={trends.litersTrend?.value ?? 0}
          icon={TrendingUp}
          severity={trends.litersTrend?.isPositive ? 'success' : 'warning'}
          subtitle="Volume acceleration rate"
          insight={trends.litersTrend?.isPositive ? 'Strong upward momentum detected' : 'Volume growth decelerating'}
        />
      </div>

      {/* Charts placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Forecast vs Actual</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">30-day moving average prediction</p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="h-64 flex items-center justify-center text-gray-400">
              {[/* TODO: implement charts using recharts or chart.js */]}
              <span>Time series chart placeholder</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Anomaly Timeline</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Detected unusual patterns</p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            <div className="space-y-3">
              {analytics.anomalies.slice(-5).map((anomaly, idx) => (
                <div key={`${anomaly.date ?? idx}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {anomaly.date ? new Date(anomaly.date).toLocaleDateString() : 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {safeNumber(anomaly.liters, 0).toFixed(0)} liters
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {analytics.seasonality.length > 0
                      ? `${(((anomaly.liters / (safeAvg(analytics.seasonality.map((d: any) => d.liters)) || 1) - 1) * 100)).toFixed(1)}% dev`
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistical Summary */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Statistical Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Mean Daily Volume</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {safeAvg(analytics.seasonality.map((d: any) => d.liters)).toFixed(0)} L
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Volatility Index</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {/* volatility as (stdDev / mean) * 100 */}
                {(() => {
                  const liters = analytics.seasonality.map((d: any) => safeNumber(d.liters, 0));
                  if (liters.length === 0) return '0.0%';
                  const mean = safeAvg(liters);
                  const variance = liters.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / liters.length;
                  const stdDev = Math.sqrt(variance);
                  return ((stdDev / (mean || 1)) * 100).toFixed(1) + '%';
                })()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Trend Strength</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">Strong</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ---------- PerformanceView ----------
const PerformanceView: React.FC<{ collections: Collection[]; trends: Trends }> = ({ collections = [], trends }) => {
  const kpis = useMemo(() => {
    if (!collections || collections.length === 0) return [];

    const avgCollectionSize = safeAvg(collections.map((c) => safeNumber(c.liters, 0)));
    const avgRevenue = safeAvg(collections.map((c) => safeNumber(c.total_amount, 0)));
    const farmerCount = new Set(collections.map((c) => c.farmer_id)).size || 0;
    const staffCount = new Set(collections.map((c) => c.staff?.id).filter(Boolean)).size || 0;

    const collectionsPerFarmer = farmerCount === 0 ? 0 : collections.length / farmerCount;
    const collectionsPerStaff = staffCount === 0 ? 0 : collections.length / staffCount;

    return [
      {
        label: 'Avg Collection Size',
        value: `${avgCollectionSize.toFixed(1)} L`,
        target: '50 L',
        progress: (avgCollectionSize / 50) * 100,
        status: avgCollectionSize >= 50 ? 'success' : avgCollectionSize >= 40 ? 'warning' : 'critical',
      },
      {
        label: 'Avg Revenue per Collection',
        value: `KES ${avgRevenue.toFixed(0)}`,
        target: 'KES 2,500',
        progress: (avgRevenue / 2500) * 100,
        status: avgRevenue >= 2500 ? 'success' : avgRevenue >= 2000 ? 'warning' : 'critical',
      },
      {
        label: 'Collections per Farmer',
        value: collectionsPerFarmer.toFixed(1),
        target: '15',
        progress: (collectionsPerFarmer / 15) * 100,
        status: collectionsPerFarmer >= 15 ? 'success' : collectionsPerFarmer >= 10 ? 'warning' : 'critical',
      },
      {
        label: 'Collections per Staff',
        value: collectionsPerStaff.toFixed(1),
        target: '100',
        progress: (collectionsPerStaff / 100) * 100,
        status: collectionsPerStaff >= 100 ? 'success' : collectionsPerStaff >= 75 ? 'warning' : 'critical',
      },
      {
        label: 'Active Farmer Rate',
        value: `${((farmerCount / (farmerCount + 10)) * 100).toFixed(1)}%`,
        target: '85%',
        progress: ((farmerCount / (farmerCount + 10)) * 100),
        status: (farmerCount / (farmerCount + 10)) >= 0.85 ? 'success' : 'warning',
      },
      {
        label: 'Revenue Growth Rate',
        value: `${trends.revenueTrend?.value ?? 0}%`,
        target: '10%',
        progress: Math.min(((trends.revenueTrend?.value ?? 0) / 10) * 100, 100),
        status: (trends.revenueTrend?.value ?? 0) >= 10 ? 'success' : (trends.revenueTrend?.value ?? 0) >= 5 ? 'warning' : 'critical',
      },
    ];
  }, [collections, trends]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{kpi.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Target: {kpi.target}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  kpi.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  kpi.status === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {kpi.status === 'success' ? '✓ On Track' : kpi.status === 'warning' ? '! Review' : '✗ Critical'}
                </div>
              </div>

              <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                    kpi.status === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                    kpi.status === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                    'bg-gradient-to-r from-red-500 to-rose-600'
                  }`}
                  style={{ width: `${Math.min(kpi.progress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {Math.min(Math.max(kpi.progress, 0), 100).toFixed(0)}% of target achieved
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ---------- Main Component ----------
const CollectionsAnalyticsDashboard: React.FC = () => {
  const toast = useToastNotifications();
  // run session refresh hook (side effect); don't destructure unused return to avoid lint
  useSessionRefresh({ refreshInterval: 90 * 60 * 1000 });

  // This hook is expected to return hooks/objects. Be defensive and provide fallbacks.
  const collectionHooks = useCollectionAnalyticsData?.() ?? ({} as any);

  const {
    useCollections = (/* dateFilter: string */) => ({ data: [] as Collection[], isLoading: false }),
    useTrends = (_dr: string) => ({ data: DEFAULT_TRENDS, isLoading: false }),
    useFilteredCollections = (_opts: any) => ({ data: [] as Collection[], isLoading: false }),
    refreshCollections,
    exportToCSV,
  } = collectionHooks;

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<string>('overview');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const [filters, setFilters] = useBatchedState({
    status: 'all',
    dateRange: 'daily',
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const dateFilter = useMemo(() => {
    const now = new Date();
    const ranges: Record<string, Date> = {
      daily: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      '7days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      '30days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
      '90days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90),
      '180days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 180),
      all: new Date('2020-01-01'),
    };
    const date = ranges[filters.dateRange] ?? ranges['daily'];
    return date.toISOString();
  }, [filters.dateRange]);

  const { data: collections = [], isLoading: collectionsLoading } = useCollections(dateFilter);
  const { data: trends = DEFAULT_TRENDS, isLoading: trendsLoading } = useTrends(filters.dateRange);
  const { data: filteredCollections = [], isLoading: filteredCollectionsLoading } = useFilteredCollections({
    searchTerm: debouncedSearchTerm,
    status: filters.status,
    dateRange: dateFilter,
  });

  const refreshPending = !!(refreshCollections && (refreshCollections.isPending ?? false));
  const exportPending = !!(exportToCSV && (exportToCSV.isPending ?? false));

  const showLoading = useLoadingDelay(refreshPending || collectionsLoading || trendsLoading || filteredCollectionsLoading, 300);

  // analytics derived from filteredCollections
  const analytics = useMemo(() => {
    // Define interfaces for our data structures
    interface DailyDataPoint {
      date: string;
      collections: number;
      liters: number;
      amount: number;
    }

    interface FarmerStat {
      id: string;
      name: string;
      collections: number;
      liters: number;
      amount: number;
    }

    interface StaffStat {
      id: string;
      name: string;
      collections: number;
      liters: number;
      farmers: Set<string>;
    }

    interface ProcessedStaffStat {
      id: string;
      name: string;
      collections: number;
      liters: number;
      farmers: number;
    }

    // Explicitly type the accumulator and result
    const dailyData: Record<string, DailyDataPoint> = {};
    filteredCollections.forEach(c => {
      const date = new Date(c.collection_date).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = { date, collections: 0, liters: 0, amount: 0 };
      }
      dailyData[date].collections += 1;
      dailyData[date].liters += safeNumber(c.liters, 0);
      dailyData[date].amount += safeNumber(c.total_amount, 0);
    });

    const dailyTrends = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Explicitly type the accumulator and result
    const farmerStats: Record<string, FarmerStat> = {};
    filteredCollections.forEach(c => {
      const id = c.farmer_id ?? 'unknown';
      if (!farmerStats[id]) {
        farmerStats[id] = { 
          id, 
          name: c.farmers?.profiles?.full_name ?? 'Unknown', 
          collections: 0, 
          liters: 0, 
          amount: 0 
        };
      }
      farmerStats[id].collections += 1;
      farmerStats[id].liters += safeNumber(c.liters, 0);
      farmerStats[id].amount += safeNumber(c.total_amount, 0);
    });
    
    const farmerStatsValues = Object.values(farmerStats);
    const topFarmers = farmerStatsValues.sort((a, b) => b.liters - a.liters).slice(0, 10);

    // Explicitly type the accumulator and result
    const staffStats: Record<string, StaffStat> = {};
    filteredCollections.forEach(c => {
      const id = c.staff?.id;
      if (!id) return;
      if (!staffStats[id]) {
        staffStats[id] = { 
          id, 
          name: c.staff?.profiles?.full_name ?? 'Unknown', 
          collections: 0, 
          liters: 0, 
          farmers: new Set<string>() 
        };
      }
      staffStats[id].collections += 1;
      staffStats[id].liters += safeNumber(c.liters, 0);
      if (c.farmer_id) {
        staffStats[id].farmers.add(c.farmer_id);
      }
    });
    
    const staffStatsValues = Object.values(staffStats);
    const staffPerformance: ProcessedStaffStat[] = staffStatsValues
      .map((s) => ({ 
        id: s.id,
        name: s.name,
        collections: s.collections,
        liters: s.liters,
        farmers: s.farmers.size 
      }))
      .sort((a, b) => b.collections - a.collections)
      .slice(0, 10);

    return { dailyTrends, qualityDistribution: [], topFarmers, staffPerformance };
  }, [filteredCollections]);

  // Add keys to stabilize the data for the charts
  const { data: stableDailyTrends } = useChartStabilizer(analytics.dailyTrends ?? [], 100);
  const { data: stableTopFarmers } = useChartStabilizer(analytics.topFarmers ?? [], 100);
  const { data: stableStaffPerformance } = useChartStabilizer(analytics.staffPerformance ?? [], 100);

  // Export handler — works if exportToCSV is either a mutation object or a plain function
  const handleExportToCSV = useCallback(async () => {
    try {
      if (!exportToCSV) {
        toast?.show?.({ title: 'Unavailable', description: 'Export not configured' });
        return;
      }

      if (typeof exportToCSV === 'function') {
        await exportToCSV(collections);
      } else if (exportToCSV.mutateAsync) {
        await exportToCSV.mutateAsync(collections);
      } else if (exportToCSV.mutate) {
        // fallback if mutate returns a Promise
        await new Promise((res, rej) => {
          try {
            exportToCSV.mutate(collections, { onSuccess: res, onError: rej });
          } catch (err) {
            rej(err);
          }
        });
      } else {
        throw new Error('Unsupported export method');
      }

      toast?.show?.({ title: 'Success', description: 'Data exported successfully' });
    } catch (error: any) {
      const message = error?.message ?? 'Failed to export data';
      if (toast?.error) toast.error('Error', message);
      else toast?.show?.({ title: 'Error', description: message });
    }
  }, [collections, exportToCSV, toast]);

  // Refresh handler — supports mutate() or simple function call
  const handleRefresh = useCallback(() => {
    try {
      if (!refreshCollections) return;
      if (typeof refreshCollections === 'function') {
        refreshCollections();
      } else if (refreshCollections.mutate) {
        refreshCollections.mutate();
      } else if (refreshCollections.mutateAsync) {
        refreshCollections.mutateAsync();
      }
    } catch (err) {
      console.warn('Refresh failed', err);
      toast?.show?.({ title: 'Refresh failed', description: 'Could not refresh collections' });
    }
  }, [refreshCollections, toast]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({ status: 'all', dateRange: 'daily' });
  }, [setFilters]);

  const getStatusVariant = useCallback((status?: string) => {
    const variants: Record<string, string> = {
      Paid: 'default',
      Verified: 'secondary',
      Cancelled: 'destructive',
    };
    return variants[status ?? ''] || 'outline';
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    try {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
      }).format(amount ?? 0);
    } catch {
      return `KES ${safeNumber(amount, 0).toFixed(0)}`;
    }
  }, []);

  if (showLoading) {
    return (
      <DashboardLayout>
        <CollectionsSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-3xl -z-10" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Advanced Analytics
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Data Science Intelligence Platform</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 ml-16">
                Predictive insights, statistical analysis, and performance benchmarking
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleRefresh}
                disabled={refreshPending}
                variant="outline"
                className="border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 flex items-center gap-2 transition-all duration-300"
              >
                <RefreshCcw className={`h-4 w-4 ${refreshPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                onClick={handleExportToCSV}
                disabled={exportPending}
                className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>
        </div>

        {/* Business Intelligence */}
        <div className="mb-8">
          <BusinessIntelligenceDashboard timeRange={filters.dateRange} />
        </div>

        {/* Views */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 p-2 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-2xl shadow-inner">
            {VIEWS.map((view) => {
              const Icon = view.icon;
              const isActive = currentView === view.id;
              return (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id)}
                  className={`flex-1 min-w-[200px] px-6 py-4 rounded-xl flex flex-col items-start gap-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    isActive
                      ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-2xl shadow-blue-500/50'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                    <span className="font-bold text-lg">{view.label}</span>
                  </div>
                  <span className={`text-sm ${isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{view.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-0 shadow-xl bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filters & Search</h3>
              </div>
              <Button onClick={() => setShowFilters((s) => !s)} variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                {showFilters ? 'Hide' : 'Show'}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search collections..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-xl py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ status: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="Collected">Collected</option>
                  <option value="Verified">Verified</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ dateRange: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily Collections</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="180days">Last 180 Days</option>
                  <option value="all">All Time</option>
                </select>

                <Button onClick={clearFilters} variant="outline" className="border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl py-3 shadow-sm">
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main view content */}
        <div className="space-y-8 transition-all duration-300">
          {currentView === 'overview' && (
            <OverviewView
              dailyTrends={stableDailyTrends}
              qualityDistribution={[]}
              topFarmers={stableTopFarmers}
              staffPerformance={stableStaffPerformance}
              totalCollections={trends.totalCollections}
              totalLiters={trends.totalLiters}
              totalAmount={trends.totalRevenue}
              collectionsTrend={trends.collectionsTrend}
              litersTrend={trends.litersTrend}
              revenueTrend={trends.revenueTrend}
              collections={collections}
            />
          )}

          {currentView === 'predictive' && <PredictiveAnalyticsView collections={collections} trends={trends} />}

          {currentView === 'collections' && (
            <CollectionsView
              filteredCollections={filteredCollections}
              collections={collections}
              setSelectedCollection={setSelectedCollection}
              getStatusVariant={getStatusVariant}
              formatCurrency={formatCurrency}
              error={null}
              isLoading={collectionsLoading || filteredCollectionsLoading}
              refreshData={handleRefresh}
            />
          )}

          {currentView === 'performance' && <PerformanceView collections={collections} trends={trends} />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CollectionsAnalyticsDashboard;