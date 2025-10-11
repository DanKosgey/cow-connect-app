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
import { useStaffInfo, useApprovedFarmers } from '@/hooks/useStaffData';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

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

const CollectionHistoryPage = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  const { farmers, loading: farmersLoading } = useApprovedFarmers();
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
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
  const [totalCollections, setTotalCollections] = useState(0);

  useEffect(() => {
    if (staffInfo) {
      fetchData();
    }
  }, [staffInfo, currentPage]);

  useEffect(() => {
    applyFilters();
  }, [collections, searchTerm, selectedFarmer, selectedQuality, dateRange, startDate, endDate]);

  const fetchData = async () => {
    if (!staffInfo?.id) return;

    setLoading(true);
    try {
      // Calculate date ranges
      const now = new Date();
      let from_date: string | undefined;
      let to_date: string | undefined = now.toISOString();

      switch (dateRange) {
        case 'today':
          from_date = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'week':
          from_date = subDays(now, 7).toISOString();
          break;
        case 'month':
          from_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          break;
        case 'custom':
          from_date = startDate ? new Date(startDate).toISOString() : undefined;
          const toDateObj = endDate ? new Date(endDate) : new Date(now);
          toDateObj.setHours(23, 59, 59, 999);
          to_date = toDateObj.toISOString();
          break;
        case 'all':
          from_date = undefined;
          to_date = undefined;
          break;
        default:
          from_date = subDays(now, 30).toISOString();
      }

      // First get total count
      let countQuery = supabase
        .from('collections')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', staffInfo.id);
        
      // Only add date filters if they are defined
      if (from_date) {
        countQuery = countQuery.gte('collection_date', from_date);
      }
      if (to_date) {
        countQuery = countQuery.lte('collection_date', to_date);
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalCollections(count || 0);

      // Then fetch paginated data
      let dataQuery = supabase
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
        .eq('staff_id', staffInfo.id);
        
      // Only add date filters if they are defined
      if (from_date) {
        dataQuery = dataQuery.gte('collection_date', from_date);
      }
      if (to_date) {
        dataQuery = dataQuery.lte('collection_date', to_date);
      }

      const { data: collectionsData, error: collectionsError } = await dataQuery
        .order('collection_date', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      // Log the full error object for better debugging
      console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Provide a more informative error message
      let errorMessage = 'Failed to load collection history';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error_description) {
        errorMessage = error.error_description;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (Object.keys(error).length > 0) {
        // If we have an error object with keys but no message, show its string representation
        errorMessage = `Data fetch error: ${JSON.stringify(error)}`;
      }
      
      showError('Error', errorMessage);
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
    
    show({ title: 'Success', description: 'Collection history exported successfully' });
  };

  // Pagination
  const totalPages = Math.ceil(totalCollections / itemsPerPage);

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Collection History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Collection ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Farmer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quality</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCollections.length > 0 ? (
                  filteredCollections.map((collection) => (
                    <tr key={collection.id} className="hover:bg-muted/50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(collection.collection_date), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {collection.collection_id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {collection.farmers?.full_name || 'Unknown Farmer'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {collection.liters} L
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          collection.quality_grade === 'A+' ? 'bg-green-100 text-green-800' :
                          collection.quality_grade === 'A' ? 'bg-blue-100 text-blue-800' :
                          collection.quality_grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Grade {collection.quality_grade}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        KSh {collection.rate_per_liter?.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        KSh {collection.total_amount?.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          collection.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          collection.status === 'Verified' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {collection.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/staff/collections/${collection.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No collections found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {filteredCollections.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredCollections.length} of {totalCollections} collections
              </p>
              {/* Pagination will be added here */}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Pagination */}
      {totalCollections > itemsPerPage && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                const page = startPage + i;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? 'bg-primary text-primary-foreground' : 'cursor-pointer'}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default CollectionHistoryPage;
