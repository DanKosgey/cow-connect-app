import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Eye, 
  Milk, 
  Users, 
  Droplets,
  Award,
  Wallet,
  Beaker,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  FileText
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import useToastNotifications from '@/hooks/useToastNotifications';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useStaffInfo, useApprovedFarmers } from '@/hooks/useStaffData';

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
  notes: string | null;
  farmers: {
    full_name: string;
    id: string;
  } | null;
}

interface Farmer {
  id: string;
  full_name: string;
}

interface QualityTest {
  id: string;
  collection_id: string;
  test_type: string;
  test_result: string;
  test_date: string;
  performed_by: string;
  notes: string | null;
  collection: {
    collection_id: string;
    farmers: {
      full_name: string;
    } | null;
    quality_grade: string;
  } | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function QualityControlManagement() {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  const { farmers, loading: farmersLoading } = useApprovedFarmers();
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [qualityTests, setQualityTests] = useState<QualityTest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Test form state
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [testType, setTestType] = useState('');
  const [testResult, setTestResult] = useState('');
  const [testNotes, setTestNotes] = useState('');
  const [showTestForm, setShowTestForm] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (staffInfo) {
      fetchData();
    }
  }, [staffInfo]);

  useEffect(() => {
    applyFilters();
  }, [collections, searchTerm, selectedFarmer, selectedQuality, dateRange, startDate, endDate]);

  const fetchData = async () => {
    if (!staffInfo?.id) return;

    setLoading(true);
    try {
      // Fetch collections for this staff member
      const { data: collectionsData, error: collectionsError } = await supabase
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
          notes,
          farmers (
            full_name,
            id
          )
        `)
        .eq('staff_id', staffInfo.id)
        .order('collection_date', { ascending: false });

      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);

      // Fetch quality tests
      const { data: testsData, error: testsError } = await supabase
        .from('quality_tests')
        .select(`
          id,
          collection_id,
          test_type,
          test_result,
          test_date,
          performed_by,
          notes,
          collection!collection_id (
            collection_id,
            farmers (
              full_name
            ),
            quality_grade
          )
        `)
        .eq('performed_by', staffInfo.id)
        .order('test_date', { ascending: false });

      if (testsError) throw testsError;
      setQualityTests(testsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showError('Error', error.message || 'Failed to load quality control data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...collections];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(collection => 
        collection.collection_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.farmers?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply farmer filter
    if (selectedFarmer && selectedFarmer !== 'all') {
      filtered = filtered.filter(collection => collection.farmer_id === selectedFarmer);
    }
    
    // Apply quality filter
    if (selectedQuality && selectedQuality !== 'all') {
      filtered = filtered.filter(collection => collection.quality_grade === selectedQuality);
    }
    
    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let fromDate: Date;
      
      switch (dateRange) {
        case 'today':
          fromDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          fromDate = subDays(now, 7);
          break;
        case 'month':
          fromDate = startOfMonth(now);
          break;
        case 'custom':
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(collection => {
              const collectionDate = new Date(collection.collection_date);
              return collectionDate >= start && collectionDate <= end;
            });
          }
          return; // Skip the general date filter for custom range
        default:
          fromDate = subDays(now, 30);
      }
      
      if (dateRange !== 'custom') {
        filtered = filtered.filter(collection => {
          const collectionDate = new Date(collection.collection_date);
          return collectionDate >= fromDate;
        });
      }
    }
    
    setFilteredCollections(filtered);
  };

  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ['Collection ID', 'Farmer Name', 'Date', 'Liters', 'Quality Grade', 'Rate per Liter', 'Total Amount', 'Status'];
      const rows = filteredCollections.map(collection => [
        collection.collection_id,
        collection.farmers?.full_name || 'Unknown Farmer',
        format(new Date(collection.collection_date), 'yyyy-MM-dd HH:mm'),
        collection.liters,
        collection.quality_grade,
        collection.rate_per_liter,
        collection.total_amount,
        collection.status
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `quality_control_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      show({ title: 'Success', description: 'Quality control report exported successfully' });
    } catch (error: any) {
      console.error('Error exporting report:', error);
      showError('Error', 'Failed to export quality control report');
    }
  };

  const handleAddTest = (collection: Collection) => {
    setSelectedCollection(collection);
    setShowTestForm(true);
  };

  const submitTest = async () => {
    if (!selectedCollection || !testType || !testResult || !staffInfo?.id) {
      showError('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('quality_tests')
        .insert({
          collection_id: selectedCollection.id,
          test_type: testType,
          test_result: testResult,
          test_date: new Date().toISOString(),
          performed_by: staffInfo.id,
          notes: testNotes
        });

      if (error) throw error;
      
      show({ title: 'Success', description: 'Quality test recorded successfully' });
      setShowTestForm(false);
      resetTestForm();
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error recording test:', error);
      showError('Error', error.message || 'Failed to record quality test');
    }
  };

  const resetTestForm = () => {
    setSelectedCollection(null);
    setTestType('');
    setTestResult('');
    setTestNotes('');
  };

  // Pagination
  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCollections = filteredCollections.slice(startIndex, endIndex);

  // Quality distribution data
  const qualityDistribution = [
    { name: 'A+', value: filteredCollections.filter(c => c.quality_grade === 'A+').length },
    { name: 'A', value: filteredCollections.filter(c => c.quality_grade === 'A').length },
    { name: 'B', value: filteredCollections.filter(c => c.quality_grade === 'B').length },
    { name: 'C', value: filteredCollections.filter(c => c.quality_grade === 'C').length },
  ];

  // Test type distribution
  const testTypeDistribution = [
    { name: 'Fat Content', value: qualityTests.filter(t => t.test_type === 'Fat Content').length },
    { name: 'Protein Content', value: qualityTests.filter(t => t.test_type === 'Protein Content').length },
    { name: 'Lactose Content', value: qualityTests.filter(t => t.test_type === 'Lactose Content').length },
    { name: 'Bacterial Count', value: qualityTests.filter(t => t.test_type === 'Bacterial Count').length },
    { name: 'Somatic Cell Count', value: qualityTests.filter(t => t.test_type === 'Somatic Cell Count').length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quality Control & Testing</h1>
          <p className="text-gray-600 mt-1">
            Manage quality assessments and testing results for milk collections
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Collections</CardTitle>
            <Milk className="h-6 w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {filteredCollections.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Quality Tests</CardTitle>
            <Beaker className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {qualityTests.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Quality Grade</CardTitle>
            <Award className="h-6 w-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {filteredCollections.length > 0 
                ? (filteredCollections.reduce((sum, c) => {
                    const score = c.quality_grade === 'A+' ? 4 : 
                                 c.quality_grade === 'A' ? 3 : 
                                 c.quality_grade === 'B' ? 2 : 1;
                    return sum + score;
                  }, 0) / filteredCollections.length).toFixed(1)
                : '0.0'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Grade</CardTitle>
            <CheckCircle className="h-6 w-6 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {filteredCollections.filter(c => c.quality_grade === 'A+').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">A+ collections</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {qualityDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === 'A+' ? '#10b981' :
                        entry.name === 'A' ? '#3b82f6' :
                        entry.name === 'B' ? '#f59e0b' :
                        '#ef4444'
                      } 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Collections']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Test Type Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Test Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={testTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {testTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Tests']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Farmer Filter */}
            <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
              <SelectTrigger>
                <SelectValue placeholder="Select farmer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Farmers</SelectItem>
                {farmers.filter(farmer => farmer.id && farmer.id.trim() !== '').map(farmer => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.profiles.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quality Filter */}
            <Select value={selectedQuality} onValueChange={setSelectedQuality}>
              <SelectTrigger>
                <SelectValue placeholder="Quality grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2 col-span-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5" />
            Milk Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Collection ID</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Farmer</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Liters</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Quality</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentCollections.map((collection) => (
                  <tr key={collection.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm font-medium">{collection.collection_id}</td>
                    <td className="p-3 text-sm">{collection.farmers?.full_name || 'Unknown Farmer'}</td>
                    <td className="p-3 text-sm">{format(new Date(collection.collection_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 text-sm">{collection.liters}L</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        collection.quality_grade === 'A+' ? 'default' :
                        collection.quality_grade === 'A' ? 'secondary' :
                        collection.quality_grade === 'B' ? 'outline' : 'destructive'
                      }>
                        {collection.quality_grade}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">KSh {collection.total_amount?.toFixed(2)}</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        collection.status === 'Collected' ? 'default' :
                        collection.status === 'Verified' ? 'secondary' :
                        collection.status === 'Paid' ? 'outline' : 'destructive'
                      }>
                        {collection.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAddTest(collection)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/staff/collections/history`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {currentCollections.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      No collections found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCollections.length)} of {filteredCollections.length} collections
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quality Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Collection ID</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Farmer</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Test Type</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Result</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {qualityTests.slice(0, 10).map((test) => (
                  <tr key={test.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">{test.collection?.collection_id || 'N/A'}</td>
                    <td className="p-3 text-sm">{test.collection?.farmers?.full_name || 'Unknown Farmer'}</td>
                    <td className="p-3 text-sm">{test.test_type}</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        test.test_result === 'Pass' ? 'default' :
                        test.test_result === 'Fail' ? 'destructive' : 'secondary'
                      }>
                        {test.test_result}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{format(new Date(test.test_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 text-sm">{test.notes || 'No notes'}</td>
                  </tr>
                ))}
                {qualityTests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No quality tests recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {qualityTests.length > 10 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Showing 10 of {qualityTests.length} tests. Export to CSV to see all data.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Form Modal */}
      {showTestForm && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Record Quality Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Collection Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Collection ID</p>
                    <p className="font-medium">{selectedCollection.collection_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Farmer</p>
                    <p className="font-medium">{selectedCollection.farmers?.full_name || 'Unknown Farmer'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(selectedCollection.collection_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quality Grade</p>
                    <Badge variant={
                      selectedCollection.quality_grade === 'A+' ? 'default' :
                      selectedCollection.quality_grade === 'A' ? 'secondary' :
                      selectedCollection.quality_grade === 'B' ? 'outline' : 'destructive'
                    }>
                      {selectedCollection.quality_grade}
                    </Badge>
                  </div>
                </div>

                {/* Test Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
                    <Select value={testType} onValueChange={setTestType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fat Content">Fat Content</SelectItem>
                        <SelectItem value="Protein Content">Protein Content</SelectItem>
                        <SelectItem value="Lactose Content">Lactose Content</SelectItem>
                        <SelectItem value="Bacterial Count">Bacterial Count</SelectItem>
                        <SelectItem value="Somatic Cell Count">Somatic Cell Count</SelectItem>
                        <SelectItem value="Antibiotic Residue">Antibiotic Residue</SelectItem>
                        <SelectItem value="pH Level">pH Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Result *</label>
                    <Select value={testResult} onValueChange={setTestResult}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select result" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pass">Pass</SelectItem>
                        <SelectItem value="Fail">Fail</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <Textarea
                      placeholder="Add any additional notes about the test..."
                      value={testNotes}
                      onChange={(e) => setTestNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowTestForm(false);
                      resetTestForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={submitTest}
                    disabled={!testType || !testResult}
                  >
                    Record Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}