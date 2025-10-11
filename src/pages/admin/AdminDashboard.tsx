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
  Warehouse as WarehouseIcon,
  RefreshCw,
  Eye,
  FileBarChart,
  UserCog,
  Droplets,
  ChevronDown,
  Search
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';

import { useChartStabilizer } from '@/hooks/useChartStabilizer';
import { businessIntelligenceService } from '@/services/business-intelligence-service';
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

// Add new interface for pending farmers
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
  const [activeTab, setActiveTab] = useState('overview');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [timeRange, setTimeRange] = useState('week');
  const [collectionTrends, setCollectionTrends] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [qualityDistribution, setQualityDistribution] = useState<any[]>([]);
  const [dailyAnalyticsData, setDailyAnalyticsData] = useState<DailyAnalyticsData[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const isProcessing = useRef(false);
  const dataStable = useRef(false);
  const prevTimeRange = useRef(timeRange);
  const [pendingFarmers, setPendingFarmers] = useState<PendingFarmer[]>([]);
  const [kycStats, setKycStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    resubmissions: 0
  });

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
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
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
      
      // Fetch collections for previous period with explicit joins
      const { data: prevCollectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          farmer_id,
          staff_id,
          liters,
          quality_grade,
          rate_per_liter,
          total_amount,
          collection_date,
          status
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
        // Don't throw error, just return null data
        return null;
      }

      // Fetch farmers for previous period
      const { data: prevFarmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          user_id,
          registration_number,
          kyc_status,
          created_at,
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (farmersError) {
        console.error('Error fetching previous period farmers data:', {
          message: farmersError.message,
          details: farmersError.details,
          hint: farmersError.hint
        });
        // Don't throw error, just return null data
        return null;
      }

      // Fetch payments for previous period with explicit query
      const { data: prevPaymentsData, error: paymentsError } = await supabase
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
        .limit(1000);

      if (paymentsError) {
        console.error('Error fetching previous period payments data:', {
          message: paymentsError.message,
          details: paymentsError.details,
          hint: paymentsError.hint
        });
        // Don't throw error, just return null data
        return null;
      }

      return {
        collections: prevCollectionsData || [],
        farmers: prevFarmersData || [],
        payments: prevPaymentsData || []
      };
    } catch (error) {
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
    farmerAnalytics: any[],
    warehouseCollections: any[]
  ) => {
    // Create lookup maps for efficient data joining
    const farmerMap = new Map(farmers.map(farmer => [farmer.id, farmer]));
    const staffMap = new Map(staff.map(staffMember => [staffMember.id, staffMember]));
    
    // Process collections data by joining with farmer and staff data
    const processedCollections = rawCollections.map(collection => {
      const farmer = farmerMap.get(collection.farmer_id);
      const staffMember = staffMap.get(collection.staff_id);
      
      return {
        ...collection,
        farmerName: farmer?.profiles?.full_name || 'Unknown Farmer',
        staffName: staffMember?.profiles?.full_name || 'Unknown Staff'
      };
    });

    setCollections(processedCollections);
    
    // Set farmers and staff data
    setFarmers(farmers);
    setStaff(staff);
    setPayments(payments);
    
    // Process trends data for charts
    const trendsData = processedCollections.reduce((acc: any, collection: any) => {
      const date = format(new Date(collection.collection_date), 'MMM dd');
      if (!acc[date]) {
        acc[date] = {
          date,
          liters: 0,
          collections: 0,
          revenue: 0,
          avgQuality: 0,
          qualityCount: 0
        };
      }
      acc[date].liters += collection.liters;
      acc[date].collections += 1;
      acc[date].revenue += collection.total_amount;
      
      // Quality mapping (assuming A+ = 4, A = 3, B = 2, C = 1)
      const qualityValue = collection.quality_grade === 'A+' ? 4 : 
                          collection.quality_grade === 'A' ? 3 : 
                          collection.quality_grade === 'B' ? 2 : 1;
      acc[date].avgQuality += qualityValue;
      acc[date].qualityCount += 1;
      
      return acc;
    }, {});
    
    // Convert to array and calculate averages
    const trendsArray = Object.values(trendsData).map((item: any) => ({
      ...item,
      avgQuality: item.qualityCount > 0 ? item.avgQuality / item.qualityCount : 0
    }));
    
    setCollectionTrends(trendsArray);
    setRevenueTrends(trendsArray);
    
    // Process quality distribution
    const qualityCounts = processedCollections.reduce((acc: any, collection: any) => {
      acc[collection.quality_grade] = (acc[collection.quality_grade] || 0) + 1;
      return acc;
    }, {});
    
    const qualityDistributionData = Object.entries(qualityCounts).map(([grade, count]) => ({
      name: grade,
      count: count as number,
      percentage: Math.round(((count as number) / processedCollections.length) * 100)
    }));
    
    setQualityDistribution(qualityDistributionData);
    
    // Process daily analytics data
    const dailyData = trendsArray.map((item: any) => ({
      date: item.date,
      liters: item.liters,
      collections: item.collections,
      revenue: item.revenue,
      avgQuality: item.avgQuality
    }));
    
    setDailyAnalyticsData(dailyData);
    
    // Generate system alerts
    const newAlerts: Alert[] = [];
    
    // Check for low quality collections
    const lowQualityCollections = processedCollections.filter(c => c.quality_grade === 'C');
    if (lowQualityCollections.length > 0) {
      newAlerts.push({
        type: 'quality',
        message: `${lowQualityCollections.length} collections with low quality (Grade C) detected`,
        severity: 'warning',
        time: format(new Date(), 'HH:mm')
      });
    }
    
    // Check for pending payments
    const pendingPayments = payments.filter(p => p.status === 'pending');
    if (pendingPayments.length > 5) {
      newAlerts.push({
        type: 'payment',
        message: `${pendingPayments.length} payments pending approval`,
        severity: 'info',
        time: format(new Date(), 'HH:mm')
      });
    }
    
    setAlerts(newAlerts);

    // Update KYC stats
    const approvedCount = farmers.filter(f => f.kyc_status === 'approved').length;
    const rejectedCount = farmers.filter(f => f.kyc_status === 'rejected').length;
    
    setKycStats(prev => ({
      ...prev,
      approved: approvedCount,
      rejected: rejectedCount
    }));
  }, []);

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
      // Make it non-blocking to prevent data loading delays
      refreshSession().catch(error => {
        console.warn('Session refresh failed, continuing with data fetch', error);
      });
      
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
        farmerAnalyticsData,
        warehouseCollectionsData
      ] = await Promise.all([
        // Fetch collections with explicit joins
        supabase
          .from('collections')
          .select(`
            id,
            collection_id,
            farmer_id,
            staff_id,
            liters,
            quality_grade,
            rate_per_liter,
            total_amount,
            collection_date,
            status,
            notes
          `)
          .gte('collection_date', startDate)
          .lte('collection_date', endDate)
          .order('collection_date', { ascending: false })
          .limit(1000),
        
        // Fetch farmers
        supabase
          .from('farmers')
          .select(`
            id,
            user_id,
            registration_number,
            kyc_status,
            created_at,
            profiles:user_id (full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(200),
        
        // Fetch staff
        supabase
          .from('staff')
          .select(`
            id,
            user_id,
            employee_id,
            created_at,
            profiles:user_id (full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Fetch collections for payment data (simplified)
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
        
        // Fetch farmer analytics
        supabase
          .from('farmer_analytics')
          .select('*')
          .limit(1000),
        
        // Fetch warehouse collections
        supabase
          .from('warehouse_collections')
          .select('*')
          .limit(1000)
      ]);

      // Handle errors with better context - CHANGED TO NOT THROW ERRORS
      if (collectionsData.error) {
        console.error('Error fetching collections data:', collectionsData.error);
        // Continue with empty data instead of throwing error
      }
      if (farmersData.error) {
        console.error('Error fetching farmers data:', farmersData.error);
        // Continue with empty data instead of throwing error
      }
      if (staffDashboardData.error) {
        console.error('Error fetching staff data:', staffDashboardData.error);
        // Continue with empty data instead of throwing error
      }
      if (paymentsData.error) {
        console.error('Error fetching payments data:', paymentsData.error);
        // Continue with empty data instead of throwing error
      }

      // Fetch previous period data for trend calculation
      const previousData = await fetchPreviousPeriodData();

      // Process the data
      processData(
        collectionsData.data || [],
        farmersData.data || [],
        staffDashboardData.data || [],
        paymentsData.data || [],
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
  }, [getDateFilter, toast, initialLoad, processData, timeRange, loading, fetchPreviousPeriodData, refreshSession]);

  // Fetch data on component mount and when time range changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Add function to fetch pending farmers for KYC
  const fetchPendingFarmers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pending_farmers')
        .select('id, full_name, email, phone_number, status, created_at, rejection_count')
        .in('status', ['pending_verification', 'email_verified'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPendingFarmers(data || []);
      
      // Update KYC stats
      const pendingCount = data?.filter(f => f.status === 'email_verified').length || 0;
      setKycStats(prev => ({
        ...prev,
        pending: pendingCount
      }));
    } catch (error) {
      console.error('Error fetching pending farmers:', error);
    }
  }, []);

  // Add useEffect to fetch pending farmers
  useEffect(() => {
    fetchPendingFarmers();
  }, [fetchPendingFarmers]);

  // Create regular components instead of using useMemo to prevent hook order issues
  const MetricCard = ({ 
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
  }) => {
    return (
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
            <div className="p-3 rounded-full bg-blue-100">
              <Icon className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Add a new MetricCard for KYC Pending
  const KycMetricCard = ({ 
    title, 
    value, 
    subtitle, 
    color = '#3b82f6', 
    trend 
  }: { 
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    trend?: { value: number; isPositive: boolean };
  }) => {
    return (
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
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Create regular chart components instead of using useMemo to prevent hook order issues
  const CollectionTrendChart = () => {
    // Only render chart when we have stable data
    if (!collectionTrendsStable || collectionTrends.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      );
    }
    
    return (
      <div className="h-80" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={collectionTrends} syncId="dashboardCharts">
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
  };

  const RevenueTrendChart = () => {
    // Only render chart when we have stable data
    if (!revenueTrendsStable || revenueTrends.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      );
    }
    
    return (
      <div className="h-80" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueTrends} syncId="dashboardCharts">
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
  };

  const QualityDistributionChart = () => {
    // Only render chart when we have stable data
    if (!qualityDistributionStable || qualityDistribution.length === 0 || qualityDistribution.every(q => q.count === 0)) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      );
    }
    
    // Define colors for quality grades
    const qualityColors: Record<string, string> = {
      'A+': '#10b981',
      'A': '#3b82f6',
      'B': '#f59e0b',
      'C': '#ef4444'
    };
    
    return (
      <div className="h-80" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={qualityDistribution}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
              nameKey="name"
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              isAnimationActive={false}
            >
              {qualityDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={qualityColors[entry.name] || '#8884d8'} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [formatNumber(Number(value)), 'Collections']}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Monitor and manage your dairy operations</p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Enhanced Metrics Grid with KYC Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard 
            icon={Users} 
            title="Total Farmers" 
            value={metrics[0]?.value || 0} 
            subtitle={`${metrics[0]?.active || 0} active`} 
            color="#3b82f6"
            trend={metrics[0]?.trend}
          />
          <MetricCard 
            icon={UserCog} 
            title="Staff Members" 
            value={metrics[1]?.value || 0} 
            subtitle={`${metrics[1]?.active || 0} active`} 
            color="#10b981"
            trend={metrics[1]?.trend}
          />
          <MetricCard 
            icon={Droplets} 
            title="Total Liters" 
            value={formatNumber(metrics[2]?.value || 0)} 
            subtitle={`${formatNumber(metrics[2]?.today || 0)} today`} 
            color="#f59e0b"
            trend={metrics[2]?.trend}
          />
          <MetricCard 
            icon={DollarSign} 
            title="Revenue" 
            value={formatCurrency(metrics[3]?.value || 0)} 
            subtitle={`${formatCurrency(metrics[3]?.pending || 0)} pending`} 
            color="#8b5cf6"
            trend={metrics[3]?.trend}
          />
          <KycMetricCard 
            title="KYC Pending" 
            value={kycStats.pending} 
            subtitle={`${kycStats.approved} approved, ${kycStats.rejected} rejected`} 
            color="#ef4444"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Collection Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CollectionTrendChart />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Revenue Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueTrendChart />
            </CardContent>
          </Card>
        </div>

        {/* Quality Distribution and Recent Pending Farmers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" />
                Quality Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QualityDistributionChart />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Farmer Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingFarmers.length > 0 ? (
                  pendingFarmers.map((farmer) => (
                    <div key={farmer.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {farmer.full_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {farmer.email}
                        </p>
                        <div className="flex items-center mt-1">
                          <Badge variant={farmer.status === 'email_verified' ? 'default' : 'secondary'}>
                            {farmer.status === 'email_verified' ? 'Ready for Review' : 'Pending Verification'}
                          </Badge>
                          {farmer.rejection_count > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {farmer.rejection_count} resubmission(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(farmer.created_at), 'MMM dd')}
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.location.hash = `/admin/kyc-pending-farmers/${farmer.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No pending farmer approvals</p>
                  </div>
                )}
                {pendingFarmers.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.hash = '/admin/kyc-pending-farmers'}
                    >
                      View All Pending Farmers
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      {alert.severity === 'warning' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      ) : alert.severity === 'info' ? (
                        <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{alert.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No recent alerts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;