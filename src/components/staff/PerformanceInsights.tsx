import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter, 
  Target,
  Award,
  Clock,
  Milk,
  Users,
  Wallet,
  BarChart3,
  LineChart,
  PieChart,
  ClipboardList
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface PerformanceMetric {
  id: string;
  title: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

interface CollectionData {
  date: string;
  collections: number;
  liters: number;
  farmers: number;
  earnings: number;
}

interface FarmerPerformance {
  id: string;
  name: string;
  collections: number;
  liters: number;
  qualityScore: number;
  earnings: number;
  rank: number;
}

const PerformanceInsights = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [collectionData, setCollectionData] = useState<CollectionData[]>([]);
  const [farmerPerformance, setFarmerPerformance] = useState<FarmerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchPerformanceData();
  }, [period]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      // Mock data - in a real implementation, this would fetch from Supabase
      const mockMetrics: PerformanceMetric[] = [
        {
          id: '1',
          title: 'Total Collections',
          value: 124,
          unit: 'collections',
          change: 12.5,
          trend: 'up'
        },
        {
          id: '2',
          title: 'Milk Collected',
          value: 4856.3,
          unit: 'liters',
          change: 8.7,
          trend: 'up'
        },
        {
          id: '3',
          title: 'Farmers Served',
          value: 89,
          unit: 'farmers',
          change: 5.2,
          trend: 'up'
        },
        {
          id: '4',
          title: 'Total Earnings',
          value: 971260,
          unit: 'KSh',
          change: 15.3,
          trend: 'up'
        },
        {
          id: '5',
          title: 'Avg Quality Score',
          value: 8.2,
          unit: '/10',
          change: 3.1,
          trend: 'up'
        },
        {
          id: '6',
          title: 'On-time Collections',
          value: 94.2,
          unit: '%',
          change: -1.8,
          trend: 'down'
        }
      ];

      // Generate collection data for the past 7 days
      const mockCollectionData: CollectionData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        mockCollectionData.push({
          date: dateString,
          collections: Math.floor(Math.random() * 30) + 10,
          liters: Math.floor(Math.random() * 1000) + 300,
          farmers: Math.floor(Math.random() * 20) + 5,
          earnings: Math.floor(Math.random() * 50000) + 15000
        });
      }

      const mockFarmerPerformance: FarmerPerformance[] = [
        {
          id: '1',
          name: 'John Smith',
          collections: 24,
          liters: 980.5,
          qualityScore: 9.2,
          earnings: 196100,
          rank: 1
        },
        {
          id: '2',
          name: 'Jane Doe',
          collections: 22,
          liters: 895.2,
          qualityScore: 8.8,
          earnings: 179040,
          rank: 2
        },
        {
          id: '3',
          name: 'Robert Johnson',
          collections: 20,
          liters: 820.7,
          qualityScore: 8.5,
          earnings: 164140,
          rank: 3
        },
        {
          id: '4',
          name: 'Emily Wilson',
          collections: 18,
          liters: 750.3,
          qualityScore: 8.7,
          earnings: 150060,
          rank: 4
        },
        {
          id: '5',
          name: 'Michael Brown',
          collections: 16,
          liters: 680.9,
          qualityScore: 8.3,
          earnings: 136180,
          rank: 5
        }
      ];

      setMetrics(mockMetrics);
      setCollectionData(mockCollectionData);
      setFarmerPerformance(mockFarmerPerformance);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast({
        title: "Error",
        description: "Failed to load performance data",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    toast({
      title: "Export Started",
      description: "Performance report export in progress...",
      variant: "success"
    });
    
    // In a real implementation, this would generate and download a report
    console.log('Exporting performance report');
  };

  const getTrendIcon = (trend: string, size: number = 16) => {
    switch (trend) {
      case 'up': return <TrendingUp className={`h-${size} w-${size} text-green-500`} />;
      case 'down': return <TrendingUp className={`h-${size} w-${size} text-red-500 rotate-180`} />;
      default: return <div className={`h-${size} w-${size}`}></div>;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance Insights</h1>
          <p className="text-muted-foreground">Track and analyze your performance metrics</p>
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded-md p-2"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {metric.unit === 'KSh' ? 'KSh ' : ''}
                    {metric.value.toLocaleString()}
                    {metric.unit !== 'KSh' && metric.unit !== '/10' && ` ${metric.unit}`}
                    {metric.unit === '/10' && metric.unit}
                  </div>
                  <div className={`flex items-center mt-1 text-sm ${getTrendColor(metric.trend)}`}>
                    {getTrendIcon(metric.trend, 4)}
                    <span className="ml-1">
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                  </div>
                </div>
                <div>
                  {metric.title === 'Total Collections' && <ClipboardList className="h-8 w-8 text-primary" />}
                  {metric.title === 'Milk Collected' && <Milk className="h-8 w-8 text-blue-500" />}
                  {metric.title === 'Farmers Served' && <Users className="h-8 w-8 text-green-500" />}
                  {metric.title === 'Total Earnings' && <Wallet className="h-8 w-8 text-purple-500" />}
                  {metric.title === 'Avg Quality Score' && <Target className="h-8 w-8 text-yellow-500" />}
                  {metric.title === 'On-time Collections' && <Clock className="h-8 w-8 text-red-500" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Collections Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'collections') return [value, 'Collections'];
                    if (name === 'liters') return [value, 'Liters'];
                    if (name === 'farmers') return [value, 'Farmers'];
                    if (name === 'earnings') return [`KSh ${value}`, 'Earnings'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="collections" fill="#3b82f6" name="Collections" />
                <Bar dataKey="liters" fill="#10b981" name="Liters" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Earnings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Earnings Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={collectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`KSh ${value}`, 'Earnings']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                  name="Earnings (KSh)"
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Farmer Performance Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top Performing Farmers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {farmerPerformance.map((farmer) => (
              <div 
                key={farmer.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {farmer.rank}
                  </div>
                  <div>
                    <h3 className="font-medium">{farmer.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {farmer.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="font-medium">{farmer.collections}</div>
                    <div className="text-xs text-muted-foreground">Collections</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium">{farmer.liters.toFixed(1)}L</div>
                    <div className="text-xs text-muted-foreground">Volume</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium">{farmer.qualityScore}/10</div>
                    <div className="text-xs text-muted-foreground">Quality</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium">KSh {farmer.earnings.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Earnings</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceInsights;