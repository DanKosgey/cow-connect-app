import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Route, 
  MapPin, 
  Truck, 
  Calendar, 
  Clock, 
  User, 
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Download,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoutePoint {
  id: string;
  farmerName: string;
  farmerId: string;
  address: string;
  latitude: number;
  longitude: number;
  estimatedTime: string;
  distance: number;
  status: 'pending' | 'visited' | 'skipped';
  collectionAmount?: number;
  qualityGrade?: string;
}

const RouteOptimization = () => {
  const { toast } = useToast();
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchRoutePoints();
  }, [selectedDate]);

  const fetchRoutePoints = async () => {
    setLoading(true);
    try {
      // Mock data - in a real implementation, this would fetch from Supabase
      const mockRoutePoints: RoutePoint[] = [
        {
          id: '1',
          farmerName: 'John Smith',
          farmerId: 'FARMER-001',
          address: '123 Main St, Nairobi',
          latitude: -1.286389,
          longitude: 36.817223,
          estimatedTime: '08:30 AM',
          distance: 2.5,
          status: 'pending',
          collectionAmount: 45.5,
          qualityGrade: 'A'
        },
        {
          id: '2',
          farmerName: 'Jane Doe',
          farmerId: 'FARMER-002',
          address: '456 Oak Ave, Nairobi',
          latitude: -1.292066,
          longitude: 36.821945,
          estimatedTime: '09:15 AM',
          distance: 3.2,
          status: 'pending',
          collectionAmount: 38.2,
          qualityGrade: 'A+'
        },
        {
          id: '3',
          farmerName: 'Robert Johnson',
          farmerId: 'FARMER-003',
          address: '789 Pine Rd, Nairobi',
          latitude: -1.303206,
          longitude: 36.829700,
          estimatedTime: '10:00 AM',
          distance: 4.8,
          status: 'pending',
          collectionAmount: 29.8,
          qualityGrade: 'B'
        },
        {
          id: '4',
          farmerName: 'Emily Wilson',
          farmerId: 'FARMER-004',
          address: '321 Elm St, Nairobi',
          latitude: -1.313206,
          longitude: 36.849700,
          estimatedTime: '11:30 AM',
          distance: 6.1,
          status: 'pending',
          collectionAmount: 52.1,
          qualityGrade: 'A'
        },
        {
          id: '5',
          farmerName: 'Michael Brown',
          farmerId: 'FARMER-005',
          address: '654 Cedar Ln, Nairobi',
          latitude: -1.323206,
          longitude: 36.859700,
          estimatedTime: '12:45 PM',
          distance: 7.3,
          status: 'pending',
          collectionAmount: 41.7,
          qualityGrade: 'A+'
        }
      ];
      
      setRoutePoints(mockRoutePoints);
      setOptimizedRoute(mockRoutePoints);
    } catch (error) {
      console.error('Error fetching route points:', error);
      toast({
        title: "Error",
        description: "Failed to load route points",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const optimizeRoute = async () => {
    setIsOptimizing(true);
    try {
      // Simulate route optimization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would call a route optimization algorithm
      // For now, we'll just shuffle the route points to simulate optimization
      const shuffled = [...routePoints].sort(() => Math.random() - 0.5);
      setOptimizedRoute(shuffled);
      
      toast({
        title: "Success",
        description: "Route optimized successfully",
        variant: "success"
      });
    } catch (error) {
      console.error('Error optimizing route:', error);
      toast({
        title: "Error",
        description: "Failed to optimize route",
        variant: "error"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const resetRoute = () => {
    setOptimizedRoute([...routePoints]);
    toast({
      title: "Reset",
      description: "Route reset to original order",
      variant: "success"
    });
  };

  const exportRoute = () => {
    toast({
      title: "Export Started",
      description: "Route data export in progress...",
      variant: "success"
    });
    
    // In a real implementation, this would generate and download a file
    console.log('Exporting route data');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'visited': return 'bg-green-100 text-green-800';
      case 'skipped': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Route Optimization</h1>
          <p className="text-muted-foreground">Optimize your collection routes for efficiency</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportRoute} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Route Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-md p-2"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={optimizeRoute} 
              disabled={isOptimizing}
              className="flex items-center gap-2"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Optimizing...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  Optimize Route
                </>
              )}
            </Button>
            <Button 
              onClick={resetRoute} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Route Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stops</p>
                <p className="text-2xl font-bold">{optimizedRoute.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Distance</p>
                <p className="text-2xl font-bold">
                  {optimizedRoute.reduce((sum, point) => sum + point.distance, 0).toFixed(1)} km
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Time</p>
                <p className="text-2xl font-bold">4.5 hrs</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">
                  {optimizedRoute.reduce((sum, point) => sum + (point.collectionAmount || 0), 0).toFixed(1)} L
                </p>
              </div>
              <Route className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Optimized Route
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg h-64 flex items-center justify-center mb-6">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Route map visualization would appear here</p>
            </div>
          </div>
          
          {/* Route Points List */}
          <div className="space-y-3">
            {optimizedRoute.map((point, index) => (
              <div 
                key={point.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4 mb-3 sm:mb-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium">{point.farmerName}</h3>
                    <p className="text-sm text-muted-foreground">{point.farmerId}</p>
                    <p className="text-sm text-muted-foreground mt-1">{point.address}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-center">
                    <div className="font-medium">{point.estimatedTime}</div>
                    <div className="text-xs text-muted-foreground">Time</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium">{point.distance} km</div>
                    <div className="text-xs text-muted-foreground">Distance</div>
                  </div>
                  
                  {point.collectionAmount && (
                    <div className="text-center">
                      <div className="font-medium">{point.collectionAmount}L</div>
                      <div className="text-xs text-muted-foreground">Volume</div>
                    </div>
                  )}
                  
                  {point.qualityGrade && (
                    <div className="text-center">
                      <Badge className={getQualityGradeColor(point.qualityGrade)}>
                        {point.qualityGrade}
                      </Badge>
                      <div className="text-xs text-muted-foreground">Quality</div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <Badge className={getStatusColor(point.status)}>
                      {point.status.charAt(0).toUpperCase() + point.status.slice(1)}
                    </Badge>
                    <div className="text-xs text-muted-foreground">Status</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteOptimization;