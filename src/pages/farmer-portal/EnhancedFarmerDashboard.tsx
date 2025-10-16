import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Milk, DollarSign, BarChart3, Calendar, TrendingUp, Award,
  Clock, CheckCircle, AlertCircle, Droplets, Leaf, Users,
  MapPin, Bell, Target, Zap, CalendarDays, TrendingDown,
  Star, Package, Truck, Download, ArrowUp, ArrowDown, Loader
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Bar, Legend
} from 'recharts';

// Define types for our data
interface Farmer {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  farm_location: string;
  farm_size: number;
  created_at: string;
}

interface Collection {
  id: string;
  farmer_id: string;
  collection_date: string;
  liters: number;
  quality_grade: string;
  fat_content: number;
  total_amount: number;
  created_at: string;
}

interface Payment {
  id: string;
  farmer_id: string;
  amount: number;
  status: string;
  payment_date: string;
  created_at: string;
}

interface Analytics {
  id: string;
  farmer_id: string;
  current_month_liters: number;
  current_month_earnings: number;
  avg_quality_score: number;
  today_collections_trend: {
    value: number;
    isPositive: boolean;
  };
  monthly_liters_trend: {
    value: number;
    isPositive: boolean;
  };
  monthly_earnings_trend: {
    value: number;
    isPositive: boolean;
  };
  created_at: string;
}

interface MonthlyTrendData {
  month: string;
  liters: number;
  earnings: number;
}

interface WeeklyTrendData {
  date: string;
  liters: number;
  earnings: number;
}

interface QualityData {
  name: string;
  value: number;
  percentage: string;
}

// Date utility functions
const format = (date: Date | string, pattern: string): string => {
  const d = new Date(date);
  const map: Record<string, string> = {
    'MMM': d.toLocaleString('en-US', { month: 'short' }),
    'MMM yyyy': d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
    'MMM d, yyyy': d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    'EEE': d.toLocaleString('en-US', { weekday: 'short' }),
    'yyyy-MM-dd': d.toISOString().split('T')[0]
  };
  return map[pattern] || d.toString();
};

