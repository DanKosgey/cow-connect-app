import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Milk, 
  Calendar, 
  Search, 
  Filter, 
  Download,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Scale,
  Eye,
  RefreshCw,
  AlertTriangle,
  Share
} from 'lucide-react';
import { Collection } from '@/types';
import apiService from '@/services/ApiService';
import { format } from 'date-fns';
import CollectionDetailsModal from '@/domains/farmers/components/CollectionDetailsModal';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import useLongPress from '@/hooks/useLongPress';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';


interface CollectionFilters {
  dateFrom: string;
  dateTo: string;
  quality: string;
  minVolume: string;
  maxVolume: string;
}

const FarmerCollectionsPage: React.FC<{}> = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<CollectionFilters>({
    dateFrom: '',
    dateTo: '',
    quality: '',
    minVolume: '',
    maxVolume: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [contextMenuCollection, setContextMenuCollection] = useState<Collection | null>(null);
  const itemsPerPage = 10;

  // Use pull-to-refresh hook
  const { elementRef, isRefreshing, pullProgress, refreshIndicatorStyle } = usePullToRefresh({
    onRefresh: async () => {
      await fetchCollections();
    },
    threshold: 80
  });

  // Long press handler for context menu
  const longPressHandlers = useLongPress({
    onLongPress: (e) => {
      // We'll set the context menu collection when the card is pressed
      // This will be handled in the card's touch/mouse handlers
    },
    threshold: 500
  });

  // Fetch collections
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, you would get the farmer ID from the authenticated user
      // For now, we'll use a placeholder
      const farmerId = 'farmer_12345'; // This should come from user context
      
      const response = await apiService.Collections.list(
        itemsPerPage, 
        (currentPage - 1) * itemsPerPage, 
        farmerId
      );
      
      setCollections(response.items || []);
      setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to load collection history');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user, currentPage, filters, fetchCollections]);

  // Filter collections based on filter criteria
  const filteredCollections = useMemo(() => {
    return collections.filter(collection => {
      // Date filters
      if (filters.dateFrom && new Date(collection.timestamp) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(collection.timestamp) > new Date(filters.dateTo)) {
        return false;
      }
      
      // Quality filter
      if (filters.quality && collection.quality_grade !== filters.quality) {
        return false;
      }
      
      // Volume filters
      if (filters.minVolume && collection.liters < parseFloat(filters.minVolume)) {
        return false;
      }
      if (filters.maxVolume && collection.liters > parseFloat(filters.maxVolume)) {
        return false;
      }
      
      return true;
    });
  }, [collections, filters]);

  const handleFilterChange = (field: keyof CollectionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      quality: '',
      minVolume: '',
      maxVolume: ''
    });
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    // Create CSV content
    const headers = ['Date', 'Volume (L)', 'Quality Grade', 'Temperature (°C)', 'Validation Code'];
    const rows = filteredCollections.map(collection => [
      new Date(collection.timestamp).toLocaleDateString(),
      collection.liters,
      collection.quality_grade,
      collection.temperature,
      collection.validation_code
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `collections-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadReceipt = async (collectionId: string) => {
    try {
      // Use the API service to download the receipt
      const blob = await apiService.Collections.downloadReceipt(collectionId);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collection-receipt-${collectionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt. Please try again.');
    }
  };



  const handleDisputeCollection = (collection: Collection) => {
    // TODO: Implement dispute functionality
    console.log('Dispute collection:', collection.id);
    alert(`Dispute collection ${collection.id.substring(0, 8)}...`);
  };

  const handleShareCollection = (collection: Collection) => {
    // TODO: Implement share functionality
    console.log('Share collection:', collection.id);
    alert(`Share collection ${collection.id.substring(0, 8)}...`);
  };

  if (loading && !isRefreshing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-gray-600">Loading collections...</p>
        </div>
      </div>
    );
  }

  if (error && !isRefreshing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Error Loading Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative" ref={elementRef}>
      {/* Pull to Refresh Indicator */}
      <div style={refreshIndicatorStyle} className="flex flex-col items-center">
        <div className="bg-white rounded-full p-2 shadow-lg">
          <RefreshCw 
            className={`h-6 w-6 text-green-600 ${isRefreshing ? 'animate-spin' : ''}`} 
            style={{ transform: `rotate(${pullProgress * 180}deg)` }}
          />
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {isRefreshing ? 'Refreshing...' : pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Collection History</h1>
          <p className="text-gray-600">View your milk collection records and history</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Milk className="h-5 w-5 text-green-600" />
                Collections
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <Label htmlFor="dateFrom" className="text-sm font-medium">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo" className="text-sm font-medium">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="quality" className="text-sm font-medium">Quality Grade</Label>
                  <select
                    id="quality"
                    className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm"
                    value={filters.quality}
                    onChange={(e) => handleFilterChange('quality', e.target.value)}
                  >
                    <option value="">All Grades</option>
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="minVolume" className="text-sm font-medium">Min Volume (L)</Label>
                  <Input
                    id="minVolume"
                    type="number"
                    placeholder="0"
                    value={filters.minVolume}
                    onChange={(e) => handleFilterChange('minVolume', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxVolume" className="text-sm font-medium">Max Volume (L)</Label>
                  <Input
                    id="maxVolume"
                    type="number"
                    placeholder="1000"
                    value={filters.maxVolume}
                    onChange={(e) => handleFilterChange('maxVolume', e.target.value)}
                  />
                </div>
              </div>
            )}
            {Object.values(filters).some(value => value !== '') && (
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {filters.dateFrom && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      From: {new Date(filters.dateFrom).toLocaleDateString()}
                      <button 
                        onClick={() => handleFilterChange('dateFrom', '')}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.dateTo && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      To: {new Date(filters.dateTo).toLocaleDateString()}
                      <button 
                        onClick={() => handleFilterChange('dateTo', '')}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.quality && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Grade: {filters.quality}
                      <button 
                        onClick={() => handleFilterChange('quality', '')}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {(filters.minVolume || filters.maxVolume) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Volume: {filters.minVolume || '0'} - {filters.maxVolume || '∞'}L
                      <button 
                        onClick={() => {
                          handleFilterChange('minVolume', '');
                          handleFilterChange('maxVolume', '');
                        }}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" onClick={clearFilters} className="text-sm">
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collections List */}
        {filteredCollections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Milk className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No collections found</h3>
              <p className="text-gray-500">
                {Object.values(filters).some(value => value !== '') 
                  ? 'No collections match your filters. Try adjusting your search criteria.' 
                  : 'You haven\'t made any milk collections yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCollections.map((collection, index) => (
              <ContextMenu key={collection.id}>
                <ContextMenuTrigger asChild>
                  <Card 
                    className="hover:shadow-md transition-shadow relative mb-4"
                    onTouchStart={(e) => {
                      longPressHandlers.touchStart(e);
                      // Set the collection for context menu on touch start
                      setContextMenuCollection(collection);
                    }}
                    onTouchEnd={longPressHandlers.touchEnd}
                    onMouseDown={(e) => {
                      longPressHandlers.mouseDown(e);
                      // Set the collection for context menu on mouse down
                      setContextMenuCollection(collection);
                    }}
                    onMouseUp={longPressHandlers.mouseUp}
                    onClick={longPressHandlers.click}
                    onContextMenu={longPressHandlers.contextMenu}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-green-100 p-3 rounded-full">
                            <Scale className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {collection.liters}L Milk Collection
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {format(new Date(collection.timestamp), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              {collection.gps_latitude && collection.gps_longitude && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>
                                    {collection.gps_latitude.toFixed(4)}, {collection.gps_longitude.toFixed(4)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                          <Badge 
                            className={
                              collection.quality_grade === 'A' ? 'bg-green-100 text-green-800' : 
                              collection.quality_grade === 'B' ? 'bg-blue-100 text-blue-800' : 
                              'bg-orange-100 text-orange-800'
                            }
                          >
                            Grade {collection.quality_grade}
                          </Badge>
                          <div className="text-sm text-gray-500">
                            Code: {collection.validation_code}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
                        <div>
                          <div className="text-xs text-gray-500">Temperature</div>
                          <div className="font-medium">{collection.temperature}°C</div>
                        </div>
                        {collection.fat_content && (
                          <div>
                            <div className="text-xs text-gray-500">Fat Content</div>
                            <div className="font-medium">{collection.fat_content}%</div>
                          </div>
                        )}
                        {collection.protein_content && (
                          <div>
                            <div className="text-xs text-gray-500">Protein Content</div>
                            <div className="font-medium">{collection.protein_content}%</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedCollection(collection)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem 
                    onClick={() => setSelectedCollection(collection)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={() => handleDisputeCollection(collection)}
                    className="flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Dispute Collection
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={() => handleShareCollection(collection)}
                    className="flex items-center gap-2"
                  >
                    <Share className="h-4 w-4" />
                    Share
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={() => downloadReceipt(collection.id)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Receipt
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Collection Details Modal */}
        {selectedCollection && (
          <CollectionDetailsModal 
            collection={selectedCollection}
            onClose={() => setSelectedCollection(null)}
            onDownloadReceipt={() => downloadReceipt(selectedCollection.id)}
          />
        )}
      </div>
    </div>
  );
};

export default FarmerCollectionsPage;