import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Wallet
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import useToastNotifications from '@/hooks/useToastNotifications';

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

const CollectionHistoryPage = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [collections, searchTerm, selectedFarmer, selectedQuality, dateRange, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get staff info
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (staffError) throw staffError;
      if (!staffData) throw new Error('Staff record not found');
      
      setStaffId(staffData.id);

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
        .eq('staff_id', staffData.id)
        .order('collection_date', { ascending: false });

      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);

      // Fetch farmers for filter dropdown
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles (
            full_name
          )
        `)
        .eq('kyc_status', 'approved');

      if (farmersError) throw farmersError;
      
      const formattedFarmers = farmersData?.map(farmer => ({
        id: farmer.id,
        full_name: farmer.profiles?.full_name || 'Unknown Farmer'
      })) || [];
      
      setFarmers(formattedFarmers);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showError('Error', error.message || 'Failed to load collection history');
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
    if (selectedFarmer) {
      filtered = filtered.filter(collection => collection.farmer_id === selectedFarmer);
    }
    
    // Apply quality filter
    if (selectedQuality) {
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
        filtered = filtered.filter(collection => 
          new Date(collection.collection_date) >= fromDate
        );
      }
    }
    
    setFilteredCollections(filtered);
    setCurrentPage(1); // Reset to first page when filters change
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Collected': return 'bg-blue-100 text-blue-800';
      case 'Verified': return 'bg-green-100 text-green-800';
      case 'Paid': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToCSV = () => {
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
    link.setAttribute('download', `collection_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    show('Success', 'Collection history exported successfully');
  };

  // Pagination
  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCollections = filteredCollections.slice(startIndex, endIndex);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collection History</h1>
          <p className="text-gray-600 mt-1">
            View and manage all your collection records
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
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
                <SelectItem value="">All Farmers</SelectItem>
                {farmers.map(farmer => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.full_name}
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
                <SelectItem value="">All Grades</SelectItem>
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
            <CardTitle className="text-sm font-medium text-gray-600">Total Liters</CardTitle>
            <Droplets className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {filteredCollections.reduce((sum, c) => sum + (c.liters || 0), 0).toFixed(1)}L
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
            <Wallet className="h-6 w-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              KSh {filteredCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Quality</CardTitle>
            <Award className="h-6 w-6 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {filteredCollections.length > 0 
                ? (filteredCollections.reduce((sum, c) => {
                    const score = c.quality_grade === 'A+' ? 10 : 
                                 c.quality_grade === 'A' ? 8 : 
                                 c.quality_grade === 'B' ? 6 : 4;
                    return sum + score;
                  }, 0) / filteredCollections.length).toFixed(1)
                : '0.0'}/10
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collections Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Collection Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentCollections.length > 0 ? (
            <div className="space-y-4">
              {currentCollections.map((collection) => (
                <div 
                  key={collection.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Milk className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {collection.farmers?.full_name || 'Unknown Farmer'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {collection.collection_id} • {format(new Date(collection.collection_date), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-center">
                      <div className="font-medium">{collection.liters}L</div>
                      <div className="text-xs text-gray-500">Quantity</div>
                    </div>
                    
                    <div className="text-center">
                      <Badge className={getQualityGradeColor(collection.quality_grade || '')}>
                        {collection.quality_grade || 'N/A'}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">Quality</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">KSh {collection.total_amount?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Amount</div>
                    </div>
                    
                    <div className="text-center">
                      <Badge className={getStatusColor(collection.status || '')}>
                        {collection.status || 'N/A'}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">Status</div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => navigate(`/staff/collections/${collection.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-gray-500">
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
            </div>
          ) : (
            <div className="text-center py-12">
              <Milk className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No collections found</h3>
              <p className="text-gray-500">
                {collections.length === 0 
                  ? "You haven't recorded any collections yet." 
                  : "No collections match your current filters."}
              </p>
              <Button 
                className="mt-4"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedFarmer('');
                  setSelectedQuality('');
                  setDateRange('all');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionHistoryPage;