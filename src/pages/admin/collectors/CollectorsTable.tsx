import React, { Fragment, useState } from 'react';
import { 
  Users, 
  ChevronRightIcon, 
  ChevronDownIcon, 
  ListIcon, 
  Loader2Icon 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';

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

interface CollectorsTableProps {
  collectors: CollectorData[];
  onMarkAsPaid: (collectorId: string, collectorName: string) => void;
  onShowPaymentHistory: (collector: CollectorData) => void;
  onSort: (key: string) => void;
  sortConfig: {
    key: string;
    direction: 'asc' | 'desc';
  };
  expandedCollectors: Record<string, boolean>;
  onToggleCollectorExpansion: (collectorId: string) => void;
  onLoadCollectionsBreakdown: (collectorId: string) => void;
  processingCollectors?: Record<string, boolean>; // Add this prop
}

export const CollectorsTable: React.FC<CollectorsTableProps> = ({
  collectors,
  onMarkAsPaid,
  onShowPaymentHistory,
  onSort,
  sortConfig,
  expandedCollectors,
  onToggleCollectorExpansion,
  onLoadCollectionsBreakdown,
  processingCollectors = {} // Add this prop with default value
}) => {
  // Calculate net payment for a collector
  const calculateNetPayment = (collector: CollectorData) => {
    const pendingAmount = collector.pendingPayments || 0;
    const penalties = collector.pendingPenalties || collector.totalPenalties || 0;
    return pendingAmount - penalties;
  };

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead 
                className="w-[120px] cursor-pointer hover:bg-muted"
                onClick={() => onSort('name')}
              >
                Collector
                <ChevronRightIcon className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead 
                className="text-right w-[80px] cursor-pointer hover:bg-muted"
                onClick={() => onSort('totalCollections')}
              >
                Collections
                <ChevronRightIcon className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead 
                className="text-right w-[80px] cursor-pointer hover:bg-muted"
                onClick={() => onSort('totalLiters')}
              >
                Liters
                <ChevronRightIcon className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead className="text-right w-[90px]">Rate/Liter</TableHead>
              <TableHead 
                className="text-right w-[100px] cursor-pointer hover:bg-muted"
                onClick={() => onSort('totalEarnings')}
              >
                Gross
                <ChevronRightIcon className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead className="text-right w-[90px]">Penalties</TableHead>
              {/* Removed Penalty Status column */}
              <TableHead 
                className="text-right w-[100px] cursor-pointer hover:bg-muted"
                onClick={() => onSort('pendingPayments')}
              >
                Pending
                <ChevronRightIcon className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead 
                className="text-right w-[100px] cursor-pointer hover:bg-muted"
                onClick={() => onSort('paidPayments')}
              >
                Paid
                <ChevronRightIcon className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead className="text-right w-[100px]">Net</TableHead>
              <TableHead className="text-right w-[100px]">Mark as Paid</TableHead>
              <TableHead 
                className="text-right w-[100px] cursor-pointer hover:bg-muted"
                onClick={() => onSort('performanceScore')}
              >
                Performance
                <ChevronRightIcon className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead className="text-right w-[120px]">Status</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collectors.map((collector) => {
              const netPayment = calculateNetPayment(collector);
              const isNegativeNetPayment = netPayment < 0;
              const hasPendingPayments = collector.pendingPayments > 0;
              
              return (
                <Fragment key={collector.id}>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      onToggleCollectorExpansion(collector.id);
                      if (!expandedCollectors[collector.id]) {
                        onLoadCollectionsBreakdown(collector.id);
                      }
                    }}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCollectorExpansion(collector.id);
                          if (!expandedCollectors[collector.id]) {
                            onLoadCollectionsBreakdown(collector.id);
                          }
                        }}
                      >
                        {expandedCollectors[collector.id] ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px] truncate">{collector.name}</TableCell>
                    <TableCell className="text-right">{collector.totalCollections}</TableCell>
                    <TableCell className="text-right">{collector.totalLiters.toFixed(0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(collector.ratePerLiter)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(collector.totalEarnings)}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(collector.pendingPenalties || collector.totalPenalties || 0)}
                    </TableCell>
                    {/* Removed Penalty Status cell */}
                    <TableCell className="text-right">
                      {formatCurrency(collector.pendingPayments)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(collector.paidPayments)}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${isNegativeNetPayment ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(netPayment)}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isNegativeNetPayment && hasPendingPayments) {
                            onMarkAsPaid(collector.id, collector.name);
                          }
                        }}
                        disabled={isNegativeNetPayment || !hasPendingPayments || !!processingCollectors[collector.id]}
                        className={`h-8 px-2 text-xs ${isNegativeNetPayment || !hasPendingPayments ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} ${processingCollectors[collector.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {processingCollectors[collector.id] ? (
                          <>
                            <Loader2Icon className="mr-1 h-3 w-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Mark as Paid'
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <div className={`text-2xl font-bold ${isNegativeNetPayment ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(netPayment)}
                        </div>
                        <div className="text-xs text-muted-foreground">After penalty deductions</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {hasPendingPayments ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                          Pending Payments
                        </Badge>
                      ) : collector.paidPayments > 0 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          All Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          No Payments
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowPaymentHistory(collector);
                          }}
                          className="h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCollectors[collector.id] && (
                    <TableRow>
                      <TableCell colSpan={14} className="p-0 bg-muted/50"> {/* Updated colspan from 15 to 14 */}
                        <div className="p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <ListIcon className="h-4 w-4" />
                            Recent Collections Breakdown (Last 20)
                          </h4>
                          {collector.collectionsBreakdown && collector.collectionsBreakdown.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[100px]">Date</TableHead>
                                  <TableHead className="text-right w-[80px]">Liters</TableHead>
                                  <TableHead className="w-[100px]">Status</TableHead>
                                  <TableHead className="w-[120px]">Payment Approval</TableHead>
                                  <TableHead className="w-[100px]">Fee Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {collector.collectionsBreakdown.map((collection, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-xs">
                                      {new Date(collection.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {collection.liters.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={collection.status === 'Collected' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {collection.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {collection.approved ? (
                                        <Badge variant="default" className="text-xs">Approved</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {(collection as any).feeStatus === 'paid' ? (
                                        <Badge variant="default" className="bg-green-100 text-green-8800 text-xs">
                                          Paid
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                          Pending
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <Loader2Icon className="h-4 w-4 animate-spin mx-auto mb-2" />
                              Loading collections data...
                            </div>
                          )}
                          {/* Show collections summary for this collector */}
                          <div className="mt-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                              <h5 className="font-medium">Collections Summary</h5>
                              <Button 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isNegativeNetPayment && hasPendingPayments) {
                                    onMarkAsPaid(collector.id, collector.name);
                                  }
                                }}
                                disabled={isNegativeNetPayment || !hasPendingPayments || !!processingCollectors[collector.id]}
                                className={`text-xs h-8 ${isNegativeNetPayment || !hasPendingPayments ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} ${processingCollectors[collector.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {processingCollectors[collector.id] ? (
                                  <>
                                    <Loader2Icon className="mr-1 h-3 w-3 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  'Mark All Pending as Paid'
                                )}
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="border rounded-lg p-4">
                                <div className="text-sm font-medium text-muted-foreground">Total Collections</div>
                                <div className="text-2xl font-bold">{collector.totalCollections}</div>
                                <div className="text-xs text-muted-foreground">All time collections</div>
                              </div>
                              <div className="border rounded-lg p-4">
                                <div className="text-sm font-medium text-muted-foreground">Total Liters</div>
                                <div className="text-2xl font-bold">{collector.totalLiters?.toFixed(0)}</div>
                                <div className="text-xs text-muted-foreground">All time liters collected</div>
                              </div>
                              <div className="border rounded-lg p-4">
                                <div className="text-sm font-medium text-muted-foreground">Net Earnings</div>
                                <div className={`text-2xl font-bold ${isNegativeNetPayment ? 'text-red-600' : 'text-green-600'}`}>
                                  {formatCurrency(netPayment)}
                                </div>
                                <div className="text-xs text-muted-foreground">After penalty deductions</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};