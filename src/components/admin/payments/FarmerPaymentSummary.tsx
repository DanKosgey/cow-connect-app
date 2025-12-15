import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  List,
  Grid,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface FarmerPaymentSummaryProps {
  farmerPaymentSummaries: any[];
  collections: any[];
  viewMode: string;
  setViewMode: (mode: string) => void;
  approveCollectionsForPayment: (farmerId: string, collectionIds: string[]) => void;
  markAllFarmerPaymentsAsPaid: (farmerId: string) => void;
  processingPayments?: Record<string, boolean>;
  processingAllPayments?: Record<string, boolean>;
}

const FarmerPaymentSummary: React.FC<FarmerPaymentSummaryProps> = ({
  farmerPaymentSummaries,
  collections,
  viewMode,
  setViewMode,
  approveCollectionsForPayment,
  markAllFarmerPaymentsAsPaid,
  processingPayments = {},
  processingAllPayments = {}
}) => {
  const [expandedFarmers, setExpandedFarmers] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'name' | 'pending' | 'paid' | 'net'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state for farmer list
  const [currentPage, setCurrentPage] = useState(1);
  const farmersPerPage = 20; // Show 20 farmers per page
  
  // Sort and paginate farmers
  const sortedAndPaginatedFarmers = useMemo(() => {
    // Sort farmers
    const sorted = [...farmerPaymentSummaries].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.farmer_name.localeCompare(b.farmer_name);
          break;
        case 'pending':
          comparison = a.pending_payments - b.pending_payments;
          break;
        case 'paid':
          comparison = a.paid_amount - b.paid_amount;
          break;
        case 'net':
          comparison = (a.net_payment || 0) - (b.net_payment || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Paginate
    const startIndex = (currentPage - 1) * farmersPerPage;
    return sorted.slice(startIndex, startIndex + farmersPerPage);
  }, [farmerPaymentSummaries, sortBy, sortOrder, currentPage]);
  
  // Calculate total pages
  const totalPages = Math.ceil(farmerPaymentSummaries.length / farmersPerPage);
  
  // Toggle farmer expansion
  const toggleFarmerExpansion = (farmerId: string) => {
    setExpandedFarmers(prev => ({
      ...prev,
      [farmerId]: !prev[farmerId]
    }));
  };
  
  // Handle sort change
  const handleSortChange = (newSortBy: 'name' | 'pending' | 'paid' | 'net') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top of the summary section
    const summaryElement = document.getElementById('farmer-payment-summary');
    if (summaryElement) {
      summaryElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Farmer Payment Summary</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-indigo-100' : ''}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-indigo-100' : ''}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Sorting controls */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">Sort by:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSortChange('name')}
          className={sortBy === 'name' ? 'bg-indigo-100' : ''}
        >
          Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSortChange('pending')}
          className={sortBy === 'pending' ? 'bg-indigo-100' : ''}
        >
          Pending {sortBy === 'pending' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSortChange('paid')}
          className={sortBy === 'paid' ? 'bg-indigo-100' : ''}
        >
          Paid {sortBy === 'paid' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSortChange('net')}
          className={sortBy === 'net' ? 'bg-indigo-100' : ''}
        >
          Net Payment {sortBy === 'net' && (sortOrder === 'asc' ? '↑' : '↓')}
        </Button>
      </div>
      
      {viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Liters</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndPaginatedFarmers.map((farmer) => {
                const hasCredit = farmer.credit_used > 0;
                const totalDeductions = farmer.total_deductions || 0;
                const isProcessingPayment = processingPayments[farmer.farmer_id] || false;
                const isProcessingAllPayments = processingAllPayments[farmer.farmer_id] || false;
                const isExpanded = expandedFarmers[farmer.farmer_id] || false;
                
                // Get collections for this farmer
                const farmerCollections = collections.filter(c => c.farmer_id === farmer.farmer_id);
                const unapprovedCollections = farmerCollections.filter(c => !c.approved_for_payment && c.status !== 'Paid');
                
                return (
                  <React.Fragment key={farmer.farmer_id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => toggleFarmerExpansion(farmer.farmer_id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{farmer.farmer_name}</div>
                        <div className="text-sm text-gray-500">{farmer.farmer_phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farmer.total_collections}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farmer.total_liters.toFixed(2)}L
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(farmer.pending_payments)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(farmer.paid_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {formatCurrency(totalDeductions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${hasCredit ? 'text-purple-600' : 'text-gray-500'}`}>
                          {formatCurrency(farmer.credit_used)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(farmer.net_payment || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(farmer.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {unapprovedCollections.length > 0 ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                const collectionIds = unapprovedCollections.map(c => c.id);
                                approveCollectionsForPayment(farmer.farmer_id, collectionIds);
                              }}
                              className="mr-2"
                              disabled={isProcessingPayment}
                            >
                              {isProcessingPayment ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                `Approve (${unapprovedCollections.length})`
                              )}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            onClick={() => markAllFarmerPaymentsAsPaid(farmer.farmer_id)}
                            disabled={farmer.pending_payments <= 0 || isProcessingAllPayments}
                          >
                            {isProcessingAllPayments ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Mark Paid"
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={11} className="px-6 py-4 bg-gray-50">
                          <div className="text-sm">
                            <h4 className="font-medium mb-2">Farmer Details:</h4>
                            <p>Bank: {farmer.bank_info}</p>
                            <div className="mt-2">
                              <h4 className="font-medium mb-2">Recent Collections:</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {farmerCollections.slice(0, 3).map(collection => (
                                  <li key={collection.id}>
                                    {collection.collection_date}: {collection.liters.toFixed(2)}L @ {formatCurrency(collection.rate_per_liter)}/L = {formatCurrency(collection.total_amount)}
                                    {collection.status === 'Paid' ? ' (Paid)' : collection.approved_for_payment ? ' (Approved)' : ' (Pending)'}
                                  </li>
                                ))}
                                {farmerCollections.length > 3 && (
                                  <li>+ {farmerCollections.length - 3} more collections</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // Grid view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAndPaginatedFarmers.map((farmer) => {
            const isProcessingPayment = processingPayments[farmer.farmer_id] || false;
            const isProcessingAllPayments = processingAllPayments[farmer.farmer_id] || false;
            const farmerCollections = collections.filter(c => c.farmer_id === farmer.farmer_id);
            const unapprovedCollections = farmerCollections.filter(c => !c.approved_for_payment && c.status !== 'Paid');
            
            return (
              <Card key={farmer.farmer_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{farmer.farmer_name}</CardTitle>
                  <p className="text-sm text-gray-500">{farmer.farmer_phone}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Collections:</span>
                      <span className="text-sm font-medium">{farmer.total_collections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Liters:</span>
                      <span className="text-sm font-medium">{farmer.total_liters.toFixed(2)}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pending:</span>
                      <span className="text-sm font-medium text-yellow-600">
                        {formatCurrency(farmer.pending_payments)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Paid:</span>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(farmer.paid_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Credit Used:</span>
                      <span className="text-sm font-medium text-purple-600">
                        {formatCurrency(farmer.credit_used)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Deductions:</span>
                      <span className="text-sm font-medium text-red-600">
                        {formatCurrency(farmer.total_deductions || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Net Payment:</span>
                      <span className="text-sm font-medium text-blue-600">
                        {formatCurrency(farmer.net_payment || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Total:</span>
                      <span className="text-sm font-bold">
                        {formatCurrency(farmer.total_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex gap-2 mb-2">
                      {unapprovedCollections.length > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            const collectionIds = unapprovedCollections.map(c => c.id);
                            approveCollectionsForPayment(farmer.farmer_id, collectionIds);
                          }}
                          className="flex-1"
                          disabled={isProcessingPayment}
                        >
                          {isProcessingPayment ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Approve (${unapprovedCollections.length})`
                          )}
                        </Button>
                      ) : null}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => markAllFarmerPaymentsAsPaid(farmer.farmer_id)}
                      disabled={farmer.pending_payments <= 0 || isProcessingAllPayments}
                    >
                      {isProcessingAllPayments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Mark Paid"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * farmersPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * farmersPerPage, farmerPaymentSummaries.length)}</span> of{' '}
                <span className="font-medium">{farmerPaymentSummaries.length}</span> farmers
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        pageNum === currentPage
                          ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {farmerPaymentSummaries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No farmer payment data available</p>
        </div>
      )}
    </div>
  );
};

export default FarmerPaymentSummary;