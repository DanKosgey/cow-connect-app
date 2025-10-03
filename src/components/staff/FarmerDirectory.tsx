import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Phone, MessageSquare, History, Calendar, DollarSign } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import type { AssignedFarmer } from '@/types/staff.types';

interface FarmerDetails extends AssignedFarmer {
  payment_status: 'pending' | 'paid';
  availability_status: 'available' | 'unavailable' | 'inactive';
  last_collection_date: string | null;
  last_collection_quantity: number | null;
  total_collections_month: number;
  total_quantity_month: number;
  avg_quality_score: number;
}

export default function FarmerDirectory() {
  const { show, error: showError } = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<FarmerDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState<string | null>(null);
  const [collectionHistory, setCollectionHistory] = useState<any[]>([]);

  useEffect(() => {
    const loadFarmers = async () => {
      try {
        const user = await supabase.auth.getUser();
        if (!user.data.user?.id) throw new Error('Not authenticated');

        // Load assigned farmers with details
        const { data, error } = await supabase
          .from('farmers')
          .select(`
            id,
            registration_number,
            full_name,
            phone_number,
            location,
            status:availability_status,
            payment_stats:farmer_payment_stats!farmer_id(
              payment_status,
              total_pending_amount
            ),
            collection_stats:farmer_collection_stats!farmer_id(
              last_collection_date,
              last_collection_quantity,
              total_collections_month,
              total_quantity_month,
              avg_quality_score
            )
          `)
          .eq('assigned_staff_id', user.data.user.id);

        if (error) throw error;

        const formattedData: FarmerDetails[] = (data || []).map(farmer => ({
          farmer_id: farmer.id,
          registration_number: farmer.registration_number,
          full_name: farmer.full_name,
          phone_number: farmer.phone_number,
          location: farmer.location,
          collection_point_id: '', // Set in route management
          availability_status: farmer.status,
          payment_status: farmer.payment_stats?.payment_status || 'pending',
          last_collection_date: farmer.collection_stats?.last_collection_date,
          last_collection_quantity: farmer.collection_stats?.last_collection_quantity,
          total_collections_month: farmer.collection_stats?.total_collections_month || 0,
          total_quantity_month: farmer.collection_stats?.total_quantity_month || 0,
          avg_quality_score: farmer.collection_stats?.avg_quality_score || 0,
        }));

        setFarmers(formattedData);
      } catch (error: any) {
        console.error('Error loading farmers:', error);
        showError('Error', String(error?.message || 'Failed to load farmers'));
      } finally {
        setLoading(false);
      }
    };

    loadFarmers();
  }, []);

  const loadCollectionHistory = async (farmerId: string) => {
    try {
      const { data, error } = await supabase
        .from('milk_collections')
        .select(`
          id,
          quantity,
          quality_grade,
          device_timestamp,
          sync_status
        `)
        .eq('farmer_id', farmerId)
        .order('device_timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCollectionHistory(data);
      } catch (error: any) {
      console.error('Error loading collection history:', error);
      showError('Error', String(error?.message || 'Failed to load history'));
    }
  };

  const handleContact = (type: 'call' | 'sms', phoneNumber: string) => {
    const url = type === 'call' ? `tel:${phoneNumber}` : `sms:${phoneNumber}`;
    window.open(url, '_blank');
  };

  const updateAvailability = async (farmerId: string, status: FarmerDetails['availability_status']) => {
    try {
      const { error } = await supabase
        .from('farmers')
        .update({ availability_status: status })
        .eq('id', farmerId);

      if (error) throw error;

      setFarmers(prev => prev.map(farmer => 
        farmer.farmer_id === farmerId
          ? { ...farmer, availability_status: status }
          : farmer
      ));

      show({ title: 'Success', description: 'Farmer availability updated' });
    } catch (error: any) {
      console.error('Error updating availability:', error);
      showError('Error', String(error?.message || 'Failed to update availability'));
    }
  };

  const filteredFarmers = farmers.filter(farmer =>
    farmer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSkeleton type="list" />;
  }

  return (
    <div className="space-y-4 p-4">
      {/* Search Bar */}
      <div className="sticky top-0 bg-background z-10 pb-2">
        <Input
          placeholder="Search farmers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Farmer List */}
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-2">
          {filteredFarmers.map((farmer) => (
            <Card
              key={farmer.farmer_id}
              className={`transition-colors ${
                selectedFarmer === farmer.farmer_id ? 'bg-muted' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{farmer.full_name}</h3>
                      <Badge variant={
                        farmer.availability_status === 'available' ? 'default' :
                        farmer.availability_status === 'unavailable' ? 'secondary' :
                        'destructive'
                      }>
                        {farmer.availability_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {farmer.registration_number}
                    </p>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContact('call', farmer.phone_number)}
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContact('sms', farmer.phone_number)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        SMS
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFarmer(
                            selectedFarmer === farmer.farmer_id ? null : farmer.farmer_id
                          );
                          if (farmer.farmer_id !== selectedFarmer) {
                            loadCollectionHistory(farmer.farmer_id);
                          }
                        }}
                      >
                        <History className="w-4 h-4 mr-1" />
                        History
                      </Button>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={
                      farmer.payment_status === 'paid' ? 'default' : 'secondary'
                    }>
                      <DollarSign className="w-3 h-3 mr-1" />
                      {farmer.payment_status}
                    </Badge>
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {farmer.last_collection_date
                        ? new Date(farmer.last_collection_date).toLocaleDateString()
                        : 'No collections'}
                    </Badge>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedFarmer === farmer.farmer_id && (
                  <div className="mt-4 pt-4 border-t">
                    <Tabs defaultValue="stats">
                      <TabsList className="w-full">
                        <TabsTrigger value="stats" className="flex-1">Stats</TabsTrigger>
                        <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                        <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
                      </TabsList>
                      <TabsContent value="stats" className="mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Monthly Collections</p>
                            <p className="text-lg font-semibold">{farmer.total_collections_month}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Volume</p>
                            <p className="text-lg font-semibold">{farmer.total_quantity_month}L</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Avg. Quality</p>
                            <p className="text-lg font-semibold">{farmer.avg_quality_score.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Last Collection</p>
                            <p className="text-lg font-semibold">
                              {farmer.last_collection_quantity?.toFixed(1) || '-'}L
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="history" className="mt-4">
                        <div className="space-y-2">
                          {collectionHistory.map((collection) => (
                            <div
                              key={collection.id}
                              className="flex items-center justify-between p-2 bg-muted rounded"
                            >
                              <div>
                                <p className="font-medium">{collection.quantity}L</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(collection.device_timestamp).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge>{collection.quality_grade}</Badge>
                                {collection.sync_status !== 'synced' && (
                                  <Badge variant="secondary" className="ml-2">
                                    {collection.sync_status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="actions" className="mt-4">
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => updateAvailability(farmer.farmer_id, 'available')}
                          >
                            Mark as Available
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => updateAvailability(farmer.farmer_id, 'unavailable')}
                          >
                            Mark as Unavailable
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => updateAvailability(farmer.farmer_id, 'inactive')}
                          >
                            Mark as Inactive
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
