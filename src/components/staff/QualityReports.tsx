import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Beaker, 
  Download, 
  Filter, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface QualityReport {
  id: string;
  collectionId: string;
  farmerName: string;
  collectionDate: string;
  fatContent: number;
  proteinContent: number;
  snfContent: number;
  acidityLevel: number;
  temperature: number;
  bacterialCount: number;
  qualityGrade: string;
  status: 'passed' | 'failed' | 'pending';
}

const QualityReports = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<QualityReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<QualityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, dateRange, gradeFilter, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Mock data - in a real implementation, this would fetch from Supabase
      const mockReports: QualityReport[] = [
        {
          id: '1',
          collectionId: 'COL-20230615-001',
          farmerName: 'John Smith',
          collectionDate: '2023-06-15',
          fatContent: 4.2,
          proteinContent: 3.5,
          snfContent: 9.1,
          acidityLevel: 6.8,
          temperature: 3.2,
          bacterialCount: 800,
          qualityGrade: 'A+',
          status: 'passed'
        },
        {
          id: '2',
          collectionId: 'COL-20230615-002',
          farmerName: 'Jane Doe',
          collectionDate: '2023-06-15',
          fatContent: 3.8,
          proteinContent: 3.2,
          snfContent: 8.7,
          acidityLevel: 7.1,
          temperature: 4.5,
          bacterialCount: 1200,
          qualityGrade: 'A',
          status: 'passed'
        },
        {
          id: '3',
          collectionId: 'COL-20230614-001',
          farmerName: 'Robert Johnson',
          collectionDate: '2023-06-14',
          fatContent: 3.1,
          proteinContent: 2.9,
          snfContent: 7.8,
          acidityLevel: 8.2,
          temperature: 6.1,
          bacterialCount: 3500,
          qualityGrade: 'B',
          status: 'failed'
        },
        {
          id: '4',
          collectionId: 'COL-20230614-002',
          farmerName: 'Emily Wilson',
          collectionDate: '2023-06-14',
          fatContent: 4.5,
          proteinContent: 3.7,
          snfContent: 9.4,
          acidityLevel: 6.5,
          temperature: 2.8,
          bacterialCount: 500,
          qualityGrade: 'A+',
          status: 'passed'
        },
        {
          id: '5',
          collectionId: 'COL-20230613-001',
          farmerName: 'Michael Brown',
          collectionDate: '2023-06-13',
          fatContent: 3.9,
          proteinContent: 3.3,
          snfContent: 8.9,
          acidityLevel: 7.0,
          temperature: 3.8,
          bacterialCount: 1800,
          qualityGrade: 'A',
          status: 'passed'
        },
        {
          id: '6',
          collectionId: 'COL-20230613-002',
          farmerName: 'Sarah Davis',
          collectionDate: '2023-06-13',
          fatContent: 2.8,
          proteinContent: 2.7,
          snfContent: 7.2,
          acidityLevel: 9.1,
          temperature: 7.5,
          bacterialCount: 5200,
          qualityGrade: 'C',
          status: 'failed'
        }
      ];
      
      setReports(mockReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load quality reports",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let result = reports;
    
    if (dateRange.start && dateRange.end) {
      result = result.filter(report => 
        report.collectionDate >= dateRange.start && report.collectionDate <= dateRange.end
      );
    }
    
    if (gradeFilter !== 'all') {
      result = result.filter(report => report.qualityGrade === gradeFilter);
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(report => report.status === statusFilter);
    }
    
    setFilteredReports(result);
  };

  const exportToCSV = () => {
    toast({
      title: "Export Started",
      description: "Quality reports export in progress...",
      variant: "success"
    });
    
    // In a real implementation, this would generate and download a CSV file
    console.log('Exporting quality reports to CSV');
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

  const statusDistribution = [
    { name: 'Passed', value: filteredReports.filter(r => r.status === 'passed').length },
    { name: 'Failed', value: filteredReports.filter(r => r.status === 'failed').length },
    { name: 'Pending', value: filteredReports.filter(r => r.status === 'pending').length }
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];
  const STATUS_COLORS = ['#10B981', '#EF4444', '#F59E0B'];

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
          <h1 className="text-3xl font-bold">Quality Reports</h1>
          <p className="text-muted-foreground">Monitor and analyze milk quality parameters</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <input
              type="date"
              className="w-full border rounded-md p-2"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">End Date</label>
            <input
              type="date"
              className="w-full border rounded-md p-2"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Quality Grade</label>
            <select
              className="w-full border rounded-md p-2"
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
            <label className="text-sm font-medium mb-1 block">Status</label>
            <select
              className="w-full border rounded-md p-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{filteredReports.length}</p>
              </div>
              <Beaker className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Passed</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredReports.filter(r => r.status === 'passed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredReports.filter(r => r.status === 'failed').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Quality</p>
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
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
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
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
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
                    <th className="text-left p-4">Farmer</th>
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Quality Grade</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{report.collectionId}</td>
                      <td className="p-4">{report.farmerName}</td>
                      <td className="p-4">{report.collectionDate}</td>
                      <td className="p-4">
                        <Badge className={getQualityGradeColor(report.qualityGrade)}>
                          {report.qualityGrade}
                        </Badge>
                      </td>
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
            <div className="text-center py-8">
              <Beaker className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium mb-1">No reports found</h3>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityReports;