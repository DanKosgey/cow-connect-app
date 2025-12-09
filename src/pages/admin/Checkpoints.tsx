import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  Filter,
  Truck,
  Building as BranchIcon,
  Droplets,
  Users,
  RefreshCw,
  Search,
  Map
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import AdvancedWarehouseMap from '@/components/admin/AdvancedWarehouseMap';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';

interface CompanyLocation {
  id: string;
  name: string;
  address: string;
  gps_latitude?: number;
  gps_longitude?: number;
  // Removed warehouse_collections reference since the table was deleted
}

const Checkpoints = () => {
  const toast = useToastNotifications();
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the session refresh hook
  const { refreshSession } = useSessionRefresh({ refreshInterval: 10 * 60 * 1000 }); // Refresh every 10 minutes

  // Fetch company locations data
  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Refresh session before fetching data to ensure we have a valid connection
      // Make it non-blocking to prevent data loading delays
      refreshSession().catch(error => {
        console.warn('Session refresh failed, continuing with data fetch', error);
      });
      
      // Fetch company locations without collection counts since warehouse_collections table was deleted
      const { data, error: fetchError } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      
      setLocations(data || []);
    } catch (err: any) {
      console.error('Error fetching company locations data:', err);
      const errorMessage = err.message || 'Failed to fetch company locations data';
      setError(errorMessage);
      toast.error('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading checkpoints data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <MapPin className="h-5 w-5" />
                Error Loading Checkpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={fetchLocations} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Checkpoints & Company Locations</h1>
          <p className="text-gray-600 mt-2">Manage company locations and view collection point analytics</p>
        </div>
        
        <div className="space-y-6">
          {/* Location Map Section */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-purple-500" />
                Company Locations & Collection Points Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedWarehouseMap warehouses={locations} />
            </CardContent>
          </Card>
          
          {/* Location List */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BranchIcon className="h-5 w-5 text-blue-500" />
                Company Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-8">
                  <BranchIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No company locations found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((location) => (
                    <Card key={location.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-gray-900">{location.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                            {/* Removed collection count display since warehouse_collections table was deleted */}
                          </div>
                          {location.gps_latitude && location.gps_longitude && (
                            <MapPin className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Checkpoints;