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
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  List,
  BarChart3,
  PieChart,
  Award,
  Users
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

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

export default function CollectorEarningsPage() {
  const { user } = useAuth();
  const [currentEarnings, setCurrentEarnings] = useState<EarningsData | null>(null);
  const [allTimeEarnings, setAllTimeEarnings] = useState<EarningsData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});
  const [paymentDetails, setPaymentDetails] = useState<Record<string, PaymentDetail[]>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
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
          // Refresh earnings data when collections change
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
          // Refresh earnings data when payments change
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
          // Refresh earnings data when approvals change
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
      console.log('Fetching data for user:', user.id);
      
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
      
      // Get current month earnings
      const current = await collectorEarningsService.getEarningsSummary(staffId);
      console.log('Current earnings:', current);
      
      // Get all-time earnings with penalties
      const allTime = await collectorEarningsService.getAllTimeEarnings(staffId);
      console.log('All-time earnings:', allTime);
      
      // Get collector data with penalties
      const collectorsData = await collectorEarningsService.getCollectorsWithEarningsAndPenalties();
      console.log('Collectors data:', collectorsData);
      const collectorData = collectorsData.find(c => c.id === staffId);
      console.log('Collector data for current user:', collectorData);
      
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
      
      console.log('Setting current earnings data:', currentEarningsData);
      console.log('Setting all-time earnings data:', allTimeEarningsData);
      
      setCurrentEarnings(currentEarningsData);
      setAllTimeEarnings(allTimeEarningsData);
      
      // Get payment history with penalties
      const history = await collectorPenaltyService.getCollectorPaymentsWithPenalties();
      console.log('Payment history:', history);
      console.log('Filtering payment history for staffId:', staffId);
      const collectorPayments = history.filter(p => p && p.collector_id === staffId);
      console.log('Filtered payment history:', collectorPayments);
      console.log('Number of payments found:', collectorPayments.length);
      setPaymentHistory(collectorPayments);
      
      // Prepare analytics data
      prepareAnalyticsData(collectorPayments);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const prepareAnalyticsData = (paymentData: any[]) => {
    console.log('Preparing analytics data with payment data:', paymentData);
    // Monthly earnings data
    const monthlyMap: Record<string, { earnings: number; collections: number; penalties: number }> = {};
    
    paymentData.forEach((payment, index) => {
      console.log(`Processing payment ${index}:`, payment);
      if (payment && payment.status === 'paid') {
        // Try multiple date fields to find a valid date
        let dateToUse = payment.payment_date || payment.created_at || payment.period_start;
        console.log(`Date to use for payment ${index}:`, dateToUse);
        if (!dateToUse) return; // Skip if no date available
        
        try {
          // More robust date parsing
          let dateObj: Date;
          if (dateToUse instanceof Date) {
            dateObj = dateToUse;
          } else if (typeof dateToUse === 'string') {
            // Try parsing the string date
            dateObj = new Date(dateToUse);
            // If that fails, try with different formats
            if (isNaN(dateObj.getTime())) {
              // Try parsing common date formats
              const parts = dateToUse.split(/[-/ :T]/);
              if (parts.length >= 3) {
                // Handle various date formats
                if (parts[0].length === 4) {
                  // YYYY-MM-DD format
                  dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else if (parts[2] && parts[2].length === 4) {
                  // MM/DD/YYYY or DD/MM/YYYY format
                  // Assume DD/MM/YYYY format (more common in Kenya)
                  dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                } else {
                  // Try MM/DD/YY format
                  dateObj = new Date(parseInt(parts[2]) + 2000, parseInt(parts[0]) - 1, parseInt(parts[1]));
                }
              }
            }
          } else {
            dateObj = new Date(dateToUse);
          }
          
          console.log(`Date object for payment ${index}:`, dateObj);
          if (isNaN(dateObj.getTime())) {
            console.log(`Invalid date for payment ${index}:`, dateToUse);
            return; // Skip if invalid date
          }
          
          const month = dateObj.toLocaleString('default', { 
            month: 'short', 
            year: 'numeric' 
          });
          console.log(`Month for payment ${index}:`, month);
          
          if (!monthlyMap[month]) {
            monthlyMap[month] = { earnings: 0, collections: 0, penalties: 0 };
          }
          
          const earningsToAdd = payment.adjusted_earnings || 0;
          const collectionsToAdd = payment.total_collections || 0;
          const penaltiesToAdd = payment.total_penalties || 0;
          
          console.log(`Adding to ${month}: earnings=${earningsToAdd}, collections=${collectionsToAdd}, penalties=${penaltiesToAdd}`);
          
          monthlyMap[month].earnings += earningsToAdd;
          monthlyMap[month].collections += collectionsToAdd;
          monthlyMap[month].penalties += penaltiesToAdd;
          
          console.log(`Updated ${month} totals:`, monthlyMap[month]);
        } catch (e) {
          console.warn('Error processing payment date:', dateToUse, e);
        }
      }
    });
    
    console.log('Final monthly map:', monthlyMap);
    
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
      { name: 'Paid', value: paymentData.filter((p: any) => p && p.status === 'paid').length, color: '#10B981' },
      { name: 'Pending', value: paymentData.filter((p: any) => p && p.status === 'pending').length, color: '#F59E0B' }
    ];
    
    // Earning trends (last 10 payments)
    const earningTrends = [...paymentData]
      .filter(payment => payment && (payment.created_at || payment.payment_date || payment.period_start)) // Filter out payments without any date
      .sort((a: any, b: any) => {
        // Get the best available date for each payment
        const getDate = (payment: any) => {
          const dateStr = payment.payment_date || payment.created_at || payment.period_start;
          if (!dateStr) return new Date(0);
          return new Date(dateStr);
        };
        
        const dateA = getDate(a);
        const dateB = getDate(b);
        // Handle invalid dates
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10)
      .map((payment: any) => {
        try {
          // Get the best available date for display
          const dateStr = payment.payment_date || payment.created_at || payment.period_start;
          const dateObj = new Date(dateStr);
          if (isNaN(dateObj.getTime())) {
            return { date: 'Unknown Date', earnings: payment?.adjusted_earnings || 0 };
          }
          return {
            date: dateObj.toLocaleDateString(),
            earnings: payment?.adjusted_earnings || 0
          };
        } catch (e) {
          console.warn('Error formatting date:', payment?.created_at, e);
          return { date: 'Invalid Date', earnings: payment?.adjusted_earnings || 0 };
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
    const paidPayments = paymentData.filter(p => p && p.status === 'paid').length;
    const performanceScore = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;
    
    // Find best and worst months
    let bestMonth = { month: '', earnings: 0 };
    let worstMonth = { month: '', earnings: Number.MAX_VALUE };
    
    // Convert monthlyMap to array for easier processing
    const monthlyEntries = Object.entries(monthlyMap).filter(([month, _]) => month && month !== 'Invalid Date');
    
    if (monthlyEntries.length > 0) {
      // Find best month
      let maxEarnings = -1;
      let bestMonthName = '';
      
      // Find worst month
      let minEarnings = Number.MAX_VALUE;
      let worstMonthName = '';
      
      monthlyEntries.forEach(([month, data]) => {
        if (data.earnings > maxEarnings) {
          maxEarnings = data.earnings;
          bestMonthName = month;
        }
        
        if (data.earnings < minEarnings) {
          minEarnings = data.earnings;
          worstMonthName = month;
        }
      });
      
      // Set best month if we found one with positive earnings
      if (bestMonthName && maxEarnings >= 0) {
        bestMonth = { month: bestMonthName, earnings: maxEarnings };
      }
      
      // Set worst month
      if (worstMonthName && minEarnings !== Number.MAX_VALUE) {
        worstMonth = { month: worstMonthName, earnings: minEarnings };
      } else {
        worstMonth = { month: '', earnings: 0 };
      }
    } else {
      // No valid months found
      bestMonth = { month: '', earnings: 0 };
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
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Earnings & Payments</h1>
          <p className="text-muted-foreground">View your collection earnings and payment history</p>
        </div>

        {/* Enhanced Earnings Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {/* Current Month Earnings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {currentEarnings && currentEarnings.totalEarnings > 0 ? formatAmount(currentEarnings.totalEarnings) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {currentEarnings?.totalCollections || 0} collections, {currentEarnings?.totalLiters?.toFixed(2) || '0.00'}L
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help truncate">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">Calc: {currentEarnings?.totalLiters?.toFixed(2) || '0.00'}L × {formatAmount(currentEarnings?.ratePerLiter || 0)}/L</span>
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
              <div className="text-xl sm:text-2xl font-bold">
                {currentEarnings && currentEarnings.ratePerLiter > 0 ? formatAmount(currentEarnings.ratePerLiter) : '3.00'}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground cursor-help flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>Payment rate</span>
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
              <div className="text-xl sm:text-2xl font-bold">
                {allTimeEarnings?.totalCollections || 0}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {allTimeEarnings?.totalLiters?.toFixed(2) || '0.00'}L collected
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    <span>Total collections</span>
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
              <div className="text-xl sm:text-2xl font-bold">
                {allTimeEarnings && allTimeEarnings.totalEarnings > 0 ? formatAmount(allTimeEarnings.totalEarnings) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {allTimeEarnings?.totalCollections || 0} collections, {allTimeEarnings?.totalLiters?.toFixed(2) || '0.00'}L
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help truncate">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">Calc: {allTimeEarnings?.totalLiters?.toFixed(2) || '0.00'}L × {formatAmount(allTimeEarnings?.ratePerLiter || 0)}/L</span>
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
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {allTimeEarnings && allTimeEarnings.totalPenalties > 0 ? formatAmount(allTimeEarnings.totalPenalties) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Penalties incurred
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    <span>Penalty info</span>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    <span>Performance</span>
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Your performance score is calculated based on the percentage of payments that have been 
                    successfully processed and marked as paid.
                  </p>
                </TooltipContent>
              </Tooltip>
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
                    <RechartsTooltip content={<CustomTooltip />} />
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
                    <RechartsTooltip content={<PaymentTooltip />} />
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
                    <RechartsTooltip content={<CustomTooltip />} />
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
                    <RechartsTooltip content={<CustomTooltip />} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {/* Best Month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Best Performing Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-center truncate">
                {analytics.bestMonth.month || 'N/A'}
              </div>
              <div className="text-lg text-center text-green-600 mt-2">
                {analytics.bestMonth.earnings > 0 ? formatAmount(analytics.bestMonth.earnings) : '0.00'}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
                Highest earnings
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
              <div className="text-xl sm:text-2xl font-bold text-center truncate">
                {analytics.worstMonth.month || 'N/A'}
              </div>
              <div className="text-lg text-center text-red-600 mt-2">
                {analytics.worstMonth.earnings > 0 ? formatAmount(analytics.worstMonth.earnings) : '0.00'}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
                Lowest earnings
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
            {paymentHistory.length > 0 ? (
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
                  {paymentHistory.map((payment) => (
                    <React.Fragment key={payment.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => togglePaymentExpansion(payment.id)}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePaymentExpansion(payment.id);
                            }}
                          >
                            {expandedPayments[payment.id] ? (
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
                      {expandedPayments[payment.id] && (
                        <TableRow>
                          <TableCell colSpan={10} className="p-0 bg-muted/50">
                            <div className="p-4">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <List className="h-4 w-4" />
                                Detailed Collections Breakdown
                              </h4>
                              {detailsLoading[payment.id] ? (
                                <div className="flex items-center justify-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                              ) : paymentDetails[payment.id] && paymentDetails[payment.id].length > 0 ? (
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
                                    {paymentDetails[payment.id].map((detail) => (
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
                  Example: If you collected 100 liters at a rate of 5.00 per liter with 50 in penalties, 
                  your net earnings would be (100 × 5.00) - 50 = 450.00
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