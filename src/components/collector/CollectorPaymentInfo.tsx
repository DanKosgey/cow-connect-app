import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_liters: number;
  rate_per_liter: number;
  total_earnings: number;
  status: 'pending' | 'paid';
  payment_date?: string;
  created_at: string;
}

export const CollectorPaymentInfo = ({ staffId }: { staffId: string }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarned: 0,
    pendingPayments: 0,
    paidPayments: 0
  });

  useEffect(() => {
    const fetchPaymentData = async () => {
      if (!staffId) return;
      
      try {
        setLoading(true);
        
        // Fetch payment records for this collector
        const { data, error } = await supabase
          .from('collector_payments')
          .select('*')
          .eq('collector_id', staffId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setPayments(data || []);
        
        // Calculate statistics
        const paidPayments = data?.filter(p => p.status === 'paid') || [];
        const pendingPayments = data?.filter(p => p.status === 'pending') || [];
        const totalEarned = paidPayments.reduce((sum, payment) => sum + payment.total_earnings, 0);
        
        setStats({
          totalEarned,
          pendingPayments: pendingPayments.length,
          paidPayments: paidPayments.length
        });
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentData();
  }, [staffId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarned)}</div>
            <p className="text-xs text-muted-foreground">All-time earnings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidPayments}</div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your payment records and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Collections</TableHead>
                  <TableHead className="text-right">Liters</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">{payment.total_collections}</TableCell>
                    <TableCell className="text-right">{payment.total_liters?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.rate_per_liter)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.total_earnings)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={payment.status === 'paid' ? 'default' : 'secondary'}
                        className={payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                      >
                        {payment.status === 'paid' ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Paid
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </div>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.payment_date 
                        ? new Date(payment.payment_date).toLocaleDateString() 
                        : new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>No payment history available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};