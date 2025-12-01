import React from 'react';
import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  BarChart3,
  PieChart,
  FileText,
  Search,
  ArrowUpDown,
  Download,
  AlertTriangle,
  FileBarChart,
  ChevronRightIcon,
  ChevronDownIcon,
  ListIcon,
  Loader2Icon
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
import { collectorPenaltyService } from '@/services/collector-penalty-service';
import useToastNotifications from '@/hooks/useToastNotifications';
import FixPaymentRecordsButton from '@/components/admin/FixPaymentRecordsButton';

// Add recharts imports for the dual-axis chart
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface CollectorData {
  id: string;
  name: string;
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  totalPenalties: number;
  pendingPayments: number;
  paidPayments: number;
  performanceScore: number;
  lastCollectionDate?: string;
  totalVariance?: number;
  positiveVariances?: number;
  negativeVariances?: number;
  avgVariancePercentage?: number;
  // Add collections breakdown data
  collectionsBreakdown?: {
    date: string;
    liters: number;
    status: string;
    approved: boolean;
    feeStatus?: string;
  }[];
}

interface PaymentData {
  id: string;
  collector_id: string;
  collector_name?: string;
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
  created_at: string;
}

// Add new interfaces for penalty analytics
interface PenaltyAnalyticsData {
  overallPenaltyStats: {
    totalPenalties: number;
    avgPenaltyPerCollector: number;
    highestPenaltyCollector: string;
    highestPenaltyAmount: number;
  };
  collectorPenaltyData: CollectorPenaltyAnalytics[];
}

interface CollectorPenaltyAnalytics {
  collectorId: string;
  collectorName: string;
  totalPenalties: number;
  pendingPenalties: number;
  paidPenalties: number;
  penaltyBreakdown: {
    positiveVariancePenalties: number;
    negativeVariancePenalties: number;
    totalPositiveVariances: number;
    totalNegativeVariances: number;
  };
  recentPenalties: any[];
  penaltyTrend: {
    date: string;
    penalties: number;
  }[];
}

