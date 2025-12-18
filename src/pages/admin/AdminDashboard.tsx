import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  UserCog,
  Droplets,
  Package,
  CreditCard,
  Home,
  FileText,
  Settings,
  Filter,
  Download,
  MoreVertical,
  ChevronRight,
  Target,
  TrendingDown,
  Percent,
  Calendar,
  Search,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Shield,
  Truck,
  Coffee,
  Zap
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useChartStabilizer } from '@/hooks/useChartStabilizer';
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
  AreaChart,
  Area,
  ComposedChart,
  Scatter
} from 'recharts';
import { 
  format, 
  subDays, 
  subWeeks, 
  subMonths, 
  subQuarters, 
  subYears,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  parseISO,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval
} from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  getCurrentPeriodFilter,
  getPreviousPeriodFilter, 
  calculateMetricsWithTrends 
} from '@/utils/dashboardTrends';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { dataCache } from '@/utils/dataCache';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CACHE_KEYS } from '@/services/cache-utils';
import RefreshButton from '@/components/ui/RefreshButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Types
interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  notes: string;
  farmers?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
  staff?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
  approved_by?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface Farmer {
  id: string;
  user_id: string;
  registration_number: string;
  kyc_status: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Staff {
  id: string;
  user_id: string;
  employee_id: string;
  status?: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface PendingFarmer {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  status: string;
  created_at: string;
  rejection_count: number;
}

interface Alert {
  type: string;
  message: string;
  severity: 'warning' | 'info' | 'success' | 'error';
  time: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  format: 'currency' | 'number' | 'percent';
  target: number;
}

const TIME_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'lastQuarter', label: 'Last Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: '90days', label: 'Last 90 Days' },
  { value: '180days', label: 'Last 180 Days' },
  { value: '365days', label: 'Last 365 Days' },
  { value: 'allTime', label: 'All Time' }
];

const CHART_TYPES = [
  { id: 'area', label: 'Area', icon: AreaChart },
  { id: 'line', label: 'Line', icon: LineChartIcon },
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'composed', label: 'Composed', icon: BarChartIcon },
];

// Define DASHBOARD_TABS constant
const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
] as const;

// Color palette for charts
const CHART_COLORS = {
  primary: '#3b82f6',     // Blue
  secondary: '#10b981',   // Emerald
  accent: '#f59e0b',      // Amber
  danger: '#ef4444',      // Red
  purple: '#8b5cf6',      // Violet
  pink: '#ec4899',        // Pink
  indigo: '#6366f1',      // Indigo
  teal: '#14b8a6',        // Teal
  cyan: '#06b6d4',        // Cyan
  orange: '#f97316',      // Orange
};

