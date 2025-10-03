import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { RoutesAPI } from '@/services/ApiService';

interface Route {
  id: string;
  staff_id: string;
  route_date: string;
  planned_stops: string[];
  estimated_duration: number;
  estimated_distance: number;
  status: string;
  actual_duration?: number;
  actual_distance?: number;
  completed_stops?: string[];
  created_at: string;
  updated_at: string;
}

interface RouteStop {
  farmer_id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

const RouteManagement: React.FC = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [mapView, setMapView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (user) {
      fetchTodaysRoute();
    }
  }, [user]);

  const fetchTodaysRoute = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's route for the staff member
      const response = await RoutesAPI.generateDailyRoute(user.id, today);
      setCurrentRoute(response.route);
      setRouteStops(response.navigation_data?.stops || []);
      
      // Fetch route history
      const history = await RoutesAPI.getStaffRouteHistory(user.id, 7);
      setRoutes(history);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching route:', err);
      setError('Failed to load route information');
      setLoading(false);
    }
  };

  const startRoute = async () => {
    try {
      if (!currentRoute || !user) return;
      
      await RoutesAPI.startRouteExecution(currentRoute.id, user.id);
      setIsTracking(true);
      
      // Update route status locally
      setCurrentRoute({
        ...currentRoute,
        status: 'in_progress'
      });
    } catch (err) {
      console.error('Error starting route:', err);
      setError('Failed to start route');
    }
  };

  const completeRoute = async () => {
    try {
      if (!currentRoute || !user) return;
      
      await RoutesAPI.completeRouteExecution(currentRoute.id, user.id);
      setIsTracking(false);
      
      // Update route status locally
      setCurrentRoute({
        ...currentRoute,
        status: 'completed'
      });
      
      // Refresh route data
      fetchTodaysRoute();
    } catch (err) {
      console.error('Error completing route:', err);
      setError('Failed to complete route');
    }
  };

  const trackLocation = async () => {
    try {
      if (!currentRoute || !user) return;
      
      // Get current position
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Record GPS track point
          await RoutesAPI.recordGPSTrackPoint(
            currentRoute.id,
            user.id,
            { latitude, longitude }
          );
          
          // Update tracking status
          setIsTracking(true);
        }, (error) => {
          console.error('Error getting location:', error);
          setError('Failed to get current location');
        });
      } else {
        setError('Geolocation is not supported by this browser');
      }
    } catch (err) {
      console.error('Error tracking location:', err);
      setError('Failed to track location');
    }
  };

  // Simple map visualization using SVG
  const renderRouteMap = () => {
    if (routeStops.length === 0) return null;
    
    // Calculate bounds for the map
    const latitudes = routeStops.map(stop => stop.location.latitude);
    const longitudes = routeStops.map(stop => stop.location.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    // Add some padding
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;
    
    const paddedMinLat = minLat - latPadding;
    const paddedMaxLat = maxLat + latPadding;
    const paddedMinLng = minLng - lngPadding;
    const paddedMaxLng = maxLng + lngPadding;
    
    // SVG dimensions
    const width = 600;
    const height = 400;
    
    // Convert lat/lng to SVG coordinates
    const latToY = (lat: number) => height - ((lat - paddedMinLat) / (paddedMaxLat - paddedMinLat)) * height;
    const lngToX = (lng: number) => ((lng - paddedMinLng) / (paddedMaxLng - paddedMinLng)) * width;
    
    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Route Map</h3>
          <div className="text-sm text-gray-500">
            {routeStops.length} stops • {currentRoute?.estimated_distance} km
          </div>
        </div>
        <div className="border rounded-lg p-2 bg-gray-50">
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
            {/* Draw route line */}
            {routeStops.length > 1 && (
              <polyline
                points={routeStops.map(stop => `${lngToX(stop.location.longitude)},${latToY(stop.location.latitude)}`).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
            
            {/* Draw stops */}
            {routeStops.map((stop, index) => (
              <g key={stop.farmer_id}>
                <circle
                  cx={lngToX(stop.location.longitude)}
                  cy={latToY(stop.location.latitude)}
                  r="8"
                  fill={index === 0 ? "#10b981" : index === routeStops.length - 1 ? "#ef4444" : "#3b82f6"}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={lngToX(stop.location.longitude)}
                  y={latToY(stop.location.latitude) - 15}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                >
                  {index + 1}
                </text>
              </g>
            ))}
          </svg>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>
      </div>
    );
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
      <Card>
        <CardHeader>
          <CardTitle>Today's Route</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {currentRoute ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Route Date</h3>
                  <p>{new Date(currentRoute.route_date).toLocaleDateString()}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800">Estimated Duration</h3>
                  <p>{currentRoute.estimated_duration} minutes</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800">Estimated Distance</h3>
                  <p>{currentRoute.estimated_distance} km</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800">Status</h3>
                <p className="capitalize">{currentRoute.status.replace('_', ' ')}</p>
              </div>
              
              {/* Toggle between list and map view */}
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 font-medium ${mapView === 'list' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                  onClick={() => setMapView('list')}
                >
                  Stop List
                </button>
                <button
                  className={`px-4 py-2 font-medium ${mapView === 'map' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                  onClick={() => setMapView('map')}
                >
                  Route Map
                </button>
              </div>
              
              {mapView === 'list' ? (
                <div>
                  <h3 className="font-semibold mb-2">Planned Stops ({currentRoute.planned_stops.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {routeStops.length > 0 ? (
                      routeStops.map((stop, index) => (
                        <div key={stop.farmer_id} className="flex items-center p-3 bg-white rounded-lg border">
                          <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{stop.name}</p>
                            <p className="text-sm text-gray-500">
                              {stop.location.latitude.toFixed(6)}, {stop.location.longitude.toFixed(6)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No stop details available</p>
                    )}
                  </div>
                </div>
              ) : (
                renderRouteMap()
              )}
              
              <div className="flex flex-wrap gap-2">
                {currentRoute.status === 'assigned' && (
                  <Button onClick={startRoute} className="bg-green-600 hover:bg-green-700">
                    Start Route
                  </Button>
                )}
                
                {currentRoute.status === 'in_progress' && (
                  <>
                    <Button onClick={trackLocation} className="bg-blue-600 hover:bg-blue-700">
                      Track Location
                    </Button>
                    <Button onClick={completeRoute} className="bg-purple-600 hover:bg-purple-700">
                      Complete Route
                    </Button>
                  </>
                )}
                
                {currentRoute.status === 'completed' && (
                  <Button disabled className="bg-gray-400">
                    Route Completed
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No route assigned for today</p>
              <Button onClick={fetchTodaysRoute}>Generate Route</Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Routes</CardTitle>
        </CardHeader>
        <CardContent>
          {routes.length > 0 ? (
            <div className="space-y-3">
              {routes.map((route) => (
                <div key={route.id} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-medium">{new Date(route.route_date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">
                      {route.planned_stops.length} stops • {route.estimated_duration} min
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm capitalize">
                    {route.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent routes found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteManagement;