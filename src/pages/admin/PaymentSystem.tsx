import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar, 
  Download, 
  Filter, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Settings, 
  BarChart3,
  PieChart,
  List,
  Grid,
  CreditCard
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { trendService } from '@/services/trend-service';
import { PaymentService } from '@/services/payment-service';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { milkRateService } from '@/services/milk-rate-service';
import { collectorRateService } from '@/services/collector-rate-service';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { formatCurrency } from '@/utils/formatters';
import { deductionService } from '@/services/deduction-service';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart as RechartsPieChart, 
  Pie, Cell
} from 'recharts';

import PaymentOverviewChart from '@/components/admin/PaymentOverviewChart';
import RefreshButton from '@/components/ui/RefreshButton';
import { usePaymentSystemData } from '@/hooks/usePaymentSystemData';
import CollectorPaymentsSection from '@/components/admin/CollectorPaymentsSection';

interface Collection {
  id: string;
  farmer_id: string;
  collection_id: string;
  collection_date: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  status: string;
  approved_for_payment?: boolean;
  approved_at?: string;
  approved_by?: string;
  staff_id?: string;
  created_at: string;
  updated_at: string;
  credit_used?: number;
  collection_payments?: {
    credit_used?: number;
  }[];
  farmers: {
    id: string;
    user_id: string;
    bank_account_name: string;
    bank_account_number: string;
    bank_name: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
}

interface FarmerPaymentSummary {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  total_collections: number;
  total_liters: number;
  total_gross_amount: number;
  total_collector_fees: number;
  total_net_amount: number;
  paid_amount: number;
  pending_gross_amount: number;
  pending_net_amount: number;
  bank_info: string;
  credit_used?: number;
  net_payment?: number;
  total_deductions?: number;
}

interface PaymentAnalytics {
  total_pending: number;
  total_paid: number;
  total_farmers: number;
  avg_payment: number;
  daily_trend: { date: string; collections: number; paidAmount: number; pendingAmount: number; creditUsed: number }[];
  farmer_distribution: { name: string; value: number }[];
  total_credit_used: number;
  total_net_payment: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const PaymentSystem = () => {
  const toast = useToastNotifications();
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // Time frame filter state
  const [timeFrame, setTimeFrame] = useState('all'); // 'all', 'daily', 'weekly', 'monthly', 'lastMonth'
  const [customDateRange, setCustomDateRange] = useState({
    from: '',
    to: ''
  });

  // Farmer deductions state
  const [farmerDeductions, setFarmerDeductions] = useState<Record<string, number>>({});

  // Use React Query hook for data fetching
  const { data: paymentData, isLoading, isError, error, refetch } = usePaymentSystemData(timeFrame, customDateRange);
  
  const collections = paymentData?.collections || [];
  const farmerPaymentSummaries = paymentData?.farmerPaymentSummaries || [];
  const analytics = paymentData?.analytics || {
    total_pending: 0,
    total_paid: 0,
    total_farmers: 0,
    avg_payment: 0,
    daily_trend: [],
    farmer_distribution: [],
    total_credit_used: 0,
    total_net_payment: 0
  };

  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);

  // Rate configuration state
  const [rateConfig, setRateConfig] = useState({
    ratePerLiter: 0,
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  // Collector rate configuration state
  const [collectorRateConfig, setCollectorRateConfig] = useState({
    ratePerLiter: 0,
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  // Calculate credit analytics based on the correct model
  const creditAnalytics = {
    totalCreditUsed: farmerPaymentSummaries.reduce((sum, farmer) => 
      sum + (farmer.credit_used || 0), 0
    ),
    creditImpact: farmerPaymentSummaries.length > 0 && 
                  farmerPaymentSummaries.reduce((sum, farmer) => sum + farmer.total_gross_amount, 0) > 0 ? 
      (farmerPaymentSummaries.reduce((sum, farmer) => 
        sum + (farmer.credit_used || 0), 0) / 
       farmerPaymentSummaries.reduce((sum, farmer) => 
        sum + farmer.total_gross_amount, 0)) * 100 : 0,
    creditDistribution: farmerPaymentSummaries
      .filter(farmer => (farmer.credit_used || 0) > 0)
      .map(farmer => ({
        name: farmer.farmer_name,
        totalAmount: farmer.total_gross_amount,
        creditUsed: farmer.credit_used || 0,
        netPayment: farmer.net_payment || 0,
        creditPercentage: farmer.total_gross_amount > 0 ? 
          ((farmer.credit_used || 0) / farmer.total_gross_amount) * 100 : 0,
        status: 'Active'
      }))
      .sort((a, b) => b.creditUsed - a.creditUsed),
    totalPendingDeductions: farmerPaymentSummaries.reduce((sum, farmer) => 
      sum + (farmer.credit_used || 0), 0
    )
  };

  // Fetch current milk rate and collector rate on component mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Fetch milk rate
        const currentRate = await milkRateService.getCurrentRate();
        setRateConfig({
          ratePerLiter: currentRate,
          effectiveFrom: new Date().toISOString().split('T')[0]
        });

        // Fetch collector rate
        const currentCollectorRate = await collectorRateService.getCurrentRate();
        setCollectorRateConfig({
          ratePerLiter: currentCollectorRate,
          effectiveFrom: new Date().toISOString().split('T')[0]
        });
      } catch (error) {
        console.error('Error fetching rates:', error);
        toast.error('Error', 'Failed to fetch rates');
      }
    };

    fetchRates();
  }, []);

