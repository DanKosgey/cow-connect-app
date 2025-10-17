import React, { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Droplet, 
  Search, 
  Download, 
  BarChart3, 
  Award
} from '@/utils/iconImports';
import useToastNotifications from '@/hooks/useToastNotifications';
import { CollectionsSkeleton } from '@/components/admin/CollectionsSkeleton';
import BusinessIntelligenceDashboard from '@/components/analytics/BusinessIntelligenceDashboard';
import { trendService } from '@/services/trend-service';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import OverviewView from '@/components/admin/analytics/OverviewView';
import { QualityView } from '@/components/admin/analytics/QualityView';
import { CollectionsView } from '@/components/admin/analytics/CollectionsView';
import { useDebounce } from '@/hooks/useDebounce';
import { useChartStabilizer } from '@/hooks/useChartStabilizer';
import { useBatchedState } from '@/hooks/useBatchedState';
import { useLoadingDelay } from '@/hooks/useLoadingDelay'; // Add loading delay hook

// Types
interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  quality_grade: string;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  farmers: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
  staff: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface DailyStats {
  date: string;
  collections: number;
  liters: number;
  amount: number;
  avgQuality: number;
}

interface QualityDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface FarmerStats {
  id: string;
  name: string;
  collections: number;
  liters: number;
  amount: number;
  avgQuality: number;
}

interface StaffStats {
  id: string;
  name: string;
  collections: number;
  liters: number;
  farmers: number;
}

interface Trends {
  totalCollections: number;
  totalLiters: number;
  totalRevenue: number;
  avgQuality: number;
  collectionsTrend: { value: number; isPositive: boolean };
  litersTrend: { value: number; isPositive: boolean };
  revenueTrend: { value: number; isPositive: boolean };
  qualityTrend: { value: number; isPositive: boolean };
}

// Constants
const GRADE_VALUES = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 } as const;
const DEFAULT_TRENDS: Trends = {
  totalCollections: 0,
  totalLiters: 0,
  totalRevenue: 0,
  avgQuality: 0,
  collectionsTrend: { value: 0, isPositive: true },
  litersTrend: { value: 0, isPositive: true },
  revenueTrend: { value: 0, isPositive: true },
  qualityTrend: { value: 0, isPositive: true }
};

const VIEWS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'quality', label: 'Quality', icon: Award },
  { id: 'collections', label: 'Collections', icon: Droplet }
] as const;