export default function CollectorsPage() {
  const { success, error } = useToastNotifications();
  const [collectors, setCollectors] = useState<CollectorData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [collectorRate, setCollectorRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataFetchError, setDataFetchError] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'analytics' | 'penalty-analytics'>('payments');
  const [stats, setStats] = useState({
    totalCollectors: 0,
    totalPendingAmount: 0,
    totalPaidAmount: 0,
    totalPenalties: 0,
    avgCollectionsPerCollector: 0
  });
  
  // Calculate total gross earnings from collectors data
  const totalGrossEarnings = useMemo(() => {
    return collectors.reduce((sum, collector) => sum + (collector.totalEarnings || 0), 0);
  }, [collectors]);

  // Add state for penalty analytics data
  const [penaltyAnalytics, setPenaltyAnalytics] = useState<PenaltyAnalyticsData | null>(null);
  const [penaltyAnalyticsLoading, setPenaltyAnalyticsLoading] = useState(false);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>('all'); // Show all by default

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current collector rate
        const rate = await collectorRateService.getCurrentRate();
        setCollectorRate(rate);
        
        // Automatically generate payment records for approved collections
        console.log('Starting automatic payment record generation...');
        const paymentGenerationSuccess = await collectorEarningsService.autoGeneratePaymentRecords();
        console.log('Payment generation result:', paymentGenerationSuccess);
        
        if (!paymentGenerationSuccess) {
          console.warn('Failed to automatically generate payment records, continuing with existing data');
        }
        
        // Get all collectors with earnings
        console.log('Fetching collector earnings data...');
        const collectorsData = await collectorEarningsService.getCollectorsWithEarnings();
        console.log('Collectors data fetched:', collectorsData.length, 'collectors');
        setCollectors(collectorsData);
        
        // Get all payments with penalties
        console.log('Fetching payment data with penalties...');
        const paymentsWithPenalties = await collectorPenaltyService.getCollectorPaymentsWithPenalties();
        console.log('Payments data fetched:', paymentsWithPenalties.length, 'payments');
        setPayments(paymentsWithPenalties as PaymentData[]);
        
        // Calculate stats using the aggregated collector data for consistency
        const totalCollectors = collectorsData.length;
        const totalGrossEarnings = collectorsData.reduce((sum, collector) => sum + (collector.totalEarnings || 0), 0);
        const totalPenalties = collectorsData.reduce((sum, collector) => sum + (collector.totalPenalties || 0), 0);
        
        // Calculate pending and paid amounts from payment records
        const totalPendingAmount = paymentsWithPenalties
          .filter((p: any) => p.status === 'pending')
          .reduce((sum: number, payment: any) => sum + payment.adjusted_earnings, 0);
          
        const totalPaidAmount = paymentsWithPenalties
          .filter((p: any) => p.status === 'paid')
          .reduce((sum: number, payment: any) => sum + payment.adjusted_earnings, 0);
          
        const totalCollections = collectorsData.reduce((sum, collector) => sum + (collector.totalCollections || 0), 0);
        const avgCollectionsPerCollector = totalCollectors > 0 ? totalCollections / totalCollectors : 0;
        
        console.log('Calculated stats:', {
          totalCollectors,
          totalPendingAmount,
          totalPaidAmount,
          totalPenalties,
          avgCollectionsPerCollector
        });
        
        setStats({
          totalCollectors,
          totalPendingAmount,
          totalPaidAmount,
          totalPenalties,
          avgCollectionsPerCollector
        });
        
        console.log('Data loading complete');
      } catch (error) {
        console.error('Error fetching collector data:', error);
        setDataFetchError(true);
        // Show error notification
        error('Error', 'Failed to fetch collector data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Fetch penalty analytics when the penalty analytics tab is selected
  useEffect(() => {
    const fetchPenaltyAnalytics = async () => {
      if (activeTab === 'penalty-analytics' && !penaltyAnalytics) {
        try {
          setPenaltyAnalyticsLoading(true);
          const analyticsData = await collectorPenaltyService.getPenaltyAnalytics();
          setPenaltyAnalytics(analyticsData);
        } catch (error) {
          console.error('Error fetching penalty analytics:', error);
          error('Error', 'Failed to fetch penalty analytics data');
        } finally {
          setPenaltyAnalyticsLoading(false);
        }
      }
    };
    
    fetchPenaltyAnalytics();
  }, [activeTab, penaltyAnalytics]);
  
  // Memoized filtered payments
  const filteredPayments = useMemo(() => {
    // Filter payments based on payment filter
    let filteredPayments = payments;
    if (paymentFilter !== 'all') {
      filteredPayments = payments.filter(payment => payment.status === paymentFilter);
    }
    
    // Further filter by search term if provided
    if (searchTerm) {
      filteredPayments = filteredPayments.filter(payment => 
        payment.collector_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filteredPayments;
  }, [payments, paymentFilter, searchTerm]);

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const successResult = await collectorEarningsService.markPaymentAsPaid(paymentId);
      
      if (successResult) {
        // Update the payment status in the list
        setPayments(prev => 
          prev.map(payment => 
            payment.id === paymentId 
              ? { ...payment, status: 'paid', payment_date: new Date().toISOString() } 
              : payment
          )
        );
        
        // Update stats
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
          setStats(prev => ({
            ...prev,
            totalPendingAmount: prev.totalPendingAmount - payment.adjusted_earnings,
            totalPaidAmount: prev.totalPaidAmount + payment.adjusted_earnings
          }));
        }
        
        success('Success', 'Payment marked as paid');
      } else {
        throw new Error('Failed to mark payment as paid');
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      error('Error', 'Failed to mark payment as paid');
    }
  };
  
  // Function to mark all pending payments for a collector as paid
  const handleMarkAllAsPaid = async (collectorId: string, collectorName: string) => {
    try {
      // Get all pending payments for this collector
      const pendingPayments = payments.filter(
        p => p.collector_id === collectorId && p.status === 'pending'
      );
      
      if (pendingPayments.length === 0) {
        error('No pending payments', 'No pending payments found for this collector');
        return;
      }
      
      // Mark each payment as paid
      const results = await Promise.all(
        pendingPayments.map(payment => collectorEarningsService.markPaymentAsPaid(payment.id))
      );
      
      // Check if all operations were successful
      const allSuccessful = results.every(result => result === true);
      
      if (allSuccessful) {
        // Update the payments state
        setPayments(prev => 
          prev.map(payment => 
            payment.collector_id === collectorId && payment.status === 'pending'
              ? { ...payment, status: 'paid', payment_date: new Date().toISOString() }
              : payment
          )
        );
        
        // Update stats
        const totalAmountPaid = pendingPayments.reduce((sum, payment) => sum + payment.adjusted_earnings, 0);
        setStats(prev => ({
          ...prev,
          totalPendingAmount: prev.totalPendingAmount - totalAmountPaid,
          totalPaidAmount: prev.totalPaidAmount + totalAmountPaid
        }));
        
        success('Success', `All pending payments for ${collectorName} marked as paid`);
      } else {
        throw new Error('Some payments failed to be marked as paid');
      }
    } catch (error) {
      console.error('Error marking all payments as paid:', error);
      error('Error', 'Failed to mark all payments as paid');
    }
  };

  // Group payments by collector for easier management
  const groupedPayments = useMemo(() => {
    const groups: Record<string, PaymentData[]> = {};
    
    filteredPayments.forEach(payment => {
      const collectorId = payment.collector_id;
      if (!groups[collectorId]) {
        groups[collectorId] = [];
      }
      groups[collectorId].push(payment);
    });
    
    return groups;
  }, [filteredPayments]);

  // State for expanded collector rows
  const [expandedCollectors, setExpandedCollectors] = useState<Record<string, boolean>>({});
  
  // Function to toggle collector expansion
  const toggleCollectorExpansion = (collectorId: string) => {
    setExpandedCollectors(prev => ({
      ...prev,
      [collectorId]: !prev[collectorId]
    }));
  };
  
  // Function to fetch collections breakdown for a collector
  const fetchCollectionsBreakdown = async (collectorId: string) => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, collection_date, liters, status, approved_for_payment, collection_fee_status')
        .eq('staff_id', collectorId)
        .order('collection_date', { ascending: false })
        .limit(20); // Limit to last 20 collections for performance
      
      if (error) {
        console.error('Error fetching collections breakdown:', error);
        return [];
      }
      
      return data.map(collection => ({
        date: collection.collection_date,
        liters: collection.liters,
        status: collection.status,
        approved: collection.approved_for_payment,
        feeStatus: collection.collection_fee_status
      }));
    } catch (error) {
      console.error('Error fetching collections breakdown:', error);
      return [];
    }
  };
  
  // Function to load collections breakdown for a collector when expanded
  const loadCollectionsBreakdown = async (collectorId: string) => {
    // Only load if not already loaded
    const collector = collectors.find(c => c.id === collectorId);
    if (collector && (!collector.collectionsBreakdown || collector.collectionsBreakdown.length === 0)) {
      const breakdown = await fetchCollectionsBreakdown(collectorId);
      setCollectors(prev => prev.map(c => 
        c.id === collectorId ? { ...c, collectionsBreakdown: breakdown } : c
      ));
    }
  };
  
  // Enhanced collectors table with breakdown
  const renderCollectorsTable = () => {
    return (
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[120px]">Collector</TableHead>
                <TableHead className="text-right w-[80px]">Collections</TableHead>
                <TableHead className="text-right w-[80px]">Liters</TableHead>
                <TableHead className="text-right w-[90px]">Rate/Liter</TableHead>
                <TableHead className="text-right w-[100px]">Gross</TableHead>
                <TableHead className="text-right w-[90px]">Penalties</TableHead>
                <TableHead className="text-right w-[100px]">Pending</TableHead>
                <TableHead className="text-right w-[100px]">Net</TableHead>
                <TableHead className="text-right w-[100px]">Performance</TableHead>
                <TableHead className="text-right w-[120px]">Status</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectors.map((collector) => (
                <Fragment key={collector.id}>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      toggleCollectorExpansion(collector.id);
                      if (!expandedCollectors[collector.id]) {
                        loadCollectionsBreakdown(collector.id);
                      }
                    }}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollectorExpansion(collector.id);
                          if (!expandedCollectors[collector.id]) {
                            loadCollectionsBreakdown(collector.id);
                          }
                        }}
                      >
                        {expandedCollectors[collector.id] ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px] truncate">{collector.name}</TableCell>
                    <TableCell className="text-right">{collector.totalCollections}</TableCell>
                    <TableCell className="text-right">{collector.totalLiters.toFixed(0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(collector.ratePerLiter)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(collector.totalEarnings)}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(collector.totalPenalties)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(collector.pendingPayments)}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${collector.totalEarnings - collector.totalPenalties < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(collector.totalEarnings - collector.totalPenalties)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span>{collector.performanceScore.toFixed(0)}</span>
                        <Badge 
                          variant={collector.performanceScore >= 80 ? 'default' : 
                                 collector.performanceScore >= 60 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {collector.performanceScore >= 80 ? 'Excellent' : 
                           collector.performanceScore >= 60 ? 'Good' : 'Poor'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {payments.filter(p => p.collector_id === collector.id && p.status === 'pending').length > 0 ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                          Pending Payments
                        </Badge>
                      ) : payments.filter(p => p.collector_id === collector.id).length > 0 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          All Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          No Payments
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      {payments.filter(p => p.collector_id === collector.id && p.status === 'pending').length > 0 && (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAllAsPaid(collector.id, collector.name);
                          }}
                          className="bg-green-600 hover:bg-green-700 h-8 px-2 text-xs"
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedCollectors[collector.id] && (
                    <TableRow>
                      <TableCell colSpan={11} className="p-0 bg-muted/50">
                        <div className="p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <ListIcon className="h-4 w-4" />
                            Recent Collections Breakdown (Last 20)
                          </h4>
                          {collector.collectionsBreakdown && collector.collectionsBreakdown.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[100px]">Date</TableHead>
                                  <TableHead className="text-right w-[80px]">Liters</TableHead>
                                  <TableHead className="w-[100px]">Status</TableHead>
                                  <TableHead className="w-[120px]">Payment Approval</TableHead>
                                  <TableHead className="w-[100px]">Fee Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {collector.collectionsBreakdown.map((collection, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-xs">
                                      {new Date(collection.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {collection.liters.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={collection.status === 'Collected' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {collection.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {collection.approved ? (
                                        <Badge variant="default" className="text-xs">Approved</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {(collection as any).feeStatus === 'paid' ? (
                                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                          Paid
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                          Pending
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <Loader2Icon className="h-4 w-4 animate-spin mx-auto mb-2" />
                              Loading collections data...
                            </div>
                          )}
                          {/* Show payment history for this collector */}
                          {payments.filter(p => p.collector_id === collector.id).length > 0 && (
                            <div className="mt-6">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                <h5 className="font-medium">Payment History</h5>
                                {payments.filter(p => p.collector_id === collector.id && p.status === 'pending').length > 0 && (
                                  <Button 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAllAsPaid(collector.id, collector.name);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-xs h-8"
                                  >
                                    Mark All Pending as Paid
                                  </Button>
                                )}
                              </div>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[120px]">Period</TableHead>
                                      <TableHead className="text-right w-[80px]">Collections</TableHead>
                                      <TableHead className="text-right w-[80px]">Liters</TableHead>
                                      <TableHead className="text-right w-[90px]">Rate</TableHead>
                                      <TableHead className="text-right w-[100px]">Gross</TableHead>
                                      <TableHead className="text-right w-[90px]">Penalties</TableHead>
                                      <TableHead className="text-right w-[100px]">Pending</TableHead>
                                      <TableHead className="text-right w-[100px]">Net Pay</TableHead>
                                      <TableHead className="w-[80px]">Status</TableHead>
                                      <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {payments.filter(p => p.collector_id === collector.id).map((payment) => (
                                      <TableRow key={payment.id}>
                                        <TableCell>
                                          <div className="text-xs">
                                            {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right text-xs">{payment.total_collections}</TableCell>
                                        <TableCell className="text-right text-xs">{payment.total_liters?.toFixed(0)}</TableCell>
                                        <TableCell className="text-right text-xs">{formatCurrency(payment.rate_per_liter)}</TableCell>
                                        <TableCell className="text-right font-medium text-xs">{formatCurrency(payment.total_earnings)}</TableCell>
                                        <TableCell className="text-right text-xs">
                                          {payment.total_penalties > 0 ? (
                                            <span className="font-medium text-red-600">
                                              {formatCurrency(payment.total_penalties)}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">{formatCurrency(0)}</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                          {payment.status === 'pending' ? (
                                            <span className="font-medium text-orange-600">
                                              {formatCurrency(payment.adjusted_earnings)}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">{formatCurrency(0)}</span>
                                          )}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold text-xs ${payment.adjusted_earnings < 0 ? 'text-red-600' : ''}`}>
                                          {formatCurrency(payment.adjusted_earnings)}
                                        </TableCell>
                                        <TableCell>
                                          <Badge 
                                            variant={payment.status === 'paid' ? 'default' : 'secondary'}
                                            className={`text-xs ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                                          >
                                            {payment.status === 'paid' ? 'Paid' : 'Pending'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {payment.status === 'pending' ? (
                                            <Button 
                                              size="sm" 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkAsPaid(payment.id);
                                              }}
                                              className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"
                                            >
                                              Mark Paid
                                            </Button>
                                          ) : (
                                            <div className="text-xs text-muted-foreground">
                                              {payment.payment_date 
                                                ? new Date(payment.payment_date).toLocaleDateString() 
                                                : 'N/A'}
                                              </div>
                                            )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                Note: Payment periods may be daily or cover specific timeframes.
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Add Mark All Pending Payments as Paid button at the end of the table */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {payments.filter(p => p.status === 'pending').length > 0 
                ? `${payments.filter(p => p.status === 'pending').length} pending payments` 
                : 'No pending payments'}
            </div>
            <div className="w-full sm:w-auto">
              {payments.filter(p => p.status === 'pending').length > 0 && (
                <Button 
                  onClick={() => {
                    // Confirm before marking all pending payments as paid for all collectors
                    if (window.confirm(`Are you sure you want to mark all ${payments.filter(p => p.status === 'pending').length} pending payments as paid for ALL collectors?`)) {
                      payments
                        .filter(p => p.status === 'pending')
                        .forEach(payment => handleMarkAsPaid(payment.id));
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  size="sm"
                >
                  Mark All Pending Payments as Paid (All Collectors)
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update the payments tab rendering to include the enhanced collectors table
  const renderPaymentsTab = () => {
    return (
      <div className="space-y-6">
        {/* Summary Cards - Made responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(stats.totalPendingAmount)}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gross Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(totalGrossEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">Before penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(stats.totalPenalties)}
              </div>
              <p className="text-xs text-muted-foreground">Deducted from earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${totalGrossEarnings - stats.totalPenalties < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(totalGrossEarnings - stats.totalPenalties)}
              </div>
              <p className="text-xs text-muted-foreground">After penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(stats.totalPaidAmount)}
              </div>
              <p className="text-xs text-muted-foreground">Completed payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Filters - Made responsive */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search payments by collector name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportPaymentsToCSV} className="flex items-center gap-1 h-10 px-3" size="sm">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Enhanced Collectors Table with Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Collector Performance Overview
            </CardTitle>
            <CardDescription>
              Detailed breakdown of collections and earnings per collector (All-time data)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {collectors.length > 0 ? (
              renderCollectorsTable()
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No collectors found</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    );
  };

  // Export payments data to CSV
  const exportPaymentsToCSV = () => {
    try {
      const headers = ['Collector Name', 'Period Start', 'Period End', 'Total Collections', 'Total Liters', 'Rate Per Liter', 'Gross Earnings', 'Total Penalties', 'Net Earnings', 'Status', 'Payment Date'];
      const rows = filteredPayments.map(payment => [
        payment.collector_name || 'Unknown Collector',
        payment.period_start,
        payment.period_end,
        payment.total_collections,
        payment.total_liters?.toFixed(2) || '0.00',
        formatCurrency(payment.rate_per_liter),
        formatCurrency(payment.total_earnings),
        formatCurrency(payment.total_penalties),
        formatCurrency(payment.adjusted_earnings),
        payment.status,
        payment.payment_date || 'N/A'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `collector-payments-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      success('Success', 'Payments data exported successfully');
    } catch (error) {
      console.error('Error exporting payments data:', error);
      error('Error', 'Failed to export payments data');
    }
  };

  // Update the analytics tab to include the variance vs earnings chart
  const renderAnalyticsTab = () => {
    // Prepare data for the chart
    const chartData = payments.map(payment => ({
      period: `${new Date(payment.period_start).toLocaleDateString()} - ${new Date(payment.period_end).toLocaleDateString()}`,
      variance: payment.total_penalties, // Using penalties as a proxy for variance
      earnings: payment.adjusted_earnings,
      collector: payment.collector_name || 'Unknown Collector'
    }));

    // Prepare data for payment status distribution chart
    const statusDistributionData = [
      { name: 'Pending', value: payments.filter(p => p.status === 'pending').length },
      { name: 'Paid', value: payments.filter(p => p.status === 'paid').length }
    ];

    // Prepare data for top collectors chart
    const collectorEarningsMap: Record<string, number> = {};
    payments.forEach(payment => {
      const collectorName = payment.collector_name || 'Unknown Collector';
      if (!collectorEarningsMap[collectorName]) {
        collectorEarningsMap[collectorName] = 0;
      }
      collectorEarningsMap[collectorName] += payment.adjusted_earnings;
    });

    const topCollectorsData = Object.entries(collectorEarningsMap)
      .map(([name, earnings]) => ({ name, earnings }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 10);

    return (
      <div className="space-y-6">
        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Variance vs Earnings Chart - Dual Axis */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Variance vs Earnings
              </CardTitle>
              <CardDescription>
                Comparison of penalties (variance) and net earnings over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      stroke="#ef4444" 
                      tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#10b981" 
                      tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        `Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        name === 'variance' ? 'Penalties' : 'Net Earnings'
                      ]}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left" 
                      dataKey="variance" 
                      name="Penalties" 
                      fill="#ef4444" 
                      opacity={0.7}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="earnings" 
                      name="Net Earnings" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available for chart
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Collectors by Net Earnings Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Collectors by Net Earnings
              </CardTitle>
              <CardDescription>
                Highest earning collectors after penalty deductions
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {topCollectorsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={topCollectorsData}
                    layout="vertical"
                    margin={{
                      top: 20,
                      right: 30,
                      left: 100,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `Ksh${value.toLocaleString()}`} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      scale="band" 
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net Earnings']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="earnings" 
                      name="Net Earnings" 
                      fill="#8b5cf6" 
                      barSize={20}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Status Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Payment Status Distribution
              </CardTitle>
              <CardDescription>
                Distribution of payments by status
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {statusDistributionData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={statusDistributionData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      name="Count" 
                      fill="#3b82f6" 
                      barSize={40}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Penalties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Total Penalties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-center text-red-600">
                {formatCurrency(stats.totalPenalties)}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Deducted from gross earnings
              </p>
            </CardContent>
          </Card>

          {/* Avg Earnings per Collector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Avg Net Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-center">
                {formatCurrency(stats.totalCollectors > 0 ? (stats.totalPaidAmount + stats.totalPendingAmount) / stats.totalCollectors : 0)}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Average net earnings per collector
              </p>
            </CardContent>
          </Card>

          {/* Collection Efficiency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Collection Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-center">
                {stats.totalCollectors > 0 ? ((stats.totalPaidAmount / (stats.totalPendingAmount + stats.totalPaidAmount)) * 100).toFixed(1) : '0.0'}%
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Percentage of payments processed
              </p>
            </CardContent>
          </Card>

          {/* Top Performing Collector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-center truncate">
                {collectors.length > 0 
                  ? [...collectors]
                      .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].name 
                  : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {collectors.length > 0 
                  ? formatCurrency(Math.max(0, [...collectors]
                      .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].totalEarnings - 
                    [...collectors]
                      .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].totalPenalties))
                  : 'No data'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Create a new function to render the penalty analytics tab
  const renderPenaltyAnalyticsTab = () => {
    if (penaltyAnalyticsLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!penaltyAnalytics) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No penalty analytics data available</p>
        </div>
      );
    }

    // Prepare data for charts
    const penaltyBreakdownData = [
      { name: 'Positive Variance', value: penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector > 0 ? 
        (penaltyAnalytics.collectorPenaltyData.reduce((sum, c) => sum + c.penaltyBreakdown.positiveVariancePenalties, 0) / penaltyAnalytics.collectorPenaltyData.length) : 0 },
      { name: 'Negative Variance', value: penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector > 0 ? 
        (penaltyAnalytics.collectorPenaltyData.reduce((sum, c) => sum + c.penaltyBreakdown.negativeVariancePenalties, 0) / penaltyAnalytics.collectorPenaltyData.length) : 0 }
    ];

    const COLORS = ['#ef4444', '#3b82f6'];

    // Top penalty collectors (top 5)
    const topPenaltyCollectors = [...penaltyAnalytics.collectorPenaltyData]
      .sort((a, b) => b.totalPenalties - a.totalPenalties)
      .slice(0, 5)
      .map(collector => ({
        name: collector.collectorName,
        penalties: collector.totalPenalties
      }));

    return (
      <div className="space-y-6">
        {/* Penalty Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(penaltyAnalytics.overallPenaltyStats.totalPenalties)}
              </div>
              <p className="text-xs text-muted-foreground">Across all collectors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Penalty per Collector</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector)}
              </div>
              <p className="text-xs text-muted-foreground">Average penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest Penalty Collector</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {penaltyAnalytics.overallPenaltyStats.highestPenaltyCollector || 'N/A'}
              </div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(penaltyAnalytics.overallPenaltyStats.highestPenaltyAmount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collectors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {penaltyAnalytics.collectorPenaltyData.length}
              </div>
              <p className="text-xs text-muted-foreground">Active collectors</p>
            </CardContent>
          </Card>
        </div>

        {/* Penalty Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Penalty Breakdown Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Penalty Breakdown (Average)
              </CardTitle>
              <CardDescription>
                Distribution of penalties by variance type
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {penaltyBreakdownData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={penaltyBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {penaltyBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No penalty data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Penalty Collectors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Penalty Collectors
              </CardTitle>
              <CardDescription>
                Collectors with highest penalties
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {topPenaltyCollectors.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={topPenaltyCollectors}
                    layout="vertical"
                    margin={{
                      top: 20,
                      right: 30,
                      left: 100,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      scale="band" 
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Number(value)), 'Penalties']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="penalties" 
                      name="Penalties" 
                      fill="#ef4444" 
                      barSize={20}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No penalty data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Collector-Specific Penalty Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              Collector Penalty Details
            </CardTitle>
            <CardDescription>
              Detailed penalty information for each collector
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collector</TableHead>
                  <TableHead className="text-right">Total Penalties</TableHead>
                  <TableHead className="text-right">Positive Variance Penalties</TableHead>
                  <TableHead className="text-right">Negative Variance Penalties</TableHead>
                  <TableHead className="text-right">Positive Variances</TableHead>
                  <TableHead className="text-right">Negative Variances</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {penaltyAnalytics.collectorPenaltyData.map((collector) => (
                  <TableRow key={collector.collectorId}>
                    <TableCell className="font-medium">{collector.collectorName}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {formatCurrency(collector.totalPenalties)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(collector.penaltyBreakdown.positiveVariancePenalties)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(collector.penaltyBreakdown.negativeVariancePenalties)}
                    </TableCell>
                    <TableCell className="text-right">
                      {collector.penaltyBreakdown.totalPositiveVariances}
                    </TableCell>
                    <TableCell className="text-right">
                      {collector.penaltyBreakdown.totalNegativeVariances}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Penalties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Penalties
            </CardTitle>
            <CardDescription>
              Most recent penalty records across all collectors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {penaltyAnalytics.collectorPenaltyData.some(c => c.recentPenalties.length > 0) ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Collector</TableHead>
                    <TableHead>Variance Type</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                    <TableHead className="text-right">Penalty Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {penaltyAnalytics.collectorPenaltyData.flatMap(collector => 
                    collector.recentPenalties.map((penalty, index) => (
                      <TableRow key={`${collector.collectorId}-${index}`}>
                        <TableCell>
                          {penalty.collection_date ? new Date(penalty.collection_date).toLocaleDateString() : 
                           penalty.approved_at ? new Date(penalty.approved_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>{collector.collectorName}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={penalty.variance_type === 'positive' ? 'default' : 
                                   penalty.variance_type === 'negative' ? 'destructive' : 'secondary'}
                            className={penalty.variance_type === 'positive' ? 'bg-blue-100 text-blue-800' : 
                                      penalty.variance_type === 'negative' ? 'bg-red-100 text-red-800' : ''}
                          >
                            {penalty.variance_type || 'None'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {penalty.variance_percentage ? `${penalty.variance_percentage.toFixed(2)}%` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(penalty.total_penalty_amount || penalty.penalty_amount || 0)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {penalty.notes || penalty.approval_notes || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  ).sort((a, b) => {
                    // Sort by date descending
                    const dateA = a.props.children[0].props.children;
                    const dateB = b.props.children[0].props.children;
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                  }).slice(0, 10)}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent penalties found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
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
      {/* Header - Made responsive */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Collector Payments</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage collector payments and track disbursements</p>
      </div>

      {/* Navigation Tabs - Simplified and responsive */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="flex overflow-x-auto">
          {(['payments', 'analytics', 'penalty-analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 sm:px-6 sm:py-4 font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'payments' && <DollarSign className="w-4 h-4 inline mr-2" />}
              {tab === 'analytics' && <BarChart3 className="w-4 h-4 inline mr-2" />}
              {tab === 'penalty-analytics' && <FileBarChart className="w-4 h-4 inline mr-2" />}
              <span className="hidden sm:inline">{tab === 'penalty-analytics' ? 'Penalty Analytics' : tab}</span>
              <span className="sm:hidden">
                {tab === 'payments' && 'Pay'}
                {tab === 'analytics' && 'Charts'}
                {tab === 'penalty-analytics' && 'Penalty'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Payments Tab - Simplified and Focused */}
      {activeTab === 'payments' && renderPaymentsTab()}

      {/* Analytics Tab - Keep existing functionality */}
      {activeTab === 'analytics' && renderAnalyticsTab()}

      {/* Penalty Analytics Tab - New functionality */}
      {activeTab === 'penalty-analytics' && renderPenaltyAnalyticsTab()}

    </div>
  );
}