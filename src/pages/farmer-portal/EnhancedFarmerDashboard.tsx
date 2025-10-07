import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Milk, 
  DollarSign, 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  Droplets,
  Leaf,
  Users,
  MapPin
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { milkRateService } from '@/services/milk-rate-service';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from '@/hooks/useToastNotifications';

interface Collection {
  id: string;
  collection_date: string;
  liters: number;
  quality_grade: string;
  total_amount: number;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface FarmerAnalytics {
  total_collections: number;
  total_liters: number;
  current_month_liters: number;
  current_month_earnings: number;
  avg_quality_score: number;
}

const EnhancedFarmerDashboard = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<any>(null);
  const [analytics, setAnalytics] = useState<FarmerAnalytics | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch farmer data and analytics
  useEffect(() => {
    const fetchFarmerData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError("Not authenticated");
          return;
        }

        // Fetch farmer profile - handle case where no farmer record exists
        const { data: farmerData, error: farmerError } = await supabase
          .from('farmers')
          .select('*')
          .eq('user_id', user.id);

        if (farmerError) throw farmerError;
        
        // Check if farmer data exists
        if (!farmerData || farmerData.length === 0) {
          setError("No farmer profile found. Please complete your registration.");
          return;
        }
        
        const farmerRecord = farmerData[0];
        setFarmer(farmerRecord);

        // Fetch analytics
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('farmer_analytics')
          .select('*')
          .eq('farmer_id', farmerRecord.id);

        if (analyticsError) throw analyticsError;
        
        // Handle case where no analytics record exists
        if (analyticsData && analyticsData.length > 0) {
          setAnalytics(analyticsData[0]);
        } else {
          // Initialize with default values
          setAnalytics({
            total_collections: 0,
            total_liters: 0,
            current_month_liters: 0,
            current_month_earnings: 0,
            avg_quality_score: 0
          });
        }

        // Fetch recent collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .eq('farmer_id', farmerRecord.id)
          .order('collection_date', { ascending: false })
          .limit(10);

        if (collectionsError) throw collectionsError;
        setCollections(collectionsData || []);

        // Fetch recent payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('farmer_id', farmerRecord.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);

      } catch (err) {
        console.error('Error fetching farmer data:', err);
        setError('Failed to load dashboard data');
        toast.error('Error', 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchFarmerData();
  }, []);

  // Subscribe to milk rate changes
  useEffect(() => {
    const unsubscribe = milkRateService.subscribe((rate) => {
      setCurrentRate(rate);
    });
    
    // Fetch current rate on component mount
    milkRateService.getCurrentRate();
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Stats cards data
  const statsCards = [
    {
      title: "Today's Collection",
      value: collections.filter(c => new Date(c.collection_date).toDateString() === new Date().toDateString())
        .reduce((sum, c) => sum + parseFloat(c.liters?.toString() || '0'), 0).toFixed(1),
      unit: 'L',
      icon: Droplets,
      color: 'bg-blue-500',
      trend: analytics?.today_collections_trend ? 
        `${analytics.today_collections_trend.isPositive ? '+' : ''}${analytics.today_collections_trend.value.toFixed(1)}%` : 
        'No data'
    },
    {
      title: 'Monthly Total',
      value: analytics?.current_month_liters?.toFixed(1) || '0',
      unit: 'L',
      icon: TrendingUp,
      color: 'bg-green-500',
      trend: analytics?.monthly_liters_trend ? 
        `${analytics.monthly_liters_trend.isPositive ? '+' : ''}${analytics.monthly_liters_trend.value.toFixed(1)}%` : 
        'No data'
    },
    {
      title: 'Monthly Earnings',
      value: `KSh ${analytics?.current_month_earnings?.toFixed(0) || '0'}`,
      unit: '',
      icon: DollarSign,
      color: 'bg-purple-500',
      trend: analytics?.monthly_earnings_trend ? 
        `${analytics.monthly_earnings_trend.isPositive ? '+' : ''}${analytics.monthly_earnings_trend.value.toFixed(1)}%` : 
        'No data'
    },
    {
      title: 'Current Rate',
      value: `KSh ${currentRate.toFixed(2)}`,
      unit: '/L',
      icon: Award,
      color: 'bg-yellow-500',
      trend: 'per liter'
    }
  ];

  // Quality distribution
  const qualityDistribution = collections.reduce((acc, c) => {
    const grade = c.quality_grade || 'Unknown';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const qualityChartData = Object.entries(qualityDistribution).map(([grade, count]) => ({
    name: grade,
    value: count
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  // Weekly collection data
  const weeklyData = collections.slice(0, 7).reverse().map(c => ({
    day: new Date(c.collection_date).toLocaleDateString('en-US', { weekday: 'short' }),
    liters: parseFloat(c.liters?.toString() || '0')
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
            </div>
            <p className="mt-2 text-red-700">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {farmer?.full_name?.split(' ')[0] || 'Farmer'}!</h1>
            <p className="text-gray-600 mt-2">Here's what's happening with your dairy operations today.</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
              <Calendar className="h-4 w-4" />
              Schedule Collection
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index} className="border border-border hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.color} text-white`}>
                  {stat.icon && <stat.icon className="h-5 w-5" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}{stat.unit}</div>
                <p className="text-xs text-green-600 font-medium mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stat.trend} from last period
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Weekly Collection Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} 
                      formatter={(value) => [`${value} L`, 'Liters']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="liters" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ fill: '#10b981', r: 5 }} 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Quality Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {qualityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Collections']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities and Upcoming Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Collections */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Milk className="h-5 w-5 text-primary" />
                  Recent Collections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {collections.slice(0, 5).map((collection) => (
                    <div key={collection.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-full bg-blue-100">
                          <Droplets className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{collection.liters} Liters</p>
                          <p className="text-sm text-gray-500">
                            {new Date(collection.collection_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          collection.quality_grade === 'A+' ? 'bg-green-100 text-green-800' :
                          collection.quality_grade === 'A' ? 'bg-blue-100 text-blue-800' :
                          collection.quality_grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Grade {collection.quality_grade}
                        </span>
                        <span className="text-lg font-bold text-gray-900">KSh {collection.total_amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-700">Total Earned</p>
                      <p className="text-xl font-bold text-green-900">
                        KSh {payments.reduce((sum, p) => sum + (p.status === 'completed' ? parseFloat(p.amount?.toString() || '0') : 0), 0).toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">Pending</p>
                      <p className="text-xl font-bold text-blue-900">
                        KSh {payments.reduce((sum, p) => sum + (p.status === 'processing' ? parseFloat(p.amount?.toString() || '0') : 0), 0).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Payments</h4>
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`p-1.5 rounded-full ${
                              payment.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                            }`}>
                              {payment.status === 'completed' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-yellow-600" />
                              )}
                            </div>
                            <span className="text-sm text-gray-600">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="font-medium">KSh {payment.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    View Payment History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                  <Milk className="w-6 h-6" />
                  <span>Record Collection</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                  <MapPin className="w-6 h-6" />
                  <span>Update Farm Location</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                  <Users className="w-6 h-6" />
                  <span>View Profile</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EnhancedFarmerDashboard;