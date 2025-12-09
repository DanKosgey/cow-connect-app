import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Users,
  RefreshCw,
  Layers,
  Download,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle
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
}

interface CollectionPoint {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  total_amount: number;
  collection_date: string;
  gps_latitude: number;
  gps_longitude: number;
  farmers: {
    full_name: string;
    registration_number: string;
  };
}

interface MapStats {
  totalCollections: number;
  totalLiters: number;
  totalAmount: number;
  uniqueFarmers: number;
  averageLiters: number;
  largestCollection: number;
}

const AdvancedWarehouseMap = ({ warehouses }: { warehouses: Warehouse[] }) => {
  const [collections, setCollections] = useState<CollectionPoint[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [selectedLayer, setSelectedLayer] = useState('carto');
  const [viewMode, setViewMode] = useState<'map' | 'heatmap' | 'clusters'>('clusters');
  const [showStats, setShowStats] = useState(true);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const layersRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const tileLayersRef = useRef<any>({});

  // Calculate statistics
  const stats: MapStats = useMemo(() => {
    const totalLiters = filteredCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
    const totalAmount = filteredCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const uniqueFarmers = new Set(filteredCollections.map(c => c.farmer_id)).size;
    const averageLiters = filteredCollections.length > 0 ? totalLiters / filteredCollections.length : 0;
    const largestCollection = Math.max(...filteredCollections.map(c => c.liters || 0), 0);

    return {
      totalCollections: filteredCollections.length,
      totalLiters,
      totalAmount,
      uniqueFarmers,
      averageLiters,
      largestCollection
    };
  }, [filteredCollections]);

  // Load Leaflet and plugins
  useEffect(() => {
    let isMounted = true;
    
    const loadLeaflet = async () => {
      try {
        const leafletModule = await import('leaflet');
        const leaflet = (leafletModule as any).default ?? leafletModule;
        (window as any).L = leaflet;
        
        if (!isMounted) return;
        
        // Load CSS files
        const cssFiles = [
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css',
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css'
        ];
        
        cssFiles.forEach(href => {
          if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
          }
        });
        
        if (isMounted) {
          setMapInitialized(true);
          initializeMap();
        }
      } catch (err) {
        console.error('Error loading Leaflet:', err);
        if (isMounted) {
          setError('Failed to load map functionality. Please refresh the page.');
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
  const initializeMap = useCallback(() => {
    if (typeof window === 'undefined' || !window.L || !mapRef.current) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      } catch (e) {
        console.warn('Error removing existing map:', e);
      }
    }

    if (mapRef.current.querySelector('.leaflet-container')) {
      mapRef.current.innerHTML = '';
    }

    try {
      const map = window.L.map(mapRef.current, {
        center: [-1.2921, 36.8219],
        zoom: 10,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true
      });

      // Custom zoom control
      window.L.control.zoom({
        position: 'topright'
      }).addTo(map);
      
      // Tile layers with better error handling and fallbacks
      tileLayersRef.current = {
        openstreetmap: window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
          className: 'map-tiles',
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          timeout: 10000,
          keepBuffer: 2,
          updateWhenIdle: false,
          updateWhenZooming: false
        }),
        carto: window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '© CARTO © OpenStreetMap',
          maxZoom: 19,
          subdomains: 'abcd',
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          timeout: 10000
        }),
        satellite: window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri',
          maxZoom: 19,
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          timeout: 10000
        }),
        dark: window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© CARTO',
          maxZoom: 19,
          subdomains: 'abcd',
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          timeout: 10000
        })
      };
      
      tileLayersRef.current[selectedLayer].addTo(map);
      
      // Add tile error handling with automatic fallback
      let tileErrorCount = 0;
      const maxTileErrors = 5;
      
      tileLayersRef.current[selectedLayer].on('tileerror', (error: any) => {
        tileErrorCount++;
        console.warn(`Tile loading error (${tileErrorCount}/${maxTileErrors}):`, error);
        
        if (tileErrorCount >= maxTileErrors && selectedLayer !== 'carto') {
          console.log('Too many tile errors, switching to stable CARTO layer');
          setError('Map tiles failed to load. Switching to stable map provider...');
          setTimeout(() => {
            handleLayerChange('carto');
            setError(null);
          }, 2000);
        }
      });
      
      tileLayersRef.current[selectedLayer].on('tileload', () => {
        // Reset error count on successful tile load
        if (tileErrorCount > 0) {
          tileErrorCount = Math.max(0, tileErrorCount - 1);
        }
      });
      
      mapInstanceRef.current = map;
      layersRef.current = window.L.layerGroup().addTo(map);
      
      addWarehouseMarkers();
      fetchCollectionData();
      
      // Add scale
      window.L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
      
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map');
    }
  }, [selectedLayer]);

  // Add warehouse markers
  const addWarehouseMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.L || !layersRef.current) return;
    
    warehouses.forEach((warehouse, index) => {
      if (warehouse.gps_latitude && warehouse.gps_longitude) {
        const marker = window.L.marker([warehouse.gps_latitude, warehouse.gps_longitude], {
          icon: window.L.divIcon({
            className: 'warehouse-marker',
            html: `<div class="relative">
              <div class="absolute -inset-2 bg-purple-500 rounded-full opacity-20 animate-ping"></div>
              <div class="relative bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold border-3 border-white shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                <span class="text-xs">W${index + 1}</span>
              </div>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          }),
          zIndexOffset: 1000
        }).addTo(layersRef.current);
        
        marker.bindPopup(`
          <div class="p-4 min-w-64">
            <div class="flex items-center gap-2 mb-3 pb-3 border-b border-purple-200">
              <div class="p-2 bg-purple-100 rounded-lg">
                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
              <h3 class="font-bold text-lg text-gray-900">${warehouse.name}</h3>
            </div>
            <div class="space-y-2">
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <p class="text-sm text-gray-600">${warehouse.address}</p>
              </div>
              <div class="mt-3 pt-3 border-t border-gray-200">
                <p class="text-xs text-gray-500">
                  <strong>Coordinates:</strong><br/>
                  ${warehouse.gps_latitude.toFixed(6)}, ${warehouse.gps_longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        `, {
          maxWidth: 320,
          className: 'custom-popup'
        });
        
        markersRef.current.push(marker);
      }
    });
  }, [warehouses]);

  // Fetch collection data
  const fetchCollectionData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch(dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }
      
      const { data, error: fetchError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          liters,
          total_amount,
          collection_date,
          gps_latitude,
          gps_longitude,
          farmers (full_name, registration_number)
        `)
        .eq('approved_for_company', true)
        .not('gps_latitude', 'is', null)
        .not('gps_longitude', 'is', null)
        .gte('collection_date', startDate.toISOString())
        .order('collection_date', { ascending: false })
        .limit(2000);

      if (fetchError) throw fetchError;
      
      const collectionPoints = data.map((c: any) => ({
        id: c.id,
        collection_id: c.collection_id,
        farmer_id: c.farmer_id,
        liters: c.liters,
        total_amount: c.total_amount,
        collection_date: c.collection_date,
        gps_latitude: c.gps_latitude,
        gps_longitude: c.gps_longitude,
        farmers: c.farmers
      }));
      
      setCollections(collectionPoints);
      setFilteredCollections(collectionPoints);
    } catch (err: any) {
      console.error('Error fetching collection data:', err);
      setError(err.message || 'Failed to fetch collection data');
    } finally {
      setLoading(false);
    }
  };

  // Get marker color based on collection size
  const getMarkerColor = (liters: number) => {
    if (liters >= 1000) return { border: '#10b981', bg: '#d1fae5', text: '#059669' };
    if (liters >= 500) return { border: '#3b82f6', bg: '#dbeafe', text: '#2563eb' };
    if (liters >= 100) return { border: '#f59e0b', bg: '#fef3c7', text: '#d97706' };
    return { border: '#ef4444', bg: '#fee2e2', text: '#dc2626' };
  };

  // Add collection markers
  const addCollectionMarkers = async () => {
    if (!mapInstanceRef.current || !window.L || !layersRef.current) return;
    
    const L = window.L;
    
    if (clusterGroupRef.current) {
      try {
        clusterGroupRef.current.clearLayers();
        clusterGroupRef.current.removeFrom(mapInstanceRef.current);
      } catch (e) {
        console.warn('Error clearing cluster group:', e);
      }
    }
    
    try {
      await import('leaflet.markercluster');
      
      if (viewMode === 'clusters') {
        clusterGroupRef.current = L.markerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 60,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          removeOutsideVisibleBounds: true,
          iconCreateFunction: function(cluster: any) {
            const childCount = cluster.getChildCount();
            let size = 'small';
            
            if (childCount >= 100) size = 'large';
            else if (childCount >= 10) size = 'medium';
            
            const dimension = size === 'large' ? 60 : size === 'medium' ? 50 : 40;
            
            return new L.DivIcon({
              html: `<div class="cluster-inner bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center font-bold shadow-2xl border-4 border-white" style="width: ${dimension}px; height: ${dimension}px;">
                <div class="text-center">
                  <div class="text-lg">${childCount}</div>
                  <div class="text-xs opacity-90">points</div>
                </div>
              </div>`,
              className: `marker-cluster marker-cluster-${size}`,
              iconSize: new L.Point(dimension, dimension)
            });
          }
        });
        
        clusterGroupRef.current.addTo(mapInstanceRef.current);
      }
      
      filteredCollections.forEach(collection => {
        if (collection.gps_latitude && collection.gps_longitude) {
          const colors = getMarkerColor(collection.liters);
          
          const marker = L.marker([collection.gps_latitude, collection.gps_longitude], {
            icon: L.divIcon({
              className: 'collection-marker',
              html: `<div class="relative group">
                <div class="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-30 transition-opacity" style="background-color: ${colors.border};"></div>
                <div class="relative bg-white rounded-full w-9 h-9 flex items-center justify-center font-bold shadow-xl hover:scale-125 transition-all duration-200 cursor-pointer" 
                     style="border: 3px solid ${colors.border};">
                  <div class="w-4 h-4 rounded-full" style="background-color: ${colors.border};"></div>
                </div>
              </div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            })
          });
          
          const collectionDate = new Date(collection.collection_date);
          const formattedDate = collectionDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          marker.bindPopup(`
            <div class="p-4 min-w-80">
              <div class="flex items-start justify-between mb-4 pb-3 border-b border-gray-200">
                <div>
                  <h3 class="font-bold text-lg text-gray-900">${collection.farmers?.full_name || 'Unknown Farmer'}</h3>
                  <p class="text-sm text-gray-500 mt-1">Reg: ${collection.farmers?.registration_number || 'N/A'}</p>
                </div>
                <div class="px-3 py-1 rounded-full text-xs font-semibold" style="background-color: ${colors.bg}; color: ${colors.text};">
                  ${collection.liters}L
                </div>
              </div>
              <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-blue-50 p-3 rounded-lg">
                    <p class="text-xs text-blue-600 font-medium mb-1">Collection ID</p>
                    <p class="text-sm font-bold text-blue-900">${collection.collection_id}</p>
                  </div>
                  <div class="bg-green-50 p-3 rounded-lg">
                    <p class="text-xs text-green-600 font-medium mb-1">Amount</p>
                    <p class="text-sm font-bold text-green-900">KES ${Math.round(collection.total_amount).toLocaleString()}</p>
                  </div>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg">
                  <p class="text-xs text-gray-600 font-medium mb-1">Collection Date</p>
                  <p class="text-sm font-semibold text-gray-900">${formattedDate}</p>
                </div>
                <div class="pt-3 border-t border-gray-200">
                  <p class="text-xs text-gray-500">
                    <strong>GPS:</strong> ${collection.gps_latitude.toFixed(6)}, ${collection.gps_longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          `, {
            maxWidth: 350,
            className: 'custom-popup'
          });
          
          marker.on('mouseover', function() {
            this.openPopup();
          });
          
          if (viewMode === 'clusters' && clusterGroupRef.current) {
            clusterGroupRef.current.addLayer(marker);
          } else {
            marker.addTo(layersRef.current);
          }
          
          markersRef.current.push(marker);
        }
      });
      
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    } catch (error) {
      console.error('Error adding markers:', error);
      setError('Failed to load map markers');
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...collections];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(collection => 
        collection.farmers?.full_name.toLowerCase().includes(term) ||
        collection.collection_id.toLowerCase().includes(term) ||
        collection.farmers?.registration_number.toLowerCase().includes(term)
      );
    }
    
    setFilteredCollections(filtered);
  }, [collections, searchTerm]);

  // Update map when filtered collections change
  useEffect(() => {
    if (mapInitialized && mapInstanceRef.current) {
      addCollectionMarkers();
    }
  }, [filteredCollections, mapInitialized, viewMode]);

  // Refresh data when date range changes
  useEffect(() => {
    if (mapInitialized) {
      fetchCollectionData();
    }
  }, [dateRange, mapInitialized]);

  // Handle layer change
  const handleLayerChange = (layer: string) => {
    if (mapInstanceRef.current && tileLayersRef.current) {
      Object.values(tileLayersRef.current).forEach((l: any) => {
        mapInstanceRef.current.removeLayer(l);
      });
      tileLayersRef.current[layer].addTo(mapInstanceRef.current);
      setSelectedLayer(layer);
    }
  };

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(Math.round(num));
  };

  // Format currency without KES prefix for cleaner display
  const formatCleanCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Controls */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-500" />
              Collection Points Map
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {showStats ? 'Hide' : 'Show'} Stats
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Search Collections</Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Farmer, ID, or registration..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date Range</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'today', label: 'Today', icon: Calendar },
                  { key: 'week', label: '7 Days' },
                  { key: 'month', label: '30 Days' },
                  { key: '90days', label: '90 Days' },
                  { key: 'year', label: 'Year' }
                ].map(range => (
                  <Button
                    key={range.key}
                    variant={dateRange === range.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange(range.key)}
                    className="text-xs"
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">View Mode</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'clusters', label: 'Clusters', icon: Layers },
                  { key: 'map', label: 'Individual' }
                ].map(mode => (
                  <Button
                    key={mode.key}
                    variant={viewMode === mode.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode(mode.key as any)}
                    className="gap-1 text-xs"
                  >
                    {mode.icon && <mode.icon className="h-3 w-3" />}
                    {mode.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Map Layer Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-sm font-medium">Map Style:</Label>
            {[
              { key: 'carto', label: 'Street (Stable)' },
              { key: 'openstreetmap', label: 'OSM' },
              { key: 'satellite', label: 'Satellite' },
              { key: 'dark', label: 'Dark' }
            ].map(layer => (
              <Button
                key={layer.key}
                variant={selectedLayer === layer.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLayerChange(layer.key)}
                className="text-xs"
              >
                {layer.label}
              </Button>
            ))}
          </div>
          
          {/* Map Controls */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="gap-1"
            >
              <ZoomIn className="h-4 w-4" />
              Zoom In
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="gap-1"
            >
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => mapInstanceRef.current?.setView([-1.2921, 36.8219], 10)}
              className="gap-1"
            >
              <Navigation className="h-4 w-4" />
              Reset View
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setError(null);
                fetchCollectionData();
              }}
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          {/* Map Container */}
          <div className="relative border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg" style={{ height: '650px' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} className="z-0" />
            {!mapInitialized && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 z-10">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                  <p className="text-gray-700 font-semibold text-lg">Loading Interactive Map...</p>
                  <p className="text-gray-500 text-sm mt-2">Preparing your collection points</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 max-w-md">
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 shadow-lg">
                  <div className="flex items-start gap-3">
<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-700 font-semibold mb-1">Map Error</p>
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Enhanced Statistics */}
          {showStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500 rounded-lg shadow">
                      <Droplets className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-blue-700 font-semibold uppercase tracking-wide whitespace-nowrap">Collections</p>
                      <p className="text-lg font-bold text-blue-900">{formatNumber(stats.totalCollections)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500 rounded-lg shadow">
                      <Droplets className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-green-700 font-semibold uppercase tracking-wide whitespace-nowrap">Total Liters</p>
                      <p className="text-lg font-bold text-green-900">{formatNumber(stats.totalLiters)}L</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500 rounded-lg shadow">
                      <WarehouseIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-purple-700 font-semibold uppercase tracking-wide whitespace-nowrap">Warehouses</p>
                      <p className="text-lg font-bold text-purple-900">{warehouses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-yellow-500 rounded-lg shadow">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-yellow-700 font-semibold uppercase tracking-wide whitespace-nowrap">Farmers</p>
                      <p className="text-lg font-bold text-yellow-900">{formatNumber(stats.uniqueFarmers)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500 rounded-lg shadow">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-indigo-700 font-semibold uppercase tracking-wide whitespace-nowrap">Avg Liters</p>
                      <p className="text-lg font-bold text-indigo-900">{formatNumber(stats.averageLiters)}L</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-pink-500 rounded-lg shadow">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-pink-700 font-semibold uppercase tracking-wide whitespace-nowrap">Revenue</p>
                      <p className="text-lg font-bold text-pink-900">{formatCleanCurrency(stats.totalAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Collection Points List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-500" />
            Recent Collection Points
            <Badge variant="secondary" className="ml-2">{filteredCollections.length} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"></div>
                <p className="text-gray-600 font-medium">Loading collection data...</p>
              </div>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium text-lg">No collection points found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your search or date filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Collection ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Farmer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Liters</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollections.slice(0, 15).map((collection, index) => {
                    const colors = getMarkerColor(collection.liters);
                    return (
                      <tr 
                        key={collection.id} 
                        className={`border-b hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="py-3 px-4 font-mono text-sm">{collection.collection_id}</td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-semibold text-gray-900">{collection.farmers?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{collection.farmers?.registration_number || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            className="font-semibold" 
                            style={{ 
                              backgroundColor: colors.bg, 
                              color: colors.text,
                              borderColor: colors.border 
                            }}
                          >
                            {formatNumber(collection.liters)}L
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-semibold text-green-700">{formatCurrency(collection.total_amount)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(collection.collection_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs font-mono text-gray-500">
                            <div>{collection.gps_latitude?.toFixed(4)}</div>
                            <div>{collection.gps_longitude?.toFixed(4)}</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredCollections.length > 15 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Showing 15 of {formatNumber(filteredCollections.length)} collection points
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedWarehouseMap;