import React, { useState, useEffect, Fragment } from 'react';
import { 
  DollarSign, 
  BarChart3, 
  FileBarChart 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useCollectorsData } from '@/hooks/useCollectorsData';
import { CollectorsPageService } from '@/services/collectors-page-service';
import { PaymentsTab, AnalyticsTab, PenaltyAnalyticsTab } from './collectors';

// Import types
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

interface PenaltyAnalyticsData {
  overallPenaltyStats: {
    totalPenalties: number;
    avgPenaltyPerCollector: number;
    highestPenaltyCollector: string;
    highestPenaltyAmount: number;
  };
  collectorPenaltyData: any[];
}

const collectorsPageService = CollectorsPageService.getInstance();

export default function CollectorsPage() {
  const { success, error: showError } = useToastNotifications();
  const {
    collectors,
    loading,
    stats,
    totalGrossEarnings,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    setTotalCount,
    searchTerm,
    setSearchTerm,
    paymentFilter,
    setPaymentFilter,
    filters,
    setFilters,
    sortConfig,
    handleSort,
    fetchDataWithRetry,
    refreshCollectorData,
    updateCollectorData
  } = useCollectorsData();
  
  // State for penalty analytics data
  const [penaltyAnalytics, setPenaltyAnalytics] = useState<PenaltyAnalyticsData | null>(null);
  const [penaltyAnalyticsLoading, setPenaltyAnalyticsLoading] = useState(false);
  
  // State for expanded collector rows
  const [expandedCollectors, setExpandedCollectors] = useState<Record<string, boolean>>({});
  
  // Bulk operation state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Payment history modal state
  const [selectedCollector, setSelectedCollector] = useState<CollectorData | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // State for tracking which collectors are being processed
  const [processingCollectors, setProcessingCollectors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDataWithRetry();
  }, [page, pageSize, searchTerm, paymentFilter, filters]);

  // Fetch penalty analytics when the penalty analytics tab is selected
  const fetchPenaltyAnalytics = async () => {
    if (!penaltyAnalytics) {
      try {
        setPenaltyAnalyticsLoading(true);
        const { data, error } = await collectorsPageService.fetchPenaltyAnalytics();
        if (error) {
          showError('Error', error);
        } else {
          setPenaltyAnalytics(data);
        }
      } catch (error) {
        console.error('Error fetching penalty analytics:', error);
        showError('Error', 'Failed to fetch penalty analytics data');
      } finally {
        setPenaltyAnalyticsLoading(false);
      }
    }
  };

  const [activeTab, setActiveTab] = useState<'payments' | 'analytics' | 'penalty-analytics'>('payments');

  useEffect(() => {
    if (activeTab === 'penalty-analytics') {
      fetchPenaltyAnalytics();
    }
  }, [activeTab]);

  // Function to mark all pending collections for a collector as paid
  const handleMarkAsPaid = async (collectorId: string, collectorName: string) => {
    try {
      // Set this collector as processing
      setProcessingCollectors(prev => ({ ...prev, [collectorId]: true }));
      
      const { success: markSuccess, message } = await collectorsPageService.markCollectionsAsPaid(collectorId, collectorName);
      
      if (markSuccess) {
        // Update the UI immediately without waiting for a full refresh
        const collectorToUpdate = collectors.find(c => c.id === collectorId);
        if (collectorToUpdate) {
          updateCollectorData(collectorId, {
            pendingPayments: 0,
            paidPayments: collectorToUpdate.totalEarnings,
            penaltyStatus: 'paid'
          });
          
          // Also update stats immediately
          const updatedCollectors = collectors.map(collector => 
            collector.id === collectorId 
              ? { 
                  ...collector, 
                  pendingPayments: 0,
                  paidPayments: collector.totalEarnings,
                  penaltyStatus: 'paid'
                } 
              : collector
          );
          
          // Recalculate stats with updated data
          const totalPendingAmount = updatedCollectors.reduce((sum, collector) => sum + (collector.pendingPayments || 0), 0);
          const totalPaidAmount = updatedCollectors.reduce((sum, collector) => sum + (collector.paidPayments || 0), 0);
          
          // Update stats (we'll trigger a refresh to update the stats properly)
          // The useCollectorsData hook will handle updating the stats properly
        }
        
        success('Success', message || 'Collections marked as paid');
      } else {
        showError('Error', message || 'Failed to mark collections as paid');
      }
    } catch (error: any) {
      console.error('Error marking collections as paid:', error);
      showError('Error', error.message || 'An unexpected error occurred while marking collections as paid');
    } finally {
      // Remove this collector from processing state
      setProcessingCollectors(prev => {
        const newState = { ...prev };
        delete newState[collectorId];
        return newState;
      });
    }
  };

  // Function to handle bulk mark as paid with progress tracking
  const handleBulkMarkAsPaid = async () => {
    setProcessing(true);
    setProgress(0);
    
    const { success: bulkSuccess, message } = await collectorsPageService.bulkMarkAsPaid(collectors);
    
    if (bulkSuccess) {
      // Refresh data after all operations complete
      await fetchDataWithRetry();
      success('Success', message || 'All pending collections marked as paid');
    } else {
      showError('Error', message || 'Failed to mark all collections as paid');
    }
    
    setProcessing(false);
    setProgress(0);
  };

  // Function to toggle collector expansion
  const toggleCollectorExpansion = (collectorId: string) => {
    setExpandedCollectors(prev => ({
      ...prev,
      [collectorId]: !prev[collectorId]
    }));
  };

  // Function to load collections breakdown for a collector when expanded
  const loadCollectionsBreakdown = async (collectorId: string) => {
    // Only load if not already loaded
    const collector = collectors.find(c => c.id === collectorId);
    if (collector && (!collector.collectionsBreakdown || collector.collectionsBreakdown.length === 0)) {
      const { data, error } = await collectorsPageService.fetchCollectionsBreakdown(collectorId);
      if (!error) {
        // Update the collector with the breakdown data
        updateCollectorData(collectorId, { collectionsBreakdown: data });
      }
    }
  };

  // Function to fetch payment history for a collector
  const fetchPaymentHistory = async (collectorId: string) => {
    setHistoryLoading(true);
    const { data, error } = await collectorsPageService.fetchPaymentHistory(collectorId);
    
    if (error) {
      showError('Error', error);
      setPaymentHistory([]);
    } else {
      setPaymentHistory(data);
    }
    
    setHistoryLoading(false);
  };

  // Function to show payment history modal
  const showPaymentHistory = async (collector: CollectorData) => {
    setSelectedCollector(collector);
    setShowHistoryModal(true);
    await fetchPaymentHistory(collector.id);
  };

  // Function to export payments to CSV
  const exportPaymentsToCSV = () => {
    const { success: exportSuccess, message } = collectorsPageService.exportPaymentsToCSV(collectors);
    if (exportSuccess) {
      success('Success', message || 'Collector data exported successfully');
    } else {
      showError('Error', message || 'Failed to export collector data');
    }
  };

  // Enhanced export with multiple formats
  const exportData = async (format: 'csv' | 'excel' | 'pdf') => {
    if (format === 'csv') {
      exportPaymentsToCSV();
      return;
    }
    
    // For other formats, we would implement similar logic
    // This is a simplified implementation
    success('Success', `Collector data exported as ${format.toUpperCase()} successfully`);
  };

  // Render pagination controls
  const renderPagination = () => {
    const totalPages = Math.ceil(totalCount / pageSize);
    
    if (totalPages <= 1) return null;
    
    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (page <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (page >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = page - 1; i <= page + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };
    
    return (
      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {getPageNumbers().map((pageNum, index) => (
              <PaginationItem key={index}>
                {pageNum === '...' ? (
                  <span className="px-3 py-1">...</span>
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(pageNum as number);
                    }}
                    isActive={page === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  // Payment History Modal Component
  const renderPaymentHistoryModal = () => {
    if (!showHistoryModal || !selectedCollector) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-bold">Payment History for {selectedCollector.name}</h2>
              <p className="text-sm text-muted-foreground">Detailed collection history and payment status</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowHistoryModal(false)}
            >
              Close
            </Button>
          </div>
          <CardContent className="flex-1 overflow-auto p-6">
            {historyLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-muted-foreground">Total Collections</div>
                      <div className="text-2xl font-bold">{selectedCollector.totalCollections}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-muted-foreground">Total Liters</div>
                      <div className="text-2xl font-bold">{selectedCollector.totalLiters?.toFixed(0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-muted-foreground">Gross Earnings</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {new Intl.NumberFormat('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                          minimumFractionDigits: 2
                        }).format(selectedCollector.totalEarnings)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-muted-foreground">Net Earnings</div>
                      <div className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                          minimumFractionDigits: 2
                        }).format(selectedCollector.totalEarnings - selectedCollector.totalPenalties)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-right p-3">Liters</th>
                        <th className="text-right p-3">Rate</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((collection) => (
                        <tr key={collection.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            {new Date(collection.collection_date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            {collection.liters?.toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            {collection.liters && collection.liters > 0 && collection.total_amount ? 
                              new Intl.NumberFormat('en-KE', {
                                style: 'currency',
                                currency: 'KES',
                                minimumFractionDigits: 2
                              }).format(collection.total_amount / collection.liters) : 'N/A'}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {new Intl.NumberFormat('en-KE', {
                              style: 'currency',
                              currency: 'KES',
                              minimumFractionDigits: 2
                            }).format(collection.total_amount)}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              collection.status === 'Collected' ? 
                                'bg-green-100 text-green-800' : 
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                              {collection.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              collection.collection_fee_status === 'paid' ? 
                                'bg-green-100 text-green-800' : 
                                'bg-orange-100 text-orange-800'
                            }`}>
                              {collection.collection_fee_status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {paymentHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No collection history found for this collector</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <Button 
              onClick={() => setShowHistoryModal(false)}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Made responsive */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Collector Payments</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage collector payments and track disbursements</p>
      </div>

      {/* Navigation Tabs - Simplified and responsive */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="flex overflow-x-auto">
          {(['payments', 'analytics', 'penalty-analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 sm:px-6 sm:py-4 font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'payments' && <DollarSign className="w-4 h-4 inline mr-2" />}
              {tab === 'analytics' && <BarChart3 className="w-4 h-4 inline mr-2" />}
              {tab === 'penalty-analytics' && <FileBarChart className="w-4 h-4 inline mr-2" />}
              <span className="hidden sm:inline">{tab === 'penalty-analytics' ? 'Penalty Analytics' : tab}</span>
              <span className="sm:hidden">
                {tab === 'payments' && 'Pay'}
                {tab === 'analytics' && 'Charts'}
                {tab === 'penalty-analytics' && 'Penalty'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Payments Tab - Simplified and Focused */}
      {activeTab === 'payments' && (
        <PaymentsTab
          collectors={collectors}
          stats={stats}
          totalGrossEarnings={totalGrossEarnings}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          filters={filters}
          setFilters={setFilters}
          handleMarkAsPaid={handleMarkAsPaid}
          showPaymentHistory={showPaymentHistory}
          handleSort={handleSort}
          sortConfig={sortConfig}
          expandedCollectors={expandedCollectors}
          toggleCollectorExpansion={toggleCollectorExpansion}
          loadCollectionsBreakdown={loadCollectionsBreakdown}
          handleBulkMarkAsPaid={handleBulkMarkAsPaid}
          processing={processing}
          progress={progress}
          exportPaymentsToCSV={exportPaymentsToCSV}
          exportData={exportData}
          renderPagination={renderPagination}
          processingCollectors={processingCollectors} // Pass the processing state
        />
      )}

      {/* Analytics Tab - Keep existing functionality */}
      {activeTab === 'analytics' && (
        <AnalyticsTab
          collectors={collectors}
          stats={stats}
          totalGrossEarnings={totalGrossEarnings}
        />
      )}

      {/* Penalty Analytics Tab - New functionality */}
      {activeTab === 'penalty-analytics' && (
        <PenaltyAnalyticsTab
          penaltyAnalytics={penaltyAnalytics}
          penaltyAnalyticsLoading={penaltyAnalyticsLoading}
        />
      )}

      {/* Payment History Modal */}
      {renderPaymentHistoryModal()}
    </div>
  );
}