const CollectionsAnalyticsDashboard = () => {
  const toast = useToastNotifications();
  const { refreshSession } = useSessionRefresh({ refreshInterval: 90 * 60 * 1000 }); // Increased to 90 minutes

  // State
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('overview');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  // Use batched state for filter controls
  const [filters, setFilters] = useBatchedState({
    status: 'all',
    dateRange: 'daily'
  });
  
  const [trends, setTrends] = useState<Trends>(DEFAULT_TRENDS);

  // Use loading delay to prevent UI blinking
  const showLoading = useLoadingDelay(loading, 300);

  // Add debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized date filter
  const dateFilter = useMemo(() => {
    const now = new Date();
    const ranges: Record<string, Date> = {
      'daily': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      '7days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      '30days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
      '90days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90),
      '180days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 180),
      'all': new Date('2020-01-01')
    };
    return ranges[filters.dateRange]?.toISOString() || ranges['daily'].toISOString();
  }, [filters.dateRange]);

  // Memoized filtered collections with debounced search
  const filteredCollections = useMemo(() => {
    let filtered = collections;

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.farmers?.profiles?.full_name?.toLowerCase().includes(term) ||
        c.collection_id?.toLowerCase().includes(term) ||
        c.staff?.profiles?.full_name?.toLowerCase().includes(term)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    return filtered;
  }, [collections, debouncedSearchTerm, filters.status]);

  // Memoized analytics calculations with chart stabilizer
  const analytics = useMemo(() => {
    // Daily trends
    const dailyData = filteredCollections.reduce((acc, c) => {
      const date = new Date(c.collection_date).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, collections: 0, liters: 0, amount: 0, qualitySum: 0, qualityCount: 0 };
      }
      acc[date].collections += 1;
      acc[date].liters += Number(c.liters) || 0;
      acc[date].amount += Number(c.total_amount) || 0;
      acc[date].qualitySum += GRADE_VALUES[c.quality_grade as keyof typeof GRADE_VALUES] || 0;
      acc[date].qualityCount += 1;
      return acc;
    }, {} as Record<string, any>);

    const dailyTrends = Object.values(dailyData)
      .map(d => ({
        date: d.date,
        collections: d.collections,
        liters: d.liters,
        amount: d.amount,
        avgQuality: d.qualityCount > 0 ? d.qualitySum / d.qualityCount : 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Quality distribution
    const qualityCounts = filteredCollections.reduce((acc, c) => {
      if (c.quality_grade && acc.hasOwnProperty(c.quality_grade)) {
        acc[c.quality_grade]++;
      }
      return acc;
    }, { 'A+': 0, 'A': 0, 'B': 0, 'C': 0 } as Record<string, number>);

    const total = filteredCollections.length || 1;
    const qualityDistribution = Object.entries(qualityCounts).map(([grade, count]) => ({
      name: `Grade ${grade}`,
      value: count,
      percentage: Math.round((count / total) * 100)
    }));

    // Top farmers
    const farmerStats = filteredCollections.reduce((acc, c) => {
      const id = c.farmer_id;
      if (!acc[id]) {
        acc[id] = {
          id,
          name: c.farmers?.profiles?.full_name || 'Unknown',
          collections: 0,
          liters: 0,
          amount: 0,
          qualitySum: 0
        };
      }
      acc[id].collections += 1;
      acc[id].liters += Number(c.liters) || 0;
      acc[id].amount += Number(c.total_amount) || 0;
      acc[id].qualitySum += GRADE_VALUES[c.quality_grade as keyof typeof GRADE_VALUES] || 0;
      return acc;
    }, {} as Record<string, any>);

    const topFarmers = Object.values(farmerStats)
      .map(f => ({
        ...f,
        avgQuality: f.collections > 0 ? f.qualitySum / f.collections : 0
      }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 10);

    // Staff performance
    const staffStats = filteredCollections.reduce((acc, c) => {
      const id = c.staff?.id;
      if (!id) return acc;
      if (!acc[id]) {
        acc[id] = {
          id,
          name: c.staff?.profiles?.full_name || 'Unknown',
          collections: 0,
          liters: 0,
          farmers: new Set()
        };
      }
      acc[id].collections += 1;
      acc[id].liters += Number(c.liters) || 0;
      acc[id].farmers.add(c.farmer_id);
      return acc;
    }, {} as Record<string, any>);

    const staffPerformance = Object.values(staffStats)
      .map(s => ({
        ...s,
        farmers: s.farmers.size
      }))
      .sort((a, b) => b.collections - a.collections)
      .slice(0, 10);

    return { dailyTrends, qualityDistribution, topFarmers, staffPerformance };
  }, [filteredCollections]);

  // Stabilize chart data to prevent blinking
  const { data: stableDailyTrends } = useChartStabilizer(analytics.dailyTrends, 100);
  const { data: stableQualityDistribution } = useChartStabilizer(analytics.qualityDistribution, 100);
  const { data: stableTopFarmers } = useChartStabilizer(analytics.topFarmers, 100);
  const { data: stableStaffPerformance } = useChartStabilizer(analytics.staffPerformance, 100);

  // Fetch data with batched state updates
  const fetchData = useCallback(async () => {
    // Rate limiting - prevent too frequent fetches
    const now = Date.now();
    if (now - lastFetchTime < 5000) { // At least 5 seconds between fetches
      console.log('Skipping data fetch - too soon since last fetch');
      return;
    }
    setLastFetchTime(now);

    try {
      startTransition(() => {
        setLoading(true);
      });
      
      // Check if we have a valid session before fetching data
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No valid session found, skipping data fetch');
        toast.error('Authentication Required', 'Please log in again to view collections data');
        startTransition(() => {
          setLoading(false);
        });
        return;
      }
      
      // Only refresh session if it's been more than 60 minutes since last refresh
      // This prevents excessive refresh calls that cause rate limiting
      refreshSession().catch(err => 
        console.warn('Session refresh check completed', err)
      );
      
      // Parallel data fetching with timeout
      const fetchWithTimeout = async (promise: Promise<any>, timeoutMs: number = 10000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
      };
      
      const [collectionsResult, trendsResult] = await Promise.allSettled([
        fetchWithTimeout(
          supabase
            .from('collections')
            .select(`
              *,
              farmers!fk_collections_farmer_id (
                id,
                user_id,
                profiles!user_id (full_name, phone)
              ),
              staff!collections_staff_id_fkey (
                id,
                user_id,
                profiles!user_id (full_name)
              )
            `)
            .gte('collection_date', dateFilter)
            .order('collection_date', { ascending: false })
            .limit(1000)
            .then(data => data) as Promise<any>
        ),
        fetchWithTimeout(trendService.calculateCollectionsTrends(filters.dateRange))
      ]);

      // Handle collections result
      if (collectionsResult.status === 'fulfilled' && !collectionsResult.value.error) {
        setCollections(collectionsResult.value.data || []);
      } else if (collectionsResult.status === 'rejected' || collectionsResult.value.error) {
        const error = collectionsResult.status === 'rejected' 
          ? collectionsResult.reason 
          : collectionsResult.value.error;
        
        console.error('Error fetching collections:', error);
        
        // Check if this is an authentication error
        if (error.message && (error.message.includes('apikey') || error.message.includes('Unauthorized') || error.message.includes('401'))) {
          toast.error('Authentication Error', 'Your session has expired. Please log in again.');
        } else if (error.message && error.message.includes('429')) {
          toast.error('Rate Limit Exceeded', 'Too many requests. Please wait a moment and try again.');
        } else {
          toast.error('Error', error.message || 'Failed to fetch collections data');
        }
      }

      // Handle trends result
      if (trendsResult.status === 'fulfilled') {
        setTrends(trendsResult.value);
      } else {
        console.error('Error calculating trends:', trendsResult.reason);
        setTrends(DEFAULT_TRENDS);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      
      // Check if this is an authentication error
      if (error.message && (error.message.includes('apikey') || error.message.includes('Unauthorized') || error.message.includes('401'))) {
        toast.error('Authentication Error', 'Your session has expired. Please log in again.');
      } else if (error.message && error.message.includes('429')) {
        toast.error('Rate Limit Exceeded', 'Too many requests. Please wait a moment and try again.');
      } else {
        toast.error('Error', error.message || 'Failed to fetch data');
      }
    } finally {
      startTransition(() => {
        setLoading(false);
      });
    }
  }, [dateFilter, filters.dateRange, refreshSession, toast, lastFetchTime]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (filteredCollections.length === 0) {
      toast.show({ title: 'Warning', description: 'No data to export' });
      return;
    }

    const csvData = filteredCollections.map(c => [
      c.collection_id,
      new Date(c.collection_date).toLocaleDateString(),
      c.farmers?.profiles?.full_name || 'N/A',
      c.staff?.profiles?.full_name || 'N/A',
      c.liters,
      c.quality_grade,
      c.rate_per_liter,
      c.total_amount,
      c.status,
      c.gps_latitude || 'N/A',
      c.gps_longitude || 'N/A'
    ]);

    const headers = ['Collection ID', 'Date', 'Farmer', 'Staff', 'Liters', 'Quality Grade', 
                     'Rate per Liter', 'Total Amount', 'Status', 'GPS Latitude', 'GPS Longitude'];
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collections_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredCollections, toast]);

  // Clear filters with batched updates
  const clearFilters = useCallback(() => {
    startTransition(() => {
      setSearchTerm('');
      setFilters({
        status: 'all',
        dateRange: 'daily'
      });
    });
  }, [setFilters]);

  // Get status badge variant
  const getStatusVariant = useCallback((status: string) => {
    const variants: Record<string, string> = {
      'Paid': 'default',
      'Verified': 'secondary',
      'Cancelled': 'destructive'
    };
    return variants[status] || 'outline';
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }, []);

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (showLoading) {
    return (
      <DashboardLayout>
        <CollectionsSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Collections Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor and analyze milk collection data, farmer performance, and quality metrics
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={exportToCSV}
              className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Business Intelligence Metrics */}
        <div className="mb-8">
          <BusinessIntelligenceDashboard timeRange={filters.dateRange} />
        </div>

        {/* View Navigation */}
        <div className="flex flex-wrap gap-3 mb-8 p-2 bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-inner">
          {VIEWS.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`px-5 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 transform hover:scale-105 ${
                  currentView === view.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 shadow'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{view.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-xl rounded-2xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input-light dark:bg-input-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-xl py-3 shadow-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value })}
                className="bg-input-light dark:bg-input-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500"
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
                className="bg-input-light dark:bg-input-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily Collections</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="180days">Last 180 Days</option>
                <option value="all">All Time</option>
              </select>
              
              <Button 
                onClick={clearFilters}
                variant="outline"
                className="border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl py-3 shadow-sm"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* View Content - Removed Suspense wrapper to prevent blinking */}
        <div className="space-y-8 transition-all duration-300">
          {currentView === 'overview' && (
            <OverviewView
              dailyTrends={stableDailyTrends}
              qualityDistribution={stableQualityDistribution}
              topFarmers={stableTopFarmers}
              staffPerformance={stableStaffPerformance}
              totalCollections={trends.totalCollections}
              totalLiters={trends.totalLiters}
              totalAmount={trends.totalRevenue}
              avgQuality={trends.avgQuality}
              collectionsTrend={trends.collectionsTrend}
              litersTrend={trends.litersTrend}
              revenueTrend={trends.revenueTrend}
              qualityTrend={trends.qualityTrend}
              collections={collections} // Add this line to pass collections data
            />
          )}
          
          {currentView === 'quality' && (
            <QualityView
              qualityDistribution={stableQualityDistribution}
              dailyTrends={stableDailyTrends}
            />
          )}
          
          {currentView === 'collections' && (
            <CollectionsView
              filteredCollections={filteredCollections}
              collections={collections}
              setSelectedCollection={setSelectedCollection}
              getStatusVariant={getStatusVariant}
              formatCurrency={formatCurrency}
              error={null} // In the future, we can pass error state from the hook
              isLoading={loading}
              refreshData={fetchData}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CollectionsAnalyticsDashboard;