const AdminDashboard = () => {
  console.log('📊 [AdminDashboard] Component rendered at:', new Date().toISOString());
  
  const toast = useToastNotifications();
  const queryClient = useQueryClient();
  const { refreshSession } = useSessionRefresh({ enabled: true, refreshInterval: 25 * 60 * 1000 }); // Refresh every 25 minutes
  
  // State management
  const [collections, setCollections] = useState<Collection[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('week');
  const [collectionTrends, setCollectionTrends] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [pendingFarmers, setPendingFarmers] = useState<PendingFarmer[]>([]);
  const [kycStats, setKycStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    resubmissions: 0
  });
  
  // New state for enhanced features
  const [activeTab, setActiveTab] = useState('overview');
  const [chartType, setChartType] = useState('composed');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [quickFilters, setQuickFilters] = useState({
    status: 'all',
    type: 'all',
    region: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // State for dashboard targets - initialized as empty array
  const [dashboardTargets, setDashboardTargets] = useState<any[]>([]);
  
  // State for loading settings
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // Timeout ref to prevent infinite loading
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Monitor dashboard targets changes
  useEffect(() => {
    console.log('Dashboard targets updated:', dashboardTargets);
  }, [dashboardTargets]);
  
  // Set up timeout to prevent infinite loading
  useEffect(() => {
    // Clear existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Set timeout to force loading to complete after 30 seconds
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading || initialLoad) {
        console.warn('Dashboard loading timeout reached, forcing load completion');
        setLoading(false);
        setInitialLoad(false);
        setSettingsLoading(false); // Also ensure settings loading is false
        setDataLoading(false); // Also ensure data loading is false
        toast.error('Dashboard data is taking longer than expected to load. Showing available data.');
      }
    }, 30000); // 30 seconds timeout
    
    // Cleanup timeout on unmount or when loading states change
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, initialLoad, toast.error]);

  // Load targets from database on component mount
  useEffect(() => {
    console.log('📊 [AdminDashboard] Starting data load at:', new Date().toISOString());
    let isMounted = true;
    
    const loadDashboardSettings = async () => {
      try {
        if (isMounted) setSettingsLoading(true);
        console.log('📊 [AdminDashboard] Loading dashboard settings from database...');
        
        // Ensure we have a valid session before making queries
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('No valid session for dashboard settings query');
          throw new Error('Authentication required');
        }
        
        const { data, error } = await supabase
          .from('dashboard_settings')
          .select('*')
          .eq('is_active', true)
          .eq('category', 'targets');
        
        console.log('Dashboard settings query result:', { data, error });
        
        // Check if component is still mounted before updating state
        if (!isMounted) return;
        
        if (error) {
          console.error('Error loading dashboard settings:', error);
          // Fallback to default targets if database load fails
          const defaultTargets = [
            { id: 'revenue', label: 'Total Revenue', target: 1000000, format: 'currency' },
            { id: 'liters', label: 'Milk Collected', target: 50000, format: 'number' },
            { id: 'farmers', label: 'Active Farmers', target: 100, format: 'number' },
            { id: 'collections', label: 'Collections', target: 1000, format: 'number' },
            { id: 'avgRate', label: 'Avg Rate/Liter', target: 45, format: 'currency' },
            { id: 'efficiency', label: 'Collection Efficiency', target: 90, format: 'percent' },
            { id: 'targetAchievement', label: 'Target Achievement', target: 100, format: 'percent' },
            { id: 'farmerSatisfaction', label: 'Farmer Satisfaction', target: 95, format: 'percent' },
            { id: 'paymentTimeliness', label: 'Payment Timeliness', target: 95, format: 'percent' },
          ];
          console.log('Using default targets:', defaultTargets);
          if (isMounted) setDashboardTargets(defaultTargets);
        } else {
          console.log('Raw data from database:', data);
          // Transform database settings to target format
          const targets = data.map((setting: any) => {
            let targetValue = setting.setting_value;
            if (setting.setting_type === 'number') {
              targetValue = Number(setting.setting_value);
            }
            
            // Map setting keys to target IDs
            const idMap: Record<string, string> = {
              'target_revenue': 'revenue',
              'target_liters': 'liters',
              'target_farmers': 'farmers',
              'target_collections': 'collections',
              'target_avg_rate': 'avgRate',
              'target_efficiency': 'efficiency',
              'target_achievement': 'targetAchievement',
              'target_farmer_satisfaction': 'farmerSatisfaction',
              'target_payment_timeliness': 'paymentTimeliness'
            };
            
            const formatMap: Record<string, string> = {
              'target_revenue': 'currency',
              'target_liters': 'number',
              'target_farmers': 'number',
              'target_collections': 'number',
              'target_avg_rate': 'currency',
              'target_efficiency': 'percent',
              'target_achievement': 'percent',
              'target_farmer_satisfaction': 'percent',
              'target_payment_timeliness': 'percent'
            };
            
            const labelMap: Record<string, string> = {
              'target_revenue': 'Total Revenue',
              'target_liters': 'Milk Collected',
              'target_farmers': 'Active Farmers',
              'target_collections': 'Collections',
              'target_avg_rate': 'Avg Rate/Liter',
              'target_efficiency': 'Collection Efficiency',
              'target_achievement': 'Target Achievement',
              'target_farmer_satisfaction': 'Farmer Satisfaction',
              'target_payment_timeliness': 'Payment Timeliness'
            };
            
            const result = {
              id: idMap[setting.setting_key] || setting.setting_key,
              label: labelMap[setting.setting_key] || setting.setting_key,
              target: targetValue,
              format: formatMap[setting.setting_key] || 'number'
            };
            
            console.log('Transformed target:', result);
            return result;
          });
          
          console.log('Final transformed targets:', targets);
          if (isMounted) setDashboardTargets(targets);
        }
      } catch (err) {
        console.error('Error loading dashboard settings:', err);
        // Check if component is still mounted before updating state
        if (!isMounted) return;
        
        // Fallback to default targets if any error occurs
        const defaultTargets = [
          { id: 'revenue', label: 'Total Revenue', target: 1000000, format: 'currency' },
          { id: 'liters', label: 'Milk Collected', target: 50000, format: 'number' },
          { id: 'farmers', label: 'Active Farmers', target: 100, format: 'number' },
          { id: 'collections', label: 'Collections', target: 1000, format: 'number' },
          { id: 'avgRate', label: 'Avg Rate/Liter', target: 45, format: 'currency' },
          { id: 'efficiency', label: 'Collection Efficiency', target: 90, format: 'percent' },
          { id: 'targetAchievement', label: 'Target Achievement', target: 100, format: 'percent' },
          { id: 'farmerSatisfaction', label: 'Farmer Satisfaction', target: 95, format: 'percent' },
          { id: 'paymentTimeliness', label: 'Payment Timeliness', target: 95, format: 'percent' },
        ];
        console.log('Using fallback default targets:', defaultTargets);
        if (isMounted) setDashboardTargets(defaultTargets);
      } finally {
        if (isMounted) {
          setSettingsLoading(false);
          console.log('Finished loading dashboard settings');
          // Set main loading state to false as well if this is the initial load
          if (initialLoad) {
            setLoading(false);
            setInitialLoad(false);
          }
        }
      }
    };
    
    loadDashboardSettings();
    
    // Set up real-time subscription for dashboard settings
    const settingsChannel = supabase
      .channel('dashboard-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_settings',
          filter: 'category=eq.targets'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Reload all settings when any change occurs
          loadDashboardSettings();
        }
      )
      .subscribe();
    
    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up dashboard settings subscription');
      isMounted = false;
      // Properly unsubscribe from the channel
      supabase.removeChannel(settingsChannel);
      // Ensure loading states are cleared when component unmounts
      setLoading(false);
      setInitialLoad(false);
      setSettingsLoading(false);
      setDataLoading(false);
    };
  }, [initialLoad]); // Removed unnecessary dependencies

  // React Query for dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError, refetch } = useQuery({
    queryKey: [CACHE_KEYS.ADMIN_DASHBOARD, timeRange, quickFilters, dashboardTargets],
    queryFn: async () => {
      setDataLoading(true);
      try {
        const { startDate, endDate } = getCurrentPeriodFilter(timeRange);
        
        // Ensure we have a valid session before making queries
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Authentication required');
        }
        
        // Fetch multiple data sources in parallel
        const [collectionsRes, farmersRes, staffRes, pendingRes] = await Promise.all([
          supabase
            .from('collections')
            .select('*')
            .eq('approved_for_company', true)
            .gte('collection_date', startDate)
            .lte('collection_date', endDate)
            .order('collection_date', { ascending: false })
            .limit(500),
          
          supabase
            .from('farmers')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200),
          
          supabase
            .from('staff')
            .select('*')
            .limit(100),
          
          supabase
            .from('pending_farmers')
            .select('*')
            .in('status', ['pending_verification', 'email_verified'])
            .limit(10)
        ]);

        // Check for errors in any of the responses
        if (collectionsRes.error) throw new Error(`Collections error: ${collectionsRes.error.message}`);
        if (farmersRes.error) throw new Error(`Farmers error: ${farmersRes.error.message}`);
        if (staffRes.error) throw new Error(`Staff error: ${staffRes.error.message}`);
        if (pendingRes.error) throw new Error(`Pending farmers error: ${pendingRes.error.message}`);

        const collections = collectionsRes.data || [];
        const farmers = farmersRes.data || [];
        const staff = staffRes.data || [];
        const pendingFarmers = pendingRes.data || [];

        // Process dual-axis data
        const dualAxisData = processDualAxisData(collections);
        
        // Calculate enhanced metrics
        const enhancedMetrics = calculateEnhancedMetrics({ collections, farmers, staff });
        
        // Process KPI data
        const kpiData = processKPIData({ collections, farmers, staff });

        // Generate alerts
        const alerts = generateEnhancedAlerts(collections, farmers, pendingFarmers);

        // Calculate KYC stats
        const kycStats = {
          pending: pendingFarmers.filter((f: any) => f.status === 'email_verified').length,
          approved: farmers.filter((f: any) => f.kyc_status === 'approved').length,
          rejected: farmers.filter((f: any) => f.kyc_status === 'rejected').length,
          resubmissions: pendingFarmers.filter((f: any) => f.rejection_count > 0).length
        };

        return {
          collections,
          farmers,
          staff,
          pendingFarmers,
          dualAxisData,
          enhancedMetrics,
          kpiData,
          alerts,
          kycStats
        };
      } finally {
        setDataLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Update state when query data changes
  useEffect(() => {
    if (dashboardData) {
      setCollections(dashboardData.collections);
      setFarmers(dashboardData.farmers);
      setStaff(dashboardData.staff);
      setPendingFarmers(dashboardData.pendingFarmers);
      setCollectionTrends(dashboardData.dualAxisData);
      setRevenueTrends(dashboardData.dualAxisData);
      setMetrics(dashboardData.enhancedMetrics);
      setAlerts(dashboardData.alerts);
      setKycStats(dashboardData.kycStats);
      console.log('📊 [AdminDashboard] Data loading completed successfully at:', new Date().toISOString());
      setLoading(false);
      setInitialLoad(false);
      setDataLoading(false);
    }
  }, [dashboardData, dashboardTargets]);

  // Handle dashboard error
  useEffect(() => {
    if (dashboardError) {
      console.error('📊 [AdminDashboard] Dashboard data fetch error:', dashboardError);
      toast.error('Failed to load dashboard data. Please try refreshing the page.');
      setLoading(false);
      setInitialLoad(false);
      setDataLoading(false);
    }
  }, [dashboardError, toast.error]);

  // Enhanced metrics calculation
  const calculateEnhancedMetrics = useCallback((data: any) => {
    const totalLiters = data.collections?.reduce((sum: number, c: any) => sum + (c.liters || 0), 0) || 0;
    const totalRevenue = data.collections?.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0) || 0;
    const avgRate = totalLiters > 0 ? totalRevenue / totalLiters : 0;
    const activeFarmers = data.farmers?.filter((f: any) => f.kyc_status === 'approved').length || 0;
    const totalFarmers = data.farmers?.length || 0;
    const collectionsCount = data.collections?.length || 0;
    
    // Get targets from state (dashboard settings)
    const revenueTarget = dashboardTargets.find(t => t.id === 'revenue')?.target || 1000000;
    const litersTarget = dashboardTargets.find(t => t.id === 'liters')?.target || 50000;
    const farmersTarget = dashboardTargets.find(t => t.id === 'farmers')?.target || 100;
    const collectionsTarget = dashboardTargets.find(t => t.id === 'collections')?.target || 1000;
    const avgRateTarget = dashboardTargets.find(t => t.id === 'avgRate')?.target || 45;
    const efficiencyTarget = dashboardTargets.find(t => t.id === 'efficiency')?.target || 90;
    
    return [
      {
        id: 'revenue',
        label: 'Total Revenue',
        value: totalRevenue,
        change: 12.5,
        changeType: 'increase',
        icon: DollarSign,
        color: 'green',
        format: 'currency',
        target: revenueTarget
      },
      {
        id: 'liters',
        label: 'Milk Collected',
        value: totalLiters,
        change: 8.2,
        changeType: 'increase',
        icon: Droplets,
        color: 'blue',
        format: 'number',
        target: litersTarget
      },
      {
        id: 'farmers',
        label: 'Active Farmers',
        value: activeFarmers,
        change: 5.3,
        changeType: 'increase',
        icon: Users,
        color: 'purple',
        format: 'number',
        target: farmersTarget
      },
      {
        id: 'collections',
        label: 'Collections',
        value: collectionsCount,
        change: -2.1,
        changeType: 'decrease',
        icon: Truck,
        color: 'orange',
        format: 'number',
        target: collectionsTarget
      },
      {
        id: 'avgRate',
        label: 'Avg Rate/Liter',
        value: avgRate,
        change: 3.7,
        changeType: 'increase',
        icon: TrendingUp,
        color: 'teal',
        format: 'currency',
        target: avgRateTarget
      },
      {
        id: 'efficiency',
        label: 'Collection Efficiency',
        value: 87.5,
        change: 2.3,
        changeType: 'increase',
        icon: Zap,
        color: 'amber',
        format: 'percent',
        target: efficiencyTarget
      }
    ];
  }, [dashboardTargets]);

  // Process data for dual-axis chart
  const processDualAxisData = useCallback((collectionsData: Collection[]) => {
    const groupedData = collectionsData.reduce((acc: any, collection) => {
      const date = format(new Date(collection.collection_date), 'MMM dd');
      if (!acc[date]) {
        acc[date] = {
          date,
          liters: 0,
          revenue: 0,
          collections: 0,
          avgRate: 0,
          farmers: new Set()
        };
      }
      acc[date].liters += collection.liters;
      acc[date].revenue += collection.total_amount;
      acc[date].collections += 1;
      acc[date].farmers.add(collection.farmer_id);
      
      return acc;
    }, {});

    return Object.values(groupedData)
      .map((item: any) => ({
        ...item,
        farmers: item.farmers.size,
        avgRate: item.liters > 0 ? item.revenue / item.liters : 0
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  // Process KPI data
  const processKPIData = useCallback((data: any) => {
    // Get targets from state (dashboard settings)
    const targetAchievementTarget = dashboardTargets.find(t => t.id === 'targetAchievement')?.target || 100;
    const farmerSatisfactionTarget = dashboardTargets.find(t => t.id === 'farmerSatisfaction')?.target || 95;
    const collectionEfficiencyTarget = dashboardTargets.find(t => t.id === 'efficiency')?.target || 90;
    const paymentTimelinessTarget = dashboardTargets.find(t => t.id === 'paymentTimeliness')?.target || 95;

    // Calculate real KPI values based on data
    const targetAchievement = data.collections && data.collections.length > 0 
      ? Math.round((data.collections.filter((c: any) => c.status === 'Approved').length / data.collections.length) * 100)
      : 0;
      
    const farmerSatisfaction = data.farmers && data.farmers.length > 0
      ? Math.round((data.farmers.filter((f: any) => f.kyc_status === 'approved').length / data.farmers.length) * 100)
      : 0;
      
    const collectionEfficiency = data.collections && data.collections.length > 0
      ? Math.round((data.collections.filter((c: any) => 
          new Date(c.collection_date) >= subDays(new Date(), 7)).length / 
          Math.max(data.collections.length / 7, 1)) * 100)
      : 0;
      
    const paymentTimeliness = data.collections && data.collections.length > 0
      ? Math.round((data.collections.filter((c: any) => c.status === 'Paid').length / 
          Math.max(data.collections.filter((c: any) => c.status === 'Approved').length, 1)) * 100)
      : 0;

    return [
      { 
        label: 'Target Achievement', 
        value: Math.min(targetAchievement, 100), 
        target: targetAchievementTarget,
        color: CHART_COLORS.primary 
      },
      { 
        label: 'Farmer Satisfaction', 
        value: Math.min(farmerSatisfaction, 100), 
        target: farmerSatisfactionTarget,
        color: CHART_COLORS.secondary 
      },
      { 
        label: 'Collection Efficiency', 
        value: Math.min(collectionEfficiency, 100), 
        target: collectionEfficiencyTarget,
        color: CHART_COLORS.accent 
      },
      { 
        label: 'Payment Timeliness', 
        value: Math.min(paymentTimeliness, 100), 
        target: paymentTimelinessTarget,
        color: CHART_COLORS.teal 
      }
    ];
  }, [dashboardTargets]);

  // Generate enhanced alerts
  const generateEnhancedAlerts = useCallback((collections: Collection[], farmers: Farmer[], pendingFarmers: PendingFarmer[]) => {
    const alerts: Alert[] = [];

    // High-value collections
    collections
      .filter(c => c.total_amount > 10000)
      .slice(0, 2)
      .forEach(c => {
        alerts.push({
          type: 'high_value',
          message: `High-value collection: ${formatCurrency(c.total_amount)} from ${c.farmers?.profiles?.full_name || 'Unknown'}`,
          severity: 'success',
          time: format(new Date(c.collection_date), 'HH:mm'),
          icon: Award
        });
      });

    // Pending KYC approvals
    if (pendingFarmers.length > 3) {
      alerts.push({
        type: 'kyc_pending',
        message: `${pendingFarmers.length} farmers awaiting KYC approval`,
        severity: 'warning',
        time: format(new Date(), 'HH:mm'),
        icon: Shield
      });
    }

    // Low stock alerts (simulated)
    if (collections.reduce((sum, c) => sum + c.liters, 0) < 1000) {
      alerts.push({
        type: 'low_stock',
        message: 'Milk collection below daily target',
        severity: 'error',
        time: format(new Date(), 'HH:mm'),
        icon: AlertCircle
      });
    }

    // Recent signups
    const recentFarmers = farmers
      .filter(f => new Date(f.created_at) > subDays(new Date(), 7))
      .slice(0, 2);
    
    recentFarmers.forEach(f => {
      alerts.push({
        type: 'new_farmer',
        message: `New farmer registered: ${f.profiles?.full_name || 'Unknown'}`,
        severity: 'info',
        time: format(new Date(f.created_at), 'HH:mm'),
        icon: Users
      });
    });

    return alerts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  // Format number
  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  }, []);

  // Format percentage
  const formatPercent = useCallback((num: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num / 100);
  }, []);

  // Enhanced Metric Card Component
  const MetricCard = ({ metric }: { metric: DashboardMetric }) => {
    const Icon = metric.icon;
    const progress = (metric.value / metric.target) * 100;
    
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg bg-${metric.color}-100 dark:bg-${metric.color}-900/30`}>
                  <Icon className={`h-5 w-5 text-${metric.color}-600 dark:text-${metric.color}-400`} />
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {metric.label}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metric.format === 'currency' 
                      ? formatCurrency(metric.value)
                      : metric.format === 'percent'
                      ? formatPercent(metric.value)
                      : formatNumber(metric.value)}
                  </h3>
                  <div className={`flex items-center text-sm font-medium ${
                    metric.changeType === 'increase' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {metric.changeType === 'increase' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span>{Math.abs(metric.change)}%</span>
                  </div>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Export Data</DropdownMenuItem>
                <DropdownMenuItem>Set Alert</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Target: {metric.format === 'currency' 
                ? formatCurrency(metric.target)
                : metric.format === 'percent'
                ? formatPercent(metric.target)
                : formatNumber(metric.target)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Dual-Axis Chart Component
  const DualAxisChart = () => {
    if (!collectionTrends.length) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={collectionTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#3b82f6"
              tick={{ fill: '#3b82f6', fontSize: 12 }}
              label={{ 
                value: 'Liters', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#3b82f6'
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#10b981"
              tick={{ fill: '#10b981', fontSize: 12 }}
              label={{ 
                value: 'Revenue (KES)', 
                angle: 90, 
                position: 'insideRight',
                fill: '#10b981'
              }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value, name) => {
                if (name === 'liters') return [formatNumber(Number(value)), 'Liters'];
                if (name === 'revenue') return [formatCurrency(Number(value)), 'Revenue'];
                if (name === 'avgRate') return [formatCurrency(Number(value)), 'Avg Rate'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="liters"
              name="Liters Collected"
              fill={CHART_COLORS.primary}
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={CHART_COLORS.secondary}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              yAxisId="left"
              type="monotone"
              dataKey="avgRate"
              name="Avg Rate/Liter"
              stroke={CHART_COLORS.accent}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // KPI Progress Chart
  const KPIProgressChart = ({ data }: { data: any[] }) => {
    return (
      <div className="space-y-4">
        {data.map((item, index) => {
          // Calculate percentage relative to target
          const percentage = item.target ? Math.min((item.value / item.target) * 100, 100) : item.value;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold" style={{ color: item.color }}>
                    {Math.round(item.value)}%
                  </span>
                  {item.target && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      / {Math.round(item.target)}%
                    </span>
                  )}
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
              {item.target && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Target: {Math.round(item.target)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Farmer Distribution Chart
  const FarmerDistributionChart = () => {
    const data = [
      { name: 'Active', value: kycStats.approved, color: CHART_COLORS.primary },
      { name: 'Pending', value: kycStats.pending, color: CHART_COLORS.accent },
      { name: 'Rejected', value: kycStats.rejected, color: CHART_COLORS.danger },
      { name: 'Resubmit', value: kycStats.resubmissions, color: CHART_COLORS.purple },
    ];

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, 'Farmers']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Mini Data Table Component
  const RecentCollectionsTable = () => {
    const recentCollections = collections.slice(0, 5);
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Farmer</TableHead>
              <TableHead>Liters</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentCollections.map((collection) => (
              <TableRow key={collection.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell className="font-medium">
                  {format(new Date(collection.collection_date), 'MMM dd')}
                </TableCell>
                <TableCell>{collection.farmers?.profiles?.full_name || 'Unknown'}</TableCell>
                <TableCell>{formatNumber(collection.liters)}</TableCell>
                <TableCell>{formatCurrency(collection.rate_per_liter)}</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(collection.total_amount)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={collection.status === 'Paid' ? 'default' : 'secondary'}
                    className={cn(
                      collection.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      collection.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    )}
                  >
                    {collection.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Function to reset targets to default values in the database
  const resetTargets = async () => {
    try {
      // Define default values
      const defaultTargets = [
        { key: 'target_revenue', value: '1000000' },
        { key: 'target_liters', value: '50000' },
        { key: 'target_farmers', value: '100' },
        { key: 'target_collections', value: '1000' },
        { key: 'target_avg_rate', value: '45' },
        { key: 'target_efficiency', value: '90' },
        { key: 'target_achievement', value: '100' },
        { key: 'target_farmer_satisfaction', value: '95' },
        { key: 'target_payment_timeliness', value: '95' }
      ];
      
      // Update each target in the database
      for (const target of defaultTargets) {
        const { error } = await supabase
          .from('dashboard_settings')
          .update({ 
            setting_value: target.value,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', target.key);
        
        if (error) {
          console.error(`Error resetting target ${target.key}:`, error);
          toast.error(`Failed to reset target ${target.key}`);
          return;
        }
      }
      
      // Update local state with default values
      setDashboardTargets([
        { id: 'revenue', label: 'Total Revenue', target: 1000000, format: 'currency' },
        { id: 'liters', label: 'Milk Collected', target: 50000, format: 'number' },
        { id: 'farmers', label: 'Active Farmers', target: 100, format: 'number' },
        { id: 'collections', label: 'Collections', target: 1000, format: 'number' },
        { id: 'avgRate', label: 'Avg Rate/Liter', target: 45, format: 'currency' },
        { id: 'efficiency', label: 'Collection Efficiency', target: 90, format: 'percent' },
        { id: 'targetAchievement', label: 'Target Achievement', target: 100, format: 'percent' },
        { id: 'farmerSatisfaction', label: 'Farmer Satisfaction', target: 95, format: 'percent' },
        { id: 'paymentTimeliness', label: 'Payment Timeliness', target: 95, format: 'percent' },
      ]);
      
      toast.success('Targets reset to default values');
    } catch (error) {
      console.error('Error resetting targets:', error);
      toast.error('Failed to reset targets');
    }
  };

  // Function to calculate collection efficiency based on collections and farmers data
  const calculateCollectionEfficiency = useCallback((collectionsData: Collection[], farmersData: Farmer[]) => {
    if (!collectionsData || !farmersData || collectionsData.length === 0) {
      return '0%';
    }

    // Calculate efficiency based on:
    // 1. Ratio of approved collections to total collections
    // 2. Consistency of farmer participation
    // 3. Timeliness of collections
    
    const approvedCollections = collectionsData.filter(c => c.status === 'Approved').length;
    const totalCollections = collectionsData.length;
    
    // Base efficiency from approval rate
    const approvalRate = totalCollections > 0 ? (approvedCollections / totalCollections) * 100 : 0;
    
    // Calculate farmer participation rate (unique farmers who have collections)
    const uniqueFarmersWithCollections = new Set(collectionsData.map(c => c.farmer_id)).size;
    const totalActiveFarmers = farmersData.filter(f => f.kyc_status === 'approved').length;
    const participationRate = totalActiveFarmers > 0 ? (uniqueFarmersWithCollections / totalActiveFarmers) * 100 : 0;
    
    // Weighted efficiency calculation
    // 60% approval rate, 40% participation rate
    const efficiency = (approvalRate * 0.6) + (participationRate * 0.4);
    
    return `${Math.round(efficiency)}%`;
  }, []);

  // Function to update a target value in the database
  const updateTarget = async (id: string, newTarget: number) => {
    try {
      // Map target IDs to setting keys
      const keyMap: Record<string, string> = {
        'revenue': 'target_revenue',
        'liters': 'target_liters',
        'farmers': 'target_farmers',
        'collections': 'target_collections',
        'avgRate': 'target_avg_rate',
        'efficiency': 'target_efficiency',
        'targetAchievement': 'target_achievement',
        'farmerSatisfaction': 'target_farmer_satisfaction',
        'paymentTimeliness': 'target_payment_timeliness'
      };
      
      const settingKey = keyMap[id];
      if (!settingKey) {
        console.error('Invalid target ID:', id);
        return;
      }
      
      const { error } = await supabase
        .from('dashboard_settings')
        .update({ 
          setting_value: newTarget.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey);
      
      if (error) {
        console.error('Error updating target:', error);
        toast.error('Failed to update target value');
        return;
      }
      
      // Update local state
      setDashboardTargets(prevTargets => 
        prevTargets.map(target => 
          target.id === id ? { ...target, target: newTarget } : target
        )
      );
      
      toast.success('Target updated successfully');
    } catch (error) {
      console.error('Error updating target:', error);
      toast.error('Failed to update target value');
    }
  };
  
  // Loading State - Simplified to prevent deadlocks
  if ((loading || isDashboardLoading || settingsLoading || dataLoading) && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
          <p className="text-sm text-gray-500 mt-2">
            {(isDashboardLoading || dataLoading) && 'Fetching collections, farmers, and staff data...'}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              // Force load completion
              setLoading(false);
              setSettingsLoading(false);
              setDataLoading(false);
              toast.success('Dashboard loading forced', 'Some data may be incomplete.');
            }}
          >
            Skip Loading
          </Button>
        </div>
      </div>
    );
  }

  // Error State
  if (dashboardError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            There was an error loading the dashboard data. Please try refreshing the page.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => refetch()} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setLoading(false);
                setInitialLoad(false);
              }}
            >
              Continue Anyway
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Test component for debugging */}
      {/* <TestDashboardSettings /> */}
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white dark:bg-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#" className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span className="font-semibold">Dashboard</span>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#" className="text-primary">
                      {DASHBOARD_TABS.find(tab => tab.id === activeTab)?.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Monitor and manage your dairy operations in real-time
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Input
                  placeholder="Search..."
                  className="w-64 pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isDashboardLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isDashboardLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  const result = await refreshSession();
                  if (result.success) {
                    toast.success('Session refreshed successfully');
                  } else {
                    toast.error('Failed to refresh session');
                  }
                }}
              >
                <Coffee className="h-4 w-4" />
              </Button>
              
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs Wrapper */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Main Navigation Tabs */}
        <div className="px-6 py-4 border-b bg-white dark:bg-gray-800">
          <TabsList className="w-full justify-start">
            {DASHBOARD_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Main Content */}
        <main className="p-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats Bar - Already updated to use real data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Active Today</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {collections.filter(c => new Date(c.collection_date).toDateString() === new Date().toDateString()).length}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </CardContent>
              </Card>
            
              <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Avg Daily Yield</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {collections.length > 0 ? Math.round(collections.reduce((sum, c) => sum + c.liters, 0) / collections.length) : 0}L
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </CardContent>
              </Card>
            
              <Card className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending Actions</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                      {collections.filter(c => c.status === 'Pending').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500" />
                </CardContent>
              </Card>
            
              <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Efficiency Score</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {calculateCollectionEfficiency(collections, farmers)}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </CardContent>
              </Card>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Charts */}
              <div className="lg:col-span-2 space-y-6">
                {/* Chart Controls */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Performance Overview</CardTitle>
                      <CardDescription>Collection vs Revenue trends</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={chartType} onValueChange={setChartType}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Chart Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHART_TYPES.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DualAxisChart />
                  </CardContent>
                </Card>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.map(metric => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* KPI Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Key Performance Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <KPIProgressChart data={dashboardData?.kpiData || []} />
                  </CardContent>
                </Card>

                {/* Farmer Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Farmer Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FarmerDistributionChart />
                  </CardContent>
                </Card>


              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Targets</CardTitle>
                  <CardDescription>Configure targets for dashboard metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Metric</th>
                          <th className="text-left py-2 px-4">Current Target</th>
                          <th className="text-left py-2 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardTargets.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-4 px-4 text-center text-gray-500">
                              {settingsLoading && 'Loading dashboard settings...'}
                            </td>
                          </tr>
                        ) : (
                          dashboardTargets.map((target) => (
                            <tr key={target.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="py-3 px-4">{target.label}</td>
                              <td className="py-3 px-4">
                                {target.format === 'currency' 
                                  ? formatCurrency(target.target)
                                  : target.format === 'percent'
                                  ? `${target.target}%`
                                  : formatNumber(target.target)}
                              </td>
                              <td className="py-3 px-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    const newValue = prompt(`Enter new target for ${target.label}:`, target.target.toString());
                                    if (newValue !== null && !isNaN(Number(newValue))) {
                                      updateTarget(target.id, Number(newValue));
                                    }
                                  }}
                                >
                                  Edit
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={resetTargets}>
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Removed General Settings and Data Export sections as requested */}
            </div>
          </TabsContent>
        </main>

        {/* Footer */}
        <footer className="mt-8 px-6 py-4 border-t text-center text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Dairy Management System</span> • 
              <span className="ml-2">Last updated: {format(new Date(), 'PPpp')}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                System Status: Operational
              </span>
              <span>Version 2.1.0</span>
            </div>
          </div>
        </footer>
      </Tabs>

    </div>
  );
};

export default AdminDashboard;
