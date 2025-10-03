import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useToastNotifications from '@/hooks/useToastNotifications';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter,
  Download,
  Calculator,
  Receipt,
  FileSpreadsheet,
  RefreshCw,
  Plus
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

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
  processed_at?: string;
  completed_at?: string;
}

interface FarmerPayment {
  farmer_id: string;
  farmer_name: string;
  national_id: string;
  total_liters: number;
  base_amount: number;
  quality_bonus: number;
  deductions: number;
  final_amount: number;
  collections_count: number;
  avg_quality_score: number;
  period_start: string;
  period_end: string;
}

interface CollectionSummary {
  farmer_id: string;
  farmer_name: string;
  collections: Array<{
    collection_id: string;
    liters: number;
    quality_grade: string;
    rate_per_liter: number;
    total_amount: number;
    collection_date: string;
  }>;
}

const PaymentProcessing = () => {
  const toast = useToastNotifications();
  
  // Payment batch state
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [currentBatch, setCurrentBatch] = useState<PaymentBatch | null>(null);
  const [batchName, setBatchName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  
  // Payment calculation state
  const [farmerPayments, setFarmerPayments] = useState<FarmerPayment[]>([]);
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PaymentBatch | null>(null);
  
  // Processing state
  const [loading, setLoading] = useState(false);
  const [processingPayments, setProcessingPayments] = useState(false);
  const [currentTab, setCurrentTab] = useState('batches');
  
  // Current period calculations
  const currentDate = new Date();
  const defaultPeriodStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const defaultPeriodEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  useEffect(() => {
    fetchPaymentBatches();
    if (periodStart === '' && periodEnd === '') {
      setPeriodStart(defaultPeriodStart);
      setPeriodEnd(defaultPeriodEnd);
    }
  }, []);

  const fetchPaymentBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentBatches((data as PaymentBatch[]) || []);
    } catch (error: any) {
      toast.error('Error fetching payment batches', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionsForPeriod = async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          farmers!inner (
            id,
            farmer_id,
            national_id,
            profiles!inner (
              full_name
            )
          )
        `)
        .gte('collection_date', `${startDate}T00:00:00`)
        .lte('collection_date', `${endDate}T23:59:59`)
        .eq('status', 'Collected');

      if (error) throw error;

      // Group collections by farmer
      const collectionsByFarmer = (data || []).reduce((acc: Record<string, CollectionSummary>, collection: any) => {
        const farmerId = collection.farmers.id;
        const farmerName = collection.farmers.profiles.full_name;
        
        if (!acc[farmerId]) {
          acc[farmerId] = {
            farmer_id: farmerId,
            farmer_name: farmerName,
            collections: []
          };
        }
        
        acc[farmerId].collections.push({
          collection_id: collection.collection_id,
          liters: collection.liters,
          quality_grade: collection.quality_grade,
          rate_per_liter: collection.rate_per_liter,
          total_amount: collection.total_amount,
          collection_date: collection.collection_date
        });
        
        return acc;
      }, {});

      setCollectionSummary(Object.values(collectionsByFarmer));

    } catch (error: any) {
      toast.error('Error fetching collections', error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentBatch = () => {
    const calculations: FarmerPayment[] = collectionSummary.map(farmerData => {
      const totalLiters = farmerData.collections.reduce((sum, c) => sum + c.liters, 0);
      const baseAmount = farmerData.collections.reduce((sum, c) => sum + (c.liters * (c.rate_per_liter || 20)), 0);
      
      // Calculate average quality score
      const avgQualityScore = farmerData.collections.reduce((sum, c) => {
        const gradeScore = c.quality_grade === 'A+' ? 10 : c.quality_grade === 'A' ? 8 : c.quality_grade === 'B' ? 6 : 4;
        return sum + gradeScore;
      }, 0) / farmerData.collections.length;

      // Calculate quality bonus (5% for A+, 2% for A)
      const qualityBonus = avgQualityScore >= 9 ? baseAmount * 0.05 : 
                          avgQualityScore >= 8 ? baseAmount * 0.02 : 0;

      // No deductions for now
      const deductions = 0;
      const finalAmount = baseAmount + qualityBonus - deductions;

      return {
        farmer_id: farmerData.farmer_id,
        farmer_name: farmerData.collections[0]?.farmer_profile?.full_name || farmerData.farmer_name,
        national_id: '', // Will be filled from farmer data
        total_liters: totalLiters,
        base_amount: baseAmount,
        quality_bonus: qualityBonus,
        deductions: deductions,
        final_amount: finalAmount,
        collections_count: farmerData.collections.length,
        avg_quality_score: avgQualityScore,
        period_start: periodStart,
        period_end: periodEnd
      };
    });

    setFarmerPayments(calculations);
  };

  const createPaymentBatch = async () => {
    if (!batchName || !periodStart || !periodEnd) {
      toast({
        title: 'Missing information',
        description: 'Please fill in batch name and date range',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Generate batch ID
      const batchId = `BATCH${format(new Date(), 'YYYYMMDD')}-${Date.now().toString().slice(-4)}`;
      
      const totalAmount = farmerPayments.reduce((sum, p) => sum + p.final_amount, 0);
      const newBatch: PaymentBatch = {
        batch_id: batchId,
        batch_name: batchName,
        period_start: periodStart,
        period_end: periodEnd,
        total_farmers: farmerPayments.length,
        total_collections: farmerPayments.reduce((sum, p) => sum + p.collections_count, 0),
        total_amount: totalAmount,
        status: 'Generated'
      };

      setPaymentBatches([newBatch, ...paymentBatches]);
      setCurrentBatch(newBatch);

      toast.success('Payment batch created successfully', `${farmerPayments.length} farmers will receive payments totaling ₹${totalAmount.toFixed(2)}`);

    } catch (error: any) {
      toast.error('Error creating payment batch', error.message);
    } finally {
      setLoading(false);
    }
  };

  const processPaymentBatch = async (batchId: string) => {
    setProcessingPayments(true);
    try {
      // Update batch status to Processing
      await supabase
        .from('payment_batches')
        .update({
          status: 'Processing',
          processed_at: new Date().toISOString()
        })
        .eq('batch_id', batchId);

      // Create individual payment records
      const paymentsToCreate = farmerPayments.map(payment => ({
        farmer_id: payment.farmer_id,
        amount: payment.final_amount,
        period_start: payment.period_start,
        period_end: payment.period_end,
        status: 'processing',
        payment_method: 'bank_transfer', // Default to bank transfer
        transaction_id: `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`
      }));

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(paymentsToCreate);

      if (paymentsError) throw paymentsError;

      // Create collection-payment links
      const collectionPaymentLinks = farmerPayments.flatMap(payment => {
        return payment.collections?.map(collection => ({
          collection_id: collection.id, // Assuming collection has id field
          payment_id: null, // Will be linked after payment processing
          batch_id: batchId,
          amount: collection.total_amount,
          rate_applied: collection.rate_per_liter,
          final_amount: collection.total_amount
        })) || [];
      });

      await supabase
        .from('collection_payments')
        .insert(collectionPaymentLinks);

      // Update batch status to Completed
      await supabase
        .from('payment_batches')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString()
        })
        .eq('batch_id', batchId);

      // Send notifications to farmers
      for (const payment of farmerPayments) {
        await supabase
          .from('notifications')
          .insert({
            user_id: payment.farmer_id, // Assuming farmer_id links to user_id
            title: 'Payment Processed',
            message: `Your payment of ₹${payment.final_amount.toFixed(2)} for ${payment.period_start} to ${periodEnd} has been processed`,
            type: 'success',
            category: 'payment'
          });
      }

      toast.success('Payment batch processed successfully', `Payments have been initiated for ${farmerPayments.length} farmers`);

      fetchPaymentBatches();

    } catch (error: any) {
      toast.error('Error processing payments', error.message);
    } finally {
      setProcessingPayments(false);
    }
  };

  const exportPaymentSummary = () => {
    if (!farmerPayments.length) return;

    const csvContent = [
      // Header
      ['Farmer ID', 'Name', 'National ID', 'Total Liters', 'Collections', 'Base Amount', 'Quality Bonus', 'Deductions', 'Final Amount', 'Quality Score'].join(','),
      // Data rows
      ...farmerPayments.map(payment => [
        payment.farmer_id,
        payment.farmer_name,
        payment.national_id,
        payment.total_liters.toFixed(2),
        payment.collections_count,
        payment.base_amount.toFixed(2),
        payment.quality_bonus.toFixed(2),
        payment.deductions.toFixed(2),
        payment.final_amount.toFixed(2),
        payment.avg_quality_score.toFixed(1)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_batch_${batchName || 'unnamed'}_${periodStart}_${periodEnd}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderBatchManagement = () => (
    <div className="space-y-6">
      {/* Create New Batch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Payment Batch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchName">Batch Name *</Label>
              <Input
                id="batchName"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g., December 2024 Payments"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodStart">Period Start *</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period End *</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => fetchCollectionsForPeriod(periodStart, periodEnd)}
              disabled={loading || !periodStart || !periodEnd}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Payments
            </Button>

            <Button
              onClick={calculatePaymentBatch}
              disabled={!collectionSummary.length}
              variant="outline"
            >
              Preview Batch
            </Button>

            <Button
              onClick={createPaymentBatch}
              disabled={loading || !farmerPayments.length}
              className="bg-green-600 hover:bg-green-700"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Create Batch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Batches */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Farmers</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentBatches.map((batch) => (
                <TableRow key={batch.batch_id}>
                  <TableCell className="font-mono text-sm">{batch.batch_id}</TableCell>
                  <TableCell className="font-medium">{batch.batch_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(batch.period_start), 'MMM dd')} - {format(new Date(batch.period_end), 'MMM dd')}
                    </div>
                  </TableCell>
                  <TableCell>{batch.total_farmers}</TableCell>
                  <TableCell className="font-medium">₹{batch.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={
                      batch.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      batch.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {batch.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {batch.status === 'Generated' && (
                        <Button
                          size="sm"
                          onClick={() => processPaymentBatch(batch.batch_id)}
                          disabled={processingPayments}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Process
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBatch(batch)}
                      >
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {paymentBatches.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No payment batches created yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPaymentCalculation = () => (
    <div className="space-y-6">

      {/* Summary Stats */}
      {farmerPayments.length > 0 && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{farmerPayments.length}</div>
              <p className="text-xs text-muted-foreground">Eligible for payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {farmerPayments.reduce((sum, p) => sum + p.collections_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">For this period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liters</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {farmerPayments.reduce((sum, p) => sum + p.total_liters, 0).toFixed(1)} L
              </div>
              <p className="text-xs text-muted-foreground">Milk collected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{farmerPayments.reduce((sum, p) => sum + p.final_amount, 0).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">Including bonuses</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Details Table */}
      {farmerPayments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Calculation Details</CardTitle>
              <Button onClick={exportPaymentSummary} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Total Liters</TableHead>
                  <TableHead>Avg Quality</TableHead>
                  <TableHead>Base Amount</TableHead>
                  <TableHead>Quality Bonus</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead className="text-right">Final Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmerPayments.map((payment, index) => (
                  <TableRow key={payment.farmer_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.farmer_name}</div>
                        <div className="text-sm text-gray-500">{payment.national_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.collections_count}</TableCell>
                    <TableCell className="font-medium">{payment.total_liters.toFixed(1)} L</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{payment.avg_quality_score.toFixed(1)}/10</Badge>
                    </TableCell>
                    <TableCell>₹{payment.base_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">₹{payment.quality_bonus.toFixed(2)}</TableCell>
                    <TableCell className="text-red-600">₹{payment.deductions.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">₹{payment.final_amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {farmerPayments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No payment calculations available. Please fetch collections for the selected period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Payment Processing Center</h1>
          <p className="text-gray-600 mt-2">Process batch payments for farmers</p>
        </div>

        {/* Main Interface */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="batches">Batch Management</TabsTrigger>
            <TabsTrigger value="calculations">Payment Calculations</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="batches">{renderBatchManagement()}</TabsContent>
          <TabsContent value="calculations">{renderPaymentCalculation()}</TabsContent>
          <TabsContent value="history">
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Payment history will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PaymentProcessing;
