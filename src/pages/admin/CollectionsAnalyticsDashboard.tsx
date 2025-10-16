import React, { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Droplet, 
  Search, 
  Filter, 
  Download, 
  AlertCircle,
  Eye,
  BarChart3,
  TrendingUp,
  Users,
  UserCog,
  Award,
  Target,
  Activity,
  Calendar,
  DollarSign,
  Zap
} from '@/utils/iconImports';
import useToastNotifications from '@/hooks/useToastNotifications';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { CollectionsSkeleton } from '@/components/admin/CollectionsSkeleton';
import BusinessIntelligenceDashboard from '@/components/analytics/BusinessIntelligenceDashboard';
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
  ComposedChart
} from 'recharts';
import { trendService } from '@/services/trend-service';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';

// Lazy load analytics view components
const OverviewView = lazy(() => import('@/components/admin/analytics/OverviewView'));
const FarmersView = lazy(() => import('@/components/admin/analytics/FarmersView'));
const StaffView = lazy(() => import('@/components/admin/analytics/StaffView'));
const QualityView = lazy(() => import('@/components/admin/analytics/QualityView').then(module => ({ default: module.QualityView })));
const CollectionsView = lazy(() => import('@/components/admin/analytics/CollectionsView').then(module => ({ default: module.CollectionsView })));

// Types for our collections data
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

