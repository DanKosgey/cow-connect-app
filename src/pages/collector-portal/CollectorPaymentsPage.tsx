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
  BarChart3,
  PieChart,
  CheckCircle,
  Clock
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface PaymentData {
  id?: string;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_liters: number;
  rate_per_liter: number;
  total_earnings: number;
  status: 'pending' | 'paid';
  payment_date?: string;
  created_at?: string;
}

interface AnalyticsData {
  monthlyEarnings: { month: string; earnings: number; collections: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
  earningTrends: { date: string; earnings: number }[];
}

export default function CollectorPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    monthlyEarnings: [],
    statusDistribution: [],
    earningTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarned: 0,
    pendingPayments: 0,
    paidPayments: 0,
    avgEarningsPerCollection: 0
  });

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
        
        // Get payment history
        const history = await collectorEarningsService.getPaymentHistory(staffId);
        setPayments(history);
        
        // Calculate stats
        const paidPayments = history.filter(p => p.status === 'paid');
        const pendingPayments = history.filter(p => p.status === 'pending');
        const totalEarned = paidPayments.reduce((sum, payment) => sum + payment.total_earnings, 0);
        const totalCollections = history.reduce((sum, payment) => sum + payment.total_collections, 0);
        const avgEarningsPerCollection = totalCollections > 0 ? totalEarned / totalCollections : 0;
        
        setStats({
          totalEarned,
          pendingPayments: pendingPayments.length,
          paidPayments: paidPayments.length,
          avgEarningsPerCollection
        });
        
        // Prepare analytics data
        prepareAnalyticsData(history);
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const prepareAnalyticsData = (paymentData: PaymentData[]) => {
    // Monthly earnings data
    const monthlyMap: Record<string, { earnings: number; collections: number }> = {};
    
    paymentData.forEach(payment => {
      if (payment.status === 'paid') {
        const month = new Date(payment.payment_date || payment.created_at).toLocaleString('default', { 
          month: 'short', 
          year: 'numeric' 
        });
        
        if (!monthlyMap[month]) {
          monthlyMap[month] = { earnings: 0, collections: 0 };
        }
        
        monthlyMap[month].earnings += payment.total_earnings;
        monthlyMap[month].collections += payment.total_collections;
      }
    });
    
    const monthlyEarnings = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      earnings: data.earnings,
      collections: data.collections
    }));
    
    // Status distribution
    const statusDistribution = [
      { name: 'Paid', value: paymentData.filter(p => p.status === 'paid').length, color: '#10B981' },
      { name: 'Pending', value: paymentData.filter(p => p.status === 'pending').length, color: '#F59E0B' }
    ];
    
    // Earning trends (last 10 payments)
    const earningTrends = [...paymentData]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(payment => ({
        date: new Date(payment.created_at).toLocaleDateString(),
        earnings: payment.total_earnings
      }))
      .reverse();
    
    setAnalytics({
      monthlyEarnings,
      statusDistribution,
      earningTrends
    });
  };

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
        <h1 className="text-3xl font-bold">Payments & Analytics</h1>
        <p className="text-muted-foreground">Track your payment history and earnings analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Earned */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time earnings
            </p>
          </CardContent>
        </Card>

        {/* Paid Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.paidPayments}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed payments
            </p>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingPayments}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        {/* Avg Earnings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Collection</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.avgEarningsPerCollection)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average earnings per collection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Earnings Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Earnings
            </CardTitle>
            <CardDescription>
              Your earnings trend over recent months
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {analytics.monthlyEarnings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `KSh${value.toLocaleString()}`} />
                  <Tooltip formatter={(value) => [`KSh${value.toLocaleString()}`, 'Earnings']} />
                  <Bar dataKey="earnings" fill="#8884d8" name="Earnings" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Payment Status
            </CardTitle>
            <CardDescription>
              Distribution of your payments by status
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {analytics.statusDistribution.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={analytics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {analytics.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Payments']} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Earning Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Earning Trends
          </CardTitle>
          <CardDescription>
            Your earnings from recent payments
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {analytics.earningTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.earningTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `KSh${value.toLocaleString()}`} />
                <Tooltip formatter={(value) => [`KSh${value.toLocaleString()}`, 'Earnings']} />
                <Bar dataKey="earnings" fill="#10B981" name="Earnings" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

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
                      <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                        {payment.status}
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
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>No payment history available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}