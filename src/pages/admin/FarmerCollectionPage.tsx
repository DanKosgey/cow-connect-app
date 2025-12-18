import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Download, 
  Calendar,
  User,
  Filter
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useRealtimeAllCollections } from '@/hooks/useRealtimeCollections';
import { useQuery } from '@tanstack/react-query';
import { CACHE_KEYS } from '@/services/cache-utils';

interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  farmers?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
  staff?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface Farmer {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

const FarmerCollectionPage = () => {
  const toast = useToastNotifications();
  const { collections: realtimeCollections, isLoading: realtimeLoading } = useRealtimeAllCollections();
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoadingFarmers, setIsLoadingFarmers] = useState(true);

  // Fetch farmers for the dropdown
  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const { data, error } = await supabase
          .from('farmers')
          .select('id, user_id, profiles (full_name)')
          .eq('kyc_status', 'approved');

        if (error) throw error;
        
        // Flatten the data structure to make it easier to work with
        const flattenedData = data?.map(farmer => ({
          ...farmer,
          profiles: Array.isArray(farmer.profiles) ? farmer.profiles[0] : farmer.profiles
        })) || [];
        
        // Sort farmers by name
        const sortedFarmers = flattenedData.sort((a, b) => {
          const nameA = a.profiles?.full_name?.toLowerCase() || '';
          const nameB = b.profiles?.full_name?.toLowerCase() || '';
          return nameA.localeCompare(nameB);
        });
        
        setFarmers(sortedFarmers);
      } catch (error) {
        console.error('Error fetching farmers:', error);
        toast.error('Failed to load farmers');
      } finally {
        setIsLoadingFarmers(false);
      }
    };

    fetchFarmers();
  }, [toast]);

  // Fetch collections with farmer and staff data
  const { data: collectionsData, isLoading: collectionsLoading, refetch } = useQuery({
    queryKey: [CACHE_KEYS.ADMIN_COLLECTIONS],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          farmers (
            id,
            user_id,
            profiles (
              full_name,
              phone
            )
          ),
          staff (
            id,
            profiles (
              full_name
            )
          )
        `)
        .order('collection_date', { ascending: false })
        .limit(50); // Limit to last 50 collections

      if (error) throw error;
      
      // Flatten the data structure
      const flattenedData = data?.map(collection => ({
        ...collection,
        farmers: Array.isArray(collection.farmers) ? collection.farmers[0] : collection.farmers,
        staff: Array.isArray(collection.staff) ? collection.staff[0] : collection.staff
      })) || [];
      
      return flattenedData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Combine collections from both sources
  const allCollections = useMemo(() => {
    // Prefer realtime data if available, otherwise use fetched data
    return realtimeCollections.length > 0 ? realtimeCollections : (collectionsData || []);
  }, [realtimeCollections, collectionsData]);

  // Filter collections based on search term, farmer, and date range
  const filteredCollections = useMemo(() => {
    let result = [...allCollections];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(collection =>
        collection.farmers?.profiles?.full_name?.toLowerCase().includes(term) ||
        collection.collection_id?.toLowerCase().includes(term) ||
        collection.staff?.profiles?.full_name?.toLowerCase().includes(term)
      );
    }
    
    // Apply farmer filter
    if (selectedFarmer !== 'all') {
      result = result.filter(collection => collection.farmer_id === selectedFarmer);
    }
    
    // Apply date range filter
    if (startDate) {
      result = result.filter(collection => new Date(collection.collection_date) >= new Date(startDate));
    }
    
    if (endDate) {
      // Set end time to end of day
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      result = result.filter(collection => new Date(collection.collection_date) <= endDateTime);
    }
    
    return result;
  }, [allCollections, searchTerm, selectedFarmer, startDate, endDate]);

  // Get status variant for badges
  const getStatusVariant = (status: string) => {
    const variants: Record<string, any> = {
      'Paid': 'default',
      'Verified': 'secondary',
      'Collected': 'outline',
      'Cancelled': 'destructive'
    };
    return variants[status] || 'outline';
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredCollections.length === 0) {
      toast.show({ title: 'Warning', description: 'No data to export' });
      return;
    }

    const csvData = filteredCollections.map(collection => [
      collection.collection_id,
      new Date(collection.collection_date).toLocaleDateString(),
      collection.farmers?.profiles?.full_name || 'N/A',
      collection.staff?.profiles?.full_name || 'N/A',
      collection.liters,
      collection.rate_per_liter,
      collection.total_amount,
      collection.status,
      collection.gps_latitude || 'N/A',
      collection.gps_longitude || 'N/A'
    ]);

    const headers = ['Collection ID', 'Date', 'Farmer', 'Staff', 'Liters',
      'Rate per Liter', 'Total Amount', 'Status', 'GPS Latitude', 'GPS Longitude'];
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmer_collections_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Collections exported successfully');
  };

  // Loading state
  const isLoading = realtimeLoading || collectionsLoading || isLoadingFarmers;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmer Collections</h1>
          <p className="text-gray-600">View and manage milk collections for farmers</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search by farmer name or collection ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2"
                />
              </div>

              {/* Farmer Filter */}
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <select
                    value={selectedFarmer}
                    onChange={(e) => setSelectedFarmer(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    disabled={isLoadingFarmers}
                  >
                    <option value="all">All Farmers</option>
                    {farmers.map(farmer => (
                      <option key={farmer.id} value={farmer.id}>
                        {farmer.profiles?.full_name || 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedFarmer('all');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </Button>
              <Button onClick={exportToCSV} disabled={filteredCollections.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Collections Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Collection Records</CardTitle>
            <div className="text-sm text-gray-500">
              Showing {filteredCollections.length} of {allCollections.length} collections
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No collections found matching your criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Liters</TableHead>
                      <TableHead>Rate/L</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollections.map((collection) => (
                      <TableRow key={collection.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{collection.collection_id}</TableCell>
                        <TableCell>{format(new Date(collection.collection_date), 'MMM dd, yyyy HH:mm')}</TableCell>
                        <TableCell>{collection.farmers?.profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>{collection.staff?.profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>{collection.liters}L</TableCell>
                        <TableCell>{formatCurrency(collection.rate_per_liter)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(collection.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(collection.status)}>
                            {collection.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerCollectionPage;