import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  List,
  Grid,
  Users,
  Loader2
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
      
      {viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
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
              {farmerPaymentSummaries.map((farmer) => {
                const hasCredit = farmer.credit_used > 0;
                const totalDeductions = farmer.total_deductions || 0;
                const isProcessingPayment = processingPayments[farmer.farmer_id] || false;
                const isProcessingAllPayments = processingAllPayments[farmer.farmer_id] || false;
                
                return (
                  <tr key={farmer.farmer_id} className="hover:bg-gray-50">
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
                        {/* Check if there are any unapproved collections for this farmer */}
                        {collections.filter(c => c.farmer_id === farmer.farmer_id && !c.approved_for_payment && c.status !== 'Paid').length > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              const unapprovedCollections = collections.filter(c => 
                                c.farmer_id === farmer.farmer_id && !c.approved_for_payment && c.status !== 'Paid'
                              );
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
                              "Approve All"
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
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        // Grid view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farmerPaymentSummaries.map((farmer) => {
            const isProcessingPayment = processingPayments[farmer.farmer_id] || false;
            const isProcessingAllPayments = processingAllPayments[farmer.farmer_id] || false;
            
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
                      {/* Check if there are any unapproved collections for this farmer */}
                      {collections.filter(c => c.farmer_id === farmer.farmer_id && !c.approved_for_payment && c.status !== 'Paid').length > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            const unapprovedCollections = collections.filter(c => 
                              c.farmer_id === farmer.farmer_id && !c.approved_for_payment && c.status !== 'Paid'
                            );
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
                            "Approve All"
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