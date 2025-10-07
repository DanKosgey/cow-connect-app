import React, { useState, useEffect, useMemo } from 'react';
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
  BarChart3 
} from '@/utils/iconImports';
import useToastNotifications from '@/hooks/useToastNotifications';
import { trendService } from '@/services/trend-service';
import { PaymentService } from '@/services/payment-service';
import { Pagination } from '@/components/admin/Pagination';
import { PaginatedResponse, paginateArray } from '@/utils/paginationUtils';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { milkRateService } from '@/services/milk-rate-service';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';

interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
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

interface Farmer {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
}

interface MilkRate {
  id: number;
  rate_per_liter: number;
  effective_from: string;
  is_active: boolean;
  created_at?: string; // Make created_at optional
}

interface Payment {
  id: string;
  collection_id: string;
  farmer_id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  paid_at: string;
  rate_applied: number;
  farmers: {
    id: string;
    profiles: {
      full_name: string;
    };
  };
}

// Add this helper function at the top of the component or before the component
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

const PaymentSystem = () => {
  const toast = useToastNotifications();
  const [activeTab, setActiveTab] = useState('overview');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [milkRates, setMilkRates] = useState<MilkRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [analytics, setAnalytics] = useState({
    totalPending: 0,
    totalPaid: 0,
    totalFarmers: 0,
    avgPayment: 0
  });

  // Add trends state
  const [trends, setTrends] = useState({
    totalCollections: 0,
    totalLiters: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    paidPayments: 0,
    collectionsTrend: { value: 0, isPositive: true },
    litersTrend: { value: 0, isPositive: true },
    revenueTrend: { value: 0, isPositive: true },
    pendingPaymentsTrend: { value: 0, isPositive: true }
  });

  // Rate configuration state with proper default values
  const [rateConfig, setRateConfig] = useState({
    ratePerLiter: 0,
    effectiveFrom: getCurrentDate()
  });

  // Pagination state - increased default page size to show more collections
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Increased from 10 to 25
  const [totalCount, setTotalCount] = useState(0);
  
  // Initialize performance monitoring
  const { measureOperation } = usePerformanceMonitor({ 
    componentName: 'PaymentSystemPage',
    enabled: process.env.NODE_ENV === 'development'
  });

  const { refreshSession } = useSessionRefresh({ refreshInterval: 10 * 60 * 1000 }); // Refresh every 10 minutes

  const fetchAllData = async () => {
    await measureOperation('fetchAllData', async () => {
      setLoading(true);
      try {
        // Refresh session before fetching data to ensure we have a valid connection
        // Make it non-blocking to prevent data loading delays
        refreshSession().catch(error => {
          console.warn('Session refresh failed, continuing with data fetch', error);
        });
        
        await Promise.all([
          fetchCollections(),
          fetchFarmers(),
          fetchMilkRates(),
          fetchPayments()
        ]);
        
        // Calculate real trends using the trend service
        try {
          const trendData = await trendService.calculatePaymentTrends('week'); // Default to week
          setTrends({
            ...trendData,
            pendingPayments: analytics.totalPending,
            paidPayments: analytics.totalPaid
          });
        } catch (trendError) {
          console.error('Error calculating payment trends:', trendError);
          // Fallback to default values
          setTrends({
            totalCollections: 0,
            totalLiters: 0,
            totalRevenue: analytics.totalPaid,
            pendingPayments: analytics.totalPending,
            paidPayments: analytics.totalPaid,
            collectionsTrend: { value: 0, isPositive: true },
            litersTrend: { value: 0, isPositive: true },
            revenueTrend: { value: 0, isPositive: true },
            pendingPaymentsTrend: { value: 0, isPositive: true }
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error', 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    });
  };

  const fetchCollections = async () => {
    await measureOperation('fetchCollections', async () => {
      try {
        // Build the base query
        let query = supabase
          .from('collections')
          .select(`
            *,
            farmers!fk_collections_farmer_id (
              id,
              user_id,
              bank_account_name,
              bank_account_number,
              bank_name,
              profiles!user_id (
                full_name,
                phone
              )
            )
          `)
          .order('collection_date', { ascending: false });

        // Apply filters based on active tab
        if (activeTab === 'pending') {
          // For pending tab, show collections that are not paid
          query = query.neq('status', 'Paid');
        } else if (activeTab === 'paid') {
          // For paid tab, show only paid collections
          query = query.eq('status', 'Paid');
        }

        // Get total count for pagination
        const countQuery = supabase
          .from('collections')
          .select('*', { count: 'exact', head: true });
          
        // Apply same filters to count query
        if (activeTab === 'pending') {
          countQuery.neq('status', 'Paid');
        } else if (activeTab === 'paid') {
          countQuery.eq('status', 'Paid');
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        setTotalCount(count || 0);

        // Fetch paginated data with applied filters
        const { data, error } = await query
          .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

        if (error) throw error;
        setCollections(data || []);
        calculateAnalytics(data || []);
      } catch (error: any) {
        console.error('Error fetching collections:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Error', error.message || 'Failed to fetch collections');
      }
    });
  };

  const fetchFarmers = async () => {
    await measureOperation('fetchFarmers', async () => {
      try {
        const { data, error } = await supabase
          .from('farmers')
          .select(`
            *,
            profiles!user_id (
              full_name,
              phone,
              email
            )
          `);

        if (error) throw error;
        setFarmers(data || []);
      } catch (error: any) {
        console.error('Error fetching farmers:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Error', error.message || 'Failed to fetch farmers');
      }
    });
  };

  const fetchMilkRates = async () => {
    await measureOperation('fetchMilkRates', async () => {
      try {
        const rate = await milkRateService.getCurrentRate();
        if (rate > 0) {
          setMilkRates([{ 
            id: 0, // Placeholder ID
            rate_per_liter: rate, 
            is_active: true, 
            effective_from: new Date().toISOString(), 
          }]);
          setRateConfig({
            ratePerLiter: rate,
            effectiveFrom: new Date().toISOString().split('T')[0]
          });
        }
      } catch (error: any) {
        console.error('Error fetching rates:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Error', error.message || 'Failed to fetch milk rates');
      }
    });
  };

  const fetchPayments = async () => {
    await measureOperation('fetchPayments', async () => {
      try {
        const { data, error } = await supabase
          .from('collection_payments')
          .select(`
            *,
            collections!collection_payments_collection_id_fkey (
              id,
              farmer_id,
              total_amount,
              status,
              rate_per_liter,
              collection_date,
              farmers!fk_collections_farmer_id (
                id,
                user_id,
                profiles!user_id (
                  full_name
                )
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        // Extract payment data from the nested structure
        const paymentData = data?.map((item: any) => ({
          ...item,
          ...(item.collections || {}), // Spread the collection data
          payment_id: item.id, // Use collection_payment id
          collection_id: item.collection_id,
          rate_applied: item.rate_applied,
          created_at: item.created_at,
          paid_at: item.paid_at
        })) || [];
        setPayments(paymentData);
      } catch (error: any) {
        console.error('Error fetching payments:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Error', error.message || 'Failed to fetch payments');
      }
    });
  };

  const calculateAnalytics = (collectionsData: Collection[]) => {
    const unpaidCollections = collectionsData.filter(c => c.status !== 'Paid');
    const paidCollections = collectionsData.filter(c => c.status === 'Paid');
    
    const totalPending = unpaidCollections.reduce((sum, c) => sum + parseFloat(c.total_amount?.toString() || '0'), 0);
    const totalPaid = paidCollections.reduce((sum, c) => sum + parseFloat(c.total_amount?.toString() || '0'), 0);
    const uniqueFarmers = new Set(collectionsData.map(c => c.farmer_id)).size;
    
    setAnalytics({
      totalPending,
      totalPaid,
      totalFarmers: uniqueFarmers,
      avgPayment: uniqueFarmers > 0 ? (totalPending + totalPaid) / uniqueFarmers : 0
    });
  };

  const updateMilkRate = async () => {
    await measureOperation('updateMilkRate', async () => {
      try {
        // Validate input before proceeding
        if (rateConfig.ratePerLiter <= 0) {
          toast.error('Error', 'Rate per liter must be greater than zero');
          return;
        }
        
        // Validate effective date
        if (!rateConfig.effectiveFrom) {
          toast.error('Error', 'Effective date is required');
          return;
        }
        
        const success = await milkRateService.updateRate(rateConfig.ratePerLiter, rateConfig.effectiveFrom);
        
        if (success) {
          toast.success('Success', 'Milk rate updated successfully!');
          fetchMilkRates();
        } else {
          throw new Error('Failed to update milk rate');
        }
      } catch (error: any) {
        console.error('Error updating rate:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Error', 'Failed to update rate: ' + (error.message || 'Unknown error'));
      }
    });
  };

  const markAsPaid = async (collectionId: string, farmerId: string) => {
    await measureOperation('markAsPaid', async () => {
      try {
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) {
          toast.error('Error', 'Collection not found');
          return;
        }
      
        // Use the unified payment service
        const result = await PaymentService.markCollectionAsPaid(collectionId, farmerId, collection);
      
        if (!result.success) {
          throw result.error || new Error('Unknown error occurred');
        }

        toast.success('Success', 'Payment marked as paid successfully!');
      
        // Optimistically update the UI
        setCollections(prevCollections => 
          prevCollections.map(c => 
            c.id === collectionId ? { ...c, status: 'Paid' } : c
          )
        );
      
        // Refresh the data to ensure consistency
        await fetchAllData();
      } catch (error: any) {
        console.error('Error marking as paid:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Error', 'Failed to mark as paid: ' + (error.message || 'Unknown error'));
      }
    });
  };

  const exportToCSV = () => {
    measureOperation('exportToCSV', () => {
      const filteredCollections = collections.filter(c => {
        const matchesSearch = c.farmers?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
        return matchesSearch && matchesFilter;
      });

      const csvData = filteredCollections.map(c => ({
        Date: new Date(c.collection_date).toLocaleDateString(),
        Farmer: c.farmers?.profiles?.full_name || 'N/A',
        Liters: c.liters,
        Rate: c.rate_per_liter,
        Amount: c.total_amount,
        Status: c.status,
        Bank: c.farmers?.bank_name || 'N/A',
        Account: c.farmers?.bank_account_number || 'N/A'
      }));

      if (csvData.length === 0) {
        toast.show({ title: 'Warning', description: 'No data to export' });
        return;
      }

      const headers = Object.keys(csvData[0] || {}).join(',');
      const rows = csvData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
    
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const filteredCollections = collections.filter(c => {
    const matchesSearch = c.farmers?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    
    // Additional filtering for pending tab
    if (activeTab === 'pending') {
      // Ensure we're only showing unpaid collections
      return matchesSearch && matchesFilter && c.status !== 'Paid';
    }
    
    // Additional filtering for paid tab
    if (activeTab === 'paid') {
      // Ensure we're only showing paid collections
      return matchesSearch && matchesFilter && c.status === 'Paid';
    }
    
    return matchesSearch && matchesFilter;
  });

  const paginatedData = useMemo(() => {
    return paginateArray(filteredCollections, currentPage, pageSize);
  }, [filteredCollections, currentPage, pageSize]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const groupedByFarmer = filteredCollections.reduce((acc: any, collection) => {
    const farmerId = collection.farmer_id;
    if (!acc[farmerId]) {
      acc[farmerId] = {
        farmer: collection.farmers,
        collections: [],
        totalAmount: 0,
        totalLiters: 0,
        pendingAmount: 0,
        paidAmount: 0
      };
    }
    acc[farmerId].collections.push(collection);
    acc[farmerId].totalAmount += parseFloat(collection.total_amount?.toString() || '0');
    acc[farmerId].totalLiters += parseFloat(collection.liters?.toString() || '0');
    
    if (collection.status === 'Paid') {
      acc[farmerId].paidAmount += parseFloat(collection.total_amount?.toString() || '0');
    } else {
      acc[farmerId].pendingAmount += parseFloat(collection.total_amount?.toString() || '0');
    }
    
    return acc;
  }, {});

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  // Refetch collections when pagination or filters change
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'pending' || activeTab === 'paid') {
      fetchCollections();
    }
  }, [currentPage, pageSize, activeTab, filterStatus]);

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Management</h1>
            <p className="text-gray-600">Manage farmer payments, configure rates, and track payment history</p>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Payments</p>
                  <p className="text-2xl font-bold text-gray-900">KES {trends.pendingPayments.toFixed(2)}</p>
                  {trends.pendingPaymentsTrend ? (
                    <p className={`text-xs ${trends.pendingPaymentsTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {trends.pendingPaymentsTrend.isPositive ? '↑' : '↓'} {trends.pendingPaymentsTrend.value}% from last period
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">No data available</p>
                  )}
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
                  <p className="text-2xl font-bold text-gray-900">KES {trends.totalRevenue.toFixed(2)}</p>
                  {trends.revenueTrend ? (
                    <p className={`text-xs ${trends.revenueTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {trends.revenueTrend.isPositive ? '↑' : '↓'} {trends.revenueTrend.value}% from last period
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">No data available</p>
                  )}
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
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalFarmers}</p>
                  <p className="text-xs text-gray-500">No trend data available</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Payment</p>
                  <p className="text-2xl font-bold text-gray-900">KES {analytics.avgPayment.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">No trend data available</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-xl shadow-lg mb-6">
            <div className="flex border-b">
              {['overview', 'pending', 'paid', 'analytics', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1); // Reset to first page when changing tabs
                  }}
                  className={`px-6 py-4 font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab === 'overview' && <BarChart3 className="w-4 h-4 inline mr-2" />}
                  {tab === 'pending' && <Clock className="w-4 h-4 inline mr-2" />}
                  {tab === 'paid' && <CheckCircle className="w-4 h-4 inline mr-2" />}
                  {tab === 'analytics' && <TrendingUp className="w-4 h-4 inline mr-2" />}
                  {tab === 'settings' && <Settings className="w-4 h-4 inline mr-2" />}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Rate Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate per Liter (KES)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rateConfig?.ratePerLiter || 0}
                    onChange={(e) => setRateConfig(prev => ({...prev, ratePerLiter: parseFloat(e.target.value) || 0}))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Effective From
                  </label>
                  <Input
                    type="date"
                    value={rateConfig?.effectiveFrom || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setRateConfig(prev => ({...prev, effectiveFrom: e.target.value}))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <Button
                onClick={updateMilkRate}
                className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Update Rate
              </Button>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Current Active Rate</h3>
                <p className="text-gray-700">
                  KES {milkRates[0]?.rate_per_liter || 0} per liter
                  {milkRates[0] && ` (Effective from ${new Date(milkRates[0].effective_from).toLocaleDateString()})`}
                </p>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Farmer Summary</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collections</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Liters</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.values(groupedByFarmer).map((farmerData: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {farmerData.farmer?.profiles?.full_name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {farmerData.farmer?.bank_name || 'No bank info'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-900">{farmerData.collections.length}</td>
                          <td className="px-6 py-4 text-gray-900">{farmerData.totalLiters.toFixed(2)}L</td>
                          <td className="px-6 py-4">
                            <span className="text-yellow-600 font-semibold">
                              KES {farmerData.pendingAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-green-600 font-semibold">
                              KES {farmerData.paidAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900">
                              KES {farmerData.totalAmount.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Overview, Pending, and Paid Tabs */}
          {(activeTab === 'overview' || activeTab === 'pending' || activeTab === 'paid') && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search farmer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1); // Reset to first page when changing filters
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="Collected">Collected</option>
                  <option value="Verified">Verified</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <Button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>

              {/* Collections Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedData.data
                      .filter(c => {
                        if (activeTab === 'pending') return c.status !== 'Paid';
                        if (activeTab === 'paid') return c.status === 'Paid';
                        return true;
                      })
                      .map((collection) => (
                        <tr key={collection.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(collection.collection_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {collection.farmers?.profiles?.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {collection.farmers?.profiles?.phone || 'No phone'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-900">{parseFloat(collection.liters?.toString() || '0').toFixed(2)}L</td>
                          <td className="px-6 py-4 text-gray-900">KES {parseFloat(collection.rate_per_liter?.toString() || '0').toFixed(2)}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            KES {parseFloat(collection.total_amount?.toString() || '0').toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {collection.farmers?.bank_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {collection.farmers?.bank_account_number || 'No account'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              collection.status === 'Paid'
                                ? 'bg-green-100 text-green-800'
                                : collection.status === 'Verified'
                                ? 'bg-blue-100 text-blue-800'
                                : collection.status === 'Cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {collection.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {collection.status !== 'Paid' && (
                              <Button
                                onClick={() => markAsPaid(collection.id, collection.farmer_id)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                              >
                                Mark Paid
                              </Button>
                            )}
                            {collection.status === 'Paid' && (
                              <span className="text-green-600 font-medium text-sm">✓ Paid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {paginatedData.data.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {activeTab === 'pending' 
                      ? 'No pending collections found. All collections may be paid or there may be no collections yet.' 
                      : activeTab === 'paid' 
                      ? 'No paid collections found yet.' 
                      : 'No collections found matching your criteria'}
                  </p>
                </div>
              )}

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={(newPageSize) => {
                  handlePageSizeChange(newPageSize);
                  setCurrentPage(1); // Reset to first page when page size changes
                }}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSystem;