import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar,
  Download,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle
} from '@/utils/iconImports';
import useToastNotifications from '@/hooks/useToastNotifications';
import { formatCurrency } from '@/utils/formatters';
import { usePaymentBatchData } from '@/hooks/usePaymentBatchData';

interface PaymentBatch {
  batch_id: string;
  batch_name: string;
  period_start: string;
  period_end: string;
  total_farmers: number;
  total_collections: number;
  total_amount: number;
  status: string;
  created_at: string;
  processed_at: string;
  completed_at: string;
  total_credit_used?: number;
  total_net_payment?: number;
}

interface BatchCollection {
  id: string;
  collection_id: string;
  farmer_name: string;
  farmer_phone: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  status: string;
  credit_used?: number;
  net_payment?: number;
}

const PaymentBatchManagement = () => {
  const toast = useToastNotifications();
  const { 
    usePaymentBatches,
    useBatchCollections,
    createPaymentBatch,
    processPaymentBatch,
    exportBatch
  } = usePaymentBatchData();
  
  // Get payment batches with caching
  const { data: batches = [], isLoading: batchesLoading, refetch: refetchBatches } = usePaymentBatches();
  
  // State for selected batch and its collections
  const [selectedBatch, setSelectedBatch] = useState<PaymentBatch | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  
  // Get batch collections with caching
  const { data: batchCollections = [], isLoading: collectionsLoading } = useBatchCollections(selectedBatchId || '');
  
  const loading = batchesLoading || collectionsLoading;
  const processing = createPaymentBatch.isPending || processPaymentBatch.isPending;
  
  const [newBatchPeriod, setNewBatchPeriod] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Update batch collections when selected batch changes
  React.useEffect(() => {
    if (selectedBatch) {
      setSelectedBatchId(selectedBatch.batch_id);
    } else {
      setSelectedBatchId(null);
    }
  }, [selectedBatch]);

  const handleCreateNewBatch = async () => {
    try {
      await createPaymentBatch.mutateAsync({
        start: newBatchPeriod.start,
        end: newBatchPeriod.end
      });
      toast.success('Success', 'Payment batch created successfully!');
      setNewBatchPeriod({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error('Error creating batch:', error);
      toast.error('Error', 'Failed to create payment batch: ' + (error.message || 'Unknown error'));
    }
  };

  const handleProcessBatch = async (batchId: string) => {
    try {
      await processPaymentBatch.mutateAsync(batchId);
      toast.success('Success', 'Payment batch processed successfully with credit deductions!');
    } catch (error: any) {
      console.error('Error processing batch:', error);
      toast.error('Error', 'Failed to process payment batch: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExportBatch = async (batchId: string) => {
    try {
      await exportBatch.mutateAsync(batchId);
      toast.success('Success', 'Batch export initiated. File will be downloaded shortly.');
    } catch (error: any) {
      console.error('Error exporting batch:', error);
      toast.error('Error', 'Failed to export batch: ' + (error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading payment batches...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Batch Management</h1>
            <p className="text-gray-600">Create, process, and manage payment batches for farmers</p>
          </div>

          {/* Create New Batch */}
          <Card className="mb-8 bg-white rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle>Create New Payment Batch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period Start
                  </label>
                  <Input
                    type="date"
                    value={newBatchPeriod.start}
                    onChange={(e) => setNewBatchPeriod(prev => ({...prev, start: e.target.value}))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period End
                  </label>
                  <Input
                    type="date"
                    value={newBatchPeriod.end}
                    onChange={(e) => setNewBatchPeriod(prev => ({...prev, end: e.target.value}))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleCreateNewBatch}
                    disabled={createPaymentBatch.isPending}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    {createPaymentBatch.isPending ? 'Creating...' : 'Create Batch'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batches List */}
          <Card className="bg-white rounded-xl shadow-lg mb-8">
            <CardHeader>
              <CardTitle>Payment Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batches.map((batch) => (
                      <tr 
                        key={batch.batch_id} 
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedBatch?.batch_id === batch.batch_id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedBatch(batch);
                        }}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {batch.batch_name}
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          {new Date(batch.period_start).toLocaleDateString()} - {new Date(batch.period_end).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-gray-900">{batch.total_farmers || 0}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatCurrency(batch.total_amount || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            batch.status === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : batch.status === 'Processing'
                              ? 'bg-blue-100 text-blue-800'
                              : batch.status === 'Failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {batch.status === 'Generated' && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProcessBatch(batch.batch_id);
                                }}
                                disabled={processing}
                                className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                              >
                                {processPaymentBatch.isPending ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                                Process
                              </Button>
                            )}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportBatch(batch.batch_id);
                              }}
                              disabled={exportBatch.isPending}
                              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Export
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {batches.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No payment batches found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Details */}
          {selectedBatch && (
            <Card className="bg-white rounded-xl shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Batch Details: {selectedBatch.batch_name}</CardTitle>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedBatch(null)}
                    className="text-sm"
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Collections</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedBatch.total_collections || 0}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Farmers</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedBatch.total_farmers || 0}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedBatch.total_amount || 0)}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedBatch.status}</p>
                  </div>
                  {/* Add credit information display */}
                  {selectedBatch.total_credit_used > 0 && (
                    <>
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total Credit Used</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedBatch.total_credit_used || 0)}</p>
                      </div>
                      <div className="bg-teal-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Net Payment</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedBatch.total_net_payment || 0)}</p>
                      </div>
                    </>
                  )}
                </div>

                <h3 className="text-lg font-semibold mb-4">Collections in Batch</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Used</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {batchCollections.map((collection) => (
                        <tr key={collection.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {collection.collection_id || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {collection.farmer_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {collection.farmer_phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-900">{(collection.liters || 0).toFixed(2)}L</td>
                          <td className="px-6 py-4 text-gray-900">
                            {formatCurrency(collection.rate_per_liter || 0)}
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            {formatCurrency(collection.total_amount || 0)}
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {formatCurrency(collection.credit_used || 0)}
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            {formatCurrency(collection.net_payment || (collection.total_amount || 0))}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              collection.status === 'Paid'
                                ? 'bg-green-100 text-green-800'
                                : collection.status === 'Verified'
                                ? 'bg-blue-100 text-blue-800'
                                : collection.status === 'Cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {collection.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {batchCollections.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No collections found in this batch</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentBatchManagement;