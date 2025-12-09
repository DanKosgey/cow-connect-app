import React, { memo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaginatedCollectionsTable } from './PaginatedCollectionsTable';
import { AlertCircle, Activity } from '@/utils/iconImports';
import { supabase } from '@/integrations/supabase/client';

interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  farmers: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
  staff: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface CollectionsViewProps {
  filteredCollections: Collection[];
  collections: Collection[];
  setSelectedCollection: (collection: Collection) => void;
  getStatusVariant: (status: string) => any;
  formatCurrency: (amount: number) => string;
  error?: string | null;
  isLoading?: boolean;
  refreshData?: () => void;
}

export const CollectionsView = memo(({
  filteredCollections,
  collections,
  setSelectedCollection,
  getStatusVariant,
  formatCurrency,
  error,
  isLoading,
  refreshData
}: CollectionsViewProps) => {
  const [authError, setAuthError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Check for authentication issues
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setAuthError(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setAuthError(true);
      }
    };

    // Only show auth error if we have no collections and it's been a while
    if (collections.length === 0 && !isLoading) {
      const timer = setTimeout(() => {
        checkAuth();
      }, 2000); // Wait 2 seconds before checking auth status
      
      return () => clearTimeout(timer);
    }
  }, [collections.length, isLoading]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (refreshData) {
        await refreshData();
      } else {
        // Force a session refresh
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Error refreshing session:', error);
        } else {
          // Reload the page to re-fetch data
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error during retry:', error);
    } finally {
      setRetrying(false);
    }
  };

  // Show auth error message if we detect authentication issues
  if (authError && collections.length === 0) {
    return (
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-text-light dark:text-text-dark">All Collections</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-light dark:text-text-dark mb-1">Authentication Required</h3>
            <p className="text-subtle-text-light dark:text-subtle-text-dark mb-4">
              Unable to load collections data due to authentication issues.
            </p>
            <p className="text-sm text-subtle-text-light dark:text-subtle-text-dark mb-6">
              This may be due to an expired session or rate limiting. Please try refreshing your session.
            </p>
            <Button 
              onClick={handleRetry}
              disabled={retrying}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Activity className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Refreshing...' : 'Refresh Session'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error message if there's an error from the hook
  if (error) {
    return (
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark overflow-hidden shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-text-light dark:text-text-dark">All Collections</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-light dark:text-text-dark mb-1">Error Loading Collections</h3>
            <p className="text-subtle-text-light dark:text-subtle-text-dark mb-4">
              {error}
            </p>
            <Button 
              onClick={handleRetry}
              disabled={retrying}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Activity className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Try Again'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark overflow-hidden shadow-xl rounded-2xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-t-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-text-light dark:text-text-dark text-2xl">All Collections</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <span className="text-sm text-subtle-text-light dark:text-subtle-text-dark bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full">
              Showing {filteredCollections.length} of {collections.length} collections
            </span>
            <Button 
              onClick={handleRetry}
              disabled={retrying}
              variant="outline"
              className="border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-xl shadow"
            >
              <Activity className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {collections.length === 0 && !authError && !error && !isLoading ? (
          <div className="text-center py-16">
            <AlertCircle className="h-20 w-20 text-subtle-text-light dark:text-subtle-text-dark mx-auto mb-6" />
            <h3 className="text-xl font-medium text-text-light dark:text-text-dark mb-2">No collections found</h3>
            <p className="text-subtle-text-light dark:text-subtle-text-dark mb-6 max-w-md mx-auto">
              Try adjusting your search or filter criteria to find the collections you're looking for.
            </p>
            <Button 
              onClick={handleRetry}
              disabled={retrying}
              variant="outline"
              className="flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
            >
              <Activity className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        ) : (
          <PaginatedCollectionsTable
            collections={filteredCollections}
            setSelectedCollection={setSelectedCollection}
            getStatusVariant={getStatusVariant}
            formatCurrency={formatCurrency}
          />
        )}
      </CardContent>
    </Card>
  );
});