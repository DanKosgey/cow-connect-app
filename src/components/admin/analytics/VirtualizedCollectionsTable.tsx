import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, AlertCircle } from '@/utils/iconImports';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

interface VirtualizedCollectionsTableProps {
  collections: Collection[];
  setSelectedCollection: (collection: Collection) => void;
  getStatusVariant: (status: string) => any;
  formatCurrency: (amount: number) => string;
}

const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 40;

const VirtualizedCollectionsTable: React.FC<VirtualizedCollectionsTableProps> = ({
  collections,
  setSelectedCollection,
  getStatusVariant,
  formatCurrency
}) => {
  const GRADE_COLORS = { 'A+': '#10b981', 'A': '#3b82f6', 'B': '#f59e0b', 'C': '#ef4444' };

  // Memoize the item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    collections,
    setSelectedCollection,
    getStatusVariant,
    formatCurrency,
    GRADE_COLORS
  }), [collections, setSelectedCollection, getStatusVariant, formatCurrency]);

  // Render a single row in the virtualized list
  const Row: React.FC<{ index: number; style: React.CSSProperties }> = ({ index, style }) => {
    const c = collections[index];
    
    return (
      <TableRow 
        key={c.id} 
        style={style}
        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition absolute"
      >
        <TableCell className="px-6 py-4 text-sm font-mono text-text-light dark:text-text-dark">{c.collection_id}</TableCell>
        <TableCell className="px-6 py-4 text-sm text-subtle-text-light dark:text-subtle-text-dark">
          <div>{format(new Date(c.collection_date), 'MMM dd, yyyy')}</div>
          <div className="text-xs text-subtle-text-light dark:text-subtle-text-dark">{format(new Date(c.collection_date), 'HH:mm')}</div>
        </TableCell>
        <TableCell className="px-6 py-4 text-sm font-medium text-text-light dark:text-text-dark">
          {c.farmers?.profiles?.full_name || 'Unknown'}
        </TableCell>
        <TableCell className="px-6 py-4 text-sm text-subtle-text-light dark:text-subtle-text-dark">
          {c.staff?.profiles?.full_name || 'Unknown'}
        </TableCell>
        <TableCell className="px-6 py-4 text-sm font-medium text-blue-600">{c.liters}L</TableCell>
        <TableCell className="px-6 py-4 text-sm text-text-light dark:text-text-dark">{formatCurrency(c.rate_per_liter)}</TableCell>
        <TableCell className="px-6 py-4 text-sm font-medium text-green-600">{formatCurrency(c.total_amount)}</TableCell>
        <TableCell className="px-6 py-4">
          <Badge variant={getStatusVariant(c.status)}>
            {c.status}
          </Badge>
        </TableCell>
        <TableCell className="px-6 py-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedCollection(c)}
                className="border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark border-border-light dark:border-border-dark">
              <DialogHeader>
                <DialogTitle className="text-text-light dark:text-text-dark">Collection Details</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div>
                  <h3 className="font-semibold text-text-light dark:text-text-dark mb-3">Collection Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Collection ID:</span>
                      <span className="font-medium text-text-light dark:text-text-dark">{c.collection_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Date:</span>
                      <span className="font-medium text-text-light dark:text-text-dark">{format(new Date(c.collection_date), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Status:</span>
                      <Badge variant={getStatusVariant(c.status)}>
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-text-light dark:text-text-dark mb-3">Quantity & Payment</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Liters:</span>
                      <span className="font-medium text-text-light dark:text-text-dark">{c.liters}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Rate per Liter:</span>
                      <span className="font-medium text-text-light dark:text-text-dark">{formatCurrency(c.rate_per_liter)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Total Amount:</span>
                      <span className="font-medium text-green-600">{formatCurrency(c.total_amount)}</span>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-text-light dark:text-text-dark mb-3">Farmer Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Name:</span>
                      <span className="font-medium text-text-light dark:text-text-dark">{c.farmers?.profiles?.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Phone:</span>
                      <span className="font-medium text-text-light dark:text-text-dark">{c.farmers?.profiles?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-text-light dark:text-text-dark mb-3">Staff Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-subtle-text-light dark:text-subtle-text-dark">Name:</span>
                      <span className="font-medium text-text-light dark:text-text-dark">{c.staff?.profiles?.full_name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                {c.gps_latitude && c.gps_longitude && (
                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-text-light dark:text-text-dark mb-3">Location</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-subtle-text-light dark:text-subtle-text-dark">Latitude:</span>
                        <span className="font-medium text-text-light dark:text-text-dark">{c.gps_latitude}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-subtle-text-light dark:text-subtle-text-dark">Longitude:</span>
                        <span className="font-medium text-text-light dark:text-text-dark">{c.gps_longitude}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TableCell>
      </TableRow>
    );
  };

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-subtle-text-light dark:text-subtle-text-dark mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-light dark:text-text-dark mb-1">No collections found</h3>
        <p className="text-subtle-text-light dark:text-subtle-text-dark">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader style={{ height: HEADER_HEIGHT }}>
          <TableRow className="bg-gray-50 dark:bg-gray-800" style={{ height: HEADER_HEIGHT }}>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">ID</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Date & Time</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Farmer</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Staff</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Liters</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Rate</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Amount</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Status</TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <List
            height={Math.min(600, collections.length * ROW_HEIGHT + 50)}
            itemCount={collections.length}
            itemSize={ROW_HEIGHT}
            itemData={itemData}
            width="100%"
          >
            {Row}
          </List>
        </TableBody>
      </Table>
    </div>
  );
};

export default VirtualizedCollectionsTable;