const subDays = (date: Date | string, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const StatCard = ({ title, value, change, isPositive, icon, unit }: { 
  title: string; 
  value: string | number; 
  change?: number | null; 
  isPositive?: boolean; 
  icon: React.ReactNode; 
  unit?: string;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        {icon}
      </div>
      {change !== null && change !== undefined && (
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
    <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
    <div className="flex items-baseline gap-2">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {unit && <p className="text-sm text-gray-500">{unit}</p>}
    </div>
  </div>
);

const Card = ({ title, icon, children }: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
    <div className="border-b border-gray-100 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg text-indigo-600">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const DualAxisChart = ({ data, title, icon, leftKey, leftName, rightKey, rightName, leftColor, rightColor, leftFormatter, rightFormatter }: { 
  data: MonthlyTrendData[];
  title: string;
  icon: React.ReactNode;
  leftKey: string;
  leftName: string;
  rightKey: string;
  rightName: string;
  leftColor: string;
  rightColor: string;
  leftFormatter: (value: number) => string;
  rightFormatter: (value: number) => string;
}) => (
  <Card title={title} icon={icon}>
    <div className="h-80 -mx-6 -mb-6">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 80, left: 60, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
          
          <YAxis 
            yAxisId="left"
            stroke={leftColor}
            tick={{ fontSize: 12 }}
            tickFormatter={leftFormatter}
            label={{ value: leftName, angle: -90, position: 'insideLeft', style: { fill: leftColor, fontSize: 12, fontWeight: 500 } }}
          />
          
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke={rightColor}
            tick={{ fontSize: 12 }}
            tickFormatter={rightFormatter}
            label={{ value: rightName, angle: 90, position: 'insideRight', style: { fill: rightColor, fontSize: 12, fontWeight: 500 } }}
          />
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: `2px solid ${leftColor}`, 
              borderRadius: '8px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            formatter={(value, name) => {
              if (name === leftKey) return [leftFormatter(value as number), leftName];
              if (name === rightKey) return [rightFormatter(value as number), rightName];
              return [value, name];
            }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey={leftKey} 
            stroke={leftColor}
            fill={leftColor}
            fillOpacity={0.1}
            strokeWidth={2.5}
            name={leftName}
            isAnimationActive={true}
          />
          
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey={rightKey} 
            stroke={rightColor}
            strokeWidth={2.5}
            dot={{ stroke: rightColor, strokeWidth: 2, r: 4, fill: '#fff' }}
            activeDot={{ r: 6, fill: rightColor }}
            name={rightName}
            isAnimationActive={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

export default function FarmerDashboard() {
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthlyTrendData, setMonthlyTrendData] = useState<MonthlyTrendData[]>([]);
  const [weeklyTrendData, setWeeklyTrendData] = useState<WeeklyTrendData[]>([]);
  const [qualityData, setQualityData] = useState<QualityData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Fetch farmer profile
        const { data: farmerData, error: farmerError } = await supabase
          .from('farmers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (farmerError) throw farmerError;
        
        if (!farmerData) {
          setError('Farmer profile not found');
          setLoading(false);
          return;
        }

        setFarmer(farmerData as Farmer);

        // Fetch collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .eq('farmer_id', farmerData.id)
          .order('collection_date', { ascending: false });

        if (collectionsError) throw collectionsError;
        setCollections((collectionsData || []) as Collection[]);

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('farmer_id', farmerData.id)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments((paymentsData || []) as Payment[]);

        // Fetch analytics
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('farmer_analytics')
          .select('*')
          .eq('farmer_id', farmerData.id)
          .maybeSingle();

        if (analyticsError) throw analyticsError;
        setAnalytics(analyticsData as Analytics || null);

        // Process monthly trend data
        const monthlyMap: Record<string, { liters: number; earnings: number; count: number }> = {};
        (collectionsData || []).forEach((collection: any) => {
          const month = format(new Date(collection.collection_date), 'MMM yyyy');
          if (!monthlyMap[month]) {
            monthlyMap[month] = { liters: 0, earnings: 0, count: 0 };
          }
          monthlyMap[month].liters += collection.liters || 0;
          monthlyMap[month].earnings += collection.total_amount || 0;
          monthlyMap[month].count += 1;
        });

        const sortedMonths = Object.keys(monthlyMap).sort((a, b) => 
          new Date(`01 ${a}`).getTime() - new Date(`01 ${b}`).getTime()
        );
        const lastSixMonths = sortedMonths.slice(-6);

        const monthlyData = lastSixMonths.map(month => ({
          month: month.split(' ')[0],
          liters: monthlyMap[month].liters,
          earnings: monthlyMap[month].earnings
        }));
        setMonthlyTrendData(monthlyData);

        // Process weekly trend data
        const weeklyMap: Record<string, { liters: number; earnings: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateString = format(date, 'EEE');
          const dayCollections = (collectionsData || []).filter((c: any) => 
            format(new Date(c.collection_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
          ) || [];
          
          const totalLiters = dayCollections.reduce((sum: number, c: any) => sum + (c.liters || 0), 0);
          const totalEarnings = dayCollections.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
          
          weeklyMap[dateString] = { liters: totalLiters, earnings: totalEarnings };
        }

        const weeklyData = Object.entries(weeklyMap).map(([date, data]) => ({
          date,
          liters: data.liters,
          earnings: data.earnings
        }));
        setWeeklyTrendData(weeklyData);

        // Process quality distribution
        const qualityMap: Record<string, number> = {};
        (collectionsData || []).forEach((collection: any) => {
          const grade = collection.quality_grade || 'Unknown';
          qualityMap[grade] = (qualityMap[grade] || 0) + 1;
        });

        const qualityChartData = Object.entries(qualityMap).map(([grade, count]) => ({
          name: grade,
          value: count,
          percentage: (collectionsData || []).length > 0 ? ((count / (collectionsData || []).length) * 100).toFixed(0) : "0"
        }));
        setQualityData(qualityChartData);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const todayCollection = collections
    .filter(c => new Date(c.collection_date).toDateString() === new Date().toDateString())
    .reduce((sum, c) => sum + (parseFloat(c.liters.toString()) || 0), 0);

  const monthlyLiters = analytics?.current_month_liters || collections
    .filter(c => {
      const date = new Date(c.collection_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + (c.liters || 0), 0);

  const monthlyEarnings = analytics?.current_month_earnings || collections
    .filter(c => {
      const date = new Date(c.collection_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + (c.total_amount || 0), 0);

  const totalEarned = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount.toString() || "0"), 0);

  const totalPending = payments
    .filter(p => p.status === 'processing')
    .reduce((sum, p) => sum + parseFloat(p.amount.toString() || "0"), 0);

  const avgQuality = analytics?.avg_quality_score || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {farmer?.full_name?.split(' ')[0] || 'Farmer'}!</h1>
              <p className="text-gray-600 mt-1">Here's your dairy operations overview</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center gap-2">
                <Bell size={18} />
                Notifications
              </button>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg transition-all font-medium flex items-center gap-2">
                <Calendar size={18} />
                Schedule Collection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Today's Collection"
            value={todayCollection.toFixed(1)} 
            unit="Liters"
            change={analytics?.today_collections_trend?.value}
            isPositive={analytics?.today_collections_trend?.isPositive ?? true}
            icon={<Droplets className="w-6 h-6 text-blue-600" />}
          />
          <StatCard 
            title="Monthly Total"
            value={monthlyLiters.toFixed(0)} 
            unit="Liters"
            change={analytics?.monthly_liters_trend?.value}
            isPositive={analytics?.monthly_liters_trend?.isPositive ?? true}
            icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          />
          <StatCard 
            title="Monthly Earnings"
            value={`KSh ${(monthlyEarnings/1000).toFixed(1)}k`}
            unit="Income"
            change={analytics?.monthly_earnings_trend?.value}
            isPositive={analytics?.monthly_earnings_trend?.isPositive ?? true}
            icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
          />
          <StatCard 
            title="Avg Quality"
            value={`${avgQuality.toFixed(0)}%`}
            unit="Grade"
            change={null}
            isPositive={true}
            icon={<Award className="w-6 h-6 text-amber-600" />}
          />
        </div>

        {/* Main Charts - Dual Axis */}
        {monthlyTrendData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <DualAxisChart
              data={monthlyTrendData}
              title="Collections & Earnings Trend"
              icon={<BarChart3 className="w-5 h-5" />}
              leftKey="liters"
              leftName="Liters Collected"
              rightKey="earnings"
              rightName="Earnings (KSh)"
              leftColor="#10b981"
              rightColor="#8b5cf6"
              leftFormatter={(v) => `${v.toFixed(0)}L`}
              rightFormatter={(v) => `KSh${(v/1000).toFixed(1)}k`}
            />

            <Card 
              title="Weekly Performance" 
              icon={<BarChart3 className="w-5 h-5 text-indigo-600" />}
            >
              <div className="h-80 -mx-6 -mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyTrendData} margin={{ top: 20, right: 80, left: 60, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    
                    <YAxis 
                      yAxisId="left"
                      stroke="#0ea5e9"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Liters (L)', angle: -90, position: 'insideLeft', style: { fill: '#0ea5e9', fontSize: 12, fontWeight: 500 } }}
                    />
                    
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#ec4899"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Earnings (KSh)', angle: 90, position: 'insideRight', style: { fill: '#ec4899', fontSize: 12, fontWeight: 500 } }}
                    />
                    
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '2px solid #0ea5e9', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    
                    <Bar 
                      yAxisId="left"
                      dataKey="liters" 
                      fill="#0ea5e9" 
                      fillOpacity={0.8}
                      radius={[8, 8, 0, 0]}
                      name="Liters Collected"
                    />
                    
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="#ec4899" 
                      strokeWidth={2.5}
                      dot={{ stroke: '#ec4899', strokeWidth: 2, r: 4, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                      name="Daily Earnings"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* Quality Distribution and Collections */}
        {qualityData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Card 
                title="Collections Over Time" 
                icon={<Droplets className="w-5 h-5 text-blue-600" />}
              >
                <div className="h-80 -mx-6 -mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrendData} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#10b981" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #10b981', borderRadius: '8px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="liters" 
                        stroke="#10b981" 
                        strokeWidth={2.5}
                        dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card 
              title="Quality Distribution" 
              icon={<Award className="w-5 h-5 text-amber-600" />}
            >
              <div className="h-80 -mx-6 -mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} collections`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* Bottom Section - Collections and Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Collections */}
          <Card 
            title="Recent Collections" 
            icon={<Milk className="w-5 h-5 text-blue-600" />}
          >
            <div className="space-y-3">
              {collections.slice(0, 5).map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Droplets className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{collection.liters}L</p>
                      <p className="text-xs text-gray-500">{format(new Date(collection.collection_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      collection.quality_grade === 'A+' ? 'bg-green-100 text-green-700' :
                      collection.quality_grade === 'A' ? 'bg-blue-100 text-blue-700' :
                      collection.quality_grade === 'B' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {collection.quality_grade}
                    </span>
                    <p className="font-bold text-gray-900 min-w-20 text-right">KSh {collection.total_amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Payment Summary */}
          <Card 
            title="Payment Summary" 
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                  <p className="text-xs font-medium text-green-700 mb-1">Total Earned</p>
                  <p className="text-2xl font-bold text-green-900">KSh {totalEarned.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-blue-900">KSh {totalPending.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Recent Transactions</h4>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          payment.status === 'completed' ? 'bg-green-100' : 'bg-amber-100'
                        }`}>
                          {payment.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">{format(new Date(payment.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-gray-400 capitalize">{payment.status}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">KSh {parseFloat(payment.amount.toString()).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}