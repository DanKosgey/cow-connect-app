import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Beaker, 
  Download, 
  Filter, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Award,
  Droplets,
  Thermometer,
  Scale
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { format, subDays } from 'date-fns';
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";

interface QualityReport {
  id: string;
  collectionId: string;
  collectionDate: string;
  fatContent: number;
  proteinContent: number;
  snfContent: number;
  acidityLevel: number;
  temperature: number;
  bacterialCount: number;
  qualityGrade: string;
  status: 'passed' | 'failed' | 'pending';
  notes: string;
}

const QualityReportsPage = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<QualityReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<QualityReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch quality reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch farmer profile
        const { data: farmerData, error: farmerError } = await supabase
          .from('farmers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (farmerError) throw farmerError;
        if (!farmerData) {
          toast.error('Error', 'Farmer profile not found. Please complete your registration.');
          return;
        }

        // Generate mock quality reports
        const mockReports: QualityReport[] = [
          {
            id: '1',
            collectionId: 'COL-20230615-001',
            collectionDate: '2023-06-15',
            fatContent: 4.2,
            proteinContent: 3.5,
            snfContent: 9.1,
            acidityLevel: 6.8,
            temperature: 3.2,
            bacterialCount: 800,
            qualityGrade: 'A+',
            status: 'passed',
            notes: 'Excellent quality with optimal fat and protein content'
          },
          {
            id: '2',
            collectionId: 'COL-20230614-001',
            collectionDate: '2023-06-14',
            fatContent: 3.8,
            proteinContent: 3.2,
            snfContent: 8.7,
            acidityLevel: 7.1,
            temperature: 4.5,
            bacterialCount: 1200,
            qualityGrade: 'A',
            status: 'passed',
            notes: 'Good quality, slightly high temperature'
          },
          {
            id: '3',
            collectionId: 'COL-20230613-001',
            collectionDate: '2023-06-13',
            fatContent: 4.5,
            proteinContent: 3.7,
            snfContent: 9.4,
            acidityLevel: 6.5,
            temperature: 2.8,
            bacterialCount: 500,
            qualityGrade: 'A+',
            status: 'passed',
            notes: 'Outstanding quality with excellent parameters'
          },
          {
            id: '4',
            collectionId: 'COL-20230612-001',
            collectionDate: '2023-06-12',
            fatContent: 3.1,
            proteinContent: 2.9,
            snfContent: 7.8,
            acidityLevel: 8.2,
            temperature: 6.1,
            bacterialCount: 3500,
            qualityGrade: 'B',
            status: 'failed',
            notes: 'Low fat content and high bacterial count'
          },
          {
            id: '5',
            collectionId: 'COL-20230611-001',
            collectionDate: '2023-06-11',
            fatContent: 3.9,
            proteinContent: 3.3,
            snfContent: 8.9,
            acidityLevel: 7.0,
            temperature: 3.8,
            bacterialCount: 1800,
            qualityGrade: 'A',
            status: 'passed',
            notes: 'Consistent quality with good parameters'
          },
          {
            id: '6',
            collectionId: 'COL-20230610-001',
            collectionDate: '2023-06-10',
            fatContent: 2.8,
            proteinContent: 2.7,
            snfContent: 7.2,
            acidityLevel: 9.1,
            temperature: 7.5,
            bacterialCount: 5200,
            qualityGrade: 'C',
            status: 'failed',
            notes: 'Poor quality with multiple parameter issues'
          }
        ];

        setReports(mockReports);
        setFilteredReports(mockReports);

      } catch (err) {
        console.error('Error fetching reports:', err);
        toast.error('Error', 'Failed to load quality reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Filter reports
  useEffect(() => {
    let result = reports;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(report => 
        report.collectionId.toLowerCase().includes(term) ||
        report.qualityGrade.toLowerCase().includes(term)
      );
    }
    
    if (dateFilter) {
      result = result.filter(report => report.collectionDate === dateFilter);
    }
    
    if (gradeFilter !== 'all') {
      result = result.filter(report => report.qualityGrade === gradeFilter);
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(report => report.status === statusFilter);
    }
    
    setFilteredReports(result);
  }, [searchTerm, dateFilter, gradeFilter, statusFilter, reports]);

  const exportQualityReports = (format: 'csv' | 'json') => {
    try {
      const exportData = filteredReports.map(report => ({
        collectionId: report.collectionId,
        collectionDate: new Date(report.collectionDate).toLocaleDateString(),
        fatContent: report.fatContent,
        proteinContent: report.proteinContent,
        snfContent: report.snfContent,
        acidityLevel: report.acidityLevel,
        temperature: report.temperature,
        bacterialCount: report.bacterialCount,
        qualityGrade: report.qualityGrade,
        status: report.status,
        notes: report.notes
      }));
      
      if (format === 'csv') {
        exportToCSV(exportData, 'quality-reports');
        toast.success('Success', 'Quality reports exported as CSV');
      } else {
        exportToJSON(exportData, 'quality-reports');
        toast.success('Success', 'Quality reports exported as JSON');
      }
    } catch (err) {
      console.error('Error exporting quality reports:', err);
      toast.error('Error', 'Failed to export quality reports');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
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

  // Prepare data for charts
  const qualityDistribution = [
    { name: 'A+', value: filteredReports.filter(r => r.qualityGrade === 'A+').length },
    { name: 'A', value: filteredReports.filter(r => r.qualityGrade === 'A').length },
    { name: 'B', value: filteredReports.filter(r => r.qualityGrade === 'B').length },
    { name: 'C', value: filteredReports.filter(r => r.qualityGrade === 'C').length }
  ];

  const parameterTrends = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateString = format(date, 'MMM dd');
    const dayReports = filteredReports.filter(r => 
      format(new Date(r.collectionDate), 'MMM dd') === dateString
    );
    
    const avgFat = dayReports.length > 0 
      ? dayReports.reduce((sum, r) => sum + r.fatContent, 0) / dayReports.length
      : 0;
      
    const avgProtein = dayReports.length > 0 
      ? dayReports.reduce((sum, r) => sum + r.proteinContent, 0) / dayReports.length
      : 0;
    
    parameterTrends.push({
      date: dateString,
      fat: parseFloat(avgFat.toFixed(1)),
      protein: parseFloat(avgProtein.toFixed(1))
    });
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
  const PARAMETER_COLORS = ['#10B981', '#3B82F6'];

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
            <h1 className="text-3xl font-bold text-gray-900">Quality Reports</h1>
            <p className="text-gray-600 mt-2">Monitor and analyze your milk quality parameters</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button onClick={() => exportQualityReports('csv')} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button onClick={() => exportQualityReports('json')} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by collection ID or grade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                >
                  <option value="all">All Grades</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <select
                  className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('');
                  setGradeFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold">{filteredReports.length}</p>
                </div>
                <Beaker className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Passed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredReports.filter(r => r.status === 'passed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredReports.filter(r => r.status === 'failed').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Quality</p>
                  <p className="text-2xl font-bold">
                    {filteredReports.length > 0 
                      ? (filteredReports.reduce((sum, r) => {
                          const score = r.qualityGrade === 'A+' ? 10 : 
                                       r.qualityGrade === 'A' ? 8 : 
                                       r.qualityGrade === 'B' ? 6 : 4;
                          return sum + score;
                        }, 0) / filteredReports.length).toFixed(1)
                      : '0.0'}
                  </p>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Quality Distribution */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5 text-primary" />
                Quality Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {qualityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Parameter Trends */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Parameter Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={parameterTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="fat" 
                      stroke={PARAMETER_COLORS[0]} 
                      strokeWidth={2} 
                      dot={{ fill: PARAMETER_COLORS[0], r: 4 }} 
                      activeDot={{ r: 6 }} 
                      name="Fat Content (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="protein" 
                      stroke={PARAMETER_COLORS[1]} 
                      strokeWidth={2} 
                      dot={{ fill: PARAMETER_COLORS[1], r: 4 }} 
                      activeDot={{ r: 6 }} 
                      name="Protein Content (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-primary" />
              Quality Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4">Collection ID</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Quality Grade</th>
                      <th className="text-left p-4">Fat (%)</th>
                      <th className="text-left p-4">Protein (%)</th>
                      <th className="text-left p-4">Temperature (°C)</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => (
                      <tr key={report.id} className="border-t hover:bg-muted/50">
                        <td className="p-4 font-medium">{report.collectionId}</td>
                        <td className="p-4">{format(new Date(report.collectionDate), 'MMM d, yyyy')}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getQualityGradeColor(report.qualityGrade)}`}>
                            {report.qualityGrade}
                          </span>
                        </td>
                        <td className="p-4">{report.fatContent}%</td>
                        <td className="p-4">{report.proteinContent}%</td>
                        <td className="p-4">{report.temperature}°C</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(report.status)}
                            <span className={getStatusColor(report.status)}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Beaker className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default QualityReportsPage;