import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  Award,
  Calendar,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  Warehouse,
  RefreshCw,
  Eye,
  FileBarChart,
  UserCog,
  Droplets,
  ChevronDown,
  Search
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import AdvancedWarehouseMap from '@/components/admin/AdvancedWarehouseMap';

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
  Area
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
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears
} from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ErrorBoundary } from '@/components/ErrorBoundary';
// Import the dashboard trends utilities
import { 
  getCurrentPeriodFilter, 
  getPreviousPeriodFilter, 
  calculateMetricsWithTrends 
} from '@/utils/dashboardTrends';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';

// Types for our data
interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  quality_grade: string;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  farmers?: {
    full_name: string;
    registration_number: string;
  };
  staff?: {
    id: string;
    profiles: {
      full_name: string;
    };
  } | null;
}

interface Farmer {
  id: string;
  user_id: string;
  registration_number: string;
  full_name: string;
  kyc_status: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  farmer_analytics: {
    total_liters: number;
    total_collections: number;
    current_month_earnings: number;
  };
}

interface Staff {
  id: string;
  user_id: string;
  employee_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Payment {
  id: string;
  farmer_id: string;
  amount: number;
  status: string;
  created_at: string;
  farmers: {
    full_name: string;
  };
}

interface Warehouse {
  id: string;
  name: string;
  address: string;
  warehouse_collections: {
    count: number;
  };
}

interface Alert {
  type: string;
  message: string;
  severity: 'warning' | 'info' | 'success';
  time: string;
}

// Enhanced time range options
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

// Add new interface for daily analytics data
interface DailyAnalyticsData {
  date: string;
  liters: number;
  collections: number;
  revenue: number;
  avgQuality: number;
}

const AdminDashboard = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add refs to prevent unnecessary re-renders
  const prevTimeRange = useRef(timeRange);
  const isProcessing = useRef(false);
  const dataStable = useRef(false);
  
  // Data states
  const [metrics, setMetrics] = useState({
    totalFarmers: 0,
    activeFarmers: 0,
    totalCollections: 0,
    todayCollections: 0,
    totalLiters: 0,
    todayLiters: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    averageQuality: '0',
    staffMembers: 0,
    // Trend data
    farmersTrend: { value: 0, isPositive: true },
    litersTrend: { value: 0, isPositive: true },
    revenueTrend: { value: 0, isPositive: true },
    qualityTrend: { value: 0, isPositive: true }
  });
  
