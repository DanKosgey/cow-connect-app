import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  MapPin, 
  Clock, 
  Navigation, 
  Play, 
  CheckCircle, 
  AlertCircle,
  RotateCcw,
  Download,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoutesAPI } from '@/services/ApiService';
import { 
  RouteData, 
  RouteStatus, 
  FarmerLocation, 
  RouteOptimizationRequest,
  RouteStartRequest
} from '@/types/route';
import { format, parseISO } from 'date-fns';

// Mock Google Maps integration - in a real app, you would use the actual Google Maps API
const useLoadScript = ({ googleMapsApiKey }: { googleMapsApiKey: string }) => {
  return { isLoaded: true };
};

// Simple map component for demonstration
const SimpleMap: React.FC<{ 
  farmers: FarmerLocation[]; 
  currentLocation?: { lat: number; lng: number };
  routePath?: { lat: number; lng: number }[];
}> = ({ farmers, currentLocation, routePath }) => {
  if (farmers.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No farmer locations to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-blue-50 rounded-lg relative overflow-hidden">
      {/* Simple map visualization */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          {/* Route path */}
          {routePath && routePath.length > 1 && (
            <svg className="absolute inset-0 w-full h-full">
              <polyline
                points={routePath.map(p => `${(p.lng + 180) / 360 * 100}%,${(90 - p.lat) / 180 * 100}%`).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          )}
          
          {/* Farmer markers */}
          {farmers.map((farmer, index) => (
            <div
              key={farmer.id}
              className="absolute w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold"
              style={{
                left: `${(farmer.location.lng + 180) / 360 * 100}%`,
                top: `${(90 - farmer.location.lat) / 180 * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {index + 1}
            </div>
          ))}
          
          {/* Current location marker */}
          {currentLocation && (
            <div
              className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
              style={{
                left: `${(currentLocation.lng + 180) / 360 * 100}%`,
                top: `${(90 - currentLocation.lat) / 180 * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <Navigation className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded text-xs text-gray-600">
        Map Visualization
      </div>
    </div>
  );
};

const RouteManagement: React.FC = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [optimizationCriteria, setOptimizationCriteria] = useState<'distance' | 'time' | 'priority'>('distance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Google Maps integration
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'
  });

  useEffect(() => {
    if (user) {
      fetchRoutes();
    }
  }, [user]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      // Fetch routes for the staff member
      const routeData = await RoutesAPI.getStaffRoutes(user.id);
      
      // Transform the data to match our RouteData interface
      const transformedRoutes: RouteData[] = routeData.map((route: any) => ({
        id: route.id,
        name: route.name || `Route ${route.id.substring(0, 8)}`,
        assigned_staff: route.staff_id,
        farmers: route.farmers || [],
        estimated_duration: route.estimated_duration || 0,
        total_distance: route.total_distance || 0,
        status: route.status || 'planned',
        scheduled_date: route.scheduled_date ? new Date(route.scheduled_date) : new Date()
      }));
      
      setRoutes(transformedRoutes);
      
      // Select the first route by default
      if (transformedRoutes.length > 0) {
        setSelectedRoute(transformedRoutes[0]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError('Failed to load routes');
      setLoading(false);
    }
  };

  const startRoute = async () => {
    try {
      if (!selectedRoute || !user) return;
      
      // Get current position
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          const startRequest: RouteStartRequest = {
            staff_location: {
              lat: latitude,
              lng: longitude
            }
          };
          
          // Start the route
          const response = await RoutesAPI.startRoute(
            selectedRoute.id, 
            startRequest.staff_location
          );
          
          // Update route status
          setSelectedRoute({
            ...selectedRoute,
            status: 'active'
          });
          
          setIsTracking(true);
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          // In a real implementation, you would connect to WebSocket here
          console.log('Route started:', response);
        }, (error) => {
          console.error('Error getting location:', error);
          setError('Failed to get current location');
        });
      } else {
        setError('Geolocation is not supported by this browser');
      }
    } catch (err) {
      console.error('Error starting route:', err);
      setError('Failed to start route');
    }
  };

  const completeRoute = async () => {
    try {
      if (!selectedRoute || !user) return;
      
      // In a real implementation, you would call the complete route endpoint
      // For now, we'll just update the status locally
      setSelectedRoute({
        ...selectedRoute,
        status: 'completed'
      });
      
      setIsTracking(false);
      
      // Refresh routes
      fetchRoutes();
    } catch (err) {
      console.error('Error completing route:', err);
      setError('Failed to complete route');
    }
  };

  const optimizeRoute = async () => {
    try {
      if (!selectedRoute) return;
      
      // Call the optimization API
      const optimizationRequest: RouteOptimizationRequest = {
        optimization_criteria: optimizationCriteria
      };
      
      // In a real implementation, you would call:
      // const response = await RoutesAPI.optimizeRoute(selectedRoute.id, optimizationCriteria);
      
      // For now, we'll simulate the optimization
      console.log('Optimizing route with criteria:', optimizationCriteria);
      
      // Show a success message
      alert(`Route optimized for ${optimizationCriteria}!`);
    } catch (err) {
      console.error('Error optimizing route:', err);
      setError('Failed to optimize route');
    }
  };

  const getStatusBadge = (status: RouteStatus) => {
    switch (status) {
      case 'planned':
        return <Badge className="bg-blue-100 text-blue-800">Planned</Badge>;
      case 'active':
        return <Badge className="bg-yellow-100 text-yellow-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const exportRoute = () => {
    // In a real implementation, this would generate a CSV/PDF
    console.log('Exporting route data');
    alert('Route data exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Route Management</h1>
        <Button onClick={fetchRoutes} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Routes</CardTitle>
              <CardDescription>Select a route to manage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {routes.length > 0 ? (
                  routes.map((route) => (
                    <div
                      key={route.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRoute?.id === route.id
                          ? 'bg-blue-50 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedRoute(route)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{route.name}</h3>
                          <p className="text-sm text-gray-500">
                            {format(route.scheduled_date, 'MMM d, yyyy')}
                          </p>
                        </div>
                        {getStatusBadge(route.status)}
                      </div>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{route.farmers.length} stops</span>
                        <Clock className="h-4 w-4 ml-3 mr-1" />
                        <span>{route.estimated_duration} min</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No routes available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Route Details */}
        <div className="lg:col-span-2">
          {selectedRoute ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedRoute.name}</CardTitle>
                    <CardDescription>
                      Scheduled for {format(selectedRoute.scheduled_date, 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={exportRoute} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800">Status</h3>
                    <div className="mt-1">{getStatusBadge(selectedRoute.status)}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800">Duration</h3>
                    <p className="mt-1">{selectedRoute.estimated_duration} minutes</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800">Distance</h3>
                    <p className="mt-1">{selectedRoute.total_distance} km</p>
                  </div>
                </div>

                {/* Route Controls */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {selectedRoute.status === 'planned' && (
                    <>
                      <Button onClick={startRoute} className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4 mr-2" />
                        Start Route
                      </Button>
                      <Select
                        value={optimizationCriteria}
                        onValueChange={(value: 'distance' | 'time' | 'priority') =>
                          setOptimizationCriteria(value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="distance">Optimize Distance</SelectItem>
                          <SelectItem value="time">Optimize Time</SelectItem>
                          <SelectItem value="priority">Optimize Priority</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={optimizeRoute} variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Optimize
                      </Button>
                    </>
                  )}

                  {selectedRoute.status === 'active' && (
                    <Button onClick={completeRoute} className="bg-blue-600 hover:bg-blue-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Route
                    </Button>
                  )}

                  {selectedRoute.status === 'completed' && (
                    <Button disabled className="bg-gray-400">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Route Completed
                    </Button>
                  )}
                </div>

                {/* View Toggle */}
                <div className="flex border-b mb-4">
                  <button
                    className={`px-4 py-2 font-medium ${
                      viewMode === 'list'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500'
                    }`}
                    onClick={() => setViewMode('list')}
                  >
                    Farmer List
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${
                      viewMode === 'map'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500'
                    }`}
                    onClick={() => setViewMode('map')}
                  >
                    Route Map
                  </button>
                </div>

                {/* Content based on view mode */}
                {viewMode === 'list' ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedRoute.farmers.length > 0 ? (
                      selectedRoute.farmers.map((farmer, index) => (
                        <div
                          key={farmer.id}
                          className="flex items-center p-3 bg-white rounded-lg border"
                        >
                          <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-3">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{farmer.name}</p>
                            <p className="text-sm text-gray-500">
                              {farmer.location.lat.toFixed(6)}, {farmer.location.lng.toFixed(6)}
                            </p>
                          </div>
                          <div className="text-right">
                            {farmer.collection_history?.last_collection_date && (
                              <p className="text-sm">
                                Last: {format(parseISO(farmer.collection_history.last_collection_date), 'MMM d')}
                              </p>
                            )}
                            {farmer.collection_history?.avg_volume && (
                              <p className="text-sm text-gray-500">
                                {farmer.collection_history.avg_volume}L avg
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No farmers assigned to this route</p>
                    )}
                  </div>
                ) : (
                  <SimpleMap 
                    farmers={selectedRoute.farmers} 
                    currentLocation={currentLocation || undefined}
                    routePath={selectedRoute.farmers.map(f => f.location)}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Route Selected</h3>
                  <p className="text-gray-500">Select a route from the list to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tracking Status */}
      {isTracking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Navigation className="h-5 w-5 text-green-500 mr-2" />
              Route Tracking Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Location</p>
                {currentLocation && (
                  <p className="font-medium">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>
              <Button onClick={() => setIsTracking(false)} variant="outline">
                Stop Tracking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RouteManagement;