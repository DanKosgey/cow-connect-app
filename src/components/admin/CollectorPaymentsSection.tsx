import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock,
  FileText
} from 'lucide-react';
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
import { collectorEarningsService } from '@/services/collector-earnings-service';
import { collectorRateService } from '@/services/collector-rate-service';
import useToastNotifications from '@/hooks/useToastNotifications';

interface CollectorPayment {
  id: string;
  collector_id: string;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_liters: number;
  rate_per_liter: number;
  total_earnings: number;
  status: 'pending' | 'paid';
  payment_date?: string;
  created_at: string;
  updated_at: string;
  collector_name?: string;
}

interface CollectorInfo {
  id: string;
  full_name: string;
  total_collections: number;
  total_liters: number;
}

const CollectorPaymentsSection = () => {
  const toast = useToastNotifications();
  const [collectorPayments, setCollectorPayments] = useState<CollectorPayment[]>([]);
  const [collectors, setCollectors] = useState<CollectorInfo[]>([]);
  const [collectorRate, setCollectorRate] = useState(0);
  const [selectedCollector, setSelectedCollector] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Fetch collector rate on component mount
  useEffect(() => {
    const fetchCollectorRate = async () => {
      const rate = await collectorRateService.getCurrentRate();
      setCollectorRate(rate);
    };
    
    fetchCollectorRate();
  }, []);

  // Fetch collectors and payments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all collectors with role 'collector'
        // First, get user IDs with collector role
        const { data: userRolesData, error: userRolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'collector')
          .eq('active', true);
        
        if (userRolesError) throw userRolesError;
        
        const collectorUserIds = userRolesData?.map(role => role.user_id) || [];
        
        if (collectorUserIds.length === 0) {
          setCollectors([]);
          setCollectorPayments([]);
          setLoading(false);
          return;
        }
        
        // Then fetch staff records for those users
        const { data: collectorData, error: collectorError } = await supabase
          .from('staff')
          .select(`
            id,
            user_id,
            profiles (
              full_name
            )
          `)
          .in('user_id', collectorUserIds);
        
        if (collectorError) throw collectorError;
        
        // Transform collector data
        const collectorsInfo = collectorData?.map((staff: any) => ({
          id: staff.id,
          full_name: staff.profiles?.full_name || 'Unknown Collector',
          total_collections: 0,
          total_liters: 0
        })) || [];
        
        setCollectors(collectorsInfo);
        
        // Fetch all payments (both pending and paid)
        const { data: allPayments, error: paymentsError } = await supabase
          .from('collector_payments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (paymentsError) throw paymentsError;
        
        const payments = allPayments || [];
        
        // Enrich payments with collector names
        const enrichedPayments = payments.map(payment => {
          const collector = collectorsInfo.find((c: any) => c.id === payment.collector_id);
          return {
            ...payment,
            collector_name: collector?.full_name || 'Unknown Collector'
          };
        });
        
        setCollectorPayments(enrichedPayments as CollectorPayment[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error', 'Failed to fetch collector data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleCalculateEarnings = async () => {
    if (!selectedCollector || !periodStart || !periodEnd) {
      toast.error('Error', 'Please select a collector and specify the period');
      return;
    }
    
    try {
      setProcessing(true);
      
      // Calculate earnings for the selected collector and period
      const earnings = await collectorEarningsService.calculateEarnings(
        selectedCollector,
        periodStart,
        periodEnd
      );
      
      // Create payment record
      const paymentRecord = {
        collector_id: selectedCollector,
        period_start: periodStart,
        period_end: periodEnd,
        total_collections: earnings.totalCollections,
        total_liters: earnings.totalLiters,
        rate_per_liter: earnings.ratePerLiter,
        total_earnings: earnings.totalEarnings,
        status: 'pending' as const
      };
      
      // Record the payment
      const result = await collectorEarningsService.recordPayment(paymentRecord);
      
      if (result) {
        // Add to payments list
        const collector = collectors.find(c => c.id === selectedCollector);
        setCollectorPayments(prev => [{
          ...(result as CollectorPayment),
          collector_name: collector?.full_name || 'Unknown Collector'
        }, ...prev]);
        
        toast.success('Success', 'Payment record created successfully');
        
        // Reset form
        setSelectedCollector('');
        setPeriodStart('');
        setPeriodEnd('');
      } else {
        throw new Error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error calculating earnings:', error);
      toast.error('Error', 'Failed to calculate earnings or record payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const success = await collectorEarningsService.markPaymentAsPaid(paymentId);
      
      if (success) {
        // Update the payment status in the list
        setCollectorPayments(prev => 
          prev.map(payment => 
            payment.id === paymentId 
              ? { ...payment, status: 'paid', payment_date: new Date().toISOString() } 
              : payment
          )
        );
        
        toast.success('Success', 'Payment marked as paid');
      } else {
        throw new Error('Failed to mark payment as paid');
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.error('Error', 'Failed to mark payment as paid');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Collector Rate Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Collector Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(collectorRate)} per liter
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            This rate is applied to all collector earnings calculations
          </p>
        </CardContent>
      </Card>

      {/* Create Payment Record */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Payment Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Collector</label>
              <select
                value={selectedCollector}
                onChange={(e) => setSelectedCollector(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a collector</option>
                {collectors.map(collector => (
                  <option key={collector.id} value={collector.id}>
                    {collector.full_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Period Start</label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Period End</label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleCalculateEarnings}
                disabled={processing || !selectedCollector || !periodStart || !periodEnd}
                className="w-full"
              >
                {processing ? 'Processing...' : 'Calculate & Record'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collectorPayments.filter(p => p.status === 'pending').length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collector</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Collections</TableHead>
                  <TableHead className="text-right">Liters</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collectorPayments.filter(p => p.status === 'pending').map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.collector_name}</TableCell>
                    <TableCell>
                      {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">{payment.total_collections}</TableCell>
                    <TableCell className="text-right">{payment.total_liters?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.rate_per_liter)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.total_earnings)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        onClick={() => handleMarkAsPaid(payment.id)}
                      >
                        Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4" />
              <p>No pending payments</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paid Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collectorPayments.filter(p => p.status === 'paid').length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collector</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Collections</TableHead>
                  <TableHead className="text-right">Liters</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collectorPayments.filter(p => p.status === 'paid').map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.collector_name}</TableCell>
                    <TableCell>
                      {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">{payment.total_collections}</TableCell>
                    <TableCell className="text-right">{payment.total_liters?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.rate_per_liter)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.total_earnings)}</TableCell>
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
    </div>
  );
};

export default CollectorPaymentsSection;