  const [collectionsByDay, setCollectionsByDay] = useState<any[]>([]);
  const [qualityDistribution, setQualityDistribution] = useState<any[]>([]);
  const [topFarmers, setTopFarmers] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [collectionTrends, setCollectionTrends] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]); // Add this line
  // Add daily analytics data state
  const [dailyAnalyticsData, setDailyAnalyticsData] = useState<any[]>([]);

  // Add loading state optimization
  const [initialLoad, setInitialLoad] = useState(true);

  // Use the session refresh hook
  const { refreshSession } = useSessionRefresh({ refreshInterval: 10 * 60 * 1000 }); // Refresh every 10 minutes

  // Calculate date range based on selected time range
  

  const getDateFilter = useCallback(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    switch(timeRange) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // // Monday start
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        endDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'quarter':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'lastQuarter':
        startDate = startOfQuarter(subQuarters(now, 1));
        endDate = endOfQuarter(subQuarters(now, 1));
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'lastYear':
        startDate = startOfYear(subYears(now, 1));
        endDate = endOfYear(subYears(now, 1));
        break;
      case '90days':
        startDate = subDays(now, 90);
        endDate = now;
        break;
      case '180days':
        startDate = subDays(now, 180);
        endDate = now;
        break;
      case '365days':
        startDate = subDays(now, 365);
        endDate = now;
        break;
      case 'allTime':
        startDate = new Date(2020, 0, 1); // Start from 2020
        endDate = now;
        break;
      default:
        startDate = subWeeks(now, 1);
        endDate = now;
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }, [timeRange]);

  // Fetch data for previous period to calculate trends
  const fetchPreviousPeriodData = useCallback(async () => {
    try {
      const { startDate, endDate } = getPreviousPeriodFilter(timeRange);
      
      // Fetch collections for previous period
      const { data: prevCollectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          *,
          farmers!fk_collections_farmer_id (
            id,
            user_id,
            kyc_status,
            profiles!user_id (
              full_name,
              email
            )
          ),
          staff (
            full_name,
            id
          )
        `)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate);

      if (collectionsError) {
        throw collectionsError;
      }

      return {
        collections: prevCollectionsData,
      };
    } catch (error) {
      console.error('Error fetching previous period data:', error);
      return null;
    }
  }, [timeRange]);

  // Fetch all data for the current period
  const fetchData = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateFilter();

      // Fetch collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          *,
          farmers!fk_collections_farmer_id (
            id,
            user_id,
            kyc_status,
            profiles!user_id (
              full_name,
              email
            )
          ),
          staff!collections_staff_id_fkey (
            full_name,
            id
          )
            user_id,
            profiles!user_id (
              full_name
            )
          )
        `)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .order('collection_date', { ascending: false })
        .limit(1000);

      if (collectionsError) {
        console.error('Error fetching previous period collections data:', {
          message: collectionsError.message,
          details: collectionsError.details,
          hint: collectionsError.hint
        });
        throw collectionsError;
      }

      // Fetch farmers for previous period
      const { data: prevFarmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          *,
          profiles!user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (farmersError) {
        console.error('Error fetching previous period farmers data:', {
          message: farmersError.message,
          details: farmersError.details,
          hint: farmersError.hint
        });
        throw farmersError;
      }

      // Fetch payments for previous period
      const { data: prevPaymentsData, error: paymentsError } = await supabase
        .from('collections')
        .select(`
          id,
          farmer_id,
          total_amount,
          collection_date,
          status,
          farmers (
            full_name
          )
        `)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .limit(1000);

      if (paymentsError) {
        console.error('Error fetching previous period payments data:', {
          message: paymentsError.message,
          details: paymentsError.details,
          hint: paymentsError.hint
        });
        throw paymentsError;
      }

      return {
        collections: prevCollectionsData || [],
        farmers: prevFarmersData || [],
        payments: prevPaymentsData || []
      };
    } catch (error: any) {
      console.error('Error fetching previous period data:', {
        message: error.message,
        error: error,
        stack: error.stack
      });
      return null;
    }
  }, [timeRange]);

  // Memoize the data processing to prevent unnecessary re-renders
  const processData = useCallback((
    rawCollections: any[],
    farmers: Farmer[],
    staff: Staff[],
    payments: Payment[],
    warehouses: Warehouse[],
    farmerAnalytics: any[],
    warehouseCollections: any[]
  ) => {
    // Create maps for efficient lookups
    const farmerAnalyticsMap = new Map(farmerAnalytics.map(fa => [fa.farmer_id, fa]));
    const farmerMap = new Map(farmers.map(f => [f.id, {...f, farmer_analytics: farmerAnalyticsMap.get(f.id) || {}}]));
    const staffMap = new Map(staff.map(s => [s.id, s]));
    
    // Group warehouse collections by warehouse_id for efficient lookup
    const warehouseCollectionsMap = new Map<string, any[]>();
    warehouseCollections.forEach(wc => {
      if (!warehouseCollectionsMap.has(wc.warehouse_id)) {
        warehouseCollectionsMap.set(wc.warehouse_id, []);
      }
      warehouseCollectionsMap.get(wc.warehouse_id)?.push(wc);
    });
    
    // Join warehouses with warehouse collections data in memory
    const warehousesWithCollections: Warehouse[] = warehouses.map(warehouse => ({
      ...warehouse,
      warehouse_collections: {
        count: warehouseCollectionsMap.get(warehouse.id)?.length || 0
      }
    }));
    
    // Join collections with farmer and staff data in memory
    const collections: Collection[] = rawCollections.map(collection => ({
      ...collection,
      farmers: collection.farmer_id ? farmerMap.get(collection.farmer_id) : undefined,
      staff: collection.staff_id ? staffMap.get(collection.staff_id) : null
    }));
    
    // Store raw collections data
    setCollections(collections);
    
    // Calculate metrics with trends
    const metricsWithTrends = calculateMetricsWithTrends(
      {
        collections: rawCollections,
        farmers,
        staff,
        payments
      },
      null // We'll calculate this properly in the fetchDashboardData function
    );
    
    setMetrics(metricsWithTrends);
    
    // Process other data for charts and tables
    const qualityScores: Record<string, number> = { 'A+': 100, 'A': 90, 'B': 75, 'C': 60 };
    
    const topFiveFarmers = [...farmers]
      .sort((a, b) => (b.farmer_analytics?.total_collections || 0) - (a.farmer_analytics?.total_collections || 0))
      .slice(0, 5)
      .map(f => ({
        id: f.id,
        name: f.profiles.full_name,
        registrationNumber: f.registration_number,
        liters: Math.round(f.farmer_analytics?.total_liters || 0),
        collections: f.farmer_analytics?.total_collections || 0,
        earnings: Math.round(f.farmer_analytics?.current_month_earnings || 0),
        quality: Math.round((f.farmer_analytics?.total_liters || 0) > 0 ? 
          ((f.farmer_analytics?.total_collections || 0) / (f.farmer_analytics?.total_liters || 1)) * 100 : 0),
        kycStatus: f.kyc_status
      }));

    const staffPerformanceMetrics = staff.map(st => {
      const staffCollections = collections.filter(
        collection => collection.staff?.profiles?.full_name === st.profiles.full_name
      );

      const totalStaffRevenue = staffCollections.reduce(
        (sum, collection) => sum + (collection.total_amount || 0),
        0
      );

      return {
        id: st.id,
        name: st.profiles.full_name,
        employeeId: st.employee_id,
        collections: staffCollections.length,
        liters: Math.round(staffCollections.reduce((sum, c) => sum + (c.liters || 0), 0)),
        farmers: new Set(staffCollections.map(c => c.farmer_id)).size,
        rating: (4 + Math.random()).toFixed(1) // Simulated rating
      };
    });

    const paymentMetricsList = payments
      .reduce((acc: Record<string, any>, curr: any) => {
        if (!acc[curr.farmers.full_name]) {
          acc[curr.farmers.full_name] = {
            id: curr.id,
            full_name: curr.farmers.full_name,
            amount: curr.amount,
            status: curr.status
          };
        }

        acc[curr.farmers.full_name].status =
          curr.status === 'Paid' || acc[curr.farmers.full_name].status === 'Paid'
            ? 'Paid'
            : acc[curr.farmers.full_name].status;

        acc[curr.farmers.full_name].amount =
          acc[curr.farmers.full_name].amount + curr.amount;

        return acc;
      }, {});

    const paymentMetricsListArray = Object.values(paymentMetricsList);

    const qualityCounts: Record<string, number> = {};
    collections.forEach((curr: Collection) => {
      if (curr.quality_grade) {
        if (qualityCounts[curr.quality_grade]) {
          qualityCounts[curr.quality_grade] += 1;
        } else {
          qualityCounts[curr.quality_grade] = 1;
        }
      }
    });

    const qualityDistributionData = Object.entries(qualityCounts).map(([grade, count]) => ({
      name: grade,
      value: count
    }));

    interface CollectionTrendItem {
      liters: number;
      collections: number;
    }

    interface CollectionTrendData {
      [date: string]: CollectionTrendItem;
    }

    const collectionTrendsData: CollectionTrendData = {};
    collections.forEach((curr: Collection) => {
      const date = format(new Date(curr.collection_date), 'yyyy-MM-dd');

      if (collectionTrendsData[date]) {
        collectionTrendsData[date].liters += curr.liters || 0;
        collectionTrendsData[date].collections += 1;
      } else {
        collectionTrendsData[date] = {
          liters: curr.liters || 0,
          collections: 1
        };
      }
    });

    const collectionTrendsList = Object.entries(collectionTrendsData).map(([date, data]) => ({
      date,
      liters: data.liters,
      collections: data.collections
    }));

    interface RevenueTrendData {
      [date: string]: number;
    }

    const revenueTrendsData: RevenueTrendData = {};
    collections.forEach((curr: Collection) => {
      const date = format(new Date(curr.collection_date), 'yyyy-MM-dd');

      if (revenueTrendsData[date]) {
        revenueTrendsData[date] += curr.total_amount || 0;
      } else {
        revenueTrendsData[date] = curr.total_amount || 0;
      }
    });

    const revenueTrendsList = Object.entries(revenueTrendsData).map(([date, amount]) => ({
      date,
      revenue: amount
    }));

    interface DailyAnalyticsItem {
      liters: number;
      collections: number;
      revenue: number;
      avgQuality: number;
    }

    interface DailyAnalytics {
      [date: string]: DailyAnalyticsItem;
    }

    const dailyAnalytics: DailyAnalytics = {};
    collections.forEach((curr: Collection) => {
      const date = format(new Date(curr.collection_date), 'yyyy-MM-dd');

      if (dailyAnalytics[date]) {
        dailyAnalytics[date].liters += curr.liters || 0;
        dailyAnalytics[date].collections += 1;
        dailyAnalytics[date].revenue += curr.total_amount || 0;
        dailyAnalytics[date].avgQuality += qualityScores[curr.quality_grade] || 0;
      } else {
        dailyAnalytics[date] = {
          liters: curr.liters || 0,
          collections: 1,
          revenue: curr.total_amount || 0,
          avgQuality: qualityScores[curr.quality_grade] || 0
        };
      }
    });

    const dailyAnalyticsList = Object.entries(dailyAnalytics).map(([date, data]) => ({
      date,
      liters: data.liters,
      collections: data.collections,
      revenue: data.revenue,
      avgQuality: data.collections > 0 ? data.avgQuality / data.collections : 0
    }));

    return {
      collectionsWithRefs: collections,
      topFiveFarmers,
      staffPerformanceMetrics,
      paymentMetricsListArray,
      qualityDistributionData,
      warehousesWithCollections,
      collectionTrendsList,
      revenueTrendsList,
      dailyAnalyticsList
    };
  }, []);

  // Enhanced fetchDashboardData with session refresh
  const fetchDashboardData = useCallback(async () => {
    // Prevent multiple simultaneous processing
    if (isProcessing.current) return;
    
    isProcessing.current = true;
    dataStable.current = false;
    
    if (prevTimeRange.current === timeRange && !loading) {
      isProcessing.current = false;
      return;
    }
    
    prevTimeRange.current = timeRange;
    setError(null);
    
    try {
      // Refresh session before fetching data to ensure we have a valid connection
      await refreshSession();
      
      const { startDate, endDate } = getDateFilter();
      
      // Show loading only for initial load or when time range changes
      if (initialLoad || prevTimeRange.current !== timeRange) {
        setLoading(true);
      }
      
      // Fetch all required data in parallel with error handling
      const [
        collectionsData,
        farmersData,
        staffDashboardData,
        paymentsData,
        warehousesData,
        farmerAnalyticsData,
        warehouseCollectionsData
      ] = await Promise.all([
        // Fetch collections without embedded data to avoid relationship ambiguity
        supabase
          .from('collections')
          .select(`
            *
          `)
          .gte('collection_date', startDate)
          .lte('collection_date', endDate)
          .order('collection_date', { ascending: false })
          .limit(1000),
        
        // Fetch farmers without embedded analytics to avoid relationship ambiguity
        supabase
          .from('farmers')
          .select(`
            *,
            profiles!user_id (full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(200),
        
        // Fetch staff
        supabase
          .from('staff')
          .select(`
            *,
            profiles!user_id (full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Fetch payments (collections data for payments)
        supabase
          .from('collections')
          .select(`
            id,
            farmer_id,
            total_amount,
            collection_date,
            status
          `)
          .gte('collection_date', startDate)
          .lte('collection_date', endDate)
          .limit(1000),
        
        // Fetch warehouses without embedded collections to avoid relationship ambiguity
        supabase
          .from('warehouses')
          .select('*')
          .limit(50),
        
        // Fetch farmer analytics separately to avoid relationship ambiguity
        supabase
          .from('farmer_analytics')
          .select('*')
          .limit(1000),
        
        // Fetch warehouse collections separately to avoid relationship ambiguity
        supabase
          .from('warehouse_collections')
          .select('*')
          .limit(1000)
      ]);

      // Handle errors with better context
      if (collectionsData.error) {
        console.error('Error fetching collections data:', collectionsData.error);
        throw new Error(`Collections data error: ${collectionsData.error.message}`);
      }
      if (farmersData.error) {
        console.error('Error fetching farmers data:', farmersData.error);
        throw new Error(`Farmers data error: ${farmersData.error.message}`);
      }
      if (staffDashboardData.error) {
        console.error('Error fetching staff data:', staffDashboardData.error);
        throw new Error(`Staff data error: ${staffDashboardData.error.message}`);
      }
      if (paymentsData.error) {
        console.error('Error fetching payments data:', paymentsData.error);
        throw new Error(`Payments data error: ${paymentsData.error.message}`);
      }
      if (warehousesData.error) {
        console.error('Error fetching warehouses data:', warehousesData.error);
        throw new Error(`Warehouses data error: ${warehousesData.error.message}`);
      }

      // Fetch previous period data for trend calculation
      const previousData = await fetchPreviousPeriodData();

      // Process the data
      processData(
        collectionsData.data || [],
        farmersData.data || [],
        staffDashboardData.data || [],
        paymentsData.data || [],
        warehousesData.data || [],
        farmerAnalyticsData.data || [],
        warehouseCollectionsData.data || []
      );
      
      // Calculate metrics with trends using real data
      const metricsWithTrends = calculateMetricsWithTrends(
        {
          collections: collectionsData.data || [],
          farmers: farmersData.data || [],
          staff: staffDashboardData.data || [],
          payments: paymentsData.data || []
        },
        previousData
      );
      
      setMetrics(metricsWithTrends);
      
      // Mark data as stable after processing
      dataStable.current = true;
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', { ...err });
      // Check if it's a relationship error
      if (err.message && err.message.includes('Could not embed')) {
        console.error('Relationship embedding error. This might be due to multiple foreign key relationships between tables.');
        const errorMessage = 'Dashboard data loading issue. Please try refreshing the page.';
        setError(errorMessage);
        toast.error('Data Loading Error', errorMessage);
      } else {
        const errorMessage = err.message || err.error_description || 'Failed to fetch dashboard data';
        setError(errorMessage);
        toast.error('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
      isProcessing.current = false;
    }
  }, [getDateFilter, toast, initialLoad, processData, timeRange, loading, fetchPreviousPeriodData]); // Removed refreshSession from dependencies

  // Fetch data function that can be called manually
  const fetchData = useCallback(async () => {
    if (isProcessing.current) return;
    
    isProcessing.current = true;
    dataStable.current = false;
    
    if (prevTimeRange.current === timeRange && !loading) {
      isProcessing.current = false;
      return;
    }
    
    prevTimeRange.current = timeRange;
    setError(null);
    
    try {
      // Refresh session before fetching data to ensure we have a valid connection
      await refreshSession();
      
      const { startDate, endDate } = getDateFilter();
      
      // Show loading only for initial load or when time range changes
      if (initialLoad || prevTimeRange.current !== timeRange) {
        setLoading(true);
      }
      
      // Fetch all required data in parallel with error handling
      const [
        collectionsData,
        farmersData,
        staffDashboardData,
        paymentsData,
        warehousesData,
        farmerAnalyticsData,
        warehouseCollectionsData
      ] = await Promise.all([
        // Fetch collections without embedded data to avoid relationship ambiguity
        supabase
          .from('collections')
          .select(`
            *
          `)
          .gte('collection_date', startDate)
          .lte('collection_date', endDate)
          .order('collection_date', { ascending: false })
          .limit(1000),
        
        // Fetch farmers without embedded analytics to avoid relationship ambiguity
        supabase
          .from('farmers')
          .select(`
            *,
            profiles!user_id (full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(200),
        
        // Fetch staff
        supabase
          .from('staff')
          .select(`
            *,
            profiles!user_id (full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Fetch payments (collections data for payments)
        supabase
          .from('collections')
          .select(`
            id,
            farmer_id,
            total_amount,
            collection_date,
            status
          `)
          .gte('collection_date', startDate)
          .lte('collection_date', endDate)
          .limit(1000),
        
        // Fetch warehouses without embedded collections to avoid relationship ambiguity
        supabase
          .from('warehouses')
          .select('*')
          .limit(50),
        
        // Fetch farmer analytics separately to avoid relationship ambiguity
        supabase
          .from('farmer_analytics')
          .select('*')
          .limit(1000),
        
        // Fetch warehouse collections separately to avoid relationship ambiguity
        supabase
          .from('warehouse_collections')
          .select('*')
          .limit(1000)
      ]);

      // Handle errors with better context
      if (collectionsData.error) {
        console.error('Error fetching collections data:', collectionsData.error);
        throw new Error(`Collections data error: ${collectionsData.error.message}`);
      }
      if (farmersData.error) {
        console.error('Error fetching farmers data:', farmersData.error);
        throw new Error(`Farmers data error: ${farmersData.error.message}`);
      }
      if (staffDashboardData.error) {
        console.error('Error fetching staff data:', staffDashboardData.error);
        throw new Error(`Staff data error: ${staffDashboardData.error.message}`);
      }
      if (paymentsData.error) {
        console.error('Error fetching payments data:', paymentsData.error);
        throw new Error(`Payments data error: ${paymentsData.error.message}`);
      }
      if (warehousesData.error) {
        console.error('Error fetching warehouses data:', warehousesData.error);
        throw new Error(`Warehouses data error: ${warehousesData.error.message}`);
      }

      // Fetch previous period data for trend calculation
      const previousData = await fetchPreviousPeriodData();

      // Process the data
      processData(
        collectionsData.data || [],
        farmersData.data || [],
        staffDashboardData.data || [],
        paymentsData.data || [],
        warehousesData.data || [],
        farmerAnalyticsData.data || [],
        warehouseCollectionsData.data || []
      );
      
      // Calculate metrics with trends using real data
      const metricsWithTrends = calculateMetricsWithTrends(
        {
          collections: collectionsData.data || [],
          farmers: farmersData.data || [],
          staff: staffDashboardData.data || [],
          payments: paymentsData.data || []
        },
        previousData
      );
      
      setMetrics(metricsWithTrends);
      
      // Mark data as stable after processing
      dataStable.current = true;
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', { ...err });
      // Check if it's a relationship error
      if (err.message && err.message.includes('Could not embed')) {
        console.error('Relationship embedding error. This might be due to multiple foreign key relationships between tables.');
        const errorMessage = 'Dashboard data loading issue. Please try refreshing the page.';
        setError(errorMessage);
        toast.error('Data Loading Error', errorMessage);
      } else {
        const errorMessage = err.message || err.error_description || 'Failed to fetch dashboard data';
        setError(errorMessage);
        toast.error('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
      isProcessing.current = false;
    }
  }, [getDateFilter, toast, initialLoad, processData, timeRange, loading, fetchPreviousPeriodData, refreshSession]); // Added refreshSession back to dependencies
      }
      
      // Fetch all required data in parallel with error handling
      const [
        collectionsData,
        farmersData,
        staffDashboardData,
        paymentsData,
        warehousesData,
        farmerAnalyticsData,
        warehouseCollectionsData
      ] = await Promise.all([
        // Fetch collections without embedded data to avoid relationship ambiguity
        supabase
          .from('collections')
          .select(`
            *
          `)
          .gte('collection_date', startDate)
          .lte('collection_date', endDate)
          .order('collection_date', { ascending: false })
          .limit(1000),
        
        // Fetch farmers without embedded analytics to avoid relationship ambiguity
        supabase
          .from('farmers')
          .select(`
            *,
            profiles!user_id (full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(200),
        
        // Fetch staff
        supabase
          .from('staff')
          .select(`
            *,
            profiles!user_id (full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Fetch payments (collections data for payments)
        supabase
          .from('collections')
          .select(`
            id,
            farmer_id,
            total_amount,
            collection_date,
            status
          `)
          .gte('collection_date', startDate)
          .lte('collection_date', endDate)
          .limit(1000),
        
        // Fetch warehouses without embedded collections to avoid relationship ambiguity
        supabase
          .from('warehouses')
          .select('*')
          .limit(50),
        
        // Fetch farmer analytics separately to avoid relationship ambiguity
        supabase
          .from('farmer_analytics')
          .select('*')
          .limit(1000),
        
        // Fetch warehouse collections separately to avoid relationship ambiguity
        supabase
          .from('warehouse_collections')
          .select('*')
          .limit(1000)
      ]);

      // Handle errors with better context
      if (collectionsData.error) {
        console.error('Error fetching collections data:', collectionsData.error);
        throw new Error(`Collections data error: ${collectionsData.error.message}`);
      }
      if (farmersData.error) {
        console.error('Error fetching farmers data:', farmersData.error);
        throw new Error(`Farmers data error: ${farmersData.error.message}`);
      }
      if (staffDashboardData.error) {
        console.error('Error fetching staff data:', staffDashboardData.error);
        throw new Error(`Staff data error: ${staffDashboardData.error.message}`);
      }
      if (paymentsData.error) {
        console.error('Error fetching payments data:', paymentsData.error);
        throw new Error(`Payments data error: ${paymentsData.error.message}`);
      }
      if (warehousesData.error) {
        console.error('Error fetching warehouses data:', warehousesData.error);
        throw new Error(`Warehouses data error: ${warehousesData.error.message}`);
      }

      // Fetch previous period data for trend calculation
      const previousData = await fetchPreviousPeriodData();

      // Process the data
      processData(
        collectionsData.data || [],
        farmersData.data || [],
        staffDashboardData.data || [],
        paymentsData.data || [],
        warehousesData.data || [],
        farmerAnalyticsData.data || [],
        warehouseCollectionsData.data || []
      );
      
      // Calculate metrics with trends using real data
      const metricsWithTrends = calculateMetricsWithTrends(
        {
          collections: collectionsData.data || [],
          farmers: farmersData.data || [],
          staff: staffDashboardData.data || [],
          payments: paymentsData.data || []
        },
        previousData
      );
      
      setMetrics(metricsWithTrends);
      
      // Mark data as stable after processing
      dataStable.current = true;
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', { ...err });
      // Check if it's a relationship error
      if (err.message && err.message.includes('Could not embed')) {
        console.error('Relationship embedding error. This might be due to multiple foreign key relationships between tables.');
        const errorMessage = 'Dashboard data loading issue. Please try refreshing the page.';
        setError(errorMessage);
        toast.error('Data Loading Error', errorMessage);
      } else {
        const errorMessage = err.message || err.error_description || 'Failed to fetch dashboard data';
        setError(errorMessage);
        toast.error('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
      isProcessing.current = false;
    }
  }, [getDateFilter, toast, initialLoad, processData, timeRange, loading, fetchPreviousPeriodData]); // Removed refreshSession from dependencies

  // Create a memoized MetricCard component
  const MetricCard = useMemo(() => ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = '#3b82f6', 
    trend 
  }: { 
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    trend?: { value: number; isPositive: boolean };
  }) => (
    <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            {trend && (
              <div className="flex items-center mt-2">
                <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-gray-500 ml-1">from last period</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-full" style={{ backgroundColor: color + '15' }}>
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  ), []);

  // Effect to fetch data on initial load and time range changes
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <DashboardLayout>
      <Breadcrumb items={['Admin', 'Dashboard']} />
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-4">
          <MetricCard 
            icon={Users} 
            title="Total Farmers" 
            value={metrics.totalFarmers} 
            trend={metrics.farmersTrend} 
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <MetricCard 
            icon={TrendingUp} 
            title="Total Collections" 
            value={metrics.totalCollections} 
            trend={metrics.litersTrend} 
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <MetricCard 
            icon={DollarSign} 
            title="Total Revenue" 
            value={metrics.totalRevenue} 
            trend={metrics.revenueTrend} 
            color="#eab308"
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <MetricCard 
            icon={Award} 
            title="Average Quality" 
            value={`${metrics.averageQuality}%`} 
            trend={metrics.qualityTrend} 
            color="#d946ef"
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <MetricCard 
            icon={UserCog} 
            title="Staff Members" 
            value={metrics.staffMembers} 
          />
        </div>
        <div className="col-span-12 sm:col-span-4">
          <MetricCard 
            icon={Clock} 
            title="Pending Payments" 
            value={metrics.pendingPayments} 
            color="#10b981"
          />
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="rounded-full">
                <Filter className="h-4 w-4" />
              </Badge>
              <h2 className="text-sm font-bold">Dashboard</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-40"
              />
              <Button onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-8">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Collections by Day</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        <Eye className="h-4 w-4" />
                      </Badge>
                      <Badge variant="outline">
                        <FileBarChart className="h-4 w-4" />
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={collectionsByDay}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 0,
                          bottom: 15,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="collections" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="liters" stroke="#82ca9d" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Top Farmers</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        <Eye className="h-4 w-4" />
                      </Badge>
                      <Badge variant="outline">
                        <FileBarChart className="h-4 w-4" />
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={topFarmers}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 0,
                          bottom: 15,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="liters" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Staff Performance</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        <Eye className="h-4 w-4" />
                      </Badge>
                      <Badge variant="outline">
                        <FileBarChart className="h-4 w-4" />
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart width={400} height={400}>
                        <Pie
                          data={staffPerformance}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="liters"
                        >
                          {staffPerformance.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quality Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart width={400} height={400}>
                          <Pie
                            data={qualityDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
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
                </div>
                <div className="col-span-12">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart width={400} height={400}>
                          <Pie
                            data={paymentStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {paymentStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <div className="col-span-12">
                  <Card>
                    <CardHeader>
                      <CardTitle>Warehouses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AdvancedWarehouseMap
                        warehouses={warehouses}
                        collections={collections}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ), []);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  // Format number
  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  }, []);

  // Use the chart stabilizer hook
  const { data: stableCollectionTrends, isStable: collectionTrendsStable } = useChartStabilizer(collectionTrends, 150);
  const { data: stableRevenueTrends, isStable: revenueTrendsStable } = useChartStabilizer(revenueTrends, 150);
  const { data: stableQualityDistribution, isStable: qualityDistributionStable } = useChartStabilizer(qualityDistribution, 150);

  // Memoize chart components with proper dependencies to prevent re-renders
  const CollectionTrendChart = useMemo(() => {
    // Only render chart when we have stable data
    if (!collectionTrendsStable || stableCollectionTrends.length === 0) {
      return () => (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      );
    }
    
    return () => (
      <div className="h-80" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stableCollectionTrends} syncId="dashboardCharts">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              formatter={(value) => [formatNumber(Number(value)), 'Liters']}
              labelFormatter={(label) => `Period: ${label}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="liters" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.3} 
              name="Liters" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }, [stableCollectionTrends, collectionTrendsStable, formatNumber]);

  const RevenueTrendChart = useMemo(() => {
    // Only render chart when we have stable data
    if (!revenueTrendsStable || stableRevenueTrends.length === 0) {
      return () => (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      );
    }
    
    return () => (
      <div className="h-80" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stableRevenueTrends} syncId="dashboardCharts">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
              labelFormatter={(label) => `Period: ${label}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue" 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }, [stableRevenueTrends, revenueTrendsStable, formatCurrency]);

  const QualityDistributionChart = useMemo(() => {
    // Only render chart when we have stable data
    if (!qualityDistributionStable || stableQualityDistribution.length === 0 || stableQualityDistribution.every(q => q.count === 0)) {
      return () => (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      );
    }
    
    return () => (
      <div className="h-80" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={stableQualityDistribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ grade, percentage }) => `${grade}: ${percentage}%`}
              outerRadius={80}
              dataKey="count"
              isAnimationActive={false}
            >
              {stableQualityDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [value, 'Collections']} 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }, [stableQualityDistribution, qualityDistributionStable]);

  // Loading skeleton with fixed dimensions
  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80 mt-2" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} style={{ height: '120px' }}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <h3 className="ml-2 text-lg font-medium text-red-800">Error Loading Data</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <Button 
            onClick={fetchDashboardData}
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <Breadcrumb />
          {/* Enhanced Header with better styling */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Enhanced Admin Dashboard</h1>
                <p className="text-blue-100 mt-1">Comprehensive overview of milk collection operations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={fetchDashboardData}
                variant="secondary"
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border-white/30 text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-48 bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

        {/* Enhanced Navigation Tabs with better styling */}
        <div className="bg-white rounded-xl shadow-sm p-2">
          <nav className="flex flex-wrap gap-2">
            {['overview', 'daily', 'farmers', 'staff', 'payments', 'quality', 'warehouses'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' && <BarChart3 className="w-4 h-4" />}
                {tab === 'daily' && <Calendar className="w-4 h-4" />}
                {tab === 'farmers' && <Users className="w-4 h-4" />}
                {tab === 'staff' && <UserCog className="w-4 h-4" />}
                {tab === 'payments' && <DollarSign className="w-4 h-4" />}
                {tab === 'quality' && <Award className="w-4 h-4" />}
                {tab === 'warehouses' && <Warehouse className="w-4 h-4" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Enhanced Key Metrics with better cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                icon={Users}
                title="Total Farmers"
                value={formatNumber(metrics.totalFarmers)}
                subtitle={`${metrics.activeFarmers} active`}
                color="#3b82f6"
                trend={metrics.farmersTrend}
              />
              <MetricCard
                icon={Droplets}
                title="Total Liters"
                value={formatNumber(metrics.totalLiters)}
                subtitle={`${formatNumber(metrics.todayLiters)} today`}
                color="#10b981"
                trend={metrics.litersTrend}
              />
              <MetricCard
                icon={DollarSign}
                title="Revenue"
                value={formatCurrency(metrics.totalRevenue)}
                subtitle={formatCurrency(metrics.pendingPayments) + ' pending'}
                color="#f59e0b"
                trend={metrics.revenueTrend}
              />
              <MetricCard
                icon={Award}
                title="Avg Quality"
                value={metrics.averageQuality + '%'}
                subtitle="Quality Score"
                color="#8b5cf6"
                trend={metrics.qualityTrend}
              />
            </div>

            {/* Enhanced Charts with better styling */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Collections Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CollectionTrendChart />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueTrendChart />
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Quality Distribution and Alerts with better styling */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Award className="h-5 w-5 text-purple-500" />
                    Quality Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QualityDistributionChart />
                </CardContent>
              </Card>

              {/* Enhanced Alerts */}
              <div className="lg:col-span-2">
                {alerts.length > 0 ? (
                  <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Alerts & Notifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {alerts.map((alert, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-full ${
                                alert.severity === 'warning' ? 'bg-yellow-100' :
                                alert.severity === 'success' ? 'bg-green-100' : 'bg-blue-100'
                              }`}>
                                <AlertCircle className={`w-5 h-5 ${
                                  alert.severity === 'warning' ? 'text-yellow-600' :
                                  alert.severity === 'success' ? 'text-green-600' : 'text-blue-600'
                                }`} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                                <p className="text-xs text-gray-500">{alert.time}</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="border-gray-200">View</Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                    <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">All Clear</h3>
                      <p className="text-gray-500">No alerts or notifications at this time</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Daily Analytics Tab */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            {/* Enhanced Daily Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                icon={Calendar}
                title="Total Collections"
                value={dailyAnalyticsData.reduce((sum, day) => sum + day.collections, 0)}
                color="#3b82f6"
              />
              <MetricCard
                icon={Droplets}
                title="Total Liters"
                value={formatNumber(dailyAnalyticsData.reduce((sum, day) => sum + day.liters, 0))}
                color="#10b981"
              />
              <MetricCard
                icon={DollarSign}
                title="Total Revenue"
                value={formatCurrency(dailyAnalyticsData.reduce((sum, day) => sum + day.revenue, 0))}
                color="#f59e0b"
              />
              <MetricCard
                icon={Award}
                title="Avg Quality"
                value={`${(dailyAnalyticsData.reduce((sum, day) => sum + day.avgQuality, 0) / dailyAnalyticsData.length || 0).toFixed(1)}%`}
                color="#8b5cf6"
              />
            </div>

            {/* Enhanced Daily Analytics Charts */}
            <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Daily Collections Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyAnalyticsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                        stroke="#6b7280"
                      />
                      <YAxis yAxisId="left" stroke="#6b7280" />
                      <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'collections') return [value, 'Collections'];
                          if (name === 'liters') return [formatNumber(Number(value)), 'Liters'];
                          if (name === 'revenue') return [formatCurrency(Number(value)), 'Revenue'];
                          if (name === 'avgQuality') return [`${Number(value).toFixed(1)}%`, 'Avg Quality'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Date: ${format(new Date(label), 'MMM dd, yyyy')}`}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left" 
                        dataKey="collections" 
                        name="Collections" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        yAxisId="left" 
                        dataKey="liters" 
                        name="Liters" 
                        fill="#10b981" 
                        opacity={0.7}
                        radius={[4, 4, 0, 0]}
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="avgQuality" 
                        name="Avg Quality (%)" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#8b5cf6' }}
                        activeDot={{ r: 6, fill: '#8b5cf6' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Daily Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyAnalyticsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          stroke="#6b7280"
                        />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                          labelFormatter={(label) => `Date: ${format(new Date(label), 'MMM dd, yyyy')}`}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          name="Revenue" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    Daily Liters Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyAnalyticsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          stroke="#6b7280"
                        />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          formatter={(value) => [formatNumber(Number(value)), 'Liters']}
                          labelFormatter={(label) => `Date: ${format(new Date(label), 'MMM dd, yyyy')}`}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="liters" 
                          name="Liters" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#3b82f6' }}
                          activeDot={{ r: 6, fill: '#3b82f6' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Farmers Tab */}
        {activeTab === 'farmers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                icon={Users}
                title="Active Farmers"
                value={formatNumber(metrics.activeFarmers)}
                subtitle={`${Math.round((metrics.activeFarmers / metrics.totalFarmers) * 100)}% of total`}
                color="#3b82f6"
              />
              <MetricCard
                icon={CheckCircle}
                title="Avg Collections"
                value={formatNumber(Math.round(metrics.totalCollections / metrics.totalFarmers))}
                subtitle="Per farmer"
                color="#10b981"
              />
              <MetricCard
                icon={TrendingUp}
                title="Avg Liters"
                value={formatNumber(Math.round(metrics.totalLiters / metrics.totalFarmers))}
                subtitle="Per farmer"
                color="#f59e0b"
              />
            </div>

            <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg font-semibold">
                  <span>Top Performing Farmers</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search farmers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-64"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="border-gray-200">
                      <FileBarChart className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Farmer</th>
                        <th className="text-left py-3 px-4 font-medium">Registration</th>
                        <th className="text-left py-3 px-4 font-medium">Collections</th>
                        <th className="text-left py-3 px-4 font-medium">Liters</th>
                        <th className="text-left py-3 px-4 font-medium">Earnings</th>
                        <th className="text-left py-3 px-4 font-medium">Quality</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topFarmers.map((farmer) => (
                        <tr key={farmer.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center">
                              <div className="bg-gradient-to-br from-blue-100 to-indigo-200 border-2 border-white rounded-xl w-10 h-10 flex items-center justify-center shadow-sm" />
                              <div className="ml-3">
                                <div>{farmer.name}</div>
                                <div className="text-xs text-gray-500">
                                  {farmer.kycStatus === 'approved' ? (
                                    <Badge className="bg-green-500 text-white hover:bg-green-500/80">
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                      {farmer.kycStatus}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{farmer.registrationNumber}</td>
                          <td className="py-3 px-4">{farmer.collections}</td>
                          <td className="py-3 px-4">{formatNumber(farmer.liters)}L</td>
                          <td className="py-3 px-4">{formatCurrency(farmer.earnings)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              farmer.quality >= 90 ? 'bg-green-100 text-green-800' :
                              farmer.quality >= 75 ? 'bg-blue-100 text-blue-800' :
                              farmer.quality >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {farmer.quality}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                icon={UserCog}
                title="Total Staff"
                value={formatNumber(metrics.staffMembers)}
                color="#3b82f6"
              />
              <MetricCard
                icon={Truck}
                title="Avg Collections"
                value={formatNumber(Math.round(metrics.totalCollections / metrics.staffMembers))}
                subtitle="Per staff member"
                color="#10b981"
              />
              <MetricCard
                icon={Users}
                title="Farmers Served"
                value={formatNumber(
                  staffPerformance.reduce((sum, s) => sum + s.farmers, 0) / metrics.staffMembers
                )}
                subtitle="Avg per staff"
                color="#f59e0b"
              />
            </div>

            <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg font-semibold">
                  <span>Staff Performance</span>
                  <Button variant="outline" size="sm" className="border-gray-200">
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Performance Report
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Staff</th>
                        <th className="text-left py-3 px-4 font-medium">Employee ID</th>
                        <th className="text-left py-3 px-4 font-medium">Collections</th>
                        <th className="text-left py-3 px-4 font-medium">Liters</th>
                        <th className="text-left py-3 px-4 font-medium">Farmers</th>
                        <th className="text-left py-3 px-4 font-medium">Rating</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPerformance.map((staff) => (
                        <tr key={staff.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center">
                              <div className="bg-gradient-to-br from-purple-100 to-pink-200 border-2 border-white rounded-xl w-10 h-10 flex items-center justify-center shadow-sm" />
                              <div className="ml-3">
                                <div>{staff.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{staff.employeeId}</td>
                          <td className="py-3 px-4">{staff.collections}</td>
                          <td className="py-3 px-4">{formatNumber(staff.liters)}L</td>
                          <td className="py-3 px-4">{staff.farmers}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {staff.rating}/5
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                icon={DollarSign}
                title="Total Revenue"
                value={formatCurrency(metrics.totalRevenue)}
                color="#10b981"
              />
              <MetricCard
                icon={Clock}
                title="Pending Payments"
                value={formatCurrency(metrics.pendingPayments)}
                color="#f59e0b"
              />
              <MetricCard
                icon={CheckCircle}
                title="Payment Completion"
                value={`${Math.round((metrics.totalRevenue - metrics.pendingPayments) / metrics.totalRevenue * 100)}%`}
                subtitle="Paid collections"
                color="#3b82f6"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Payment Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentStatus}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="status" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          formatter={(value) => [formatNumber(Number(value)), 'Count']} 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#3b82f6" 
                          name="Count" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Payment Amounts by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentStatus}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="status" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), 'Amount']} 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}
                        />
                        <Bar 
                          dataKey="amount" 
                          fill="#10b981" 
                          name="Amount (KES)" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === 'quality' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard
                icon={Award}
                title="Average Quality"
                value={metrics.averageQuality + '%'}
                subtitle="Overall score"
                color="#8b5cf6"
              />
              <MetricCard
                icon={TrendingUp}
                title="Quality Improvement"
                value="+2.5%"
                subtitle="Compared to last period"
                color="#10b981"
              />
            </div>

            <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quality Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Grade</th>
                        <th className="text-left py-3 px-4 font-medium">Collections</th>
                        <th className="text-left py-3 px-4 font-medium">Percentage</th>
                        <th className="text-left py-3 px-4 font-medium">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qualityDistribution.map((grade) => (
                        <tr key={grade.grade} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{grade.grade}</td>
                          <td className="py-3 px-4">{formatNumber(grade.count)}</td>
                          <td className="py-3 px-4">{grade.percentage}%</td>
                          <td className="py-3 px-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${grade.percentage}%`,
                                  backgroundColor: grade.color
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Warehouses Tab */}
        {activeTab === 'warehouses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                icon={Warehouse}
                title="Total Warehouses"
                value={warehouses.length}
                color="#3b82f6"
              />
              <MetricCard
                icon={Droplets}
                title="Total Collections"
                value={formatNumber(
                  warehouses.reduce((sum, w) => sum + (w.warehouse_collections?.count || 0), 0)
                )}
                subtitle="Across all warehouses"
                color="#10b981"
              />
              <MetricCard
                icon={BarChart3}
                title="Avg Collections"
                value={formatNumber(
                  warehouses.reduce((sum, w) => sum + (w.warehouse_collections?.count || 0), 0) / warehouses.length
                )}
                subtitle="Per warehouse"
                color="#f59e0b"
              />
            </div>

            {/* Advanced Warehouse Map Visualization */}
            <AdvancedWarehouseMap warehouses={warehouses} />

            <Card className="hover:shadow-lg transition-shadow duration-300 rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Warehouse Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Warehouse</th>
                        <th className="text-left py-3 px-4 font-medium">Location</th>
                        <th className="text-left py-3 px-4 font-medium">Collections</th>
                        <th className="text-left py-3 px-4 font-medium">Capacity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.map((warehouse) => (
                        <tr key={warehouse.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{warehouse.name}</td>
                          <td className="py-3 px-4">{warehouse.address}</td>
                          <td className="py-3 px-4">
                            {formatNumber(warehouse.warehouse_collections?.count || 0)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {Math.round((warehouse.warehouse_collections?.count || 0) / 1000 * 100)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default AdminDashboard;