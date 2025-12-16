import React from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Search
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/utils/formatters';
import { CollectorsTable } from './CollectorsTable';

interface CollectorData {
  id: string;
  name: string;
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  totalPenalties: number;
  pendingPayments: number;
  paidPayments: number;
  performanceScore: number;
  lastCollectionDate?: string;
  totalVariance?: number;
  positiveVariances?: number;
  negativeVariances?: number;
  avgVariancePercentage?: number;
  pendingPenalties?: number;
  penaltyStatus?: 'pending' | 'paid';
  collectionsBreakdown?: {
    date: string;
    liters: number;
    status: string;
    approved: boolean;
    feeStatus?: string;
  }[];
}

interface PaymentsTabProps {
  collectors: CollectorData[];
  stats: {
    totalCollectors: number;
    totalPendingAmount: number;
    totalPaidAmount: number;
    totalPenalties: number;
    avgCollectionsPerCollector: number;
  };
  totalGrossEarnings: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  paymentFilter: 'all' | 'pending' | 'paid';
  setPaymentFilter: (filter: 'all' | 'pending' | 'paid') => void;
  filters: {
    minEarnings: number | null;
    maxEarnings: number | null;
    performanceRange: 'all' | 'excellent' | 'good' | 'poor';
    dateRange: { from: string | null; to: string | null };
  };
  setFilters: (filters: any) => void;
  handleMarkAsPaid: (collectorId: string, collectorName: string) => void;
  showPaymentHistory: (collector: CollectorData) => void;
  handleSort: (key: string) => void;
  sortConfig: {
    key: string;
    direction: 'asc' | 'desc';
  };
  expandedCollectors: Record<string, boolean>;
  toggleCollectorExpansion: (collectorId: string) => void;
  loadCollectionsBreakdown: (collectorId: string) => void;
  handleBulkMarkAsPaid: () => void;
  processing: boolean;
  progress: number;
  exportPaymentsToCSV: () => void;
  exportData: (format: 'csv' | 'excel' | 'pdf') => void;
  renderPagination: () => React.ReactNode;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  collectors,
  stats,
  totalGrossEarnings,
  searchTerm,
  setSearchTerm,
  paymentFilter,
  setPaymentFilter,
  filters,
  setFilters,
  handleMarkAsPaid,
  showPaymentHistory,
  handleSort,
  sortConfig,
  expandedCollectors,
  toggleCollectorExpansion,
  loadCollectionsBreakdown,
  handleBulkMarkAsPaid,
  processing,
  progress,
  exportPaymentsToCSV,
  exportData,
  renderPagination
}) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards - Made responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(stats.totalPendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(totalGrossEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">Before penalties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(stats.totalPenalties)}
            </div>
            <p className="text-xs text-muted-foreground">Deducted from earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${totalGrossEarnings - stats.totalPenalties < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.max(0, totalGrossEarnings - stats.totalPenalties))}
            </div>
            <p className="text-xs text-muted-foreground">After penalties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(stats.totalPaidAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Filters - Made responsive */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search payments by collector name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={exportPaymentsToCSV} className="flex items-center gap-1 h-10 px-3" size="sm">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Select onValueChange={(value) => exportData(value as 'csv' | 'excel' | 'pdf')}>
              <SelectTrigger className="w-[120px] h-10">
                <span className="hidden sm:inline">More Formats</span>
                <span className="sm:hidden">Export</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Export Excel</SelectItem>
                <SelectItem value="pdf">Export PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-1 block">Min Earnings</label>
          <Input
            type="number"
            placeholder="0"
            value={filters.minEarnings || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, minEarnings: e.target.value ? Number(e.target.value) : null }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Max Earnings</label>
          <Input
            type="number"
            placeholder="10000"
            value={filters.maxEarnings || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, maxEarnings: e.target.value ? Number(e.target.value) : null }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Performance</label>
          <Select value={filters.performanceRange} onValueChange={(value) => setFilters(prev => ({ ...prev, performanceRange: value as any }))}>
            <SelectTrigger>
              <SelectValue placeholder="Performance Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="excellent">Excellent (80%+)</SelectItem>
              <SelectItem value="good">Good (60-79%)</SelectItem>
              <SelectItem value="poor">Poor (&lt;60%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Date Range</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="date"
                value={filters.dateRange.from || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: e.target.value || null } }))}
              />
            </div>
            <div className="flex-1">
              <Input
                type="date"
                value={filters.dateRange.to || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: e.target.value || null } }))}
              />
            </div>
          </div>
        </div>
        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={() => setFilters({
              minEarnings: null,
              maxEarnings: null,
              performanceRange: 'all',
              dateRange: { from: null, to: null }
            })}
            className="w-full"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Enhanced Collectors Table with Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collector Performance Overview
          </CardTitle>
          <CardDescription>
            Detailed breakdown of collections and earnings per collector (All-time data)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {collectors.length > 0 ? (
            <CollectorsTable
              collectors={collectors}
              onMarkAsPaid={handleMarkAsPaid}
              onShowPaymentHistory={showPaymentHistory}
              onSort={handleSort}
              sortConfig={sortConfig}
              expandedCollectors={expandedCollectors}
              onToggleCollectorExpansion={toggleCollectorExpansion}
              onLoadCollectionsBreakdown={loadCollectionsBreakdown}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No collectors found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add pagination controls */}
      {renderPagination()}
    </div>
  );
};