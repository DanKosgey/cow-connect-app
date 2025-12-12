import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useStaffInfo } from '@/hooks/useStaffData';
import { useApprovedFarmersData } from '@/hooks/useFarmersData'; // Updated import
import { format, subDays, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus, Download, TestTube, User, Milk, CheckCircle, XCircle, Clock } from 'lucide-react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

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

interface QualityTest {
  id: string;
  collection_id: string;
  test_type: string;
  test_result: string;
  test_date: string;
  performed_by: string;
  notes: string | null;
  collections: {
    collection_id: string;
    farmers: {
      full_name: string;
    } | null;
    quality_grade: string;
  } | null;
}

export default function QualityControlManagement() {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  // Updated to use the new hook
  const { data: farmersData, isLoading: farmersLoading } = useApprovedFarmersData();
  const farmers = farmersData || [];
  
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
        .from('milk_quality_parameters')
        .select(`
          id,
          collection_id,
          test_type,
          test_result,
          test_date,
          performed_by,
          notes,
          collections!milk_quality_parameters_collection_id_fkey (
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
      showError('Error', error.message || 'Failed to export quality control report');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Collected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Collected':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (staffLoading || farmersLoading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quality Control</h1>
          <p className="text-muted-foreground">Manage milk quality tests and collection records</p>
        </div>
        <Button onClick={() => navigate('/collector/dashboard')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
              <SelectTrigger>
                <SelectValue placeholder="Select farmer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Farmers</SelectItem>
                {farmers.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
            
            <div className="flex gap-2">
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
              
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collection Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5" />
            Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton type="table" />
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-12">
              <Milk className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No collections found</h3>
              <p className="text-gray-500">Try adjusting your filters to see more results</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Collection ID</th>
                    <th className="text-left py-3 px-4">Farmer</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Liters</th>
                    <th className="text-left py-3 px-4">Quality</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollections.map((collection) => (
                    <tr key={collection.id} className="border-b hover:bg-muted">
                      <td className="py-3 px-4 font-medium">{collection.collection_id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {collection.farmers?.full_name || 'Unknown Farmer'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {format(new Date(collection.collection_date), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="py-3 px-4">{collection.liters}L</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                          {collection.quality_grade}
                        </span>
                      </td>
                      <td className="py-3 px-4">KSh {collection.total_amount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(collection.status)}
                          <span>{collection.status}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCollection(collection);
                            setShowTestForm(true);
                          }}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          Add Test
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Quality Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton type="table" />
          ) : qualityTests.length === 0 ? (
            <div className="text-center py-12">
              <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No quality tests found</h3>
              <p className="text-gray-500">Add tests to collections to see them here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Test ID</th>
                    <th className="text-left py-3 px-4">Collection</th>
                    <th className="text-left py-3 px-4">Farmer</th>
                    <th className="text-left py-3 px-4">Test Type</th>
                    <th className="text-left py-3 px-4">Result</th>
                    <th className="text-left py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityTests.map((test) => (
                    <tr key={test.id} className="border-b hover:bg-muted">
                      <td className="py-3 px-4 font-medium">{test.id.substring(0, 8)}...</td>
                      <td className="py-3 px-4">{test.collections?.collection_id || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {test.collections?.farmers?.full_name || 'Unknown Farmer'}
                      </td>
                      <td className="py-3 px-4">{test.test_type}</td>
                      <td className="py-3 px-4">{test.test_result}</td>
                      <td className="py-3 px-4">
                        {format(new Date(test.test_date), 'MMM dd, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Form Modal */}
      {showTestForm && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Add Quality Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Collection</label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{selectedCollection.collection_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCollection.farmers?.full_name || 'Unknown Farmer'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Test Type</label>
                  <Input
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    placeholder="e.g., Fat Content, Protein Content"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Test Result</label>
                  <Input
                    value={testResult}
                    onChange={(e) => setTestResult(e.target.value)}
                    placeholder="e.g., 3.5%, 2.8%"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Textarea
                    value={testNotes}
                    onChange={(e) => setTestNotes(e.target.value)}
                    placeholder="Additional notes about the test..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTestForm(false);
                      setSelectedCollection(null);
                      setTestType('');
                      setTestResult('');
                      setTestNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('milk_quality_parameters')
                          .insert({
                            collection_id: selectedCollection.id,
                            test_type: testType,
                            test_result: testResult,
                            test_date: new Date().toISOString(),
                            performed_by: staffInfo?.id,
                            notes: testNotes
                          });
                        
                        if (error) throw error;
                        
                        show({ title: 'Success', description: 'Quality test added successfully' });
                        setShowTestForm(false);
                        setSelectedCollection(null);
                        setTestType('');
                        setTestResult('');
                        setTestNotes('');
                        fetchData(); // Refresh data
                      } catch (error: any) {
                        console.error('Error adding test:', error);
                        showError('Error', error.message || 'Failed to add quality test');
                      }
                    }}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Add Test
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