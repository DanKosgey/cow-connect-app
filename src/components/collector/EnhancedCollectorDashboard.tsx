import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Milk, 
  Users, 
  ClipboardList, 
  Calendar, 
  TrendingUp, 
  Award,
  Clock,
  CheckCircle,
  Wallet,
  MapPin,
  Droplets,
  Thermometer,
  Scale,
  Package,
  AlertCircle,
  Plus,
  BarChart3,
  PieChart,
  Activity,
  Route,
  Beaker,
  FileText,
  Bell,
  Zap,
  Target,
  Star,
  CalendarDays,
  Clock3,
  TrendingDown,
  LineChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart as RechartsLineChart, Line } from 'recharts';
import { useStaffInfo } from '@/hooks/useStaffData';

// Define interfaces at the top of the file
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
    full_name: string;
    id: string;
  } | null;
}

interface StaffStats {
  total_collections_today: number;
  total_liters_today: number;
  total_farmers_today: number;
  avg_quality_score: number;
  total_earnings_today: number;
  collections_by_hour: { hour: number; count: number; liters: number }[];
  top_farmers: { name: string; liters: number; collections: number }[];
  status_distribution: { name: string; value: number }[];
  hourly_distribution: { time: string; collections: number; liters: number }[];
  weekly_trend: { date: string; collections: number; liters: number; earnings: number }[];
  quality_distribution: { grade: string; count: number }[];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const QUALITY_COLORS = {
  'A+': '#10B981',
  'A': '#3B82F6',
  'B': '#F59E0B',
  'C': '#EF4444'
};

const EnhancedCollectorDashboard = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [weeklyTrendLoading, setWeeklyTrendLoading] = useState(true);
  const [weeklyTrendData, setWeeklyTrendData] = useState<{ date: string; collections: number; liters: number; earnings: number }[]>([]);
  const [staffName, setStaffName] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modify fetchCollections to handle null staffInfo
  const fetchCollections = useCallback(async () => {
    console.log('fetchCollections called with staffInfo:', staffInfo);
    // Don't return early if no staffInfo, we'll fetch all collections or handle appropriately

    try {
      console.log('Starting collections fetch');
      setCollectionsLoading(true);
      
      // Only fetch today's collections to reduce data load
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      let query = supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          liters,
          quality_grade,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          farmers!fk_collections_farmer_id (
            full_name,
            id
          )
        `)
        .gte('collection_date', startOfDay)
        .lte('collection_date', endOfDay)
        .order('collection_date', { ascending: false })
        .limit(50); // Limit to 50 collections to prevent performance issues

      // Only filter by staff_id if we have staffInfo
      if (staffInfo?.id) {
        query = query.eq('staff_id', staffInfo.id);
      }

      const { data, error } = await query;

      console.log('Collections fetch completed', { dataLength: data?.length, error });
      
      if (error) throw error;

      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast({
        title: "Error",
        description: "Failed to load collections data",
        variant: "error"
      });
    } finally {
      console.log('Setting collectionsLoading to false');
      setCollectionsLoading(false);
    }
  }, [staffInfo, toast]);

  // Fetch collections with optimized query
  // const fetchCollections = useCallback(async () => {
  //   console.log('fetchCollections called with staffInfo:', staffInfo);
  //   if (!staffInfo?.id) {
  //     console.log('No staffInfo.id, returning early');
  //     return;
  //   }

  //   try {
  //     console.log('Starting collections fetch');
  //     setCollectionsLoading(true);
      
  //     // Only fetch today's collections to reduce data load
  //     const today = new Date();
  //     const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  //     const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  //     const { data, error } = await supabase
  //       .from('collections')
  //       .select(`
  //         id,
  //         collection_id,
  //         farmer_id,
  //         liters,
  //         quality_grade,
  //         rate_per_liter,
  //         total_amount,
  //         collection_date,
  //         status,
  //         farmers (
  //           full_name,
  //           id
  //         )
  //       `)
  //       .eq('staff_id', staffInfo.id)
  //       .gte('collection_date', startOfDay)
  //       .lte('collection_date', endOfDay)
  //       .order('collection_date', { ascending: false })
  //       .limit(50); // Limit to 50 collections to prevent performance issues

  //     console.log('Collections fetch completed', { dataLength: data?.length, error });
      
  //     if (error) throw error;

  //     setCollections(data || []);
  //   } catch (error) {
  //     console.error('Error fetching collections:', error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to load collections data",
  //       variant: "error"
  //     });
  //   } finally {
  //     console.log('Setting collectionsLoading to false');
  //     setCollectionsLoading(false);
  //   }
  // }, [staffInfo, toast]);

  useEffect(() => {
    console.log('useEffect triggered with staffInfo:', staffInfo, 'user:', user);
    if (staffInfo) {
      console.log('Setting staffName and calling fetch functions');
      setStaffName(staffInfo.employee_id || 'Staff Member');
      // Fetch real notifications from Supabase instead of mock data
      fetchRealNotifications();
      // Fetch collections
      fetchCollections();
    } else if (user?.id && !staffLoading) {
      // If we have a user but no staffInfo, check if this is a new staff member
      console.log('User available but no staffInfo, checking if this is a new staff member');
      // Set a default name and proceed with loading
      setStaffName('Staff Member');
      // We still want to fetch collections and other data even if staffInfo is null
      // But we'll modify the queries to not filter by staff_id in this case
      fetchRealNotifications();
      fetchCollections();
    } else {
      console.log('No staffInfo and no user, not calling fetch functions');
    }
  }, [staffInfo, fetchCollections, user, staffLoading]);

  // Optimized stats calculation with useMemo
  const calculateStats = useMemo(() => {
    if (!collections || collections.length === 0) {
      // Return default stats when no collections
      return {
        total_collections_today: 0,
        total_liters_today: 0,
        total_farmers_today: 0,
        avg_quality_score: 0,
        total_earnings_today: 0,
        collections_by_hour: [],
        top_farmers: [],
        status_distribution: [],
        hourly_distribution: [],
        weekly_trend: [],
        quality_distribution: []
      };
    }

    // Calculate stats
    const totalCollections = collections.length;
    const totalLiters = collections.reduce((sum, c) => sum + (c.liters || 0), 0);
    const totalFarmers = new Set(collections.map(c => c.farmer_id)).size;
    const totalEarnings = collections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    
    // Calculate average quality score
    let qualityScoreSum = 0;
    let qualityCountForAverage = 0;
    collections.forEach(c => {
      if (c.quality_grade) {
        const score = c.quality_grade === 'A+' ? 10 : 
                     c.quality_grade === 'A' ? 8 : 
                     c.quality_grade === 'B' ? 6 : 4;
        qualityScoreSum += score;
        qualityCountForAverage++;
      }
    });
    const avgQualityScore = qualityCountForAverage > 0 ? qualityScoreSum / qualityCountForAverage : 0;

    // Group collections by hour
    const collectionsByHour: { hour: number; count: number; liters: number }[] = Array(24).fill(0).map((_, i) => ({ 
      hour: i, 
      count: 0, 
      liters: 0 
    }));
    
    collections.forEach(c => {
      const hour = new Date(c.collection_date).getHours();
      collectionsByHour[hour].count += 1;
      collectionsByHour[hour].liters += c.liters || 0;
    });

    // Group collections by hour for chart
    const hourlyDistribution = collectionsByHour
      .filter(hour => hour.count > 0)
      .map(hour => ({
        time: `${hour.hour}:00`,
        collections: hour.count,
        liters: parseFloat(hour.liters.toFixed(2))
      }));

    // Get top 5 farmers
    const farmerStats: { [key: string]: { name: string; liters: number; collections: number } } = {};
    collections.forEach(c => {
      const farmerId = c.farmer_id;
      if (!farmerStats[farmerId]) {
        farmerStats[farmerId] = {
          name: c.farmers?.full_name || 'Unknown Farmer',
          liters: 0,
          collections: 0
        };
      }
      farmerStats[farmerId].liters += c.liters || 0;
      farmerStats[farmerId].collections += 1;
    });

    const topFarmers = Object.values(farmerStats)
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);

    // Status distribution
    const statusCount: { [key: string]: number } = {};
    collections.forEach(c => {
      statusCount[c.status] = (statusCount[c.status] || 0) + 1;
    });

    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      name: status,
      value: count
    }));

    // Quality distribution
    const qualityCount: { [key: string]: number } = {};
    collections.forEach(c => {
      qualityCount[c.quality_grade || 'N/A'] = (qualityCount[c.quality_grade || 'N/A'] || 0) + 1;
    });

    const qualityDistribution = Object.entries(qualityCount).map(([grade, count]) => ({
      grade,
      count
    }));

    return {
      total_collections_today: totalCollections,
      total_liters_today: parseFloat(totalLiters.toFixed(2)),
      total_farmers_today: totalFarmers,
      avg_quality_score: parseFloat(avgQualityScore.toFixed(1)),
      total_earnings_today: parseFloat(totalEarnings.toFixed(2)),
      collections_by_hour: collectionsByHour,
      top_farmers: topFarmers,
      status_distribution: statusDistribution,
      hourly_distribution: hourlyDistribution,
      weekly_trend: weeklyTrendData,
      quality_distribution: qualityDistribution
    };
  }, [collections, weeklyTrendData]);

  // Update stats when collections or weekly trend data change
  useEffect(() => {
    console.log('Stats useEffect triggered', { calculateStats, weeklyTrendData });
    setStats(calculateStats);
  }, [calculateStats, weeklyTrendData]);

  // Recalculate loading state when data fetching completes
  useEffect(() => {
    console.log('Loading states:', { staffLoading, collectionsLoading, weeklyTrendLoading });
    // Even if staffLoading is true (because staffInfo is null), we should still proceed
    // We only need to wait for collections and weekly trend data to load
    if (!collectionsLoading && !weeklyTrendLoading) {
      console.log('Essential data loaded, setting loading to false');
      setLoading(false);
    }
  }, [staffLoading, collectionsLoading, weeklyTrendLoading]);

  const fetchWeeklyTrendData = async () => {
    console.log('fetchWeeklyTrendData called with staffInfo:', staffInfo);
    // Don't return early if no staffInfo, we'll fetch all data or handle appropriately

    try {
      console.log('Starting weekly trend data fetch');
      setWeeklyTrendLoading(true);
      
      // Get collections for the past 7 days
      const oneWeekAgo = subDays(new Date(), 7);
      
      let query = supabase
        .from('collections')
        .select(`
          id,
          liters,
          total_amount,
          collection_date,
          farmer_id
        `)
        .gte('collection_date', oneWeekAgo.toISOString())
        .order('collection_date', { ascending: true })
        .limit(500); // Limit to prevent performance issues

      // Only filter by staff_id if we have staffInfo
      if (staffInfo?.id) {
        query = query.eq('staff_id', staffInfo.id);
      }

      const { data: weeklyCollections, error } = await query;

      console.log('Weekly trend data fetch completed', { dataLength: weeklyCollections?.length, error });
      
      if (error) throw error;

      // Group by date
      const dailyStats: { [key: string]: { collections: number; liters: number; earnings: number; farmers: Set<string> } } = {};
      
      // Initialize all days
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateString = format(date, 'MMM dd');
        dailyStats[dateString] = {
          collections: 0,
          liters: 0,
          earnings: 0,
          farmers: new Set()
        };
      }

      // Process collections
      weeklyCollections?.forEach(collection => {
        const date = format(new Date(collection.collection_date), 'MMM dd');
        if (dailyStats[date]) {
          dailyStats[date].collections += 1;
          dailyStats[date].liters += collection.liters || 0;
          dailyStats[date].earnings += collection.total_amount || 0;
          dailyStats[date].farmers.add(collection.farmer_id);
        }
      });

      // Convert to array format
      const weeklyTrend = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        collections: stats.collections,
        liters: stats.liters,
        earnings: stats.earnings
      }));

      // Update weekly trend data
      console.log('Setting weekly trend data', weeklyTrend);
      setWeeklyTrendData(weeklyTrend);
    } catch (error) {
      console.error('Error fetching weekly trend data:', error);
    } finally {
      console.log('Setting weeklyTrendLoading to false');
      setWeeklyTrendLoading(false);
    }
  };

  // Fetch weekly trend data when staff info is available
  useEffect(() => {
    console.log('Weekly trend useEffect triggered with staffInfo:', staffInfo);
    // Don't return early if no staffInfo, we'll fetch all data or handle appropriately
    console.log('Calling fetchWeeklyTrendData');
    fetchWeeklyTrendData();
  }, [staffInfo]);

  const fetchRealNotifications = async () => {
    if (!user?.id) return;

    try {
      // Fetch real notifications from Supabase
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedNotifications: Notification[] = (notificationsData || []).map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        timestamp: notification.created_at,
        read: notification.read,
        type: notification.type || 'info'
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to mock data if there's an error
      fetchMockNotifications();
    }
  };

  const fetchMockNotifications = () => {
    // Mock notifications for fallback
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'New Collection Request',
        message: 'Farmer John Smith has requested a collection pickup',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'info'
      },
      {
        id: '2',
        title: 'Quality Alert',
        message: 'Collection from Farmer Jane needs quality review',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        type: 'warning'
      },
      {
        id: '3',
        title: 'Payment Processed',
        message: 'Payment of KSh 15,000 has been processed for your collections',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true,
        type: 'success'
      }
    ];
    
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  };

  const markAsRead = async (id: string) => {
    try {
      // Update notification in Supabase
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(n => 
        n.id === id ? {...n, read: true} : n
      ));
      setUnreadCount(unreadCount - 1);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "error"
      });
    }
  };

  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Memoized data transformations
  const qualityDistributionData = useMemo(() => stats?.quality_distribution || [], [stats]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Dashboard loading timeout reached, forcing load with available data');
        // Force loading to complete after 15 seconds
        setLoading(false);
        setCollectionsLoading(false);
        setWeeklyTrendLoading(false);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeoutId);
  }, [loading]);

  const isLoading = collectionsLoading || weeklyTrendLoading;

  if (isLoading) {
    console.log('Showing loading screen');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3">Loading dashboard...</span>
      </div>
    );
  }

  // Show a message if user is authenticated but has no staff record or wrong role
  if ((!staffInfo && user?.id && !staffLoading) || (userRole && userRole !== 'staff')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {userRole && userRole !== 'staff' ? 'Staff Access Required' : 'Staff Record Not Found'}
          </h2>
          <p className="text-gray-600 mb-6">
            {userRole && userRole !== 'staff' 
              ? `Your account is authenticated as a ${userRole}, but this portal requires staff access.`
              : "Your account is authenticated, but no staff record was found."}
            Please contact your administrator to set up your staff profile or log in with a staff account.
          </p>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate(`/${userRole || 'farmer'}/dashboard`)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
            >
              Go to {userRole === 'farmer' ? 'Farmer' : userRole === 'admin' ? 'Admin' : 'Your'} Dashboard
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full py-2 px-4 rounded"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering dashboard with data:', { stats, collections, weeklyTrendData });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header with Welcome, Notifications and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome, {staffName}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Today is {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Button 
              variant="outline"
              className="relative flex items-center gap-2 text-sm sm:text-base"
              onClick={() => navigate('/collector/notifications')}
            >
              <Bell className="h-4 w-4" />
              <span className="hidden xs:inline">Notifications</span>
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </div>
          <Button 
            className="flex items-center gap-2 text-sm sm:text-base"
            onClick={() => navigate('/collector/collections/new')}
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden xs:inline">New Collection</span>
            <span className="xs:hidden">New</span>
          </Button>
          <Button 
            variant="outline"
            className="flex items-center gap-2 text-sm sm:text-base"
            onClick={() => navigate('/collector/payments/approval')}
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden xs:inline">Payments</span>
            <span className="xs:hidden">Pay</span>
          </Button>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Today's Collections</CardTitle>
            <Milk className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              {stats?.total_collections_today || 0}
              <TrendingUp className="h-4 w-4 ml-2 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.total_liters_today?.toFixed(1) || 0}L collected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Farmers Served</CardTitle>
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              {stats?.total_farmers_today || 0}
              <Target className="h-4 w-4 ml-2 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Unique farmers visited
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Earnings</CardTitle>
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              KSh {stats?.total_earnings_today?.toFixed(2) || '0.00'}
              <Zap className="h-4 w-4 ml-2 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total value collected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Avg Quality</CardTitle>
            <Scale className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              {stats?.avg_quality_score?.toFixed(1) || '0.0'}/10
              <Star className="h-4 w-4 ml-2 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Average quality score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Weekly Performance Chart */}
        <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Weekly Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip 
                  wrapperClassName="text-xs sm:text-sm"
                  formatter={(value, name) => {
                    if (name === 'collections') return [value, 'Collections'];
                    if (name === 'liters') return [value, 'Liters'];
                    if (name === 'earnings') return [`KSh ${value}`, 'Earnings'];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="collections" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.2} 
                  name="Collections"
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="liters" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.2} 
                  name="Liters"
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.2} 
                  name="Earnings (KSh)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quality Distribution */}
        <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={qualityDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ grade, percent }) => `${grade}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {qualityDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={QUALITY_COLORS[entry.grade as keyof typeof QUALITY_COLORS] || '#cccccc'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Collections']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Collections and Top Farmers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Recent Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collections && collections.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {collections.slice(0, 5).map((collection) => (
                  <div 
                    key={collection.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <div className="p-2 rounded-full bg-blue-100">
                        <Milk className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-medium text-sm sm:text-base">
                          {collection.farmers?.full_name || 'Unknown Farmer'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {collection.farmers?.id}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-center">
                        <div className="font-medium text-sm">{collection.liters}L</div>
                        <div className="text-xs text-gray-500">Quantity</div>
                      </div>
                      
                      <div className="text-center">
                        <Badge className={`${getQualityGradeColor(collection.quality_grade || '')} text-xs`}>
                          {collection.quality_grade || 'N/A'}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">Quality</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-medium text-sm">KSh {collection.total_amount?.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Amount</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Milk className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-2" />
                <p className="text-sm sm:text-base">No collections recorded today</p>
              </div>
            )}
            
            <div className="mt-4 sm:mt-6 text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/collector/collections/new')}
                className="flex items-center gap-2 mx-auto text-sm sm:text-base"
              >
                <Plus className="h-4 w-4" />
                Record New Collection
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Top Farmers Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.top_farmers && stats.top_farmers.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {stats.top_farmers.map((farmer, index) => (
                  <div 
                    key={index} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm sm:text-base">{farmer.name}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-center">
                        <div className="font-medium text-sm">{farmer.liters}L</div>
                        <div className="text-xs text-gray-500">Quantity</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-sm">{farmer.collections}</div>
                        <div className="text-xs text-gray-500">Collections</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-gray-300 mb-2" />
                <p className="text-sm sm:text-base">No farmer data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/collections/new')}
            >
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">New Collection</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/collections/history')}
            >
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Collection History</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/farmers')}
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Farmer Directory</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/payments/approval')}
            >
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Payments</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/routes')}
            >
              <Route className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Routes</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/performance')}
            >
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Performance</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/performance-tracking')}
            >
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center hidden xs:inline">Performance Tracking</span>
              <span className="text-center xs:hidden">Tracking</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/quality-control')}
            >
              <Beaker className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Quality Control</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/inventory')}
            >
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Inventory</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/reports')}
            >
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Reports</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/collector/analytics')}
            >
              <LineChart className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center hidden xs:inline">Detailed Analytics</span>
              <span className="text-center xs:hidden">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCollectorDashboard;