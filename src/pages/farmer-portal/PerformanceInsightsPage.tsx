import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Star,
  Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { format, subDays, subMonths } from 'date-fns';
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";

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
  qualityScore: number;
}

interface QualityReport {
  id: string;
  date: string;
  qualityGrade: string;
  fatContent: number;
  proteinContent: number;
  snfContent: number;
  acidityLevel: number;
  temperature: number;
  bacterialCount: number;
}

const PerformanceInsightsPage = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<any>(null);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [collectionData, setCollectionData] = useState<CollectionData[]>([]);
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [period, setPeriod] = useState('month');

  // Fetch farmer data and performance metrics
  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch farmer profile
        const { data: farmerData, error: farmerError } = await supabase
          .from('farmers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (farmerError) throw farmerError;
        if (!farmerData) {
          toast.error('Error', 'Farmer profile not found. Please complete your registration.');
          return;
        }
        setFarmer(farmerData);

        // Generate mock performance metrics
        const mockMetrics: PerformanceMetric[] = [
          {
            id: '1',
            title: 'Total Collections',
            value: 42,
            unit: 'collections',
            change: 12.5,
            trend: 'up'
          },
          {
            id: '2',
            title: 'Milk Collected',
            value: 1856.3,
            unit: 'liters',
            change: 8.7,
            trend: 'up'
          },
          {
            id: '3',
            title: 'Avg Quality Score',
            value: 8.2,
            unit: '/10',
            change: 3.1,
            trend: 'up'
          },
          {
            id: '4',
            title: 'Total Earnings',
            value: 371260,
            unit: 'KSh',
            change: 15.3,
            trend: 'up'
          },
          {
            id: '5',
            title: 'On-time Collections',
            value: 94.2,
            unit: '%',
            change: -1.8,
            trend: 'down'
          },
          {
            id: '6',
            title: 'Avg Daily Production',
            value: 62.1,
            unit: 'liters',
            change: 5.2,
            trend: 'up'
          }
        ];

        setMetrics(mockMetrics);

        // Generate collection data for the past 30 days
        const mockCollectionData: CollectionData[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateString = format(date, 'MMM dd');
          
          mockCollectionData.push({
            date: dateString,
            collections: Math.floor(Math.random() * 5) + 1,
            liters: Math.floor(Math.random() * 100) + 30,
            farmers: 1,
            earnings: Math.floor(Math.random() * 2000) + 800,
            qualityScore: Math.floor(Math.random() * 3) + 7
          });
        }

        setCollectionData(mockCollectionData);

        // Generate quality reports
        const mockQualityReports: QualityReport[] = [
          {
            id: '1',
            date: '2023-06-15',
            qualityGrade: 'A+',
            fatContent: 4.2,
            proteinContent: 3.5,
            snfContent: 9.1,
            acidityLevel: 6.8,
            temperature: 3.2,
            bacterialCount: 800
          },
          {
            id: '2',
            date: '2023-06-14',
            qualityGrade: 'A',
            fatContent: 3.8,
            proteinContent: 3.2,
            snfContent: 8.7,
            acidityLevel: 7.1,
            temperature: 4.5,
            bacterialCount: 1200
          },
          {
            id: '3',
            date: '2023-06-13',
            qualityGrade: 'A+',
            fatContent: 4.5,
            proteinContent: 3.7,
            snfContent: 9.4,
            acidityLevel: 6.5,
            temperature: 2.8,
            bacterialCount: 500
          },
          {
            id: '4',
            date: '2023-06-12',
            qualityGrade: 'A',
            fatContent: 3.9,
            proteinContent: 3.3,
            snfContent: 8.9,
            acidityLevel: 7.0,
            temperature: 3.8,
            bacterialCount: 1800
          },
          {
            id: '5',
            date: '2023-06-11',
            qualityGrade: 'A+',
            fatContent: 4.1,
            proteinContent: 3.6,
            snfContent: 9.2,
            acidityLevel: 6.7,
            temperature: 3.5,
            bacterialCount: 900
          }
        ];

        setQualityReports(mockQualityReports);

      } catch (err) {
        console.error('Error fetching performance data:', err);
        toast.error('Error', 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [period]);

  const exportReport = (format: 'csv' | 'json') => {
    try {
      // Prepare performance metrics data for export
      const metricsExportData = metrics.map(metric => ({
        title: metric.title,
        value: metric.value,
        unit: metric.unit,
        change: metric.change,
        trend: metric.trend
      }));
      
      // Prepare collection data for export
      const collectionExportData = collectionData.map(data => ({
        date: data.date,
        collections: data.collections,
        liters: data.liters,
        farmers: data.farmers,
        earnings: data.earnings,
        qualityScore: data.qualityScore
      }));
      
      // Prepare quality reports data for export
      const qualityReportsExportData = qualityReports.map(report => ({
        date: report.date,
        qualityGrade: report.qualityGrade,
        fatContent: report.fatContent,
        proteinContent: report.proteinContent,
        snfContent: report.snfContent,
        acidityLevel: report.acidityLevel,
        temperature: report.temperature,
        bacterialCount: report.bacterialCount
      }));
      
      // Export based on format
      if (format === 'csv') {
        exportToCSV(metricsExportData, 'performance-metrics-report');
        exportToCSV(collectionExportData, 'collection-trend-report');
        exportToCSV(qualityReportsExportData, 'quality-reports');
        toast.success('Success', 'Performance reports exported as CSV');
      } else {
        exportToJSON(metricsExportData, 'performance-metrics-report');
        exportToJSON(collectionExportData, 'collection-trend-report');
        exportToJSON(qualityReportsExportData, 'quality-reports');
        toast.success('Success', 'Performance reports exported as JSON');
      }
    } catch (err) {
      console.error('Error exporting performance reports:', err);
      toast.error('Error', 'Failed to export performance reports');
    }
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

  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Insights</h1>
            <p className="text-gray-600 mt-2">Track and analyze your dairy farming performance</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <select
              className="border rounded-md p-2"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <Button onClick={() => exportReport('csv')} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button onClick={() => exportReport('json')} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {metrics.map((metric) => (
            <Card key={metric.id} className="border border-border hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
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
                    {metric.title === 'Total Collections' && <Milk className="h-8 w-8 text-blue-500" />}
                    {metric.title === 'Milk Collected' && <BarChart3 className="h-8 w-8 text-green-500" />}
                    {metric.title === 'Avg Quality Score' && <Star className="h-8 w-8 text-yellow-500" />}
                    {metric.title === 'Total Earnings' && <Wallet className="h-8 w-8 text-purple-500" />}
                    {metric.title === 'On-time Collections' && <Clock className="h-8 w-8 text-red-500" />}
                    {metric.title === 'Avg Daily Production' && <TrendingUp className="h-8 w-8 text-cyan-500" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Collections and Earnings Trend */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                Collections & Earnings Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={collectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis yAxisId="left" stroke="#6b7280" />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} 
                      formatter={(value, name) => {
                        if (name === 'liters') return [`${value} L`, 'Liters'];
                        if (name === 'collections') return [value, 'Collections'];
                        if (name === 'earnings') return [`KSh ${value}`, 'Earnings'];
                        if (name === 'qualityScore') return [value, 'Quality Score'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="liters" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.2} 
                      name="Liters Collected"
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
              </div>
            </CardContent>
          </Card>

          {/* Quality Score Trend */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Quality Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={collectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" domain={[0, 10]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} 
                      formatter={(value) => [value, 'Quality Score']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="qualityScore" 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      dot={{ fill: '#f59e0b', r: 4 }} 
                      activeDot={{ r: 6 }} 
                      name="Quality Score"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quality Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Quality Reports */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Recent Quality Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-blue-100">
                          <Award className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Grade {report.qualityGrade}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(report.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(report.qualityGrade)}`}>
                        {report.qualityGrade}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fat:</span>
                        <span className="font-medium">{report.fatContent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Protein:</span>
                        <span className="font-medium">{report.proteinContent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">SNF:</span>
                        <span className="font-medium">{report.snfContent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Temp:</span>
                        <span className="font-medium">{report.temperature}°C</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Parameters Distribution */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Quality Parameters Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'A+', value: qualityReports.filter(r => r.qualityGrade === 'A+').length },
                        { name: 'A', value: qualityReports.filter(r => r.qualityGrade === 'A').length },
                        { name: 'B', value: qualityReports.filter(r => r.qualityGrade === 'B').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'A+', value: qualityReports.filter(r => r.qualityGrade === 'A+').length },
                        { name: 'A', value: qualityReports.filter(r => r.qualityGrade === 'A').length },
                        { name: 'B', value: qualityReports.filter(r => r.qualityGrade === 'B').length }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.name === 'A+' ? '#10b981' : 
                          entry.name === 'A' ? '#3b82f6' : 
                          '#f59e0b'
                        } />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Reports']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-full bg-green-100">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-bold text-green-800">Excellent Performance</h3>
                </div>
                <p className="text-sm text-green-700">
                  Your milk quality scores are consistently high. Keep up the great work!
                </p>
              </div>
              
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-blue-800">Opportunity</h3>
                </div>
                <p className="text-sm text-blue-700">
                  Consider increasing your daily collection volume to boost earnings.
                </p>
              </div>
              
              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <Star className="h-4 w-4 text-yellow-600" />
                  </div>
                  <h3 className="font-bold text-yellow-800">Quality Focus</h3>
                </div>
                <p className="text-sm text-yellow-700">
                  Maintain consistent temperature control to preserve milk quality.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PerformanceInsightsPage;