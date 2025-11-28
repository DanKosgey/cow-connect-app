import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  Milk, 
  Calendar,
  FileText
} from 'lucide-react';
import { collectorEarningsService } from '@/services/collector-earnings-service';
import { formatCurrency } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface EarningsData {
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  periodStart: string;
  periodEnd: string;
}

export default function CollectorEarningsPage() {
  const { user } = useAuth();
  const [currentEarnings, setCurrentEarnings] = useState<EarningsData | null>(null);
  const [allTimeEarnings, setAllTimeEarnings] = useState<EarningsData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get staff info to get staff ID
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (staffError) throw staffError;
        
        const staffId = staffData.id;
        
        // Get current month earnings
        const current = await collectorEarningsService.getEarningsSummary(staffId);
        setCurrentEarnings(current);
        
        // Get all-time earnings
        const allTime = await collectorEarningsService.getAllTimeEarnings(staffId);
        setAllTimeEarnings(allTime);
        
        // Get payment history
        const history = await collectorEarningsService.getPaymentHistory(staffId);
        setPaymentHistory(history);
      } catch (error) {
        console.error('Error fetching earnings data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Earnings & Payments</h1>
        <p className="text-muted-foreground">View your collection earnings and payment history</p>
      </div>

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Month Earnings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentEarnings ? formatCurrency(currentEarnings.totalEarnings) : 'KSh 0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentEarnings?.totalCollections || 0} collections, {currentEarnings?.totalLiters?.toFixed(2) || '0.00'}L
            </p>
          </CardContent>
        </Card>

        {/* Rate Per Liter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Per Liter</CardTitle>
            <Milk className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentEarnings ? formatCurrency(currentEarnings.ratePerLiter) : 'KSh 0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Current payment rate</p>
          </CardContent>
        </Card>

        {/* All-Time Collections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All-Time Collections</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allTimeEarnings?.totalCollections || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {allTimeEarnings?.totalLiters?.toFixed(2) || '0.00'} liters collected
            </p>
          </CardContent>
        </Card>

        {/* All-Time Earnings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All-Time Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allTimeEarnings ? formatCurrency(allTimeEarnings.totalEarnings) : 'KSh 0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Total earnings to date</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your payment records and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
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
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">{payment.total_collections}</TableCell>
                    <TableCell className="text-right">{payment.total_liters?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.rate_per_liter)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.total_earnings)}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.payment_date 
                        ? new Date(payment.payment_date).toLocaleDateString() 
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>No payment history available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            How Earnings Are Calculated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <h3 className="font-medium">Collection Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  All milk collections you record are tracked in the system
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <h3 className="font-medium">Rate Application</h3>
                <p className="text-sm text-muted-foreground">
                  The current rate per liter is applied to your total collections
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <h3 className="font-medium">Payment Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Payments are processed by administrators and marked as paid when complete
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}