  // Fetch farmer deductions
  useEffect(() => {
    const fetchFarmerDeductions = async () => {
      try {
        const deductionsData = await deductionService.getAllFarmersWithDeductions();
        const deductionsMap: Record<string, number> = {};
        deductionsData.forEach((farmer: any) => {
          deductionsMap[farmer.id] = farmer.totalDeductions || 0;
        });
        setFarmerDeductions(deductionsMap);
      } catch (error) {
        console.error('Error fetching farmer deductions:', error);
        toast.error('Error', 'Failed to fetch farmer deductions');
      }
    };

    fetchFarmerDeductions();
  }, []);

  // Initialize performance monitoring
  const { measureOperation } = usePerformanceMonitor({ 
    componentName: 'PaymentSystemPage',
    enabled: process.env.NODE_ENV === 'development'
  });

  const { refreshSession } = useSessionRefresh({ refreshInterval: 10 * 60 * 1000 });

  // Fetch all data with retry logic
  const fetchAllData = async () => {
    await refetch();
  };

  const updateMilkRate = async () => {
    await measureOperation('updateMilkRate', async () => {
      try {
        if (rateConfig.ratePerLiter <= 0) {
          toast.error('Error', 'Rate per liter must be greater than zero');
          return;
        }
        
        if (!rateConfig.effectiveFrom) {
          toast.error('Error', 'Effective date is required');
          return;
        }
        
        const success = await milkRateService.updateRate(rateConfig.ratePerLiter, rateConfig.effectiveFrom);
        
        if (success) {
          toast.success('Success', 'Milk rate updated successfully!');
          // Note: Milk rate updates are not cached, so we don't need to refetch
        } else {
          throw new Error('Failed to update milk rate');
        }
      } catch (error: any) {
        console.error('Error updating rate:', error);
        toast.error('Error', 'Failed to update rate: ' + (error.message || 'Unknown error'));
      }
    });
  };

  const updateCollectorRate = async () => {
    await measureOperation('updateCollectorRate', async () => {
      try {
        if (collectorRateConfig.ratePerLiter <= 0) {
          toast.error('Error', 'Rate per liter must be greater than zero');
          return;
        }
        
        if (!collectorRateConfig.effectiveFrom) {
          toast.error('Error', 'Effective date is required');
          return;
        }
        
        const success = await collectorRateService.updateRate(collectorRateConfig.ratePerLiter, collectorRateConfig.effectiveFrom);
        
        if (success) {
          toast.success('Success', 'Collector rate updated successfully!');
        } else {
          throw new Error('Failed to update collector rate');
        }
      } catch (error: any) {
        console.error('Error updating collector rate:', error);
        toast.error('Error', 'Failed to update collector rate: ' + (error.message || 'Unknown error'));
      }
    });
  };

