import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollections } from '@/hooks/queries';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

interface Collection {
  id: string;
  liters: number;
  quality_grade: string;
  timestamp: string;
  farmer_name: string;
}

const PaginationDemo: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const { data, isLoading, isError, error } = useCollections(limit, (page - 1) * limit);
  
  const totalPages = data ? Math.ceil(data.total / limit) : 1;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collections Pagination Demo</CardTitle>
          <CardDescription>Loading collections...</CardDescription>
        </CardHeader>
        <CardContent>
          <SkeletonLoader type="list" count={5} />
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collections Pagination Demo</CardTitle>
          <CardDescription>Error loading collections</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error: {error?.message}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections Pagination Demo</CardTitle>
        <CardDescription>
          Showing {data?.items.length || 0} of {data?.total || 0} collections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          {data?.items.map((collection: Collection) => (
            <div key={collection.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{collection.farmer_name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(collection.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{collection.liters}L</p>
                  <p className="text-sm text-gray-500">Grade {collection.quality_grade}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center">
          <Button 
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          
          <Button 
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaginationDemo;