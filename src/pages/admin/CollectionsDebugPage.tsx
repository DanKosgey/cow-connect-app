import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw } from 'lucide-react';

interface CollectionData {
  id: string;
  collection_date: string;
  farmer_id: string;
  farmer_name: string;
  liters: number;
  status: string;
  approved_for_payment: boolean;
  staff_id: string;
  staff_name: string;
  created_at: string;
  updated_at: string;
}

interface CollectorData {
  id: string;
  full_name: string;
  total_collections: number;
  total_liters: number;
  total_earnings: number;
}

export default function CollectionsDebugPage() {
  const [collectorId, setCollectorId] = useState('');
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [collectors, setCollectors] = useState<CollectorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all collectors with role 'collector'
  useEffect(() => {
    const fetchCollectors = async () => {
      try {
        // Get user IDs with collector role
        const { data: userRolesData, error: userRolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'collector')
          .eq('active', true);
        
        if (userRolesError) throw userRolesError;

        const collectorUserIds = userRolesData?.map(role => role.user_id) || [];
        
        if (collectorUserIds.length === 0) {
          setCollectors([]);
          return;
        }
        
        // Then fetch staff records for those users
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select(`
            id,
            user_id,
            profiles (
              full_name
            )
          `)
          .in('user_id', collectorUserIds);
        
        if (staffError) throw staffError;
        
        // Get collection counts for each collector
        const collectorData = await Promise.all(
          staffData.map(async (staff: any) => {
            const { data: collectionData, error: collectionError } = await supabase
              .from('collections')
              .select('id, liters')
              .eq('staff_id', staff.id);
            
            if (collectionError) {
              console.error('Error fetching collections for collector:', collectionError);
              return {
                id: staff.id,
                full_name: staff.profiles?.full_name || 'Unknown Collector',
                total_collections: 0,
                total_liters: 0,
                total_earnings: 0
              };
            }
            
            const total_collections = collectionData.length;
            const total_liters = collectionData.reduce((sum, collection) => sum + (collection.liters || 0), 0);
            const total_earnings = total_liters * 25; // Assuming default rate of 25
            
            return {
              id: staff.id,
              full_name: staff.profiles?.full_name || 'Unknown Collector',
              total_collections,
              total_liters,
              total_earnings
            };
          })
        );
        
        setCollectors(collectorData);
      } catch (err) {
        console.error('Error fetching collectors:', err);
        setError('Failed to fetch collectors');
      }
    };
    
    fetchCollectors();
  }, []);

  const fetchCollections = async () => {
    if (!collectorId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch collections for the selected collector
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_date,
          farmer_id,
          liters,
          status,
          approved_for_payment,
          staff_id,
          created_at,
          updated_at,
          farmers (
            full_name
          ),
          staff (
            profiles (
              full_name
            )
          )
        `)
        .eq('staff_id', collectorId)
        .order('collection_date', { ascending: false });
      
      if (error) throw error;
      
      const formattedData = data.map((collection: any) => ({
        id: collection.id,
        collection_date: collection.collection_date,
        farmer_id: collection.farmer_id,
        farmer_name: collection.farmers?.full_name || 'Unknown Farmer',
        liters: collection.liters,
        status: collection.status,
        approved_for_payment: collection.approved_for_payment,
        staff_id: collection.staff_id,
        staff_name: collection.staff?.profiles?.full_name || 'Unknown Staff',
        created_at: collection.created_at,
        updated_at: collection.updated_at
      }));
      
      setCollections(formattedData);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchCollections();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Collections Debug</h1>
        <p className="text-muted-foreground">
          View raw collection data for debugging purposes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collector Selection</CardTitle>
          <CardDescription>
            Select a collector to view their raw collection data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="collector-select">Select Collector</Label>
              <select
                id="collector-select"
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a collector</option>
                {collectors.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.full_name} ({collector.total_collections} collections, {collector.total_liters.toFixed(2)}L)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button 
                onClick={fetchCollections} 
                disabled={!collectorId || loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? 'Loading...' : 'Load Collections'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={!collectorId || loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 p-2 bg-red-50 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {collections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collection Data</CardTitle>
            <CardDescription>
              Raw collection records for the selected collector
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Approved</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell>
                        {new Date(collection.collection_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{collection.farmer_name}</div>
                        <div className="text-sm text-muted-foreground">{collection.farmer_id}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {collection.liters.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={collection.status === 'Collected' ? 'default' : 'secondary'}>
                          {collection.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {collection.approved_for_payment ? (
                          <Badge variant="default">Approved</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(collection.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(collection.updated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h3 className="font-medium mb-2">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Collections</p>
                  <p className="text-2xl font-bold">{collections.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Liters</p>
                  <p className="text-2xl font-bold">
                    {collections.reduce((sum, collection) => sum + collection.liters, 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Potential Earnings</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(collections.reduce((sum, collection) => sum + collection.liters, 0) * 25)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}