import { useState, useEffect } from 'react';
import { Collection } from '@/types';
import { CollectionsAPI } from '@/services/ApiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CollectionHistoryProps {
  farmerId: string;
}

const CollectionHistory = ({ farmerId }: CollectionHistoryProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollectionHistory = async () => {
      try {
        setLoading(true);
        const response = await CollectionsAPI.list(10, 0, farmerId);
        // Extract items from paginated response
        const history = response.items || [];
        setCollections(history);
      } catch (err) {
        console.error('Error fetching collection history:', err);
        setError('Failed to load collection history');
      } finally {
        setLoading(false);
      }
    };

    if (farmerId) {
      fetchCollectionHistory();
    }
  }, [farmerId]);

  if (loading) {
    return (
      <div className="text-center py-4 text-dairy-600">
        Loading collection history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-dairy-900">Recent Collections</h3>
      {collections.length === 0 ? (
        <p className="text-dairy-600 text-sm">No previous collections found</p>
      ) : (
        <div className="space-y-2">
          {collections.map((collection) => (
            <Card key={collection.id} className="border-dairy-200">
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <Scale className="h-4 w-4 text-dairy-blue" />
                    <span className="font-medium">{collection.liters}L</span>
                  </div>
                  <Badge 
                    className={
                      collection.quality_grade === 'A' ? 'bg-dairy-green' : 
                      collection.quality_grade === 'B' ? 'bg-dairy-blue' : 
                      'bg-dairy-orange'
                    }
                  >
                    Grade {collection.quality_grade}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-dairy-600 mt-2">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>
                    {new Date(collection.timestamp).toLocaleDateString()} at{' '}
                    {new Date(collection.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {collection.gps_latitude && collection.gps_longitude && (
                  <div className="flex items-center text-xs text-dairy-600 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>
                      {collection.gps_latitude.toFixed(4)}, {collection.gps_longitude.toFixed(4)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionHistory;