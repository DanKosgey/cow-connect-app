import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaginatedCollectionsTable } from './PaginatedCollectionsTable';

interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  quality_grade: string;
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
}

export function CollectionsView({
  filteredCollections,
  collections,
  setSelectedCollection,
  getStatusVariant,
  formatCurrency
}: CollectionsViewProps) {
  return (
    <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-text-light dark:text-text-dark">All Collections</CardTitle>
          <span className="text-sm text-subtle-text-light dark:text-subtle-text-dark">
            Showing {filteredCollections.length} of {collections.length} collections
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <PaginatedCollectionsTable
          collections={filteredCollections}
          setSelectedCollection={setSelectedCollection}
          getStatusVariant={getStatusVariant}
          formatCurrency={formatCurrency}
        />
      </CardContent>
    </Card>
  );
}