const CollectionsAnalyticsDashboard = () => {
  const toast = useToastNotifications();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [dateRange, setDateRange] = useState('7days'); // Changed default to 7 days for daily view
  const [selectedFarmer, setSelectedFarmer] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [currentView, setCurrentView] = useState('overview');
  const [farmers, setFarmers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Analytics data with proper typing
  const [dailyTrends, setDailyTrends] = useState<DailyStats[]>([]);
  const [qualityDistribution, setQualityDistribution] = useState<QualityDistribution[]>([]);
  const [topFarmers, setTopFarmers] = useState<FarmerStats[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffStats[]>([]);
  const [trends, setTrends] = useState({
    totalCollections: 0,
    totalLiters: 0,
    totalRevenue: 0,
    avgQuality: 0,
    collectionsTrend: { value: 0, isPositive: true },
    litersTrend: { value: 0, isPositive: true },
    revenueTrend: { value: 0, isPositive: true },
    qualityTrend: { value: 0, isPositive: true }
  });

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const GRADE_COLORS = { 'A+': '#10b981', 'A': '#3b82f6', 'B': '#f59e0b', 'C': '#ef4444' };

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  useEffect(() => {
    filterCollections();
    calculateAnalytics();
  }, [collections, searchTerm, filterStatus, selectedFarmer, selectedStaff, dateRange]); // Added dateRange dependency

  const { refreshSession } = useSessionRefresh({ refreshInterval: 10 * 60 * 1000 }); // Refresh every 10 minutes

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch collections with basic data (without complex embedding)
      const dateFilter = getDateFilter();
      let collectionsQuery = supabase
        .from('collections')
        .select(`
          *,
          farmers!fk_collections_farmer_id (
            id,
            user_id,
            profiles!user_id (
              full_name,
              phone
            )
          )
        `);
      
      // Only add date filter if it's valid
      if (dateFilter) {
        collectionsQuery = collectionsQuery.gte('collection_date', dateFilter);
      }

      collectionsQuery = collectionsQuery.order('collection_date', { ascending: false });

      const { data: collectionsData, error: collectionsError } = await collectionsQuery;

      if (collectionsError) throw collectionsError;

      // Extract unique staff IDs from collections
      const staffIds = new Set<string>();
      collectionsData?.forEach(collection => {
        if (collection.staff_id) staffIds.add(collection.staff_id);
      });

      // Fetch staff profiles if we have staff IDs
      let enrichedCollections = collectionsData || [];
      if (collectionsData && staffIds.size > 0) {
        const { data: staffProfiles, error: profilesError } = await supabase
          .from('staff')
          .select(`
            id,
            profiles!user_id (
              full_name
            )
          `)
          .in('id', Array.from(staffIds));

        if (!profilesError && staffProfiles) {
          // Create a map of staff ID to profile
          const staffProfileMap = new Map<string, any>();
          staffProfiles.forEach(staff => {
            staffProfileMap.set(staff.id, staff.profiles);
          });

          // Enrich collections with staff names
          enrichedCollections = collectionsData.map(collection => ({
            ...collection,
            staff: collection.staff_id ? { profiles: staffProfileMap.get(collection.staff_id) } : null
          }));
        }
      }

      // Fetch farmers for filter dropdown
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles!user_id (
            full_name
          )
        `)
        .eq('kyc_status', 'approved');

      if (farmersError) throw farmersError;

      // Fetch staff for filter dropdown
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          profiles!user_id (
            full_name
          )
        `);

      if (staffError) throw staffError;

      setCollections(enrichedCollections);
      setFarmers(farmersData || []);
      setStaff(staffData || []);
      
      // Calculate real trends using the trend service
      try {
        const trendData = await trendService.calculateCollectionsTrends(dateRange);
        setTrends(trendData);
      } catch (trendError) {
        console.error('Error calculating trends:', trendError);
        // Fallback to default values
        setTrends({
          totalCollections: 0,
          totalLiters: 0,
          totalRevenue: 0,
          avgQuality: 0,
          collectionsTrend: { value: 0, isPositive: true },
          litersTrend: { value: 0, isPositive: true },
          revenueTrend: { value: 0, isPositive: true },
          qualityTrend: { value: 0, isPositive: true }
        });
      }
    } catch (error: any) {
      // Log detailed error information for debugging
      console.error('Error fetching data:', error.message, error);
      // Also log as JSON for more detailed inspection
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show user-friendly error message
      const errorMessage = error.message || error.error_description || 'Failed to fetch data';
      toast.error('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Refresh session before fetching data to ensure we have a valid connection
      // Make it non-blocking to prevent data loading delays
      refreshSession().catch(error => {
        console.warn('Session refresh failed, continuing with data fetch', error);
      });
      
      // Fetch collections
      const dateFilter = getDateFilter();
      let collectionsQuery = supabase
        .from('collections')
        .select(`
          *,
          farmers!fk_collections_farmer_id (
            id,
            user_id,
            profiles!user_id (
              full_name,
              phone
            )
          ),
          staff!collections_staff_id_fkey (
            id,
            user_id,
            profiles!user_id (
              full_name
            )
          )
        `);
        
      // Only add date filter if it's valid
      if (dateFilter) {
        collectionsQuery = collectionsQuery.gte('collection_date', dateFilter);
      }

      collectionsQuery = collectionsQuery.order('collection_date', { ascending: false });

      const { data: collectionsData, error: collectionsError } = await collectionsQuery;

      if (collectionsError) throw collectionsError;

      // Fetch farmers for filter dropdown
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles!user_id (
            full_name
          )
        `)
        .eq('kyc_status', 'approved');

      if (farmersError) throw farmersError;

      // Fetch staff for filter dropdown
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          profiles!user_id (
            full_name
          )
        `);

      if (staffError) throw staffError;

      setCollections(collectionsData || []);
      setFarmers(farmersData || []);
      setStaff(staffData || []);
      
      // Calculate real trends using the trend service
      try {
        const trendData = await trendService.calculateCollectionsTrends(dateRange);
        setTrends(trendData);
      } catch (trendError) {
        console.error('Error calculating trends:', trendError);
        // Fallback to default values
        setTrends({
          totalCollections: 0,
          totalLiters: 0,
          totalRevenue: 0,
          avgQuality: 0,
          collectionsTrend: { value: 0, isPositive: true },
          litersTrend: { value: 0, isPositive: true },
          revenueTrend: { value: 0, isPositive: true },
          qualityTrend: { value: 0, isPositive: true }
        });
      }
    } catch (error: any) {
      // Log detailed error information for debugging
      console.error('Error fetching data:', error.message, error);
      // Also log as JSON for more detailed inspection
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show user-friendly error message
      const errorMessage = error.message || error.error_description || 'Failed to fetch data';
      toast.error('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    const ranges: Record<string, Date> = {
      '7days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      '30days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
      '90days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90),
      '180days': new Date(now.getFullYear(), now.getMonth(), now.getDate() - 180),
      'all': new Date('2020-01-01')
    };
    return ranges[dateRange]?.toISOString() || ranges['7days'].toISOString(); // Default to 7 days
  };

  const filterCollections = () => {
    let filtered = [...collections];

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.farmers?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.collection_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.staff?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (selectedFarmer !== 'all') {
      filtered = filtered.filter(c => c.farmer_id === selectedFarmer);
    }

    if (selectedStaff !== 'all') {
      filtered = filtered.filter(c => c.staff?.id === selectedStaff);
    }

    setFilteredCollections(filtered);
  };

  const calculateAnalytics = () => {
    // Calculate daily trends
    const dailyData: Record<string, any> = {};
    filteredCollections.forEach(c => {
      const date = new Date(c.collection_date).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = { date, collections: 0, liters: 0, amount: 0, qualitySum: 0, qualityCount: 0 };
      }
      dailyData[date].collections += 1;
      dailyData[date].liters += parseFloat(c.liters?.toString() || '0');
      dailyData[date].amount += parseFloat(c.total_amount?.toString() || '0');
      const gradeValues = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 };
      dailyData[date].qualitySum += gradeValues[c.quality_grade as keyof typeof gradeValues] || 0;
      dailyData[date].qualityCount += 1;
    });

    const dailyTrendsData = Object.values(dailyData).map(d => ({
      ...d,
      avgQuality: d.qualityCount > 0 ? (d.qualitySum / d.qualityCount) : 0
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setDailyTrends(dailyTrendsData);

    // Calculate quality distribution
    const qualityCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0 };
    filteredCollections.forEach(c => {
      if (c.quality_grade && qualityCounts.hasOwnProperty(c.quality_grade)) {
        qualityCounts[c.quality_grade]++;
      }
    });

    const total = filteredCollections.length || 1;
    const qualityDist = Object.entries(qualityCounts).map(([grade, count]) => ({
      name: `Grade ${grade}`,
      value: count,
      percentage: Math.round((count / total) * 100)
    }));

    setQualityDistribution(qualityDist);

    // Calculate top farmers
    const farmerStats: Record<string, any> = {};
    filteredCollections.forEach(c => {
      const farmerId = c.farmer_id;
      if (!farmerStats[farmerId]) {
        farmerStats[farmerId] = {
          id: farmerId,
          name: c.farmers?.profiles?.full_name || 'Unknown',
          collections: 0,
          liters: 0,
          amount: 0,
          qualitySum: 0
        };
      }
      farmerStats[farmerId].collections += 1;
      farmerStats[farmerId].liters += parseFloat(c.liters?.toString() || '0');
      farmerStats[farmerId].amount += parseFloat(c.total_amount?.toString() || '0');
      const gradeValues = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 };
      farmerStats[farmerId].qualitySum += gradeValues[c.quality_grade as keyof typeof gradeValues] || 0;
    });

    const topFarmersData = Object.values(farmerStats)
      .map(f => ({
        ...f,
        avgQuality: f.collections > 0 ? (f.qualitySum / f.collections) : 0
      }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 10);

    setTopFarmers(topFarmersData);

    // Calculate staff performance
    const staffStats: Record<string, any> = {};
    filteredCollections.forEach(c => {
      const staffId = c.staff?.id;
      if (!staffStats[staffId]) {
        staffStats[staffId] = {
          id: staffId,
          name: c.staff?.profiles?.full_name || 'Unknown',
          collections: 0,
          liters: 0,
          farmers: new Set()
        };
      }
      staffStats[staffId].collections += 1;
      staffStats[staffId].liters += parseFloat(c.liters?.toString() || '0');
      staffStats[staffId].farmers.add(c.farmer_id);
    });

    const staffPerformanceData = Object.values(staffStats)
      .map(s => ({
        ...s,
        farmers: s.farmers.size
      }))
      .sort((a, b) => b.collections - a.collections)
      .slice(0, 10);

    setStaffPerformance(staffPerformanceData);
  };

  const exportToCSV = () => {
    const csvData = filteredCollections.map(c => ({
      'Collection ID': c.collection_id,
      'Date': new Date(c.collection_date).toLocaleDateString(),
      'Farmer': c.farmers?.profiles?.full_name || 'N/A',
      'Staff': c.staff?.profiles?.full_name || 'N/A',
      'Liters': c.liters,
      'Quality Grade': c.quality_grade,
      'Rate per Liter': c.rate_per_liter,
      'Total Amount': c.total_amount,
      'Status': c.status,
      'GPS Latitude': c.gps_latitude || 'N/A',
      'GPS Longitude': c.gps_longitude || 'N/A'
    }));

    if (csvData.length === 0) {
      toast.show({ title: 'Warning', description: 'No data to export' });
      return;
    }

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collections_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Verified': return 'secondary';
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  // Calculate overall stats (these will now be overridden by real trends)
  const totalCollections = filteredCollections.length;
  const totalLiters = filteredCollections.reduce((sum, c) => sum + parseFloat(c.liters?.toString() || '0'), 0);
  const totalAmount = filteredCollections.reduce((sum, c) => sum + parseFloat(c.total_amount?.toString() || '0'), 0);
  const avgQuality = filteredCollections.length > 0 
    ? filteredCollections.reduce((sum, c) => {
        const gradeValues = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 };
        return sum + (gradeValues[c.quality_grade as keyof typeof gradeValues] || 0);
      }, 0) / filteredCollections.length
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <CollectionsSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Collections Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Monitor and analyze milk collection data, farmer performance, and quality metrics</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Button 
              onClick={exportToCSV}
              className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Business Intelligence Metrics */}
        <div className="mb-6">
          <BusinessIntelligenceDashboard timeRange={dateRange} />
        </div>

        {/* View Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'farmers', label: 'Farmers', icon: Users },
            { id: 'staff', label: 'Staff', icon: UserCog },
            { id: 'quality', label: 'Quality', icon: Award },
            { id: 'collections', label: 'Collections', icon: Droplet }
          ].map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  currentView === view.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {view.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input-light dark:bg-input-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-input-light dark:bg-input-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-md px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="Collected">Collected</option>
                <option value="Verified">Verified</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-input-light dark:bg-input-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-md px-3 py-2"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="180days">Last 180 Days</option>
                <option value="all">All Time</option>
              </select>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setDateRange('7days'); // Reset to 7 days (daily view)
                    setSelectedFarmer('all');
                    setSelectedStaff('all');
                  }}
                  variant="outline"
                  className="border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
            
            {currentView === 'farmers' && (
              <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                <select
                  value={selectedFarmer}
                  onChange={(e) => {
                    setSelectedFarmer(e.target.value);
                    // Reset staff filter when farmer is selected
                    if (e.target.value !== 'all') {
                      setSelectedStaff('all');
                    }
                  }}
                  className="bg-input-light dark:bg-input-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-md px-3 py-2"
                >
                  <option value="all">All Farmers</option>
                  {farmers.map(farmer => (
                    <option key={farmer.id} value={farmer.id}>
                      {farmer.profiles?.full_name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {currentView === 'staff' && (
              <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                <select
                  value={selectedStaff}
                  onChange={(e) => {
                    setSelectedStaff(e.target.value);
                    // Reset farmer filter when staff is selected
                    if (e.target.value !== 'all') {
                      setSelectedFarmer('all');
                    }
                  }}
                  className="bg-input-light dark:bg-input-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-md px-3 py-2"
                >
                  <option value="all">All Staff</option>
                  {staff.map(staffMember => (
                    <option key={staffMember.id} value={staffMember.id}>
                      {staffMember.profiles?.full_name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Content */}
        <div className="space-y-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            {currentView === 'overview' && (
              <OverviewView
                dailyTrends={dailyTrends}
                qualityDistribution={qualityDistribution}
                topFarmers={topFarmers}
                staffPerformance={staffPerformance}
                totalCollections={trends.totalCollections}
                totalLiters={trends.totalLiters}
                totalAmount={trends.totalRevenue}
                avgQuality={trends.avgQuality}
                collectionsTrend={trends.collectionsTrend}
                litersTrend={trends.litersTrend}
                revenueTrend={trends.revenueTrend}
                qualityTrend={trends.qualityTrend}
              />
            )}
            
            {currentView === 'farmers' && (
              <FarmersView
                topFarmers={topFarmers}
                farmers={farmers}
                selectedFarmer={selectedFarmer === 'all' ? (topFarmers[0]?.id || '') : selectedFarmer}
                setSelectedFarmer={setSelectedFarmer}
              />
            )}
            
            {currentView === 'staff' && (
              <StaffView
                staffPerformance={staffPerformance}
                staff={staff}
                selectedStaff={selectedStaff === 'all' ? (staffPerformance[0]?.id || '') : selectedStaff}
                setSelectedStaff={setSelectedStaff}
              />
            )}
            
            {currentView === 'quality' && (
              <QualityView
                qualityDistribution={qualityDistribution}
                dailyTrends={dailyTrends}
              />
            )}
            
            {currentView === 'collections' && (
              <CollectionsView
                filteredCollections={filteredCollections}
                collections={collections}
                setSelectedCollection={setSelectedCollection}
                getStatusVariant={getStatusVariant}
                formatCurrency={formatCurrency}
              />
            )}
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CollectionsAnalyticsDashboard;