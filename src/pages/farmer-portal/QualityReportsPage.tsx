import { useState, useEffect } from "react";
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
import { qualityReportService, QualityReportWithCollection, ServiceResponse } from "@/services/quality-report-service";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";

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

// Update the interface to match what we're actually receiving
interface FormattedQualityReport extends QualityReport {}

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

        // Fetch quality data for the farmer using the service
        const qualityResponse = await qualityReportService.getReportsByFarmer(farmerData.id);
        
        if (!qualityResponse.success) {
          toast.error('Error', qualityResponse.error || 'Failed to load quality reports');
          setReports([]);
          setFilteredReports([]);
          return;
        }

        // Convert service data to UI format
        const formattedReports: QualityReport[] = (qualityResponse.data || []).map(report => {
          // Determine status based on quality parameters
          let status: 'passed' | 'failed' | 'pending' = 'pending';
          if (report.fat_content && report.protein_content && report.bacterial_count !== null) {
            // Simple logic: if bacterial count is low and fat/protein are reasonable, it passes
            status = (report.bacterial_count < 10000 && report.fat_content > 2.5 && report.protein_content > 2.0) 
              ? 'passed' 
              : 'failed';
          }
          
          return {
            id: report.id.toString(),
            collectionId: report.collection?.id || 'N/A',
            collectionDate: report.collection?.collection_date || new Date().toISOString(),
            fatContent: report.fat_content || 0,
            proteinContent: report.protein_content || 0,
            snfContent: report.snf_content || 0,
            acidityLevel: report.acidity_level || 0,
            temperature: report.temperature || 0,
            bacterialCount: report.bacterial_count || 0,
            qualityGrade: report.collection?.quality_grade || 'N/A',
            status: status,
            notes: `Report for collection on ${report.collection?.collection_date ? new Date(report.collection.collection_date).toLocaleDateString() : 'unknown date'}`
          };
        });

        setReports(formattedReports);
        setFilteredReports(formattedReports);

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
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Quality Reports"
        description="View and analyze your milk quality test results"
        actions={
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportQualityReports('csv')}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportQualityReports('json')}>
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        }
      />

      {/* Quality Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Tests"
          value={reports.length}
          description="Quality tests conducted"
          icon={<Beaker className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Passed Tests"
          value={reports.filter(r => r.status === 'passed').length}
          description="Tests that passed quality standards"
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Failed Tests"
          value={reports.filter(r => r.status === 'failed').length}
          description="Tests that failed quality standards"
          icon={<XCircle className="h-6 w-6 text-red-600" />}
          color="bg-red-100"
        />
        <StatCard
          title="Avg. Fat Content"
          value={`${reports.length > 0 ? (reports.reduce((sum, r) => sum + r.fatContent, 0) / reports.length).toFixed(2) : "0.00"}%`}
          description="Average fat content in milk"
          icon={<Droplets className="h-6 w-6 text-purple-600" />}
          color="bg-purple-100"
        />
      </div>

      {/* Quality Distribution Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Quality Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="qualityGrade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="fatContent" fill="#8884d8" name="Fat Content (%)" />
                <Bar dataKey="proteinContent" fill="#82ca9d" name="Protein Content (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by collection ID or grade..."
          >
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">All Grades</option>
                {Array.from(new Set(reports.map(r => r.qualityGrade))).map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </FilterBar>
        </CardContent>
      </Card>

      {/* Quality Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            Quality Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Collection ID", "Date", "Fat (%)", "Protein (%)", "SNF (%)", "Acidity", "Temperature", "Bacterial Count", "Grade", "Status"]}
            data={filteredReports}
            renderRow={(report) => (
              <tr key={report.id} className="hover:bg-muted/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {report.collectionId}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(report.collectionDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.fatContent.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.proteinContent.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.snfContent.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.acidityLevel.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.temperature.toFixed(1)}°C
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.bacterialCount.toLocaleString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {report.qualityGrade}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                    {getStatusIcon(report.status)}
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                </td>
              </tr>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityReportsPage;