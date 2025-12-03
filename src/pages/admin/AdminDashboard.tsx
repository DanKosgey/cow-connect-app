import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CreditCard
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
  endOfYear
} from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  getPreviousPeriodFilter, 
  calculateMetricsWithTrends 
} from '@/utils/dashboardTrends';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { dataCache } from '@/utils/dataCache';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CACHE_KEYS } from '@/services/cache-utils';
import RefreshButton from '@/components/ui/RefreshButton';

// Types
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
  notes: string;
  farmers?: {
    full_name: string;
  };
  staff?: {
    profiles: {
      full_name: string;
    };
  };
  approved_by?: {
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
  severity: 'warning' | 'info' | 'success';
  time: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// Define interface for previous period data
interface PreviousPeriodData {
  collections: any[];
  farmers: any[];
  payments: any[];
}

// Define interface for cached dashboard data
interface CachedDashboardData {
  collections: Collection[];
  farmers: Farmer[];
  staff: Staff[];
  collectionTrends: any[];
  revenueTrends: any[];
  qualityDistribution: any[];
  alerts: Alert[];
  kycStats: {
    pending: number;
    approved: number;
    rejected: number;
    resubmissions: number;
  };
  metrics: any[];
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
};

const AdminDashboard = () => {
  const toast = useToastNotifications();
  const queryClient = useQueryClient();
  
  // State management
  const [collections, setCollections] = useState<Collection[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('week');
  const [collectionTrends, setCollectionTrends] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [qualityDistribution, setQualityDistribution] = useState<any[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const isProcessing = useRef(false);
  const prevTimeRange = useRef(timeRange);
  const [pendingFarmers, setPendingFarmers] = useState<PendingFarmer[]>([]);
  const [kycStats, setKycStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    resubmissions: 0
  });

  const { refreshSession } = useSessionRefresh({ refreshInterval: 30 * 60 * 1000 }); // Increase to 30 minutes

  // Clear cache when timeframe changes with debounce
  useEffect(() => {
    // Clear the cache for the previous timeframe to ensure fresh data
    const timeoutId = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_DASHBOARD] });
      dataCache.clear();
    }, 1000); // Increase debounce to 1 second
    
    return () => clearTimeout(timeoutId);
  }, [timeRange, queryClient]); // Keep dependencies minimal

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
        startDate = startOfWeek(now, { weekStartsOn: 1 });
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
        startDate = new Date(2020, 0, 1);
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

  const fetchPreviousPeriodData = useCallback(async () => {
    try {
      const { startDate, endDate } = getPreviousPeriodFilter(timeRange);
      const cacheKey = `prev_data_${timeRange}_${startDate}_${endDate}`;
      const cachedData = dataCache.get<PreviousPeriodData>(cacheKey);
      
      if (cachedData) {
        console.log('Using cached previous period data');
        return cachedData;
      }
      
      // Simplified query - fetch collections with staff and approved_by IDs only
      const { data: prevCollectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          farmer_id,
          staff_id,
          approved_by,
          liters,
          quality_grade,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          farmers!inner(full_name)
        `)
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .order('collection_date', { ascending: false })
        .limit(100);

      if (collectionsError) {
        console.error('Error fetching previous period collections:', collectionsError);
        return null;
      }

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
        .limit(50);

      if (farmersError) {
        console.error('Error fetching previous period farmers:', farmersError);
        return null;
      }

      // Define the return type explicitly
      const result: PreviousPeriodData = {
        collections: prevCollectionsData || [],
        farmers: prevFarmersData || [],
        payments: prevCollectionsData || []
      };
      
      dataCache.set(cacheKey, result, 5 * 60 * 1000);
      return result;
    } catch (error: any) {
      console.error('Error fetching previous period data:', error);
      return null;
    }
  }, [timeRange]);

  const processData = useCallback((
    rawCollections: any[],
    farmers: Farmer[],
    staff: Staff[]
  ) => {
    performanceMonitor.startProcessing();
    
    const farmerMap = new Map(farmers.map(farmer => [farmer.id, farmer]));
    const staffMap = new Map(staff.map(staffMember => [staffMember.id, staffMember]));
    
    // Use embedded staff objects first, fallback to map lookup
    const processedCollections = rawCollections.map(collection => {
      const farmer = farmerMap.get(collection.farmer_id);
      
      // Prefer embedded staff objects (explicit aliases), else fallback to staffMap lookup
      const embeddedCollector = collection.staff;
      const embeddedApprover = collection.approved_by;
      const collector = embeddedCollector ?? (collection.staff_id ? staffMap.get(collection.staff_id) : null);
      
      return {
        ...collection,
        farmerName: farmer?.profiles?.full_name || 'Unknown Farmer',
        staffName: collector?.profiles?.full_name || 'Unknown Staff',
        approverName: embeddedApprover?.profiles?.full_name || (collection.approved_by ? staffMap.get(collection.approved_by)?.profiles?.full_name || 'Unknown Staff' : null)
      };
    });

    setCollections(processedCollections);
    setFarmers(farmers);
    setStaff(staff);
    
    // Process trends data - SORT DATA BY DATE TO FIX REVERSE ORDER ISSUE
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
      
      const qualityValue = collection.quality_grade === 'A+' ? 4 : 
                        collection.quality_grade === 'A' ? 3 : 
                        collection.quality_grade === 'B' ? 2 : 1;
      acc[date].avgQuality += qualityValue;
      acc[date].qualityCount += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by date to fix the order issue
    const trendsArray = Object.values(trendsData)
      .map((item: any) => ({
        ...item,
        avgQuality: item.qualityCount > 0 ? item.avgQuality / item.qualityCount : 0
      }))
      .sort((a: any, b: any) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime(); // Sort chronologically
      });
    
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
    
    // Generate alerts - ENHANCED WITH COLLECTIONS AND PAYMENTS ACTIVITIES
    const newAlerts: Alert[] = [];
    
    // Add low quality collections alert
    const lowQualityCollections = processedCollections.filter(c => c.quality_grade === 'C');
    if (lowQualityCollections.length > 0) {
      newAlerts.push({
        type: 'quality',
        message: `${lowQualityCollections.length} collections with low quality (Grade C) detected`,
        severity: 'warning',
        time: format(new Date(), 'HH:mm'),
        icon: AlertCircle
      });
    }
    
    // Add recent collections alerts
    const recentCollections = processedCollections.slice(0, 3);
    recentCollections.forEach(collection => {
      newAlerts.push({
        type: 'collection',
        message: `New collection: ${collection.liters}L from ${collection.farmerName || 'Unknown Farmer'}`,
        severity: 'info',
        time: format(new Date(collection.collection_date), 'HH:mm'),
        icon: Droplets
      });
    });
    
    // Add high value collections alerts
    const highValueCollections = processedCollections
      .filter(c => c.total_amount > 5000)
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 2);
    
    highValueCollections.forEach(collection => {
      newAlerts.push({
        type: 'payment',
        message: `High value collection: ${formatCurrency(collection.total_amount)} from ${collection.farmerName || 'Unknown Farmer'}`,
        severity: 'success',
        time: format(new Date(collection.collection_date), 'HH:mm'),
        icon: DollarSign
      });
    });
    
    // Add pending payments alerts
    const pendingPayments = processedCollections
      .filter(c => c.status !== 'Paid')
      .slice(0, 2);
    
    pendingPayments.forEach(collection => {
      newAlerts.push({
        type: 'pending',
        message: `Pending payment: ${formatCurrency(collection.total_amount)} from ${collection.farmerName || 'Unknown Farmer'}`,
        severity: 'warning',
        time: format(new Date(collection.collection_date), 'HH:mm'),
        icon: CreditCard
      });
    });
    
    // Sort alerts by time (newest first)
    newAlerts.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return timeB[0] * 60 + timeB[1] - (timeA[0] * 60 + timeA[1]);
    });
    
    setAlerts(newAlerts);

    const approvedCount = farmers.filter(f => f.kyc_status === 'approved').length;
    const rejectedCount = farmers.filter(f => f.kyc_status === 'rejected').length;
    
    setKycStats(prev => ({
      ...prev,
      approved: approvedCount,
      rejected: rejectedCount
    }));
    
    performanceMonitor.endProcessing();
  }, []);

  const fetchData = useCallback(async () => {
    if (isProcessing.current) return;
    
    isProcessing.current = true;
    performanceMonitor.reset();
    performanceMonitor.startFetch();
    
    // Always fetch fresh data when timeframe changes
    setError(null);
    
    try {
      refreshSession().catch(error => {
        console.warn('Session refresh failed, continuing with data fetch', error);
      });
      
      const { startDate, endDate } = getDateFilter();
      const cacheKey = `dashboard_data_${timeRange}_${startDate}_${endDate}`;
      
      // Always fetch fresh data to ensure charts update properly
      setLoading(true);
      
      // Fetch collections with staff and approval information
      const { data: rawCollections, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          staff_id,
          approved_by,
          liters,
          quality_grade,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          notes,
          farmers!inner(full_name)
        `)
        .eq('approved_for_company', true)  // Only fetch approved collections
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .order('collection_date', { ascending: false })
        .limit(200);
      
      // Fetch farmers data
      const { data: farmersData, error: farmersError } = await supabase
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
        .limit(100);
      
      // Fetch staff data
      const { data: staffDashboardData, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          employee_id,
          status,
          created_at,
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      performanceMonitor.endFetch();
      
      if (collectionsError) {
        console.error('Error fetching collections:', collectionsError);
        // Log details for debugging
        if (collectionsError.details) {
          console.error('Error details:', collectionsError.details);
        }
      }
      if (farmersError) {
        console.error('Error fetching farmers:', farmersError);
      }
      if (staffError) {
        console.error('Error fetching staff:', staffError);
      }

      // If we have collections data, fetch staff profiles for collector and approver
      let enrichedCollections = rawCollections || [];
      if (rawCollections && rawCollections.length > 0) {
        // Extract unique staff IDs from collections (both collectors and approvers)
        const staffIds = new Set<string>();
        rawCollections.forEach(collection => {
          if (collection.staff_id) staffIds.add(collection.staff_id);
          if (collection.milk_approvals?.staff_id) staffIds.add(collection.milk_approvals.staff_id);
        });
        
        // Fetch profiles for all staff members referenced in collections
        if (staffIds.size > 0) {
          const { data: staffProfiles, error: profilesError } = await supabase
            .from('staff')
            .select(`
              id,
              profiles:user_id (full_name)
            `)
            .in('id', Array.from(staffIds));
          
          if (!profilesError && staffProfiles) {
            // Create a map of staff ID to profile
            const staffProfileMap = new Map<string, any>();
            staffProfiles.forEach(staff => {
              staffProfileMap.set(staff.id, staff.profiles);
            });
            
            // Enrich collections with staff names
            enrichedCollections = rawCollections.map(collection => ({
              ...collection,
              staff: collection.staff_id ? { profiles: staffProfileMap.get(collection.staff_id) } : null,
              approved_by: collection.milk_approvals?.staff_id ? { profiles: staffProfileMap.get(collection.milk_approvals.staff_id) } : null
            }));
          }
        }
      }

      const previousData: PreviousPeriodData | null = await fetchPreviousPeriodData();

      processData(
        enrichedCollections,
        farmersData || [],
        staffDashboardData || []
      );
      
      // Define the type for current data to match calculateMetricsWithTrends signature
      const currentDataForMetrics = {
        collections: enrichedCollections,
        farmers: farmersData || [],
        staff: staffDashboardData || [],
        payments: enrichedCollections
      };
      
      const metricsWithTrends = calculateMetricsWithTrends(
        currentDataForMetrics,
        previousData
      );
      
      setMetrics(metricsWithTrends);
      
      if (enrichedCollections && farmersData && staffDashboardData) {
        const cacheData: CachedDashboardData = {
          collections: enrichedCollections,
          farmers: farmersData,
          staff: staffDashboardData,
          collectionTrends,
          revenueTrends,
          qualityDistribution,
          alerts,
          kycStats,
          metrics: metricsWithTrends
        };
        dataCache.set(cacheKey, cacheData, 5 * 60 * 1000);
      }
      
      performanceMonitor.endRender();
      performanceMonitor.logMetrics('AdminDashboard');
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      performanceMonitor.endFetch();
      
      if (err.message && err.message.includes('Could not embed')) {
        console.error('Relationship embedding error');
        const errorMessage = 'Dashboard data loading issue. Please try refreshing the page.';
        setError(errorMessage);
        toast.error('Data Loading Error', errorMessage);
      } else {
        const errorMessage = err.message || 'Failed to fetch dashboard data';
        setError(errorMessage);
        toast.error('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
      isProcessing.current = false;
    }
  }, [getDateFilter, toast, processData, timeRange, fetchPreviousPeriodData, refreshSession, 
      collectionTrends, revenueTrends, qualityDistribution, alerts, kycStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData, timeRange]); // Add timeRange as dependency

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  }, []);

  const { data: stableCollectionTrends, isStable: collectionTrendsStable } = useChartStabilizer(collectionTrends, 50);
  const { data: stableRevenueTrends, isStable: revenueTrendsStable } = useChartStabilizer(revenueTrends, 50);
  const { data: stableQualityDistribution, isStable: qualityDistributionStable } = useChartStabilizer(qualityDistribution, 50);

  // Fetch pending farmers data with React Query
  const { data: pendingFarmersData, isLoading: isPendingFarmersLoading } = useQuery({
    queryKey: [CACHE_KEYS.ADMIN_DASHBOARD, 'pending-farmers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_farmers')
        .select('id, full_name, email, phone_number, status, created_at, rejection_count')
        .in('status', ['pending_verification', 'email_verified'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Update pending farmers state when data changes
  useEffect(() => {
    if (pendingFarmersData) {
      setPendingFarmers(pendingFarmersData);
      const pendingCount = pendingFarmersData.filter(f => f.status === 'email_verified').length || 0;
      setKycStats(prev => ({
        ...prev,
        pending: pendingCount
      }));
    }
  }, [pendingFarmersData]);

  const MetricCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    trend,
    color = 'blue'
  }: { 
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { value: number; isPositive: boolean };
    color?: string;
  }) => {
    // Define color classes for different metrics
    const colorClasses = {
      blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-500 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/50 text-green-500 dark:text-green-400',
      amber: 'bg-amber-100 dark:bg-amber-900/50 text-amber-500 dark:text-amber-400',
      purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-500 dark:text-purple-400',
      red: 'bg-red-100 dark:bg-red-900/50 text-red-500 dark:text-red-400',
      teal: 'bg-teal-100 dark:bg-teal-900/50 text-teal-500 dark:text-teal-400',
      pink: 'bg-pink-100 dark:bg-pink-900/50 text-pink-500 dark:text-pink-400',
      indigo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-400',
    };
    
    const borderClasses = {
      blue: 'border-l-4 border-blue-500',
      green: 'border-l-4 border-green-500',
      amber: 'border-l-4 border-amber-500',
      purple: 'border-l-4 border-purple-500',
      red: 'border-l-4 border-red-500',
      teal: 'border-l-4 border-teal-500',
      pink: 'border-l-4 border-pink-500',
      indigo: 'border-l-4 border-indigo-500',
    };

    return (
      <Card className={`hover:shadow-lg transition-all duration-300 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${borderClasses[color as keyof typeof borderClasses]}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
              {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
              {trend && (
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">from last period</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CollectionTrendChart = () => {
    // Always use the latest data, don't rely on stabilization for charts
    if (collectionTrends.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No data available for the selected timeframe</p>
        </div>
      );
    }
    
    return (
      <div className="h-80" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={collectionTrends} syncId="dashboardCharts">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280" 
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              stroke="#6b7280" 
              tick={{ fill: '#6b7280' }}
            />
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
              stroke={CHART_COLORS.primary} 
              fill={CHART_COLORS.primary} 
              fillOpacity={0.3} 
              name="Liters" 
              isAnimationActive={false}
              key={`collection-trend-${timeRange}`} // Force re-render when timeframe changes
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const RevenueTrendChart = () => {
    // Always use the latest data, don't rely on stabilization for charts
    if (revenueTrends.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No data available for the selected timeframe</p>
        </div>
      );
    }
    
    return (
      <div className="h-80" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueTrends} syncId="dashboardCharts">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280" 
              tick={{ fill: '#6b7280' }}
            />
            <YAxis 
              stroke="#6b7280" 
              tick={{ fill: '#6b7280' }}
            />
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
              stroke={CHART_COLORS.secondary} 
              strokeWidth={3}
              dot={{ r: 5, fill: CHART_COLORS.secondary }}
              activeDot={{ r: 7, fill: CHART_COLORS.secondary }}
              name="Revenue" 
              isAnimationActive={false}
              key={`revenue-trend-${timeRange}`} // Force re-render when timeframe changes
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const QualityDistributionChart = () => {
    // Always use the latest data, don't rely on stabilization for charts
    if (qualityDistribution.length === 0 || qualityDistribution.every(q => q.count === 0)) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No data available for the selected timeframe</p>
        </div>
      );
    }
    
    const qualityColors: Record<string, string> = {
      'A+': CHART_COLORS.secondary,
      'A': CHART_COLORS.primary,
      'B': CHART_COLORS.accent,
      'C': CHART_COLORS.danger
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
              key={`quality-distribution-${timeRange}`} // Force re-render when timeframe changes
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

  // Optimize the data fetching effect to prevent constant refreshes
  useEffect(() => {
    // Add a ref to track if we're already fetching
    if (isProcessing.current) return;
    
    const fetchTimer = setTimeout(() => {
      fetchData();
    }, 500); // Add debounce to data fetching
    
    return () => {
      clearTimeout(fetchTimer);
    };
  }, [fetchData, timeRange]);

  // React Query hook for fetching dashboard data with caching
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError, refetch } = useQuery({
    queryKey: [CACHE_KEYS.ADMIN_DASHBOARD, timeRange],
    queryFn: async () => {
      // Refresh session before fetching data (but less frequently)
      await refreshSession().catch(error => {
        console.warn('Session refresh failed before dashboard data fetch', error);
      });
      
      const { startDate, endDate } = getDateFilter();
      const cacheKey = `dashboard_data_${timeRange}_${startDate}_${endDate}`;
      
      // Check cache first before fetching
      const cachedData = dataCache.get<CachedDashboardData>(cacheKey);
      if (cachedData && !initialLoad) {
        console.log('Using cached dashboard data');
        return cachedData;
      }
      
      performanceMonitor.startFetch();
      
      // Fetch collections data
      const { data: rawCollections, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          staff_id,
          approved_by,
          liters,
          quality_grade,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          notes,
          farmers!inner(full_name)
        `)
        .eq('approved_for_company', true)  // Only fetch approved collections
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .order('collection_date', { ascending: false })
        .limit(200);
      
      // Fetch farmers data
      const { data: farmersData, error: farmersError } = await supabase
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
        .limit(100);
      
      // Fetch staff data
      const { data: staffDashboardData, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          employee_id,
          status,
          created_at,
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      performanceMonitor.endFetch();
      
      if (collectionsError) {
        console.error('Error fetching collections:', collectionsError);
        // Log details for debugging
        if (collectionsError.details) {
          console.error('Error details:', collectionsError.details);
        }
      }
      if (farmersError) {
        console.error('Error fetching farmers:', farmersError);
      }
      if (staffError) {
        console.error('Error fetching staff:', staffError);
      }

      // If we have collections data, fetch staff profiles for collector and approver
      let enrichedCollections = rawCollections || [];
      if (rawCollections && rawCollections.length > 0) {
        // Extract unique staff IDs from collections (both collectors and approvers)
        const staffIds = new Set<string>();
        rawCollections.forEach(collection => {
          if (collection.staff_id) staffIds.add(collection.staff_id);
          if (collection.milk_approvals?.staff_id) staffIds.add(collection.milk_approvals.staff_id);
        });
        
        // Fetch profiles for all staff members referenced in collections
        if (staffIds.size > 0) {
          const { data: staffProfiles, error: profilesError } = await supabase
            .from('staff')
            .select(`
              id,
              profiles:user_id (full_name)
            `)
            .in('id', Array.from(staffIds));
          
          if (!profilesError && staffProfiles) {
            // Create a map of staff ID to profile
            const staffProfileMap = new Map<string, any>();
            staffProfiles.forEach(staff => {
              staffProfileMap.set(staff.id, staff.profiles);
            });
            
            // Enrich collections with staff names
            enrichedCollections = rawCollections.map(collection => ({
              ...collection,
              staff: collection.staff_id ? { profiles: staffProfileMap.get(collection.staff_id) } : null,
              approved_by: collection.milk_approvals?.staff_id ? { profiles: staffProfileMap.get(collection.milk_approvals.staff_id) } : null
            }));
          }
        }
      }

      const previousData: PreviousPeriodData | null = await fetchPreviousPeriodData();

      processData(
        enrichedCollections,
        farmersData || [],
        staffDashboardData || []
      );
      
      // Define the type for current data to match calculateMetricsWithTrends signature
      const currentDataForMetrics = {
        collections: enrichedCollections,
        farmers: farmersData || [],
        staff: staffDashboardData || [],
        payments: enrichedCollections
      };
      
      const metricsWithTrends = calculateMetricsWithTrends(
        currentDataForMetrics,
        previousData
      );
      
      setMetrics(metricsWithTrends);
      
      if (enrichedCollections && farmersData && staffDashboardData) {
        const cacheData: CachedDashboardData = {
          collections: enrichedCollections,
          farmers: farmersData,
          staff: staffDashboardData,
          collectionTrends,
          revenueTrends,
          qualityDistribution,
          alerts,
          kycStats,
          metrics: metricsWithTrends
        };
        dataCache.set(cacheKey, cacheData, 5 * 60 * 1000);
        return cacheData;
      }
      
      return null;
    },
    staleTime: 1000 * 60 * 15, // Increase to 15 minutes to reduce refresh frequency
    gcTime: 1000 * 60 * 30, // Increase to 30 minutes
    refetchOnWindowFocus: false, // Disable refetching on window focus
    refetchOnReconnect: false, // Disable refetching on reconnect
    refetchOnMount: false, // Disable refetching on mount
    enabled: true,
    retry: 1,
  });

  // Update loading and error states based on React Query
  useEffect(() => {
    // Only set loading state from React Query if we're not already loading from manual fetch
    if (!isProcessing.current) {
      // Add debounce to loading state changes
      const loadingTimer = setTimeout(() => {
        setLoading(isDashboardLoading);
      }, 300);
      
      return () => clearTimeout(loadingTimer);
    }
    if (dashboardError) {
      setError(dashboardError.message || 'Failed to fetch dashboard data');
    }
  }, [isDashboardLoading, dashboardError]); // Keep dependencies minimal

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor and manage your dairy operations</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={(value) => {
            setTimeRange(value);
            // Trigger refresh with debounce when timeframe changes
            const timeoutId = setTimeout(() => {
              refetch();
            }, 500); // Debounce for 500ms
            
            // Clear previous timeout if exists
            if ((window as any).dashboardTimeRangeTimeout) {
              clearTimeout((window as any).dashboardTimeRangeTimeout);
            }
            (window as any).dashboardTimeRangeTimeout = timeoutId;
          }}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm">
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
          <RefreshButton 
            isRefreshing={isDashboardLoading || loading} 
            onRefresh={() => {
              // Clear cache and refetch data with debounce
              const timeoutId = setTimeout(() => {
                dataCache.clear();
                queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.ADMIN_DASHBOARD, timeRange] });
                refetch();
              }, 300); // Debounce for 300ms
              
              // Store timeout ID to clear if needed
              (window as any).dashboardRefreshTimeout = timeoutId;
            }} 
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-sm"
          />
        </div>
      </div>

      {/* Enhanced Metrics Grid with KYC Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <MetricCard 
          icon={Users} 
          title="Total Farmers" 
          value={metrics[0]?.value || 0} 
          subtitle={`${metrics[0]?.active || 0} active`} 
          trend={metrics[0]?.trend}
          color="blue"
        />
        <MetricCard 
          icon={UserCog} 
          title="Staff Members" 
          value={metrics[1]?.value || 0} 
          subtitle={`${metrics[1]?.active || 0} active`} 
          trend={metrics[1]?.trend}
          color="green"
        />
        <MetricCard 
          icon={Droplets} 
          title="Total Liters" 
          value={formatNumber(metrics[2]?.value || 0)} 
          subtitle={`${formatNumber(metrics[2]?.today || 0)} today`} 
          trend={metrics[2]?.trend}
          color="amber"
        />
        <MetricCard 
          icon={DollarSign} 
          title="Revenue" 
          value={formatCurrency(metrics[3]?.value || 0)} 
          subtitle={`${formatCurrency(metrics[3]?.pending || 0)} pending`} 
          trend={metrics[3]?.trend}
          color="purple"
        />
        <MetricCard 
          icon={Award} 
          title="KYC Stats" 
          value={kycStats.pending} 
          subtitle={`${kycStats.approved} approved, ${kycStats.rejected} rejected`}
          color="teal"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <BarChart3 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Collection Trends</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Daily milk collection volumes</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <CollectionTrendChart />
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Revenue Trends</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Daily revenue generation</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <RevenueTrendChart />
          </CardContent>
        </Card>
      </div>

      {/* Quality Distribution */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <Award className="h-5 w-5 text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Quality Distribution</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Milk quality grade distribution</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <QualityDistributionChart />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-white">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Activity className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Collections, payments and system alerts</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="mt-0.5">
                      {alert.icon ? (
                        <alert.icon className={`h-5 w-5 ${
                          alert.severity === 'warning' ? 'text-yellow-500' : 
                          alert.severity === 'info' ? 'text-blue-500' : 'text-green-500'
                        }`} />
                      ) : alert.severity === 'warning' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      ) : alert.severity === 'info' ? (
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No recent activity</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All systems are operating normally</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;