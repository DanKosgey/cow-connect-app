import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Map as MapIcon, Navigation, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';
import type { RoutePoint } from '@/types/staff.types';
import type { Database } from '@/types/database.types';

export default function RouteManagement() {
  const { show, error: showError } = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [noRouteFound, setNoRouteFound] = useState(false);

  useEffect(() => {
    const loadRoute = async () => {
      try {
        const user = await supabase.auth.getUser();
        if (!user.data.user?.id) throw new Error('Not authenticated');

        interface RouteData {
          route: {
            id: string;
            name: string;
            route_points: Array<{
              id: string;
              sequence_number: number;
              collection_point: {
                id: string;
                name: string;
                location: {
                  coordinates: [number, number];
                };
              };
            }>;
          };
        }

        interface Collection {
          farmer_id: string;
          collection_point_id: string;
        }

        interface AssignedFarmer {
          farmer_id: string;
          full_name: string;
          collection_point_id: string;
        }

        // Load route points with collection status
        const { data: staffRoutes, error: routeError } = await supabase
          .from('staff_routes')
          .select(`
            route:routes (
              id,
              name,
              route_points (
                id,
                sequence_number,
                collection_point:collection_points (
                  id,
                  name,
                  location
                )
              )
            )
          `)
          .eq('staff_id', user.data.user.id)
          .eq('is_active', true)
          .limit(1);

        if (routeError) throw routeError;
        
        // Check if we have any routes
        if (!staffRoutes || staffRoutes.length === 0) {
          setNoRouteFound(true);
          setRoute([]);
          return;
        }
        
        const staffRoute = staffRoutes[0];

        // Load today's collections for status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: collections, error: collectionsError } = await supabase
          .from('collections')
          .select('farmer_id, collection_date')
          .eq('staff_id', user.data.user.id)
          .gte('collection_date', today.toISOString())
          .lt('collection_date', tomorrow.toISOString());

        if (collectionsError) throw collectionsError;

        // Load assigned farmers using the RPC function
        const { data: farmers, error: farmersError } = await supabase
          .rpc('get_assigned_farmers', { staff_id: user.data.user.id });

        if (farmersError) throw farmersError;

        // Transform data into RoutePoint[] structure
        const routePoints: RoutePoint[] = (staffRoute as RouteData).route.route_points
          .sort((a, b) => a.sequence_number - b.sequence_number)
          .map(point => {
            // Get farmers assigned to this collection point
            const pointFarmers = farmers.filter(
              (f: any) => f.collection_point_id === point.collection_point.id
            );

            // Get collections for farmers at this point today
            const collectedFarmers = collections.filter(
              (c: any) => {
                // Check if this farmer has been collected today at this point
                return pointFarmers.some((f: any) => f.farmer_id === c.farmer_id);
              }
            ).map((c: any) => c.farmer_id);

            return {
              id: point.id,
              name: point.collection_point.name,
              sequence: point.sequence_number,
              latitude: point.collection_point.location.coordinates[1],
              longitude: point.collection_point.location.coordinates[0],
              status: collectedFarmers.length === pointFarmers.length
                ? 'completed'
                : collectedFarmers.length > 0
                  ? 'partial'
                  : 'pending',
              farmers: pointFarmers.map((farmer: any) => ({
                id: farmer.farmer_id,
                name: farmer.full_name,
                status: collectedFarmers.includes(farmer.farmer_id)
                  ? 'completed'
                  : 'pending'
              }))
            };
          });

        setRoute(routePoints);
      } catch (error: any) {
        console.error('Error loading route:', error);
        showError('Error', String(error?.message || 'Failed to load route'));
      } finally {
        setLoading(false);
      }
    };

    loadRoute();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'skipped':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handlePointClick = (pointId: string) => {
    const point = route.find(p => p.id === pointId);
    if (!point) return;

    // Implement map navigation using Google Maps
    if ('geolocation' in navigator) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
      window.open(mapsUrl, '_blank');
    } else {
      // Fallback for browsers that don't support geolocation
      window.open(`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`, '_blank');
    }
  };

  const handleViewFullMap = () => {
    // Calculate bounds for all route points
    if (route.length === 0) {
      show({ title: 'No Route Data', description: 'There are no route points to display on the map.' });
      return;
    }

    // Create a URL with all points as waypoints
    const origin = `${route[0].latitude},${route[0].longitude}`;
    const destination = `${route[route.length - 1].latitude},${route[route.length - 1].longitude}`;
    
    let waypoints = '';
    if (route.length > 2) {
      const middlePoints = route.slice(1, route.length - 1);
      waypoints = middlePoints.map(p => `${p.latitude},${p.longitude}`).join('|');
    }

    let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
      mapsUrl += `&waypoints=${waypoints}`;
    }

    window.open(mapsUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="p-4">
        <LoadingSkeleton type="list" />
      </div>
    );
  }

  // Handle case when no route is found
  if (noRouteFound) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Route Assigned</h3>
            <p className="text-muted-foreground mb-4">
              You don't have an active route assigned to you at the moment. 
              Please contact your administrator to assign a route.
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Map Preview */}
      <Card>
        <CardContent className="p-4">
          <Button
            variant="outline"
            className="w-full h-32 flex flex-col items-center justify-center"
            onClick={handleViewFullMap}
          >
            <MapIcon className="h-8 w-8 mb-2" />
            View Full Map
          </Button>
        </CardContent>
      </Card>

      {/* Route List */}
      <ScrollArea className="h-[60vh]">
        <div className="space-y-2 pr-4">
          {route.map((point) => (
            <Card
              key={point.id}
              className={`transition-colors ${
                selectedPoint === point.id ? 'bg-muted' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Stop {point.sequence}</Badge>
                      {getStatusIcon(point.status)}
                    </div>
                    <h3 className="font-medium mt-1">{point.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {point.farmers.length} farmers
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePointClick(point.id)}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>

                {/* Farmer List */}
                {selectedPoint === point.id && (
                  <div className="mt-4 space-y-2">
                    {point.farmers.map(farmer => (
                      <div
                        key={farmer.id}
                        className="flex items-center justify-between p-2 bg-background rounded"
                      >
                        <span className="text-sm">{farmer.name}</span>
                        {getStatusIcon(farmer.status)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => setSelectedPoint(
                    selectedPoint === point.id ? null : point.id
                  )}
                >
                  {selectedPoint === point.id ? 'Hide' : 'Show'} Farmers
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}