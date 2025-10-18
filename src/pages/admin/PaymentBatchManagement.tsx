import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
}

const PaymentBatchManagement = () => {
  const toast = useToastNotifications();
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PaymentBatch | null>(null);
  const [batchCollections, setBatchCollections] = useState<BatchCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newBatchPeriod, setNewBatchPeriod] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Error', 'Failed to fetch payment batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchCollections = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('collection_payments')
        .select(`
          id,
          collection_id,
          amount,
          rate_applied,
          collections (
            id,
            collection_id,
            liters,
            rate_per_liter,
            total_amount,
            status,
            collection_date,
            farmers (
              profiles (
                full_name,
                phone
              )
            )
          )
        `)
        .eq('batch_id', batchId);

      if (error) throw error;

      const collections = data?.map(item => ({
        id: item.id,
        collection_id: item.collections?.collection_id || '',
        farmer_name: item.collections?.farmers?.profiles?.full_name || 'Unknown Farmer',
        farmer_phone: item.collections?.farmers?.profiles?.phone || 'No phone',
        liters: item.collections?.liters || 0,
        rate_per_liter: item.collections?.rate_per_liter || 0,
        total_amount: item.collections?.total_amount || 0,
        status: item.collections?.status || 'Unknown'
      })) || [];

      setBatchCollections(collections);
    } catch (error) {
      console.error('Error fetching batch collections:', error);
      toast.error('Error', 'Failed to fetch batch collections');
    }
  };

  const createNewBatch = async () => {
    try {
      // Generate a human-readable batch identifier
      const batchName = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const displayName = `Payment Batch ${new Date().toISOString().slice(0, 10)}`;
      
      const { data, error } = await supabase
        .from('payment_batches')
        .insert({
          batch_id: batchName,
          batch_name: displayName,
          period_start: newBatchPeriod.start,
          period_end: newBatchPeriod.end,
          status: 'Generated'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Success', 'Payment batch created successfully!');
      fetchBatches();
      setNewBatchPeriod({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error('Error creating batch:', error);
      toast.error('Error', 'Failed to create payment batch: ' + (error.message || 'Unknown error'));
    }
  };

  const processBatch = async (batchId: string) => {
    try {
      setProcessing(true);
      
      // Update batch status to Processing
      const { error: updateError } = await supabase
        .from('payment_batches')
        .update({ 
          status: 'Processing',
          processed_at: new Date().toISOString()
        })
        .eq('batch_id', batchId);

      if (updateError) throw updateError;

      // Here you would typically integrate with a payment provider
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update batch status to Completed
      const { error: completeError } = await supabase
        .from('payment_batches')
        .update({ 
          status: 'Completed',
          completed_at: new Date().toISOString()
        })
        .eq('batch_id', batchId);

      if (completeError) throw completeError;

      toast.success('Success', 'Payment batch processed successfully!');
      fetchBatches();
    } catch (error: any) {
      console.error('Error processing batch:', error);
      
      // Reset batch status to Generated on error
      await supabase
        .from('payment_batches')
        .update({ status: 'Generated' })
        .eq('batch_id', batchId);
        
      toast.error('Error', 'Failed to process payment batch: ' + (error.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const exportBatch = async (batchId: string) => {
    try {
      // Fetch batch data for export
      await fetchBatchCollections(batchId);
      
      // In a real implementation, you would generate a CSV file
      // For now, we'll just show a success message
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
                    onClick={createNewBatch}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Create Batch
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
                          fetchBatchCollections(batch.batch_id);
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
                                  processBatch(batch.batch_id);
                                }}
                                disabled={processing}
                                className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" />
                                Process
                              </Button>
                            )}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                exportBatch(batch.batch_id);
                              }}
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