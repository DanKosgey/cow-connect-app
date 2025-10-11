import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';
import { PaymentService } from '@/services/payment-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Wallet, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface FarmerPayment {
  id: string;
  farmer_id: string;
  collection_ids: string[];
  total_amount: number;
  approval_status: string;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  farmers: {
    full_name: string;
    id: string;
    phone_number: string;
  } | null;
}

const PaymentHistory: React.FC = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const [farmerPayments, setFarmerPayments] = useState<FarmerPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payment history with increased limit to show more records
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('farmer_payments')
        .select(`
          id,
          farmer_id,
          collection_ids,
          total_amount,
          approval_status,
          approved_at,
          paid_at,
          notes,
          created_at,
          farmers!farmer_payments_farmer_id_fkey (
            full_name,
            id,
            phone_number
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000); // Increased limit to show more payment records

      if (paymentsError) throw paymentsError;
      
      setFarmerPayments(paymentsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showError('Error', String(error?.message || 'Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const result = await PaymentService.markPaymentAsPaid(paymentId, user?.id);
      
      if (!result.success) {
        throw result.error;
      }

      // Refresh data
      await fetchData();

      show({
        title: 'Success',
        description: 'Payment marked as paid successfully'
      });
    } catch (error: any) {
      console.error('Error marking payment as paid:', error);
      showError('Error', String(error?.message || 'Failed to mark payment as paid'));
    }
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">View and manage farmer payment records</p>
      </div>

      {/* Payment History */}
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payment Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmerPayments.length > 0 ? (
                  farmerPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {payment.farmers?.full_name || 'Unknown Farmer'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.farmers?.id || 'No ID'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{payment.collection_ids.length} collections</TableCell>
                      <TableCell className="font-medium">
                        KSh {payment.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={getApprovalStatusColor(payment.approval_status)}
                        >
                          {payment.approval_status.charAt(0).toUpperCase() + 
                           payment.approval_status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.approval_status === 'approved' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleMarkAsPaid(payment.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark as Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No payment history available</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;