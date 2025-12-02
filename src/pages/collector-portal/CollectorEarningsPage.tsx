import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  Milk, 
  Calendar,
  FileText,
  Info,
  AlertTriangle
} from 'lucide-react';
import { collectorEarningsService } from '@/services/collector-earnings-service';
import { collectorPenaltyService } from '@/services/collector-penalty-service';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EarningsData {
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  totalPenalties: number;
  pendingPayments: number;
  paidPayments: number;
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
        
        // Get all-time earnings with penalties
        const allTime = await collectorEarningsService.getAllTimeEarnings(staffId);
        
        // Get collector data with penalties
        const collectorsData = await collectorEarningsService.getCollectorsWithEarningsAndPenalties();
        const collectorData = collectorsData.find(c => c.id === staffId);
        
        // Combine earnings data with penalty information
        const currentEarningsData = {
          ...current,
          totalPenalties: collectorData?.totalPenalties || 0,
          pendingPayments: collectorData?.pendingPayments || 0,
          paidPayments: collectorData?.paidPayments || 0
        };
        
        const allTimeEarningsData = {
          ...allTime,
          totalPenalties: collectorData?.totalPenalties || 0,
          pendingPayments: collectorData?.pendingPayments || 0,
          paidPayments: collectorData?.paidPayments || 0
        };
        
        setCurrentEarnings(currentEarningsData);
        setAllTimeEarnings(allTimeEarningsData);
        
        // Get payment history with penalties
        const history = await collectorPenaltyService.getCollectorPaymentsWithPenalties();
        const collectorPayments = history.filter(p => p.collector_id === staffId);
        setPaymentHistory(collectorPayments);
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
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Earnings & Payments</h1>
          <p className="text-muted-foreground">View your collection earnings and payment history</p>
        </div>

        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    Calculation: {currentEarnings?.totalLiters?.toFixed(2) || '0.00'}L × {formatCurrency(currentEarnings?.ratePerLiter || 0)}/L
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Your earnings are calculated by multiplying the total liters you've collected this month 
                    by the current rate per liter. Only collections marked as "Collected" and "Approved for Payment" 
                    are included in this calculation.
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground cursor-help flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Current payment rate
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    This is the current rate you're paid per liter of milk collected. 
                    This rate may change periodically based on market conditions.
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    Total collections
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    This shows the total number of collections you've made and the total liters collected 
                    throughout your time as a collector. Only collections marked as "Collected" and 
                    "Approved for Payment" are counted.
                  </p>
                </TooltipContent>
              </Tooltip>
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
              <p className="text-xs text-muted-foreground">
                {allTimeEarnings?.totalCollections || 0} collections, {allTimeEarnings?.totalLiters?.toFixed(2) || '0.00'}L total
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    Calculation: {allTimeEarnings?.totalLiters?.toFixed(2) || '0.00'}L × {formatCurrency(allTimeEarnings?.ratePerLiter || 0)}/L
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Your all-time earnings are calculated by multiplying all the liters you've collected 
                    by the current rate per liter. This represents the gross amount before any penalties 
                    or deductions. Only collections marked as "Collected" and "Approved for Payment" 
                    are included in this calculation.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>

          {/* Total Penalties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {allTimeEarnings ? formatCurrency(allTimeEarnings.totalPenalties) : 'KSh 0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Penalties incurred
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    Penalty information
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Penalties are deducted from your gross earnings based on quality variances in milk collections. 
                    Positive variances (company receives more than collected) do not incur penalties. 
                    Negative variances (company receives less than collected) incur penalties based on variance percentage.
                  </p>
                </TooltipContent>
              </Tooltip>
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
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Penalties</TableHead>
                    <TableHead className="text-right">Net</TableHead>
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
                      <TableCell className="text-right">{formatCurrency(payment.total_earnings)}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {payment.total_penalties > 0 ? formatCurrency(payment.total_penalties) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${payment.adjusted_earnings < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(payment.adjusted_earnings)}
                      </TableCell>
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

        {/* Earnings Calculation Formula */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              How Your Earnings Are Calculated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-bold text-lg text-blue-800 mb-2">Earnings Formula</h3>
                <div className="text-lg font-mono bg-white p-3 rounded border">
                  Net Earnings = (Total Liters Collected × Rate Per Liter) - Penalties
                </div>
                <p className="mt-2 text-sm text-blue-700">
                  Example: If you collected 100 liters at a rate of KSh 5.00 per liter with KSh 50 in penalties, 
                  your net earnings would be (100 × 5.00) - 50 = KSh 450.00
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <h3 className="font-medium">Collection Tracking</h3>
                    <p className="text-sm text-muted-foreground">
                      All milk collections you record are tracked in the system. Only collections marked as "Collected" and "Approved for Payment" count toward your earnings.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <h3 className="font-medium">Rate Application</h3>
                    <p className="text-sm text-muted-foreground">
                      The current rate per liter is applied to your total collections. This rate may change periodically based on market conditions.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <h3 className="font-medium">Penalty Calculation</h3>
                    <p className="text-sm text-muted-foreground">
                      Penalties are calculated based on negative variances in milk collections. If the company receives less milk than you collected, penalties may be applied.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <h3 className="font-medium">Payment Processing</h3>
                    <p className="text-sm text-muted-foreground">
                      Payments are processed by administrators and marked as paid when complete. You'll see your payment status change from "Pending" to "Paid".
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mt-4">
                <h3 className="font-bold text-yellow-800 mb-2">Important Notes</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  <li>Only collections approved for payment are included in your earnings calculation</li>
                  <li>Penalties are automatically calculated and deducted from your gross earnings</li>
                  <li>Positive variances (company receives more than collected) do not incur penalties</li>
                  <li>Negative variances (company receives less than collected) incur penalties based on variance percentage</li>
                  <li>Your earnings are calculated automatically when collections are approved</li>
                  <li>Contact an administrator if you believe there's an error in your earnings calculation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}