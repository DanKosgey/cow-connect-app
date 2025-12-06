import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Phone, 
  MessageSquare, 
  History, 
  Calendar, 
  DollarSign, 
  Search,
  User,
  MapPin,
  Milk,
  TrendingUp,
  AlertCircle,
  Filter,
  Clock
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { format } from 'date-fns';
import { useApprovedFarmersData, useAllFarmers } from '@/hooks/useFarmersData';
import { useFarmerCollectionHistory } from '@/hooks/useStaffData';

interface FarmerStats {
  total_collections?: number;
  total_liters?: number;
  avg_quality_score?: number;
  current_month_earnings?: number;
  current_month_liters?: number;
  last_collection_date?: string;
}

interface Farmer {
  id: string;
  registration_number: string;
  full_name: string;
  phone_number: string;
  kyc_status: string;
  national_id?: string;
  farm_location?: string;
  address?: string;
  created_at?: string;
  stats?: FarmerStats;
}

interface Collection {
  id: string;
  collection_id: string;
  liters: number;
  total_amount: number;
  collection_date: string;
  status: string;
  farmers?: {
    full_name: string;
  };
}

export default function EnhancedFarmerDirectory() {
  const { show, error: showError } = useToastNotifications();
  const { data: farmersData, isLoading: farmersLoading } = useApprovedFarmersData();
  const farmers: Farmer[] = farmersData || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'collections' | 'volume'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'high-volume' | 'recent'>('all');
  const { collections: collectionHistory, loading: collectionHistoryLoading } = useFarmerCollectionHistory(selectedFarmer);
  const [recentCollections, setRecentCollections] = useState<Collection[]>([]);

  useEffect(() => {
    fetchRecentCollections();
  }, []);

  const fetchRecentCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          liters,
          total_amount,
          collection_date,
          status,
          farmer_id,
          farmers!inner (full_name)
        `)
        .order('collection_date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent collections:', error);
        // Try a simpler query without the join
        const { data: simpleData, error: simpleError } = await supabase
          .from('collections')
          .select(`
            id,
            collection_id,
            liters,
            total_amount,
            collection_date,
            status,
            farmer_id
          `)
          .order('collection_date', { ascending: false })
          .limit(5);
        
        if (simpleError) throw simpleError;
        
        // Fetch farmer names separately
        const farmerIds = simpleData?.map(c => c.farmer_id).filter(Boolean) || [];
        if (farmerIds.length > 0) {
          const { data: farmersData, error: farmersError } = await supabase
            .from('farmers')
            .select('id, full_name')
            .in('id', farmerIds);
          
          if (!farmersError && farmersData) {
            const farmersMap = farmersData.reduce((acc, farmer) => {
              acc[farmer.id] = farmer.full_name;
              return acc;
            }, {} as Record<string, string>);
            
            const collectionsWithData = simpleData?.map(collection => ({
              ...collection,
              farmers: { full_name: farmersMap[collection.farmer_id] || 'Unknown Farmer' }
            })) || [];
            
            setRecentCollections(collectionsWithData);
          } else {
            setRecentCollections(simpleData || []);
          }
        } else {
          setRecentCollections(simpleData || []);
        }
      } else {
        setRecentCollections(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching recent collections:', error);
      showError('Error', 'Failed to load recent collections');
      setRecentCollections([]); // Set empty array on error
    }
  };

  const handleContact = (type: 'call' | 'sms', phoneNumber: string) => {
    const url = type === 'call' ? `tel:${phoneNumber}` : `sms:${phoneNumber}`;
    window.open(url, '_blank');
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const sortAndFilterFarmers = () => {
    let result: Farmer[] = [...farmers];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(farmer =>
        farmer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (farmer.national_id && farmer.national_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        farmer.phone_number.includes(searchTerm)
      );
    }
    
    // Apply additional filters
    if (filterBy === 'high-volume') {
      result = result.filter(farmer => (farmer.stats?.total_liters || 0) > 1000);
    } else if (filterBy === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(farmer => {
        if (!farmer.stats?.last_collection_date) return false;
        const lastCollection = new Date(farmer.stats.last_collection_date);
        return lastCollection >= thirtyDaysAgo;
      });
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      result.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sortBy === 'collections') {
      result.sort((a, b) => (b.stats?.total_collections || 0) - (a.stats?.total_collections || 0));
    } else if (sortBy === 'volume') {
      result.sort((a, b) => (b.stats?.total_liters || 0) - (a.stats?.total_liters || 0));
    }
    
    return result;
  };

  const filteredAndSortedFarmers = sortAndFilterFarmers();

  if (farmersLoading) {
    return <LoadingSkeleton type="list" />;
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Farmer Directory</h1>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedFarmers.length} farmers
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, ID, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={filterBy === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterBy('all')}
          >
            All Farmers
          </Button>
          <Button 
            variant={filterBy === 'high-volume' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterBy('high-volume')}
          >
            High Volume
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={sortBy === 'name' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSortBy('name')}
          >
            Sort by Name
          </Button>
          <Button 
            variant={sortBy === 'volume' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSortBy('volume')}
          >
            Sort by Volume
          </Button>
        </div>
      </div>

      {/* Recent Collections Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentCollections.length > 0 ? (
            <div className="space-y-3">
              {recentCollections.map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">
                      {(collection as any).farmers?.full_name || 'Unknown Farmer'} - {collection.collection_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(collection.collection_date), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{collection.liters}L</p>
                    <p className="text-sm text-muted-foreground">KSh {collection.total_amount.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No recent collections found</p>
          )}
        </CardContent>
      </Card>

      {/* Farmer List */}
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-3">
          {filteredAndSortedFarmers.map((farmer) => (
            <Card
              key={farmer.id}
              className={`transition-colors cursor-pointer ${
                selectedFarmer === farmer.id ? 'bg-muted border-primary' : ''
              }`}
              onClick={() => {
                setSelectedFarmer(selectedFarmer === farmer.id ? null : farmer.id);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{farmer.full_name}</h3>
                      <Badge variant={getKycStatusColor(farmer.kyc_status)}>
                        {farmer.kyc_status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">ID:</span> {farmer.id}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {farmer.phone_number}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {farmer.farm_location || 'Location not set'}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">National ID:</span> {farmer.national_id || 'N/A'}
                      </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-lg font-bold">{farmer.stats?.total_collections || 0}</div>
                        <div className="text-xs text-muted-foreground">Collections</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-lg font-bold">{(farmer.stats?.total_liters || 0).toFixed(0)}L</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-lg font-bold">KSh {(farmer.stats?.current_month_earnings || 0).toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">This Month</div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContact('call', farmer.phone_number);
                        }}
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContact('sms', farmer.phone_number);
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        SMS
                      </Button>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline">
                      <Milk className="w-3 h-3 mr-1" />
                      {(farmer.stats?.current_month_liters || 0).toFixed(0)}L
                    </Badge>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedFarmer === farmer.id && (
                  <div className="mt-4 pt-4 border-t">
                    <Tabs defaultValue="stats">
                      <TabsList className="w-full">
                        <TabsTrigger value="stats" className="flex-1">Statistics</TabsTrigger>
                        <TabsTrigger value="history" className="flex-1">Collection History</TabsTrigger>
                        <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                      </TabsList>
                      <TabsContent value="stats" className="mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <h4 className="font-medium">Collection Stats</h4>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Total Collections</span>
                                  <span className="font-medium">{farmer.stats?.total_collections || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Total Volume</span>
                                  <span className="font-medium">{(farmer.stats?.total_liters || 0).toFixed(1)}L</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">This Month</span>
                                  <span className="font-medium">{(farmer.stats?.current_month_liters || 0).toFixed(1)}L</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Milk className="h-5 w-5 text-primary" />
                                <h4 className="font-medium">Financial Metrics</h4>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">This Month Earnings</span>
                                  <span className="font-medium">KSh {(farmer.stats?.current_month_earnings || 0).toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Last Collection</span>
                                  <span className="font-medium">
                                    {farmer.stats?.last_collection_date
                                      ? format(new Date(farmer.stats.last_collection_date), 'MMM dd, yyyy HH:mm')
                                      : 'None'}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="history" className="mt-4">
                        <div className="space-y-2">
                          {collectionHistoryLoading ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                              <p className="text-muted-foreground mt-2">Loading collection history...</p>
                            </div>
                          ) : collectionHistory.length > 0 ? (
                            collectionHistory.map((collection) => (
                              <div
                                key={collection.id}
                                className="flex items-center justify-between p-3 bg-muted rounded"
                              >
                                <div>
                                  <p className="font-medium">{collection.liters}L</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(collection.collection_date), 'MMM dd, yyyy HH:mm')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium mt-1">
                                    KSh {collection.total_amount.toFixed(0)}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              No collection history available
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="details" className="mt-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Personal Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Full Name</span>
                                  <span>{farmer.full_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Farmer ID</span>
                                  <span>{farmer.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">National ID</span>
                                  <span>{farmer.national_id || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Phone</span>
                                  <span>{farmer.phone_number}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Location Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Address</span>
                                  <span>{farmer.address || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Farm Location</span>
                                  <span>{farmer.farm_location || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Registration Date</span>
                                  <span>
                                    {farmer.created_at 
                                      ? format(new Date(farmer.created_at), 'MMM dd, yyyy') 
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">KYC Status</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant={getKycStatusColor(farmer.kyc_status)}>
                                {farmer.kyc_status.charAt(0).toUpperCase() + farmer.kyc_status.slice(1)}
                              </Badge>
                              {farmer.kyc_status === 'approved' && (
                                <span className="text-sm text-green-600">Farmer is approved for collections</span>
                              )}
                              {farmer.kyc_status === 'pending' && (
                                <span className="text-sm text-yellow-600">KYC verification pending</span>
                              )}
                              {farmer.kyc_status === 'rejected' && (
                                <span className="text-sm text-red-600">KYC verification rejected</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {filteredAndSortedFarmers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p>No farmers found matching your search criteria</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}