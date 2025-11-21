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
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { formatCurrency } from '@/utils/formatters';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart as RechartsPieChart, 
  Pie, Cell
} from 'recharts';

import PaymentOverviewChart from '@/components/admin/PaymentOverviewChart';
import RefreshButton from '@/components/ui/RefreshButton';
import { usePaymentSystemData } from '@/hooks/usePaymentSystemData';

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
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  bank_info: string;
  credit_used: number;
  net_payment: number;
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
        
        // Refresh session before performing critical operation
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before marking all payments as paid', error);
        });
        
        const result = await PaymentService.markAllFarmerPaymentsAsPaid(farmerId, pendingCollections);
      
        if (!result.success) {
          throw result.error || new Error('Unknown error occurred');
        }

        toast.success('Success', `Marked ${pendingCollections.length} payments as paid successfully!`);
        
        // Refresh the data to ensure consistency
        await fetchAllData();
      } catch (error: any) {
        console.error('Error marking all farmer payments as paid:', error);
        toast.error('Error', 'Failed to mark all payments as paid: ' + (error.message || 'Unknown error'));
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Used</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmerPaymentSummaries.map((farmer) => {
                          const hasCredit = farmer.credit_used > 0;
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
                                {formatCurrency(farmer.pending_amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(farmer.paid_amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-medium ${hasCredit ? 'text-purple-600' : 'text-gray-500'}`}>
                                  {formatCurrency(farmer.credit_used)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-green-600">
                                  {formatCurrency(farmer.net_payment)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(farmer.total_amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Button
                                  size="sm"
                                  onClick={() => markAllFarmerPaymentsAsPaid(farmer.farmer_id)}
                                  disabled={farmer.pending_amount <= 0}
                                >
                                  Mark Paid
                                </Button>
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
                                {formatCurrency(farmer.pending_amount)}
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
                              <span className="text-sm text-gray-600">Net Payment:</span>
                              <span className="text-sm font-medium text-blue-600">
                                {formatCurrency(farmer.net_payment)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="text-sm font-medium">Total:</span>
                              <span className="text-sm font-bold">
                                {formatCurrency(farmer.total_amount)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Button
                              className="w-full"
                              onClick={() => markAllFarmerPaymentsAsPaid(farmer.farmer_id)}
                              disabled={farmer.pending_amount <= 0}
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

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Credit Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                      Credit Utilization
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={farmerPaymentSummaries
                            .filter(f => f.credit_used > 0)
                            .slice(0, 10)
                            .map(f => ({
                              name: f.farmer_name.split(' ')[0],
                              credit: f.credit_used,
                              total: f.total_amount
                            }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Bar dataKey="credit" name="Credit Used" fill="#8b5cf6" />
                          <Bar dataKey="total" name="Total Amount" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-blue-600" />
                      Payment Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={[
                              { name: 'Paid', value: analytics.total_paid },
                              { name: 'Pending', value: analytics.total_pending },
                              { name: 'Credit Used', value: analytics.total_credit_used }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell key="cell-0" fill="#10b981" />
                            <Cell key="cell-1" fill="#f59e0b" />
                            <Cell key="cell-2" fill="#8b5cf6" />
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Credit Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">Gross Payments</span>
                          <span className="text-sm font-medium">{formatCurrency(analytics.total_paid + analytics.total_pending)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: '100%' }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">Credit Deductions</span>
                          <span className="text-sm font-medium text-purple-600">
                            {formatCurrency(analytics.total_credit_used)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(analytics.total_credit_used / (analytics.total_paid + analytics.total_pending)) * 100 || 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600">Net Payments</span>
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(analytics.total_net_payment)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ 
                              width: `${(analytics.total_net_payment / (analytics.total_paid + analytics.total_pending)) * 100 || 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Credit Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Credit Analytics by Farmer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Used</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit %</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {farmerPaymentSummaries
                          .filter(f => f.credit_used > 0)
                          .map((farmer) => {
                            const creditPercentage = farmer.total_amount > 0 
                              ? (farmer.credit_used / farmer.total_amount) * 100 
                              : 0;
                            return (
                              <tr key={farmer.farmer_id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{farmer.farmer_name}</div>
                                  <div className="text-sm text-gray-500">{farmer.farmer_phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(farmer.total_amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                                  {formatCurrency(farmer.credit_used)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                  {formatCurrency(farmer.net_payment)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    creditPercentage > 50 
                                      ? 'bg-red-100 text-red-800' 
                                      : creditPercentage > 25 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-green-100 text-green-800'
                                  }`}>
                                    {creditPercentage.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Active
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  
                  {farmerPaymentSummaries.filter(f => f.credit_used > 0).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No credit usage data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    Pending Collections
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCollections
                          .filter(c => c.status !== 'Paid')
                          .map((collection) => (
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
                                {formatCurrency(collection.collection_payments?.[0]?.credit_used || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                {formatCurrency(collection.total_amount - (collection.collection_payments?.[0]?.credit_used || 0))}
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
                                <Button
                                  size="sm"
                                  onClick={() => markAsPaid(collection.id, collection.farmer_id)}
                                >
                                  Mark Paid
                                </Button>
                              </td>
                            </tr>
                          ))}
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCollections
                          .filter(c => c.status === 'Paid')
                          .map((collection) => (
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
                                {formatCurrency(collection.collection_payments?.[0]?.credit_used || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                {formatCurrency(collection.total_amount - (collection.collection_payments?.[0]?.credit_used || 0))}
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
                          ))}
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
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSystem;