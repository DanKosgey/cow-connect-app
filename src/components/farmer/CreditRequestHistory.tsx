import React, { useState, useEffect } from 'react';
import { Clock, PackageCheck, PackageX, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AgrovetInventoryService } from '@/services/agrovet-inventory-service';

interface CreditRequest {
  id: string;
  products: {
    name: string;
    unit: string;
  };
  packaging_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
}

const CreditRequestHistory = () => {
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('credit_requests')
        .select(`
          id,
          quantity,
          unit_price,
          total_amount,
          status,
          created_at,
          processed_at,
          notes,
          packaging_id,
          products (
            name,
            unit
          )
        `)
        .eq('farmer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit request history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'disbursed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'disbursed': return <PackageCheck className="w-4 h-4" />;
      case 'rejected': return <PackageX className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p>Loading request history...</p>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-8 text-center">
        <PackageCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          No credit requests yet
        </h3>
        <p className="text-gray-600">
          Your credit request history will appear here once you make requests.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{request.products.name}</h3>
              <p className="text-sm text-gray-600">
                {request.quantity} units @ KES {request.unit_price.toLocaleString()} each
              </p>
              {request.packaging_id && (
                <p className="text-xs text-gray-500 mt-1">
                  Packaging ID: {request.packaging_id.substring(0, 8)}...
                </p>
              )}
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                {getStatusIcon(request.status)}
                <span className="capitalize">{request.status}</span>
              </span>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(request.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Amount</span>
              <span className="text-lg font-semibold text-green-600">
                KES {request.total_amount.toLocaleString()}
              </span>
            </div>
          </div>

          {request.notes && (
            <div className="p-3 bg-blue-50 rounded-lg mb-4">
              <p className="text-sm font-medium text-blue-800">Notes:</p>
              <p className="text-sm text-blue-700">{request.notes}</p>
            </div>
          )}

          {request.processed_at && (
            <div className={`p-3 rounded-lg ${
              request.status === 'disbursed' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className={`text-sm ${
                request.status === 'disbursed' ? 'text-green-800' : 'text-red-800'
              }`}>
                <span className="font-medium">
                  {request.status === 'disbursed' ? 'Disbursed' : 'Rejected'} on:
                </span>{' '}
                {new Date(request.processed_at).toLocaleString()}
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default CreditRequestHistory;