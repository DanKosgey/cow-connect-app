import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Map as MapIcon, Navigation, CheckCircle2, XCircle, Clock } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';
import type { RoutePoint } from '@/types/staff.types';
import type { Database } from '@/types/database.types';

export default function RouteManagement() {
  const { show, error: showError } = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

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
        const { data: staffRoute, error: routeError } = await supabase
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
          .limit(1)
          .single();

        if (routeError) throw routeError;
        if (!staffRoute) throw new Error('No active route found');

        // Load today's collections for status
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: collections, error: collectionsError } = await supabase
          .from('milk_collections')
          .select('farmer_id, collection_point_id')
          .eq('staff_id', user.data.user.id)
          .gte('device_timestamp', today.toISOString()) as { 
            data: Collection[] | null; 
            error: Error | null; 
          };

        if (collectionsError) throw collectionsError;
        if (!collections) throw new Error('Failed to load collections');

        // Load assigned farmers for each point
        const { data: farmers, error: farmersError } = await supabase
          .from('farmers')
          .select(`
            farmer_id:id,
            full_name,
            collection_point_id
          `) as {
            data: AssignedFarmer[] | null;
            error: Error | null;
          };

        if (farmersError) throw farmersError;
        if (!farmers) throw new Error('Failed to load farmers');

        // Transform data into RoutePoint[] structure
        const routePoints: RoutePoint[] = (staffRoute as RouteData).route.route_points
          .sort((a, b) => a.sequence_number - b.sequence_number)
          .map(point => {
            const pointFarmers = farmers.filter(
              f => f.collection_point_id === point.collection_point.id
            );

            const collectedFarmers = collections.filter(
              c => c.collection_point_id === point.collection_point.id
            ).map(c => c.farmer_id);

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
              farmers: pointFarmers.map(farmer => ({
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

    // TODO: Implement map navigation
    if ('geolocation' in navigator) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
      window.open(mapsUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
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
            onClick={() => {
              // TODO: Implement full map view
              toast({
                title: 'Coming Soon',
                description: 'Full map view will be available in the next update',
              });
            }}
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