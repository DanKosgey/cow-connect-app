import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  Filter,
  Truck,
  Warehouse as WarehouseIcon,
  Droplets,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Declare global L for Leaflet
declare global {
  interface Window {
    L: any;
  }
}

interface Warehouse {
  id: string;
  name: string;
  address: string;
  gps_latitude?: number;
  gps_longitude?: number;
  warehouse_collections: {
    count: number;
  };
}

interface CollectionPoint {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  quality_grade: string;
  total_amount: number;
  collection_date: string;
  gps_latitude: number;
  gps_longitude: number;
  farmers: {
    full_name: string;
    registration_number: string;
  };
}

const AdvancedWarehouseMap = ({ warehouses }: { warehouses: Warehouse[] }) => {
  const [collections, setCollections] = useState<CollectionPoint[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('week');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const layersRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);

  // Load Leaflet CSS and JS
  useEffect(() => {
    let isMounted = true;
    
    const loadLeaflet = async () => {
      try {
        // Dynamically import Leaflet only when needed
        const L = await import('leaflet');
        
        // Only proceed if component is still mounted
        if (!isMounted) return;
        
        // Create link element for Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
        document.head.appendChild(link);
        
        // Create link element for Marker Cluster CSS
        const clusterLink = document.createElement('link');
        clusterLink.rel = 'stylesheet';
        clusterLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css';
        document.head.appendChild(clusterLink);
        
        // Create link element for Marker Cluster Default CSS
        const clusterDefaultLink = document.createElement('link');
        clusterDefaultLink.rel = 'stylesheet';
        clusterDefaultLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css';
        document.head.appendChild(clusterDefaultLink);
        
        if (isMounted) {
          setMapInitialized(true);
          initializeMap();
        }
      } catch (err) {
        console.error('Error loading Leaflet:', err);
        if (isMounted) {
          setError('Failed to load map functionality');
        }
      }
    };

    loadLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (e) {
          console.warn('Error removing map:', e);
        }
      }
    };
  }, []);

  // Initialize the map
  const initializeMap = () => {
    if (typeof window === 'undefined' || !window.L || !mapRef.current) return;

    // Remove existing map if any
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      } catch (e) {
        console.warn('Error removing existing map:', e);
      }
    }

    // Check if map container already has a map instance
    if (mapRef.current.querySelector('.leaflet-container')) {
      // Clear the container
      mapRef.current.innerHTML = '';
    }

    try {
      // Create new map
      const map = window.L.map(mapRef.current).setView([-1.2921, 36.8219], 10); // Default to Nairobi
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
      
      mapInstanceRef.current = map;
      layersRef.current = window.L.layerGroup().addTo(map);
      
      // Add warehouse markers
      addWarehouseMarkers();
      
      // Fetch and display collection data
      fetchCollectionData();
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map');
    }
  };

  // Add warehouse markers to the map
  const addWarehouseMarkers = () => {
    if (!mapInstanceRef.current || !window.L || !layersRef.current) return;
    
    // Clear existing markers
    layersRef.current.clearLayers();
    markersRef.current = [];
    
    // Add warehouse markers
    warehouses.forEach((warehouse, index) => {
      if (warehouse.gps_latitude && warehouse.gps_longitude) {
        const marker = window.L.marker([warehouse.gps_latitude, warehouse.gps_longitude], {
          icon: window.L.divIcon({
            className: 'warehouse-marker',
            html: `<div class="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold border-2 border-white shadow-lg">
              W${index + 1}
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(layersRef.current);
        
        marker.bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-purple-700">${warehouse.name}</h3>
            <p class="text-sm">${warehouse.address}</p>
            <p class="text-sm mt-1"><strong>Collections:</strong> ${warehouse.warehouse_collections?.count || 0}</p>
          </div>
        `);
        
        markersRef.current.push(marker);
      }
    });
  };

  // Fetch collection data with GPS coordinates
  const fetchCollectionData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate date filter
      const now = new Date();
      let startDate = new Date();
      
      switch(dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
      }
      
      // Fetch collections with GPS data
      const { data, error: fetchError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          liters,
          quality_grade,
          total_amount,
          collection_date,
          gps_latitude,
          gps_longitude,
          farmers!fk_collections_farmer_id (full_name, registration_number)
        `)
        .not('gps_latitude', 'is', null)
        .not('gps_longitude', 'is', null)
        .gte('collection_date', startDate.toISOString())
        .order('collection_date', { ascending: false })
        .limit(1000);

      if (fetchError) throw fetchError;
      
      const collectionPoints = data.map((c: any) => ({
        id: c.id,
        collection_id: c.collection_id,
        farmer_id: c.farmer_id,
        liters: c.liters,
        quality_grade: c.quality_grade,
        total_amount: c.total_amount,
        collection_date: c.collection_date,
        gps_latitude: c.gps_latitude,
        gps_longitude: c.gps_longitude,
        farmers: c.farmers
      }));
      
      setCollections(collectionPoints);
      setFilteredCollections(collectionPoints);
    } catch (err) {
      console.error('Error fetching collection data:', err);
      setError(err.message || 'Failed to fetch collection data');
    } finally {
      setLoading(false);
    }
  };

  // Add collection markers to the map with clustering
  const addCollectionMarkers = async () => {
    if (!mapInstanceRef.current || !window.L || !layersRef.current) return;
    
    // Get L reference
    const L = window.L;
    
    // Clear existing collection markers
    if (clusterGroupRef.current) {
      try {
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current.removeFrom(mapInstanceRef.current);
      } catch (e) {
        console.warn('Error clearing cluster group:', e);
      }
    }
    
    try {
      // Dynamically import leaflet.markercluster
      await import('leaflet.markercluster');
      
      // Get MarkerClusterGroup constructor from L
      const MarkerClusterGroup = L.MarkerClusterGroup;
      
      if (!MarkerClusterGroup) {
        throw new Error('MarkerClusterGroup not found in Leaflet');
      }
      
      // Create marker cluster group
      clusterGroupRef.current = new MarkerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster: any) {
          const childCount = cluster.getChildCount();
          let size = 40;
          let className = 'marker-cluster marker-cluster-';
          
          if (childCount < 10) {
            className += 'small';
          } else if (childCount < 100) {
            className += 'medium';
          } else {
            className += 'large';
            size = 50;
          }
          
          return new L.DivIcon({
            html: `<div class="flex items-center justify-center w-full h-full text-white font-bold text-sm">
              <span>${childCount}</span>
            </div>`,
            className: className,
            iconSize: new L.Point(size, size)
          });
        }
      });
      
      // Add cluster group to map
      clusterGroupRef.current.addTo(mapInstanceRef.current);
      
      // Add collection point markers
      filteredCollections.forEach(collection => {
        if (collection.gps_latitude && collection.gps_longitude) {
          // Determine marker color based on quality grade
          let markerColor = '#3b82f6'; // Blue for default
          switch (collection.quality_grade) {
            case 'A+': markerColor = '#10b981'; break; // Green
            case 'A': markerColor = '#3b82f6'; break;  // Blue
            case 'B': markerColor = '#f59e0b'; break;  // Yellow
            case 'C': markerColor = '#ef4444'; break;  // Red
          }
          
          const marker = window.L.marker([collection.gps_latitude, collection.gps_longitude], {
            icon: window.L.divIcon({
              className: 'collection-marker',
              html: `<div class="bg-white border-2 rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg" 
                       style="border-color: ${markerColor};">
                </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          });
          
          marker.bindPopup(`
            <div class="p-2 min-w-48">
              <h3 class="font-bold text-gray-800">${collection.farmers?.full_name || 'Unknown Farmer'}</h3>
              <p class="text-sm text-gray-600">${collection.farmers?.registration_number || 'N/A'}</p>
              <div class="mt-2 space-y-1">
                <p><strong>Collection ID:</strong> ${collection.collection_id}</p>
                <p><strong>Liters:</strong> ${collection.liters}L</p>
                <p><strong>Quality:</strong> 
                  <span class="px-2 py-1 rounded text-xs font-medium ${
                    collection.quality_grade === 'A+' ? 'bg-green-100 text-green-800' :
                    collection.quality_grade === 'A' ? 'bg-blue-100 text-blue-800' :
                    collection.quality_grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }">
                    ${collection.quality_grade}
                  </span>
                </p>
                <p><strong>Amount:</strong> KES ${Math.round(collection.total_amount)}</p>
                <p><strong>Date:</strong> ${new Date(collection.collection_date).toLocaleDateString()}</p>
              </div>
            </div>
          `);
          
          clusterGroupRef.current.addLayer(marker);
          markersRef.current.push(marker);
        }
      });
      
      // Fit map to show all markers
      if (markersRef.current.length > 0) {
        const group = window.L.featureGroup(markersRef.current);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    } catch (error) {
      console.error('Error loading leaflet.markercluster:', error);
      setError('Failed to load map clustering functionality');
      
      // Fallback: Add markers without clustering
      try {
        // Clear any existing layers
        layersRef.current.clearLayers();
        markersRef.current = [];
        
        // Add warehouse markers
        addWarehouseMarkers();
        
        // Add collection point markers directly to layersRef
        filteredCollections.forEach(collection => {
          if (collection.gps_latitude && collection.gps_longitude) {
            // Determine marker color based on quality grade
            let markerColor = '#3b82f6'; // Blue for default
            switch (collection.quality_grade) {
              case 'A+': markerColor = '#10b981'; break; // Green
              case 'A': markerColor = '#3b82f6'; break;  // Blue
              case 'B': markerColor = '#f59e0b'; break;  // Yellow
              case 'C': markerColor = '#ef4444'; break;  // Red
            }
            
            const marker = window.L.marker([collection.gps_latitude, collection.gps_longitude], {
              icon: window.L.divIcon({
                className: 'collection-marker',
                html: `<div class="bg-white border-2 rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg" 
                         style="border-color: ${markerColor};">
                  </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })
            });
            
            marker.bindPopup(`
              <div class="p-2 min-w-48">
                <h3 class="font-bold text-gray-800">${collection.farmers?.full_name || 'Unknown Farmer'}</h3>
                <p class="text-sm text-gray-600">${collection.farmers?.registration_number || 'N/A'}</p>
                <div class="mt-2 space-y-1">
                  <p><strong>Collection ID:</strong> ${collection.collection_id}</p>
                  <p><strong>Liters:</strong> ${collection.liters}L</p>
                  <p><strong>Quality:</strong> 
                    <span class="px-2 py-1 rounded text-xs font-medium ${
                      collection.quality_grade === 'A+' ? 'bg-green-100 text-green-800' :
                      collection.quality_grade === 'A' ? 'bg-blue-100 text-blue-800' :
                      collection.quality_grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }">
                      ${collection.quality_grade}
                    </span>
                  </p>
                  <p><strong>Amount:</strong> KES ${Math.round(collection.total_amount)}</p>
                  <p><strong>Date:</strong> ${new Date(collection.collection_date).toLocaleDateString()}</p>
                </div>
              </div>
            `);
            
            marker.addTo(layersRef.current);
            markersRef.current.push(marker);
          }
        });
        
        // Fit map to show all markers
        if (markersRef.current.length > 0) {
          const group = window.L.featureGroup(markersRef.current);
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
        }
      } catch (fallbackError) {
        console.error('Error in fallback marker rendering:', fallbackError);
      }
    }
  };

  // Apply filters to collections
  useEffect(() => {
    let filtered = [...collections];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(collection => 
        collection.farmers?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.collection_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.farmers?.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply quality filter
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(collection => collection.quality_grade === qualityFilter);
    }
    
    setFilteredCollections(filtered);
  }, [collections, searchTerm, qualityFilter]);

  // Update map when filtered collections change
  useEffect(() => {
    if (mapInitialized && mapInstanceRef.current) {
      addCollectionMarkers();
    }
  }, [filteredCollections, mapInitialized]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle quality filter
  const handleQualityFilter = (quality: string) => {
    setQualityFilter(quality);
  };

  // Handle date range filter
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
  };

  // Handle zoom in
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  // Handle zoom out
  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchCollectionData();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Map Controls */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            Collection Points Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Collections</Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Search by farmer, ID, or registration..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-10"
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            {/* Quality Filter */}
            <div className="space-y-2">
              <Label>Quality Filter</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={qualityFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQualityFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={qualityFilter === 'A+' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQualityFilter('A+')}
                  className="bg-green-100 text-green-800 hover:bg-green-200"
                >
                  A+
                </Button>
                <Button
                  variant={qualityFilter === 'A' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQualityFilter('A')}
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  A
                </Button>
                <Button
                  variant={qualityFilter === 'B' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQualityFilter('B')}
                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                >
                  B
                </Button>
                <Button
                  variant={qualityFilter === 'C' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQualityFilter('C')}
                  className="bg-red-100 text-red-800 hover:bg-red-200"
                >
                  C
                </Button>
              </div>
            </div>
            
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex flex-wrap gap-2">
                {['today', 'week', 'month', 'year'].map(range => (
                  <Button
                    key={range}
                    variant={dateRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDateRangeChange(range)}
                    className="capitalize"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Map Controls */}
            <div className="space-y-2">
              <Label>Map Controls</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Map Container */}
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
            {!mapInitialized && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                  <p className="text-gray-500">Loading map...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Droplets className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Collections</p>
                    <p className="text-xl font-bold text-blue-900">{filteredCollections.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Droplets className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Total Liters</p>
                    <p className="text-xl font-bold text-green-900">
                      {formatNumber(filteredCollections.reduce((sum, c) => sum + (c.liters || 0), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <WarehouseIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Warehouses</p>
                    <p className="text-xl font-bold text-purple-900">{warehouses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Users className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">Unique Farmers</p>
                    <p className="text-xl font-bold text-yellow-900">
                      {new Set(filteredCollections.map(c => c.farmer_id)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {/* Collection Points List */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-500" />
            Recent Collection Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-gray-500">Loading collection data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
              <Button onClick={handleRefresh} className="mt-2">Retry</Button>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No collection points found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Collection ID</th>
                    <th className="text-left py-3 px-4 font-medium">Farmer</th>
                    <th className="text-left py-3 px-4 font-medium">Liters</th>
                    <th className="text-left py-3 px-4 font-medium">Quality</th>
                    <th className="text-left py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollections.slice(0, 10).map(collection => (
                    <tr key={collection.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{collection.collection_id}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{collection.farmers?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{collection.farmers?.registration_number || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{formatNumber(collection.liters)}L</td>
                      <td className="py-3 px-4">
                        <Badge className={
                          collection.quality_grade === 'A+' ? 'bg-green-100 text-green-800' :
                          collection.quality_grade === 'A' ? 'bg-blue-100 text-blue-800' :
                          collection.quality_grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {collection.quality_grade}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{formatCurrency(collection.total_amount)}</td>
                      <td className="py-3 px-4">
                        {new Date(collection.collection_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div>Lat: {collection.gps_latitude?.toFixed(4)}</div>
                          <div>Lng: {collection.gps_longitude?.toFixed(4)}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedWarehouseMap;