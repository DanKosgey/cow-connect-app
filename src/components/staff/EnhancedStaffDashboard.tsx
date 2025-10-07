import { useEffect, useState } from 'react';
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
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { responsiveGridClasses, responsiveText, responsiveSpacing, responsiveCards } from '@/utils/responsive';

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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const EnhancedStaffDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get staff info
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, employee_id, profiles(full_name)')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (staffError) throw staffError;
      
      setStaffName(staffData?.profiles?.full_name || 'Staff Member');
      
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch today's collections - only if staff record exists
      let collectionsData = [];
      if (staffData?.id) {
        const { data, error: collectionsError } = await supabase
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
            gps_latitude,
            gps_longitude,
            farmers (
              full_name,
              id
            )
          `)
          .eq('staff_id', staffData.id)
          .gte('collection_date', today.toISOString())
          .lt('collection_date', tomorrow.toISOString())
          .order('collection_date', { ascending: false })
          .limit(10);

        if (collectionsError) throw collectionsError;
        collectionsData = data || [];
      }

      setCollections(collectionsData);

      // Calculate stats
      const totalCollections = collectionsData?.length || 0;
      const totalLiters = collectionsData?.reduce((sum, c) => sum + (c.liters || 0), 0) || 0;
      const totalFarmers = new Set(collectionsData?.map(c => c.farmer_id)).size || 0;
      const totalEarnings = collectionsData?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      
      // Calculate average quality score
      let qualityScoreSum = 0;
      let qualityCount = 0;
      collectionsData?.forEach(c => {
        if (c.quality_grade) {
          const score = c.quality_grade === 'A+' ? 10 : 
                       c.quality_grade === 'A' ? 8 : 
                       c.quality_grade === 'B' ? 6 : 4;
          qualityScoreSum += score;
          qualityCount++;
        }
      });
      const avgQualityScore = qualityCount > 0 ? qualityScoreSum / qualityCount : 0;

      // Group collections by hour
      const collectionsByHour: { hour: number; count: number; liters: number }[] = [];
      for (let i = 0; i < 24; i++) {
        collectionsByHour.push({ hour: i, count: 0, liters: 0 });
      }
      
      collectionsData?.forEach(c => {
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
      collectionsData?.forEach(c => {
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
      collectionsData?.forEach(c => {
        statusCount[c.status] = (statusCount[c.status] || 0) + 1;
      });

      const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
        name: status,
        value: count
      }));

      setStats({
        total_collections_today: totalCollections,
        total_liters_today: parseFloat(totalLiters.toFixed(2)),
        total_farmers_today: totalFarmers,
        avg_quality_score: parseFloat(avgQualityScore.toFixed(1)),
        total_earnings_today: parseFloat(totalEarnings.toFixed(2)),
        collections_by_hour: collectionsByHour,
        top_farmers: topFarmers,
        status_distribution: statusDistribution,
        hourly_distribution: hourlyDistribution
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`${responsiveSpacing.sectionPadding} space-y-4 sm:space-y-6`}>
      {/* Header with Welcome and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`${responsiveText.heading2} text-gray-900`}>Welcome, {staffName}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Today is {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="flex items-center gap-2 text-sm sm:text-base"
            onClick={() => navigate('/staff/collections/new')}
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden xs:inline">New Collection</span>
            <span className="xs:hidden">New</span>
          </Button>
          <Button 
            variant="outline"
            className="flex items-center gap-2 text-sm sm:text-base"
            onClick={() => navigate('/staff/payments/approval')}
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden xs:inline">Payments</span>
            <span className="xs:hidden">Pay</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className={responsiveGridClasses.summaryCards}>
        <Card className={`${responsiveCards.withHover} border-l-4 border-l-blue-500`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Today's Collections</CardTitle>
            <Milk className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {stats?.total_collections_today || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.total_liters_today?.toFixed(1) || 0}L collected
            </p>
          </CardContent>
        </Card>

        <Card className={`${responsiveCards.withHover} border-l-4 border-l-green-500`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Farmers Served</CardTitle>
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {stats?.total_farmers_today || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Unique farmers visited
            </p>
          </CardContent>
        </Card>

        <Card className={`${responsiveCards.withHover} border-l-4 border-l-purple-500`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Earnings</CardTitle>
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              KSh {stats?.total_earnings_today?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total value collected
            </p>
          </CardContent>
        </Card>

        <Card className={`${responsiveCards.withHover} border-l-4 border-l-yellow-500`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Avg Quality</CardTitle>
            <Scale className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {stats?.avg_quality_score?.toFixed(1) || '0.0'}/10
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Average quality score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className={responsiveGridClasses.chartSection}>
        <Card className={responsiveCards.withHover}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Collection Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.hourly_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.length > 5 ? value.substring(0, 5) : value}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  wrapperClassName="text-xs sm:text-sm"
                  formatter={(value) => [value, 'Liters']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="liters" fill="#3b82f6" name="Liters Collected" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={responsiveCards.withHover}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={stats?.status_distribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(stats?.status_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Collected' ? '#3b82f6' : 
                      entry.name === 'Verified' ? '#10b981' : 
                      entry.name === 'Paid' ? '#8b5cf6' : '#ef4444'
                    } />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Collections']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Collections and Top Farmers */}
      <div className={responsiveGridClasses.chartSection}>
        <Card className={responsiveCards.withHover}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Recent Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collections.length > 0 ? (
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
                onClick={() => navigate('/staff/collections/new')}
                className="flex items-center gap-2 mx-auto text-sm sm:text-base"
              >
                <Plus className="h-4 w-4" />
                Record New Collection
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={responsiveCards.withHover}>
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
      <Card className={responsiveCards.withHover}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={responsiveGridClasses.quickActions}>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/collections/new')}
            >
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">New Collection</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/collections/history')}
            >
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Collection History</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/farmers')}
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Farmer Directory</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/payments/approval')}
            >
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Payments</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/routes')}
            >
              <Route className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Routes</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/performance')}
            >
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Performance</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/performance-tracking')}
            >
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center hidden xs:inline">Performance Tracking</span>
              <span className="text-center xs:hidden">Tracking</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/quality-control')}
            >
              <Beaker className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Quality Control</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/inventory')}
            >
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Inventory</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/reports')}
            >
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-center">Reports</span>
            </Button>
            <Button 
              className="flex flex-col items-center justify-center h-20 sm:h-24 gap-1 sm:gap-2 text-xs sm:text-sm"
              variant="outline"
              onClick={() => navigate('/staff/analytics')}
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

export default EnhancedStaffDashboard;