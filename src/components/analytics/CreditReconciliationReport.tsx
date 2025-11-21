import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DataExportService, ExportData } from '@/utils/data-export';

interface CreditReconciliationRecord {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  pending_payments: number;
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  net_payment: number;
  credit_utilization_rate: number;
  last_payment_date: string;
  last_credit_transaction: string;
}

interface ReconciliationSummary {
  total_pending_payments: number;
  total_credit_limit: number;
  total_credit_used: number;
  total_net_payments: number;
  average_credit_utilization: number;
  farmers_with_credit: number;
  farmers_with_pending_payments: number;
}

const CreditReconciliationReport = () => {
  const [reconciliationData, setReconciliationData] = useState<CreditReconciliationRecord[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      
      // Get all farmers with their profile information
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          phone_number,
          profiles (
            full_name
          )
        `);

      if (farmersError) throw farmersError;

      // Get credit limits for all farmers
      const { data: creditLimits, error: creditError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('is_active', true);

      if (creditError) throw creditError;

      // Get payment data for all farmers
      const { data: payments, error: paymentsError } = await supabase
        .from('farmer_payments')
        .select(`
          farmer_id,
          total_amount,
          credit_used,
          net_payment,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get pending collections for all farmers
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('farmer_id, total_amount')
        .eq('approved_for_company', true) // Only consider approved collections
        .neq('status', 'Paid');

      if (collectionsError) throw collectionsError;

      // Get latest credit transactions
      const { data: creditTransactions, error: transactionsError } = await supabase
        .from('farmer_credit_transactions')
        .select('farmer_id, created_at, transaction_type, amount')
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Process data to create reconciliation records
      const reconciliationRecords: CreditReconciliationRecord[] = [];
      
      farmers?.forEach(farmer => {
        const farmerId = farmer.id;
        const farmerName = farmer.profiles?.full_name || 'Unknown Farmer';
        const farmerPhone = farmer.phone_number || 'No phone';
        
        // Get credit information
        const creditLimit = creditLimits?.find(limit => limit.farmer_id === farmerId);
        const creditLimitAmount = creditLimit?.max_credit_amount || 0;
        const availableCredit = creditLimit?.current_credit_balance || 0;
        const creditUsed = creditLimit?.total_credit_used || 0;
        
        // Get pending payments
        const farmerPendingCollections = pendingCollections?.filter(c => c.farmer_id === farmerId) || [];
        const pendingPayments = farmerPendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
        
        // Get payment information
        const farmerPayments = payments?.filter(p => p.farmer_id === farmerId) || [];
        const totalPaid = farmerPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        const totalCreditUsedInPayments = farmerPayments.reduce((sum, p) => sum + (p.credit_used || 0), 0);
        const totalNetPayment = farmerPayments.reduce((sum, p) => sum + (p.net_payment || 0), 0);
        
        // Get last payment date
        const lastPayment = farmerPayments[0];
        const lastPaymentDate = lastPayment?.created_at ? new Date(lastPayment.created_at).toLocaleDateString() : 'N/A';
        
        // Get last credit transaction
        const lastCreditTransaction = creditTransactions?.find(t => t.farmer_id === farmerId);
        const lastCreditTransactionDate = lastCreditTransaction?.created_at ? 
          new Date(lastCreditTransaction.created_at).toLocaleDateString() : 'N/A';
        
        // Calculate credit utilization rate
        const creditUtilizationRate = creditLimitAmount > 0 ? (creditUsed / creditLimitAmount) * 100 : 0;
        
        reconciliationRecords.push({
          farmer_id: farmerId,
          farmer_name: farmerName,
          farmer_phone: farmerPhone,
          pending_payments: pendingPayments,
          credit_limit: creditLimitAmount,
          available_credit: availableCredit,
          credit_used: creditUsed,
          net_payment: totalNetPayment,
          credit_utilization_rate: parseFloat(creditUtilizationRate.toFixed(2)),
          last_payment_date: lastPaymentDate,
          last_credit_transaction: lastCreditTransactionDate
        });
      });

      setReconciliationData(reconciliationRecords);

      // Calculate summary
      const totalPendingPayments = reconciliationRecords.reduce((sum, r) => sum + r.pending_payments, 0);
      const totalCreditLimit = reconciliationRecords.reduce((sum, r) => sum + r.credit_limit, 0);
      const totalCreditUsed = reconciliationRecords.reduce((sum, r) => sum + r.credit_used, 0);
      const totalNetPayments = reconciliationRecords.reduce((sum, r) => sum + r.net_payment, 0);
      const averageCreditUtilization = reconciliationRecords.length > 0 ? 
        reconciliationRecords.reduce((sum, r) => sum + r.credit_utilization_rate, 0) / reconciliationRecords.length : 0;
      const farmersWithCredit = reconciliationRecords.filter(r => r.credit_limit > 0).length;
      const farmersWithPendingPayments = reconciliationRecords.filter(r => r.pending_payments > 0).length;

      setSummary({
        total_pending_payments: totalPendingPayments,
        total_credit_limit: totalCreditLimit,
        total_credit_used: totalCreditUsed,
        total_net_payments: totalNetPayments,
        average_credit_utilization: parseFloat(averageCreditUtilization.toFixed(2)),
        farmers_with_credit: farmersWithCredit,
        farmers_with_pending_payments: farmersWithPendingPayments
      });
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const exportData: ExportData[] = [
      {
        sheetName: 'Credit Reconciliation Summary',
        data: [
          ['Metric', 'Value'],
          ['Total Pending Payments', formatCurrency(summary?.total_pending_payments || 0)],
          ['Total Credit Limit', formatCurrency(summary?.total_credit_limit || 0)],
          ['Total Credit Used', formatCurrency(summary?.total_credit_used || 0)],
          ['Total Net Payments', formatCurrency(summary?.total_net_payments || 0)],
          ['Average Credit Utilization', `${summary?.average_credit_utilization || 0}%`],
          ['Farmers with Credit', summary?.farmers_with_credit || 0],
          ['Farmers with Pending Payments', summary?.farmers_with_pending_payments || 0]
        ]
      },
      {
        sheetName: 'Farmer Credit Reconciliation',
        data: [
          [
            'Farmer Name',
            'Phone',
            'Pending Payments',
            'Credit Limit',
            'Available Credit',
            'Credit Used',
            'Net Payment',
            'Credit Utilization %',
            'Last Payment Date',
            'Last Credit Transaction'
          ],
          ...reconciliationData.map(record => [
            record.farmer_name,
            record.farmer_phone,
            formatCurrency(record.pending_payments),
            formatCurrency(record.credit_limit),
            formatCurrency(record.available_credit),
            formatCurrency(record.credit_used),
            formatCurrency(record.net_payment),
            `${record.credit_utilization_rate}%`,
            record.last_payment_date,
            record.last_credit_transaction
          ])
        ]
      }
    ];

    DataExportService.exportData(exportData, {
      fileName: 'credit-reconciliation-report',
      format: exportFormat,
      sheetName: 'Credit Reconciliation'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_pending_payments || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_credit_used || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Net Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_net_payments || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Credit Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.average_credit_utilization || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Controls */}
      <div className="flex justify-end gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Export Format:</span>
          <select 
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
            className="border rounded px-2 py-1"
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>
        <Button onClick={exportReport} className="flex items-center gap-2">
          {exportFormat === 'xlsx' ? (
            <FileSpreadsheet className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Export Report
        </Button>
      </div>

      {/* Reconciliation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Reconciliation by Farmer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Pending Payments</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Available Credit</TableHead>
                  <TableHead>Credit Used</TableHead>
                  <TableHead>Net Payment</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationData.map((record) => (
                  <TableRow key={record.farmer_id}>
                    <TableCell>
                      <div className="font-medium">{record.farmer_name}</div>
                      <div className="text-sm text-gray-500">{record.farmer_phone}</div>
                    </TableCell>
                    <TableCell>{formatCurrency(record.pending_payments)}</TableCell>
                    <TableCell>{formatCurrency(record.credit_limit)}</TableCell>
                    <TableCell>{formatCurrency(record.available_credit)}</TableCell>
                    <TableCell>{formatCurrency(record.credit_used)}</TableCell>
                    <TableCell>{formatCurrency(record.net_payment)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={record.credit_utilization_rate > 80 ? "destructive" : "secondary"}
                      >
                        {record.credit_utilization_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Payment: {record.last_payment_date}</div>
                        <div className="text-gray-500">Credit: {record.last_credit_transaction}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditReconciliationReport;