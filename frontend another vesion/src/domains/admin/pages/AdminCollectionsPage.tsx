import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Milk, 
  Camera, 
  MapPin, 
  Clock,
  User,
  TrendingUp,
  Filter,
  Wifi,
  WifiOff
} from "lucide-react";
import { useEffect, useState, useCallback } from 'react';
import apiService from '@/services/ApiService';
import { logger } from '../lib/logger';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Collection } from '@/types';

const AdminCollections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  // Use the admin notifications hook
  const {
    collections: realtimeCollections,
    isConnected,
    isLoading: notificationsLoading,
    error: notificationsError
  } = useAdminNotifications({
    onNewCollection: (collection) => {
      // Add new collection to the top of the list
      setCollections(prev => [collection, ...prev]);
      logger.info(`New collection received via WebSocket: ${collection.liters}L from farmer ${collection.farmer_id}`);
    },
    onKycStatusUpdate: (farmerId, status) => {
      logger.info(`KYC status updated for farmer ${farmerId}: ${status}`);
      // In a real implementation, you might want to update the UI to reflect KYC changes
    },
    onConnectionChange: (connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    }
  });

  // Function to merge collections avoiding duplicates
  const mergeCollections = useCallback((existingCollections: Collection[], newCollections: Collection[]) => {
    const existingIds = new Set(existingCollections.map(c => c.id));
    const uniqueNewCollections = newCollections.filter(c => !existingIds.has(c.id));
    return [...uniqueNewCollections, ...existingCollections];
  }, []);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const response = await apiService.Collections.list(100, 0);
        // Extract items from paginated response
        const fetchedCollections = response.items;
        setCollections(fetchedCollections);
        logger.info('Collections data fetched successfully');
      } catch (err) {
        logger.error('Error fetching collections data', err);
        setError('Failed to load collections data');
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  // Update collections when we receive real-time updates
  useEffect(() => {
    if (realtimeCollections.length > 0) {
      // Merge real-time collections with existing ones, avoiding duplicates
      setCollections(prev => mergeCollections(prev, realtimeCollections));
    }
  }, [realtimeCollections, mergeCollections]);

  const todayCollections = collections.filter(c => 
    new Date(c.timestamp).toDateString() === new Date().toDateString()
  );
  const totalTodayLiters = todayCollections.reduce((sum, c) => sum + c.liters, 0);
  const avgQuality = todayCollections.length > 0 ? 
    todayCollections.reduce((sum, c) => sum + (c.quality_grade === 'A' ? 3 : c.quality_grade === 'B' ? 2 : 1), 0) / todayCollections.length : 0;

  if (loading || notificationsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dairy-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-center">
          <p>Error loading collections: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-dairy-50">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="border border-dairy-200" />
              <div>
                <h1 className="text-3xl font-bold text-dairy-900">Milk Collections</h1>
                <p className="text-dairy-600">Monitor and manage daily milk collection records</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`${
                isConnected 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 mr-1" />
                    Live Updates
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 mr-1" />
                    Connecting...
                  </>
                )}
              </Badge>
              <div className="flex space-x-2">
                <Button variant="outline" className="border-dairy-300">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button className="bg-dairy-blue hover:bg-dairy-blue/90">
                  Export Report
                </Button>
              </div>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Today's Collections</CardTitle>
                <Milk className="h-4 w-4 text-dairy-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{todayCollections.length}</div>
                <p className="text-xs text-dairy-600">Collection records</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Total Liters</CardTitle>
                <TrendingUp className="h-4 w-4 text-dairy-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{totalTodayLiters}L</div>
                <p className="text-xs text-dairy-600">Collected today</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Average Quality</CardTitle>
                <Badge className="bg-dairy-green/10 text-dairy-green border-dairy-green/20">
                  Grade {avgQuality >= 2.5 ? 'A' : avgQuality >= 1.5 ? 'B' : 'C'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{avgQuality.toFixed(1)}/3.0</div>
                <p className="text-xs text-dairy-600">Quality score</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Active Farmers</CardTitle>
                <User className="h-4 w-4 text-dairy-amber" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">
                  {new Set(todayCollections.map(c => c.farmer_id)).size}
                </div>
                <p className="text-xs text-dairy-600">Delivered today</p>
              </CardContent>
            </Card>
          </div>

          {/* Collection Records */}
          <Card className="border-dairy-200">
            <CardHeader>
              <CardTitle className="text-dairy-900">Recent Collection Records</CardTitle>
              <CardDescription>Latest milk collection entries with verification data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {collections.slice(0, 10).map((collection: Collection) => (
                  <div key={collection.id} className="border border-dairy-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-dairy-blue/10 rounded-full flex items-center justify-center">
                            <Milk className="h-5 w-5 text-dairy-blue" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-dairy-900">{collection.farmer_name || 'Unknown Farmer'}</h3>
                            <p className="text-sm text-dairy-600">{collection.liters}L collected</p>
                          </div>
                        </div>
                        <Badge className="bg-dairy-green/10 text-dairy-green border-dairy-green/20">
                          Grade {collection.quality_grade}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="h-4 w-4 text-dairy-600" />
                          <span className="text-dairy-700">Staff: {collection.staff_name || 'Unknown Staff'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="h-4 w-4 text-dairy-600" />
                          <span className="text-dairy-700">
                            {new Date(collection.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="h-4 w-4 text-dairy-600" />
                          <span className="text-dairy-700">
                            {collection.gps_latitude.toFixed(4)}, {collection.gps_longitude.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Camera className="h-4 w-4 text-dairy-600" />
                          <span className="text-dairy-700">Photo verified</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <p className="text-dairy-600">Temperature: <span className="text-dairy-900">{collection.temperature}°C</span></p>
                          <p className="text-dairy-600">Fat: <span className="text-dairy-900">{collection.fat_content || 'N/A'}%</span></p>
                          <p className="text-dairy-600">Protein: <span className="text-dairy-900">{collection.protein_content || 'N/A'}%</span></p>
                        </div>
                        <Button size="sm" variant="outline" className="border-dairy-300">
                          View Details
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-dairy-200">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-dairy-600">
                          Blockchain TX: <span className="font-mono">{collection.tx_hash || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-dairy-600">
                          Validation Code: <span className="font-mono">{collection.validation_code || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminCollections;