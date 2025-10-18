import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  DollarSign,
  CheckCircle,
  Clock,
  Calendar,
  User
} from '@/utils/iconImports';
import useToastNotifications from '@/hooks/useToastNotifications';
import { PaymentManagementService } from '@/services/payment-management-service';
import { formatCurrency } from '@/utils/formatters';

interface Collection {
  id: string;
  collection_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

interface Farmer {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
}

const FarmerPaymentDetails = () => {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_collections: 0,
    total_liters: 0,
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0
  });

  useEffect(() => {
    if (farmerId) {
      fetchFarmerData();
      fetchCollections();
    }
  }, [farmerId]);

  const fetchFarmerData = async () => {
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles!user_id (
            full_name,
            phone,
            email
          ),
          bank_account_name,
          bank_account_number,
          bank_name
        `)
        .eq('id', farmerId)
        .single();

      if (error) throw error;

      setFarmer({
        id: data.id,
        full_name: data.profiles?.full_name || 'Unknown Farmer',
        phone: data.profiles?.phone || 'No phone',
        email: data.profiles?.email || 'No email',
        bank_account_name: data.bank_account_name || 'N/A',
        bank_account_number: data.bank_account_number || 'N/A',
        bank_name: data.bank_name || 'N/A'
      });
    } catch (error) {
      console.error('Error fetching farmer data:', error);
      toast.error('Error', 'Failed to fetch farmer data');
    }
  };

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          liters,
          rate_per_liter,
          total_amount,
          collection_date,
          status
        `)
        .eq('farmer_id', farmerId)
        .order('collection_date', { ascending: false });

      if (error) throw error;

      setCollections(data || []);

      // Calculate stats
      const totalCollections = data?.length || 0;
      const totalLiters = data?.reduce((sum, c) => sum + (c.liters || 0), 0) || 0;
      const totalAmount = data?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      const paidAmount = data?.filter(c => c.status === 'Paid')
        .reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;
      const pendingAmount = totalAmount - paidAmount;

      setStats({
        total_collections: totalCollections,
        total_liters: totalLiters,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount
      });
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Error', 'Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (collectionId: string) => {
    try {
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) {
        toast.error('Error', 'Collection not found');
        return;
      }

      const result = await PaymentManagementService.markCollectionAsPaid(
        collectionId, 
        farmerId!, 
        collection
      );

      if (!result.success) {
        throw result.error || new Error('Unknown error occurred');
      }

      toast.success('Success', 'Collection marked as paid successfully!');
      fetchCollections(); // Refresh data
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast.error('Error', 'Failed to mark as paid: ' + (error.message || 'Unknown error'));
    }
  };

  const markAllAsPaid = async () => {
    try {
      const pendingCollections = collections.filter(c => c.status !== 'Paid');
      
      if (pendingCollections.length === 0) {
        toast.show({ title: 'Info', description: 'No pending collections for this farmer' });
        return;
      }

      const result = await PaymentManagementService.markAllFarmerCollectionsAsPaid(
        farmerId!, 
        pendingCollections
      );

      if (!result.success) {
        throw result.error || new Error('Unknown error occurred');
      }

      toast.success('Success', `Marked ${pendingCollections.length} collections as paid successfully!`);
      fetchCollections(); // Refresh data
    } catch (error: any) {
      console.error('Error marking all as paid:', error);
      toast.error('Error', 'Failed to mark all as paid: ' + (error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading farmer details...</p>
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
          <div className="mb-6">
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline" 
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Payment Management
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{farmer?.full_name || 'Farmer Details'}</h1>
                <p className="text-gray-600">{farmer?.phone || 'No phone'} • {farmer?.email || 'No email'}</p>
              </div>
            </div>
          </div>

          {/* Farmer Info Card */}
          <Card className="mb-6 bg-white rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle>Bank Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Bank Name</p>
                  <p className="font-medium">{farmer?.bank_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account Name</p>
                  <p className="font-medium">{farmer?.bank_account_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account Number</p>
                  <p className="font-medium">{farmer?.bank_account_number || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600">Total Collections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_collections}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
              <p className="text-sm text-gray-600">Total Liters</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_liters.toFixed(2)}L</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
              <p className="text-sm text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pending_amount)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
              <p className="text-sm text-gray-600">Paid Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.paid_amount)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_amount)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end mb-6">
            {stats.pending_amount > 0 && (
              <Button
                onClick={markAllAsPaid}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Mark All Pending as Paid
              </Button>
            )}
          </div>

          {/* Collections Table */}
          <Card className="bg-white rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Collection History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {collections.map((collection) => (
                      <tr key={collection.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(collection.collection_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {collection.collection_id || 'N/A'}
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
                        <td className="px-6 py-4">
                          {collection.status !== 'Paid' && (
                            <Button
                              onClick={() => markAsPaid(collection.id)}
                              className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                              Mark Paid
                            </Button>
                          )}
                          {collection.status === 'Paid' && (
                            <span className="text-green-600 font-medium text-sm">✓ Paid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {collections.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No collections found for this farmer</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FarmerPaymentDetails;