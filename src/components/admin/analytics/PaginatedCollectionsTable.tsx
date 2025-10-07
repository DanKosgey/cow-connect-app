import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@/utils/iconImports';
import { format } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';

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

interface PaginatedCollectionsTableProps {
  collections: Collection[];
  setSelectedCollection: (collection: Collection) => void;
  getStatusVariant: (status: string) => any;
  formatCurrency: (amount: number) => string;
}

export function PaginatedCollectionsTable({
  collections,
  setSelectedCollection,
  getStatusVariant,
  formatCurrency
}: PaginatedCollectionsTableProps) {
  const GRADE_COLORS = { 'A+': '#10b981', 'A': '#3b82f6', 'B': '#f59e0b', 'C': '#ef4444' };

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    visiblePages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setPageSize,
  } = usePagination({
    totalCount: collections.length,
    pageSize: 20,
    initialPage: 1,
  });

  // Get current page data
  const currentPageData = useMemo(() => {
    return collections.slice(startIndex, endIndex + 1);
  }, [collections, startIndex, endIndex]);

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
    <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-text-light dark:text-text-dark">All Collections</CardTitle>
          <span className="text-sm text-subtle-text-light dark:text-subtle-text-dark">
            Showing {startIndex + 1}-{endIndex + 1} of {collections.length} collections
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">ID</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Date & Time</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Farmer</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Staff</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Liters</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Grade</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Rate</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Amount</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Status</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-subtle-text-light dark:text-subtle-text-dark uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPageData.map((c) => (
                <TableRow key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
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
                  <TableCell className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: GRADE_COLORS[c.quality_grade as keyof typeof GRADE_COLORS] || '#6b7280' }}>
                      {c.quality_grade}
                    </span>
                  </TableCell>
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
                              <div className="flex justify-between">
                                <span className="text-subtle-text-light dark:text-subtle-text-dark">Quality Grade:</span>
                                <Badge variant={c.quality_grade === 'A+' ? 'default' : c.quality_grade === 'A' ? 'secondary' : c.quality_grade === 'B' ? 'outline' : 'destructive'}>
                                  {c.quality_grade}
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
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border-light dark:border-border-dark">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-subtle-text-light dark:text-subtle-text-dark">
                Rows per page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-input-light dark:bg-input-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-md px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={() => goToPage(1)}
                disabled={!hasPreviousPage}
                variant="outline"
                size="sm"
                className="border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={goToPreviousPage}
                disabled={!hasPreviousPage}
                variant="outline"
                size="sm"
                className="border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-1">
                {visiblePages.map((page) => (
                  <Button
                    key={page}
                    onClick={() => goToPage(page)}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className={
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700"
                    }
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <Button
                onClick={goToNextPage}
                disabled={!hasNextPage}
                variant="outline"
                size="sm"
                className="border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => goToPage(totalPages)}
                disabled={!hasNextPage}
                variant="outline"
                size="sm"
                className="border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}