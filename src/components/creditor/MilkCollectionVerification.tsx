import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface MilkCollection {
  id: string;
  collection_date: string;
  liters: number;
  total_amount: number;
  status: string;
  approved_for_payment: boolean;
  approved_for_company: boolean;
}

interface MilkCollectionVerificationProps {
  farmerId: string;
  creditRequestId: string;
  requestedAmount: number;
}

const MilkCollectionVerification: React.FC<MilkCollectionVerificationProps> = ({ 
  farmerId, 
  creditRequestId,
  requestedAmount
}) => {
  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFarmerCollections();
  }, [farmerId]);

  const fetchFarmerCollections = async () => {
    try {
      setLoading(true);
      
      // Fetch pending collections for this farmer
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_date,
          liters,
          total_amount,
          status,
          approved_for_payment,
          approved_for_company
        `)
        .eq('farmer_id', farmerId)
        .neq('status', 'Paid')
        .order('collection_date', { ascending: false });

      if (error) {
        throw error;
      }

      setCollections(data || []);
    } catch (err) {
      console.error('Error fetching farmer collections:', err);
      setError('Failed to load farmer collections');
    } finally {
      setLoading(false);
    }
  };

  const getTotalPendingAmount = () => {
    return collections.reduce((sum, collection) => sum + (collection.total_amount || 0), 0);
  };

  const hasApprovedCollections = () => {
    return collections.some(collection => collection.approved_for_company);
  };

  const getVerificationStatus = () => {
    if (collections.length === 0) {
      return {
        status: 'no_collections',
        message: 'No pending collections found for this farmer',
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'bg-red-100 text-red-800'
      };
    }

    if (!hasApprovedCollections()) {
      return {
        status: 'not_verified',
        message: 'Farmer has pending collections that are not yet verified',
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'bg-yellow-100 text-yellow-800'
      };
    }

    const totalPending = getTotalPendingAmount();
    if (totalPending < requestedAmount) {
      return {
        status: 'insufficient',
        message: `Insufficient pending collections (KES ${formatCurrency(totalPending)}) for requested credit (KES ${formatCurrency(requestedAmount)})`,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'bg-orange-100 text-orange-800'
      };
    }

    return {
      status: 'verified',
      message: 'Farmer has sufficient verified collections for this credit request',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800'
    };
  };

  const verificationStatus = getVerificationStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2">Loading collection verification...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            Verification Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Milk Collection Verification
          </span>
          <Badge className={verificationStatus.color}>
            <span className="flex items-center gap-1">
              {verificationStatus.icon}
              {verificationStatus.message}
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-600">Pending Collections</p>
              <p className="text-lg font-semibold">{collections.length}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-600">Total Pending Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(getTotalPendingAmount())}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm text-purple-600">Requested Credit</p>
              <p className="text-lg font-semibold">{formatCurrency(requestedAmount)}</p>
            </div>
          </div>

          {collections.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {collections.map((collection) => (
                    <tr key={collection.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {new Date(collection.collection_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {collection.liters?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(collection.total_amount || 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Badge variant={collection.status === 'Paid' ? 'default' : 'secondary'}>
                          {collection.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {collection.approved_for_company ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MilkCollectionVerification;