  const markAsPaid = async (collectionId: string, farmerId: string) => {
    await measureOperation('markAsPaid', async () => {
      try {
        if (userRole !== 'admin') {
          toast.error('Access Denied', 'Only administrators can mark payments as paid');
          return;
        }

        const collection = collections.find(c => c.id === collectionId);
        if (!collection) {
          toast.error('Error', 'Collection not found');
          return;
        }
      
        // Refresh session before performing critical operation
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before marking payment as paid', error);
        });
      
        const result = await PaymentService.markCollectionAsPaid(collectionId, farmerId, collection);
      
        if (!result.success) {
          throw result.error || new Error('Unknown error occurred');
        }

        toast.success('Success', 'Payment marked as paid successfully!');
      
        // Refresh the data to ensure consistency
        await fetchAllData();
      } catch (error: any) {
        console.error('Error marking as paid:', error);
        toast.error('Error', 'Failed to mark as paid: ' + (error.message || 'Unknown error'));
      }
    });
  };

  const markAllFarmerPaymentsAsPaid = async (farmerId: string) => {
    await measureOperation('markAllFarmerPaymentsAsPaid', async () => {
      try {
        if (userRole !== 'admin') {
          toast.error('Access Denied', 'Only administrators can mark payments as paid');
          return;
        }

        // Get all pending collections for this farmer
        const pendingCollections = collections.filter(
          c => c.farmer_id === farmerId && c.status !== 'Paid'
        );
        
        if (pendingCollections.length === 0) {
          toast.show({ title: 'Info', description: 'No pending payments for this farmer' });
          return;
        }
        
        // Check how many collections are approved for payment
        const approvedCollections = pendingCollections.filter(c => c.approved_for_payment);
        const unapprovedCount = pendingCollections.length - approvedCollections.length;
        
        if (unapprovedCount > 0) {
          toast.show({ 
            title: 'Notice', 
            description: `${unapprovedCount} collections need approval before payment processing. Only ${approvedCollections.length} will be processed.` 
          });
        }
        
        if (approvedCollections.length === 0) {
          toast.show({ 
            title: 'Info', 
            description: 'No approved collections to process for payment.' 
          });
          return;
        }
        
        // Refresh session before performing critical operation
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before marking all payments as paid', error);
        });
        
        const result = await PaymentService.markAllFarmerPaymentsAsPaid(farmerId, pendingCollections);
      
        if (!result.success) {
          throw result.error || new Error('Unknown error occurred');
        }

        toast.success('Success', result.message || `Processed ${approvedCollections.length} payments successfully!`);
        
        // Refresh the data to ensure consistency
        await fetchAllData();
      } catch (error: any) {
        console.error('Error marking all farmer payments as paid:', error);
        toast.error('Error', 'Failed to mark all payments as paid: ' + (error.message || 'Unknown error'));
      }
    });
  };

  // New function to approve collections for payment
  const approveCollectionsForPayment = async (farmerId: string, collectionIds: string[]) => {
    await measureOperation('approveCollectionsForPayment', async () => {
      try {
        if (userRole !== 'admin') {
          toast.error('Access Denied', 'Only administrators can approve collections for payment');
          return;
        }

        // Refresh session before performing critical operation
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before approving collections for payment', error);
        });

        // Get the total amount for these collections
        const farmerCollections = collections.filter(c => 
          c.farmer_id === farmerId && collectionIds.includes(c.id)
        );

        const totalAmount = farmerCollections.reduce((sum, collection) => 
          sum + (collection.total_amount || 0), 0
        );

        // Call the payment service to approve collections for payment
        const result = await PaymentService.createPaymentForApproval(
          farmerId,
          collectionIds,
          totalAmount,
          'Approved for payment by admin',
          user?.id
        );

        if (!result.success) {
          throw result.error || new Error('Unknown error occurred');
        }

        toast.success('Success', `Approved ${collectionIds.length} collections for payment successfully!`);
        
        // Refresh the data to ensure consistency
        await fetchAllData();
      } catch (error: any) {
        console.error('Error approving collections for payment:', error);
        toast.error('Error', 'Failed to approve collections for payment: ' + (error.message || 'Unknown error'));
      }
    });
  };

  // Function to deduct collector fees from pending payments (individual processing)
  const deductCollectorFees = async () => {
    await measureOperation('deductCollectorFees', async () => {
      try {
        if (userRole !== 'admin') {
          toast.error('Access Denied', 'Only administrators can deduct collector fees');
          return;
        }

        // Get current collector rate
        const collectorRate = await collectorRateService.getCurrentRate();
        
        if (collectorRate <= 0) {
          toast.error('Error', 'Invalid collector rate. Please set a valid collector rate first.');
          return;
        }

        // Get all pending collections that are approved for payment
        const pendingCollections = filteredCollections.filter(
          c => c.status !== 'Paid' && c.approved_for_payment
        );
        
        if (pendingCollections.length === 0) {
          toast.show({ title: 'Info', description: 'No approved pending payments to process.' });
          return;
        }
        
        // Process each collection to deduct collector fees
        let successCount = 0;
        let errorCount = 0;
        
        for (const collection of pendingCollections) {
          try {
            const result = await PaymentService.markCollectionAsPaid(
              collection.id, 
              collection.farmer_id, 
              collection
            );
            
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              console.error(`Failed to process collection ${collection.id}:`, result.error);
            }
          } catch (error) {
            errorCount++;
            console.error(`Error processing collection ${collection.id}:`, error);
          }
        }
        
        // Refresh the data to ensure consistency
        await fetchAllData();
        
        if (errorCount === 0) {
          toast.success('Success', `Successfully deducted collector fees from ${successCount} payments!`);
        } else {
          toast.show({ 
            title: 'Partial Success', 
            description: `Processed ${successCount} payments successfully. ${errorCount} payments failed.` 
          });
        }
      } catch (error: any) {
        console.error('Error deducting collector fees:', error);
        toast.error('Error', 'Failed to deduct collector fees: ' + (error.message || 'Unknown error'));
      }
    });
  };

  // Function to handle time frame change
  const handleTimeFrameChange = (newTimeFrame: string) => {
    setTimeFrame(newTimeFrame);
    
    // If switching to custom, don't trigger data refresh yet
    // Wait for user to input dates
    if (newTimeFrame !== 'custom') {
      // Reset custom date range when not using custom
      setCustomDateRange({ from: '', to: '' });
      // React Query will automatically refetch when timeFrame changes
    }
  };

  // Function to handle custom date range change
  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setCustomDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to apply custom date range filter
  const applyCustomDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      // Validate that 'from' date is not after 'to' date
      const fromDate = new Date(customDateRange.from);
      const toDate = new Date(customDateRange.to);
      
      if (fromDate > toDate) {
        toast.error('Error', 'From date cannot be after To date');
        return;
      }
      
      // Set time frame to custom
      // React Query will automatically refetch when timeFrame or customDateRange changes
      setTimeFrame('custom');
    } else {
      toast.error('Error', 'Please select both From and To dates');
    }
  };

  // Function to reset all filters
  const resetFilters = () => {
    setTimeFrame('all');
    setCustomDateRange({ from: '', to: '' });
    setSearchTerm('');
    setFilterStatus('all');
    // React Query will automatically refetch when dependencies change
  };

  // Refresh session on component mount and fetch initial data
  useEffect(() => {
    const initialize = async () => {
      try {
        // Refresh session first
        await refreshSession().catch(error => {
          console.warn('Initial session refresh failed', error);
        });
        // Then fetch all data
        await fetchAllData();
      } catch (error) {
        console.error('Error during initialization:', error);
        toast.error('Error', 'Failed to initialize payment system');
      }
    };
    
    initialize();
  }, []);



  // Filter collections based on search and filters
  useEffect(() => {
    let result = [...collections];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(collection => 
        collection.farmers?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.collection_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(collection => collection.status === filterStatus);
    }
    
    // Additional filtering for tabs
    if (activeTab === 'pending') {
      result = result.filter(collection => collection.status !== 'Paid');
    } else if (activeTab === 'paid') {
      result = result.filter(collection => collection.status === 'Paid');
    }
    
    // Only update state if the result actually changed
    const currentResultString = JSON.stringify(result);
    const previousResultString = JSON.stringify(filteredCollections);
    
    if (currentResultString !== previousResultString) {
      setFilteredCollections(result);
    }
  }, [searchTerm, filterStatus, activeTab, collections, filteredCollections]);



  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading payment data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Management</h1>
                <p className="text-gray-600">Manage farmer payments, configure rates, and track payment history</p>
              </div>
              <RefreshButton 
                isRefreshing={isLoading} 
                onRefresh={fetchAllData} 
                className="bg-white border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.total_pending)}</p>
                  <p className="text-xs text-gray-500">Awaiting payment processing</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.total_paid)}</p>
                  <p className="text-xs text-gray-500">Successfully processed</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Farmers</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.total_farmers}</p>
                  <p className="text-xs text-gray-500">With payment records</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Credit Used</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.total_credit_used)}</p>
                  <p className="text-xs text-gray-500">From pending payments</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Net Payment</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.total_net_payment)}</p>
                  <p className="text-xs text-gray-500">After credit deductions</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-xl shadow-lg mb-6">
            <div className="flex border-b">
              {['overview', 'analytics', 'pending', 'paid', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab === 'overview' && <BarChart3 className="w-4 h-4 inline mr-2" />}
                  {tab === 'analytics' && <PieChart className="w-4 h-4 inline mr-2" />}
                  {tab === 'pending' && <Clock className="w-4 h-4 inline mr-2" />}
                  {tab === 'paid' && <CheckCircle className="w-4 h-4 inline mr-2" />}
                  {tab === 'settings' && <Settings className="w-4 h-4 inline mr-2" />}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Time Frame Filters */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">Filter by Time Period</h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {['all', 'daily', 'weekly', 'monthly', 'lastMonth'].map((period) => (
                      <button
                        key={period}
                        onClick={() => handleTimeFrameChange(period)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          timeFrame === period
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {period === 'all' && 'All Time'}
                        {period === 'daily' && 'Today'}
                        {period === 'weekly' && 'This Week'}
                        {period === 'monthly' && 'This Month'}
                        {period === 'lastMonth' && 'Last Month'}
                      </button>
                    ))}
                    
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
                
                {/* Custom Date Range */}
                <div className="mt-4 flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <Input
                      type="date"
                      value={customDateRange.from}
                      onChange={(e) => handleCustomDateChange('from', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <Input
                      type="date"
                      value={customDateRange.to}
                      onChange={(e) => handleCustomDateChange('to', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  
                  <Button
                    onClick={applyCustomDateRange}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Apply Date Range
                  </Button>
                </div>
                
                {/* Current Filter Display */}
                <div className="mt-4 text-sm text-gray-600">
                  {timeFrame !== 'all' && (
                    <p>
                      Showing data for: 
                      <span className="font-medium ml-1">
                        {timeFrame === 'daily' && 'Today'}
                        {timeFrame === 'weekly' && 'This Week'}
                        {timeFrame === 'monthly' && 'This Month'}
                        {timeFrame === 'lastMonth' && 'Last Month'}
                        {timeFrame === 'custom' && `Custom Range: ${customDateRange.from} to ${customDateRange.to}`}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Collections and Payments Trend Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Collections and Payments Trend
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Daily overview of collections and payment amounts</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analytics.daily_trend.map(item => ({
                          date: item.date,
                          paid: item.paidAmount,
                          pending: item.pendingAmount,
                          credit: item.creditUsed
                        }))}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis tickFormatter={(value) => `KSh${(value / 1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(Number(value))}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area type="monotone" dataKey="paid" stackId="1" stroke="#10b981" fill="#10b981" name="Paid" />
                        <Area type="monotone" dataKey="pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Pending" />
                        <Area type="monotone" dataKey="credit" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Credit Used" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </div>

              {/* New Payment Overview Chart */}
              <PaymentOverviewChart 
                data={analytics.daily_trend.map(item => ({
                  date: item.date,
                  collections: item.collections,
                  pendingAmount: item.pendingAmount,
                  paidAmount: item.paidAmount
                }))}
              />

              {/* Farmer Payment Summary */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Farmer Payment Summary</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-indigo-100' : ''}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-indigo-100' : ''}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {viewMode === 'list' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collections</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Liters</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Used</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmerPaymentSummaries.map((farmer) => {
                          const hasCredit = farmer.credit_used > 0;
                          const totalDeductions = farmer.total_deductions || 0;
                          return (
                            <tr key={farmer.farmer_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{farmer.farmer_name}</div>
                                <div className="text-sm text-gray-500">{farmer.farmer_phone}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {farmer.total_collections}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {farmer.total_liters.toFixed(2)}L
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(farmer.pending_net_amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(farmer.paid_amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                {formatCurrency(totalDeductions)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-medium ${hasCredit ? 'text-purple-600' : 'text-gray-500'}`}>
                                  {formatCurrency(farmer.credit_used)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-green-600">
                                  {formatCurrency(farmer.net_payment || 0)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(farmer.total_gross_amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  {/* Check if there are any unapproved collections for this farmer */}
                                  {collections.filter(c => c.farmer_id === farmer.farmer_id && !c.approved_for_payment && c.status !== 'Paid').length > 0 ? (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const unapprovedCollections = collections.filter(c => 
                                          c.farmer_id === farmer.farmer_id && !c.approved_for_payment && c.status !== 'Paid'
                                        );
                                        const collectionIds = unapprovedCollections.map(c => c.id);
                                        approveCollectionsForPayment(farmer.farmer_id, collectionIds);
                                      }}
                                      className="mr-2"
                                    >
                                      Approve All
                                    </Button>
                                  ) : null}
                                  <Button
                                    size="sm"
                                    onClick={() => markAllFarmerPaymentsAsPaid(farmer.farmer_id)}
                                    disabled={farmer.pending_net_amount <= 0}
                                  >
                                    Mark Paid
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Grid view
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {farmerPaymentSummaries.map((farmer) => (
                      <Card key={farmer.farmer_id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{farmer.farmer_name}</CardTitle>
                          <p className="text-sm text-gray-500">{farmer.farmer_phone}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Collections:</span>
                              <span className="text-sm font-medium">{farmer.total_collections}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Liters:</span>
                              <span className="text-sm font-medium">{farmer.total_liters.toFixed(2)}L</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Pending:</span>
                              <span className="text-sm font-medium text-yellow-600">
                                {formatCurrency(farmer.pending_net_amount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Paid:</span>
                              <span className="text-sm font-medium text-green-600">
                                {formatCurrency(farmer.paid_amount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Credit Used:</span>
                              <span className="text-sm font-medium text-purple-600">
                                {formatCurrency(farmer.credit_used)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Deductions:</span>
                              <span className="text-sm font-medium text-red-600">
                                {formatCurrency(farmer.total_deductions || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Net Payment:</span>
                              <span className="text-sm font-medium text-blue-600">
                                {formatCurrency(farmer.net_payment || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="text-sm font-medium">Total:</span>
                              <span className="text-sm font-bold">
                                {formatCurrency(farmer.total_gross_amount)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex gap-2 mb-2">
                              {/* Check if there are any unapproved collections for this farmer */}
                              {collections.filter(c => c.farmer_id === farmer.farmer_id && !c.approved_for_payment && c.status !== 'Paid').length > 0 ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const unapprovedCollections = collections.filter(c => 
                                      c.farmer_id === farmer.farmer_id && !c.approved_for_payment && c.status !== 'Paid'
                                    );
                                    const collectionIds = unapprovedCollections.map(c => c.id);
                                    approveCollectionsForPayment(farmer.farmer_id, collectionIds);
                                  }}
                                  className="flex-1"
                                >
                                  Approve All
                                </Button>
                              ) : null}
                            </div>
                            <Button
                              className="w-full"
                              onClick={() => markAllFarmerPaymentsAsPaid(farmer.farmer_id)}
                              disabled={farmer.pending_net_amount <= 0}
                            >
                              Mark Paid
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {farmerPaymentSummaries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No farmer payment data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Credit Analytics Section */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Credit Utilization Overview */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Credit Utilization</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Credit Distribution Pie Chart */}
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-800 mb-4">Credit Distribution</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={creditAnalytics.creditDistribution.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="creditUsed"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {creditAnalytics.creditDistribution.slice(0, 5).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Credit Metrics */}
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-700">Total Credit Used</p>
                      <p className="text-2xl font-bold text-purple-900">{formatCurrency(creditAnalytics.totalCreditUsed)}</p>
                      <p className="text-xs text-purple-600">Pending deductions from payments</p>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm text-indigo-700">Credit Impact</p>
                      <p className="text-2xl font-bold text-indigo-900">{creditAnalytics.creditImpact.toFixed(1)}%</p>
                      <p className="text-xs text-indigo-600">Of total payments</p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">Active Credit Users</p>
                      <p className="text-2xl font-bold text-blue-900">{creditAnalytics.creditDistribution.length}</p>
                      <p className="text-xs text-blue-600">Farmers using credit</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Credit Impact Analysis */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Credit Impact Analysis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700">Gross Payments</p>
                    <p className="text-xl font-bold text-green-900">{formatCurrency(analytics.total_pending + analytics.total_paid)}</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-700">Credit Deductions</p>
                    <p className="text-xl font-bold text-purple-900">{formatCurrency(analytics.total_credit_used)}</p>
                    <p className="text-xs text-purple-600">Pending deductions from payments</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-indigo-700">Net Payments</p>
                    <p className="text-xl font-bold text-indigo-900">{formatCurrency(analytics.total_net_payment)}</p>
                  </div>
                </div>
                
                {/* Credit Analytics by Farmer */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Used</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit %</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {creditAnalytics.creditDistribution.map((farmer, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{farmer.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(farmer.totalAmount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(farmer.creditUsed)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(farmer.netPayment)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              farmer.creditPercentage > 20 ? 'bg-red-100 text-red-800' : 
                              farmer.creditPercentage > 10 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {farmer.creditPercentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {farmer.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {creditAnalytics.creditDistribution.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                            No credit usage data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <CardTitle>
                        Pending Collections
                      </CardTitle>
                    </div>
                    
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Used</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collector Fee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCollections
                          .filter(c => c.status !== 'Paid')
                          .map((collection) => {
                            // Calculate collector fee for this collection
                            const collectorRate = collectorRateConfig.ratePerLiter;
                            const collectorFee = (collection.liters || 0) * collectorRate;
                            const creditUsed = collection.collection_payments?.[0]?.credit_used || 0;
                            const netPayment = collection.total_amount - creditUsed - collectorFee;
                            
                            return (
                              <tr key={collection.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {collection.farmers?.profiles?.full_name || 'Unknown Farmer'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {collection.farmers?.profiles?.phone || 'No phone'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(collection.collection_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {collection.liters.toFixed(2)}L
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  KSh {collection.rate_per_liter.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCurrency(collection.total_amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                                  {formatCurrency(creditUsed)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                                  {formatCurrency(collectorFee)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                  {formatCurrency(netPayment)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {collection.approved_for_payment ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Approved
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {!collection.approved_for_payment && collection.status !== 'Paid' ? (
                                    <Button
                                      size="sm"
                                      onClick={() => approveCollectionsForPayment(collection.farmer_id, [collection.id])}
                                    >
                                      Approve
                                    </Button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Paid Tab */}
          {activeTab === 'paid' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Paid Collections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Used</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collector Fee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCollections
                          .filter(c => c.status === 'Paid')
                          .map((collection) => {
                            // Calculate collector fee for this collection
                            const collectorRate = collectorRateConfig.ratePerLiter;
                            const collectorFee = (collection.liters || 0) * collectorRate;
                            const creditUsed = collection.collection_payments?.[0]?.credit_used || 0;
                            const netPayment = collection.total_amount - creditUsed - collectorFee;
                            
                            return (
                              <tr key={collection.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {collection.farmers?.profiles?.full_name || 'Unknown Farmer'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {collection.farmers?.profiles?.phone || 'No phone'}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(collection.collection_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {collection.liters.toFixed(2)}L
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  KSh {collection.rate_per_liter.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCurrency(collection.total_amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                                  {formatCurrency(creditUsed)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                                  {formatCurrency(collectorFee)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                  {formatCurrency(netPayment)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {collection.approved_for_payment ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Approved
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}



          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    Milk Rate Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Rate per Liter (KES)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rateConfig.ratePerLiter}
                        onChange={(e) => setRateConfig({
                          ...rateConfig,
                          ratePerLiter: parseFloat(e.target.value) || 0
                        })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective From
                      </label>
                      <Input
                        type="date"
                        value={rateConfig.effectiveFrom}
                        onChange={(e) => setRateConfig({
                          ...rateConfig,
                          effectiveFrom: e.target.value
                        })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button onClick={updateMilkRate}>
                      Update Milk Rate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    Collector Rate Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Collector Rate per Liter (KES)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={collectorRateConfig.ratePerLiter}
                        onChange={(e) => setCollectorRateConfig({
                          ...collectorRateConfig,
                          ratePerLiter: parseFloat(e.target.value) || 0
                        })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective From
                      </label>
                      <Input
                        type="date"
                        value={collectorRateConfig.effectiveFrom}
                        onChange={(e) => setCollectorRateConfig({
                          ...collectorRateConfig,
                          effectiveFrom: e.target.value
                        })}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button onClick={updateCollectorRate}>
                      Update Collector Rate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSystem;