import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  List,
  Users,
  Award
} from 'lucide-react';
import { collectorEarningsService } from '@/services/collector-earnings-service';
import { collectorPenaltyService } from '@/services/collector-penalty-service';
import { formatCurrency, formatAmount } from '@/utils/formatters';
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
  Cell,
  ComposedChart,
  Line,
  Legend
} from 'recharts';

interface PaymentData {
  id?: string;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_liters: number;
  rate_per_liter: number;
  total_earnings: number;
  total_penalties: number;
  adjusted_earnings: number;
  status: 'pending' | 'paid';
  payment_date?: string;
  created_at?: string;
}

interface PaymentDetail {
  id: string;
  collection_id: string;
  collection_date: string;
  farmer_name: string;
  liters_collected: number;
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: 'positive' | 'negative' | 'none';
  penalty_amount: number;
  penalty_status: 'pending' | 'paid';
  approval_date: string;
}

interface AnalyticsData {
  monthlyEarnings: { month: string; earnings: number; collections: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
  earningTrends: { date: string; earnings: number }[];
  penaltyTrends: { month: string; penalties: number }[];
  varianceAnalysis: { type: string; count: number; totalPenalty: number }[];
  performanceScore: number;
  bestMonth: { month: string; earnings: number };
  worstMonth: { month: string; earnings: number };
}

// Custom tooltip components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded shadow">
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? `${entry.value.toLocaleString()}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PaymentTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded shadow">
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CollectorPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});
  const [paymentDetails, setPaymentDetails] = useState<Record<string, PaymentDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    monthlyEarnings: [],
    statusDistribution: [],
    earningTrends: [],
    penaltyTrends: [],
    varianceAnalysis: [],
    performanceScore: 0,
    bestMonth: { month: '', earnings: 0 },
    worstMonth: { month: '', earnings: 0 }
  });
  const [stats, setStats] = useState({
    totalEarned: 0,
    totalPenalties: 0,
    pendingPayments: 0,
    paidPayments: 0,
    avgEarningsPerCollection: 0
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to collections changes
    const collectionsSubscription = supabase
      .channel('collections_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'collections'
        },
        (payload) => {
          console.log('Collection updated:', payload);
          // Refresh payment data when collections change
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to collector payments changes
    const paymentsSubscription = supabase
      .channel('collector_payments_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'collector_payments'
        },
        (payload) => {
          console.log('Collector payment updated:', payload);
          // Refresh payment data when payments change
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to milk approvals changes
    const approvalsSubscription = supabase
      .channel('milk_approvals_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'milk_approvals'
        },
        (payload) => {
          console.log('Milk approval updated:', payload);
          // Refresh payment data when approvals change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(collectionsSubscription);
      supabase.removeChannel(paymentsSubscription);
      supabase.removeChannel(approvalsSubscription);
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Fetching payment data for user:', user.id);
      
      // Get staff info to get staff ID
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (staffError) {
        console.error('Error fetching staff data:', staffError);
        throw staffError;
      }
      
      const staffId = staffData.id;
      console.log('Staff ID:', staffId);
      
      // Get payment history with penalties
      const history = await collectorPenaltyService.getCollectorPaymentsWithPenalties();
      console.log('Payment history:', history);
      const collectorPayments = history.filter(p => p.collector_id === staffId);
      console.log('Filtered payment history:', collectorPayments);
      setPayments(collectorPayments as PaymentData[]);
      
      // Calculate stats
      const paidPayments = collectorPayments.filter((p: any) => p && p.status === 'paid');
      const pendingPayments = collectorPayments.filter((p: any) => p && p.status === 'pending');
      const totalEarned = paidPayments.reduce((sum: any, payment: any) => sum + (payment?.adjusted_earnings || 0), 0);
      const totalPenalties = collectorPayments.reduce((sum: any, payment: any) => sum + (payment?.total_penalties || 0), 0);
      const totalCollections = collectorPayments.reduce((sum: any, payment: any) => sum + (payment?.total_collections || 0), 0);
      const avgEarningsPerCollection = totalCollections > 0 ? totalEarned / totalCollections : 0;
      
      console.log('Calculated stats:', {
        totalEarned,
        totalPenalties,
        pendingPayments: pendingPayments.length,
        paidPayments: paidPayments.length,
        avgEarningsPerCollection,
        totalCollections
      });
      
      setStats({
        totalEarned,
        totalPenalties,
        pendingPayments: pendingPayments.length,
        paidPayments: paidPayments.length,
        avgEarningsPerCollection
      });
      
      // Prepare analytics data
      prepareAnalyticsData(collectorPayments);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const prepareAnalyticsData = (paymentData: PaymentData[]) => {
    // Monthly earnings data
    const monthlyMap: Record<string, { earnings: number; collections: number; penalties: number }> = {};
    
    paymentData.forEach(payment => {
      if (payment.status === 'paid') {
        const dateToUse = payment.payment_date || payment.created_at;
        if (!dateToUse) return; // Skip if no date available
        
        try {
          const dateObj = new Date(dateToUse);
          if (isNaN(dateObj.getTime())) return; // Skip if invalid date
          
          const month = dateObj.toLocaleString('default', { 
            month: 'short', 
            year: 'numeric' 
          });
          
          if (!monthlyMap[month]) {
            monthlyMap[month] = { earnings: 0, collections: 0, penalties: 0 };
          }
          
          monthlyMap[month].earnings += payment.adjusted_earnings;
          monthlyMap[month].collections += payment.total_collections;
          monthlyMap[month].penalties += payment.total_penalties;
        } catch (e) {
          console.warn('Error processing payment date:', dateToUse, e);
        }
      }
    });
    
    const monthlyEarnings = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      earnings: data.earnings,
      collections: data.collections
    }));
    
    // Penalty trends
    const penaltyTrends = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      penalties: data.penalties
    }));
    
    // Status distribution
    const statusDistribution = [
      { name: 'Paid', value: paymentData.filter(p => p.status === 'paid').length, color: '#10B981' },
      { name: 'Pending', value: paymentData.filter(p => p.status === 'pending').length, color: '#F59E0B' }
    ];
    
    // Earning trends (last 10 payments)
    const earningTrends = [...paymentData]
      .filter(payment => payment.created_at) // Filter out payments without created_at
      .sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        // Handle invalid dates
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10)
      .map(payment => {
        try {
          const dateObj = new Date(payment.created_at);
          if (isNaN(dateObj.getTime())) {
            return { date: 'Unknown Date', earnings: payment.adjusted_earnings };
          }
          return {
            date: dateObj.toLocaleDateString(),
            earnings: payment.adjusted_earnings
          };
        } catch (e) {
          console.warn('Error formatting date:', payment.created_at, e);
          return { date: 'Invalid Date', earnings: payment.adjusted_earnings };
        }
      })
      .reverse();
    
    // Variance analysis (would need to fetch detailed data for this)
    const varianceAnalysis = [
      { type: 'Positive', count: 0, totalPenalty: 0 },
      { type: 'Negative', count: 0, totalPenalty: 0 },
      { type: 'None', count: 0, totalPenalty: 0 }
    ];
    
    // Calculate performance score (simplified)
    const totalPayments = paymentData.length;
    const paidPayments = paymentData.filter(p => p.status === 'paid').length;
    const performanceScore = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;
    
    // Find best and worst months
    let bestMonth = { month: '', earnings: 0 };
    let worstMonth = { month: '', earnings: Number.MAX_VALUE };
    
    Object.entries(monthlyMap).forEach(([month, data]) => {
      // Skip invalid months
      if (!month || month === 'Invalid Date') return;
      
      if (data.earnings > bestMonth.earnings) {
        bestMonth = { month, earnings: data.earnings };
      }
      if (data.earnings < worstMonth.earnings && data.earnings >= 0) {
        worstMonth = { month, earnings: data.earnings };
      }
    });
    
    if (worstMonth.earnings === Number.MAX_VALUE) {
      worstMonth = { month: '', earnings: 0 };
    }
    
    setAnalytics({
      monthlyEarnings,
      statusDistribution,
      earningTrends,
      penaltyTrends,
      varianceAnalysis,
      performanceScore,
      bestMonth,
      worstMonth
    });
  };

  const togglePaymentExpansion = async (paymentId: string) => {
    setExpandedPayments(prev => ({
      ...prev,
      [paymentId]: !prev[paymentId]
    }));

    // If expanding, fetch details
    if (!expandedPayments[paymentId]) {
      setDetailsLoading(prev => ({ ...prev, [paymentId]: true }));
      
      try {
        const { collections } = await collectorPenaltyService.getDetailedPaymentWithPenalties(paymentId);
        setPaymentDetails(prev => ({
          ...prev,
          [paymentId]: collections
        }));
      } catch (error) {
        console.error('Error fetching payment details:', error);
      } finally {
        setDetailsLoading(prev => ({ ...prev, [paymentId]: false }));
      }
    }
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

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
        {/* Total Earned */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.totalEarned > 0 ? formatAmount(stats.totalEarned) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              All-time earnings
            </p>
          </CardContent>
        </Card>

        {/* Total Penalties */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {stats.totalPenalties > 0 ? formatAmount(stats.totalPenalties) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Penalties incurred
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
            <div className="text-xl sm:text-2xl font-bold">
              {stats.paidPayments}
            </div>
            <p className="text-xs text-muted-foreground truncate">
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
            <div className="text-xl sm:text-2xl font-bold">
              {stats.pendingPayments}
            </div>
            <p className="text-xs text-muted-foreground truncate">
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
            <div className="text-xl sm:text-2xl font-bold">
              {stats.avgEarningsPerCollection > 0 ? formatAmount(stats.avgEarningsPerCollection) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Avg per collection
            </p>
          </CardContent>
        </Card>

        {/* Performance Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {analytics.performanceScore.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Payment completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Analytics Charts */}
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
          <CardContent className="h-64 sm:h-80">
            {analytics.monthlyEarnings.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyEarnings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value.toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
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
          <CardContent className="h-64 sm:h-80">
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
                  <Tooltip content={<PaymentTooltip />} />
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

      {/* Additional Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Penalty Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Penalty Trends
            </CardTitle>
            <CardDescription>
              Your penalty history over recent months
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 sm:h-80">
            {analytics.penaltyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.penaltyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value.toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="penalties" fill="#ef4444" name="Penalties" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earning Trends */}
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
          <CardContent className="h-64 sm:h-80">
            {analytics.earningTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.earningTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value.toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
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
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Best Performing Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {analytics.bestMonth.month || 'N/A'}
            </div>
            <div className="text-lg text-center text-green-600 mt-2">
              {analytics.bestMonth.earnings > 0 ? formatAmount(analytics.bestMonth.earnings) : '0.00'}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Highest earnings achieved
            </p>
          </CardContent>
        </Card>

        {/* Worst Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Lowest Performing Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {analytics.worstMonth.month || 'N/A'}
            </div>
            <div className="text-lg text-center text-red-600 mt-2">
              {analytics.worstMonth.earnings > 0 ? formatAmount(analytics.worstMonth.earnings) : '0.00'}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Lowest earnings recorded
            </p>
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
            Your payment records and status with detailed breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
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
                {payments.map((payment) => (
                  <React.Fragment key={payment.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => togglePaymentExpansion(payment.id!)}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePaymentExpansion(payment.id!);
                          }}
                        >
                          {expandedPayments[payment.id!] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{payment.total_collections || 0}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{(payment.total_liters || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{payment.rate_per_liter > 0 ? formatAmount(payment.rate_per_liter) : '3.00'}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{payment.total_earnings > 0 ? formatAmount(payment.total_earnings) : '0.00'}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm text-red-600">
                        {payment.total_penalties > 0 ? formatAmount(payment.total_penalties) : '-'}
                      </TableCell>
                      <TableCell className={`text-right text-xs sm:text-sm font-medium ${(payment.adjusted_earnings || 0) < 0 ? 'text-red-600' : ''}`}>
                        {(payment.adjusted_earnings || 0) > 0 ? formatAmount(payment.adjusted_earnings) : '0.00'}
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
                    {expandedPayments[payment.id!] && (
                      <TableRow>
                        <TableCell colSpan={10} className="p-0 bg-muted/50">
                          <div className="p-4">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <List className="h-4 w-4" />
                              Detailed Collections Breakdown
                            </h4>
                            {detailsLoading[payment.id!] ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                              </div>
                            ) : paymentDetails[payment.id!] && paymentDetails[payment.id!].length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Farmer</TableHead>
                                    <TableHead className="text-right">Liters Collected</TableHead>
                                    <TableHead className="text-right">Company Received</TableHead>
                                    <TableHead className="text-right">Variance</TableHead>
                                    <TableHead className="text-right">Variance %</TableHead>
                                    <TableHead className="text-right">Penalty</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paymentDetails[payment.id!].map((detail) => (
                                    <TableRow key={detail.id}>
                                      <TableCell className="text-xs sm:text-sm">
                                        {new Date(detail.collection_date).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell className="text-xs sm:text-sm">
                                        {detail.farmer_name}
                                      </TableCell>
                                      <TableCell className="text-right text-xs sm:text-sm">
                                        {detail.liters_collected?.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right text-xs sm:text-sm">
                                        {detail.company_received_liters?.toFixed(2)}
                                      </TableCell>
                                      <TableCell className={`text-right text-xs sm:text-sm ${detail.variance_type === 'negative' ? 'text-red-600' : detail.variance_type === 'positive' ? 'text-green-600' : ''}`}>
                                        {detail.variance_liters?.toFixed(2)}
                                      </TableCell>
                                      <TableCell className={`text-right text-xs sm:text-sm ${detail.variance_type === 'negative' ? 'text-red-600' : detail.variance_type === 'positive' ? 'text-green-600' : ''}`}>
                                        {detail.variance_percentage?.toFixed(2)}%
                                      </TableCell>
                                      <TableCell className={`text-right text-xs sm:text-sm ${detail.penalty_amount > 0 ? 'text-red-600' : ''}`}>
                                        {detail.penalty_amount > 0 ? formatAmount(detail.penalty_amount) : '-'}
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant={detail.penalty_status === 'paid' ? 'default' : 'secondary'}
                                          className={detail.penalty_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                                        >
                                          {detail.penalty_status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                <p>No detailed collection data available for this payment period</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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