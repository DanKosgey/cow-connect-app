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
  AlertCircle
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { format } from 'date-fns';
import { useFarmerDirectory, useFarmerCollectionHistory } from '@/hooks/useStaffData';

export default function EnhancedFarmerDirectory() {
  const { show, error: showError } = useToastNotifications();
  const { farmers, loading: farmersLoading } = useFarmerDirectory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState<string | null>(null);
  const { collections: collectionHistory, loading: collectionHistoryLoading } = useFarmerCollectionHistory(selectedFarmer);

  useEffect(() => {
    // Data is now loaded through the useFarmerDirectory hook
  }, []);

  const loadCollectionHistory = async (farmerId: string) => {
    // This is now handled by the useFarmerCollectionHistory hook
    // The collection history will automatically update when selectedFarmer changes
    console.log('Collection history will be loaded by the hook for farmer:', farmerId);
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

  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-green-100 text-green-800';
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFarmers = farmers.filter(farmer =>
    farmer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.national_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.phone_number.includes(searchTerm)
  );

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
            {filteredFarmers.length} farmers
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by name, ID, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full"
        />
      </div>

      {/* Farmer List */}
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-3">
          {filteredFarmers.map((farmer) => (
            <Card
              key={farmer.id}
              className={`transition-colors cursor-pointer ${
                selectedFarmer === farmer.id ? 'bg-muted border-primary' : ''
              }`}
              onClick={() => {
                setSelectedFarmer(selectedFarmer === farmer.id ? null : farmer.id);
                if (farmer.id !== selectedFarmer) {
                  loadCollectionHistory(farmer.id);
                }
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
                        <span className="font-medium">National ID:</span> {farmer.national_id}
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
                        <div className="text-lg font-bold">{(farmer.stats?.avg_quality_score || 0).toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Quality</div>
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
                      <DollarSign className="w-3 h-3 mr-1" />
                      KSh {(farmer.stats?.current_month_earnings || 0).toFixed(0)}
                    </Badge>
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
                                <h4 className="font-medium">Quality Metrics</h4>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Avg Quality Score</span>
                                  <span className="font-medium">{(farmer.stats?.avg_quality_score || 0).toFixed(1)}/10</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">This Month Earnings</span>
                                  <span className="font-medium">KSh {(farmer.stats?.current_month_earnings || 0).toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Last Collection</span>
                                  <span className="font-medium">
                                    {farmer.stats?.last_collection_date
                                      ? format(new Date(farmer.stats.last_collection_date), 'MMM dd')
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
                                  <Badge className={getQualityGradeColor(collection.quality_grade)}>
                                    {collection.quality_grade}
                                  </Badge>
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
                                  <span>{farmer.national_id}</span>
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
                                  <span>{format(new Date(farmer.created_at), 'MMM dd, yyyy')}</span>
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
          
          {filteredFarmers.length === 0 && (
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