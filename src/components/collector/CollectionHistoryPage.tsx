import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useStaffInfo } from '@/hooks/useStaffData';
import { useApprovedFarmersData } from '@/hooks/useFarmersData'; // Updated import
import { format, subDays, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Calendar, Download, User, Milk, CheckCircle, XCircle, Clock } from 'lucide-react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { FarmerDataDiagnostics } from './FarmerDataDiagnostics';

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

export default function CollectionHistoryPage() {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  // Updated to use the new hook
  const { data: farmersData, isLoading: farmersLoading } = useApprovedFarmersData();
  const farmers = farmersData || [];
  
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
      link.setAttribute('download', `collection_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      show({ title: 'Success', description: 'Collection history exported successfully' });
    } catch (error: any) {
      console.error('Error exporting report:', error);
      showError('Error', error.message || 'Failed to export collection history');
    }
  };

  const getStatusIcon = (status: string) => {
    // Simplified status icons for collectors - hide approval details
    switch (status) {
      case 'Collected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
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

  const totalPages = Math.ceil(totalCollections / itemsPerPage);

  if (staffLoading || farmersLoading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Collection History</h1>
          <p className="text-muted-foreground">View and manage milk collection records</p>
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
            <>
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
                            <span>Recorded</span> {/* Hide actual status from collectors */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCollections)} of {totalCollections} collections
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}