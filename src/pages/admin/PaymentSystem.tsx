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
  Grid
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
}

interface PaymentAnalytics {
  total_pending: number;
  total_paid: number;
  total_farmers: number;
  avg_payment: number;
  daily_trend: { date: string; collections: number; paidAmount: number; pendingAmount: number }[];
  farmer_distribution: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const PaymentSystem = () => {
  const toast = useToastNotifications();
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [farmerPaymentSummaries, setFarmerPaymentSummaries] = useState<FarmerPaymentSummary[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics>({
    total_pending: 0,
    total_paid: 0,
    total_farmers: 0,
    avg_payment: 0,
    daily_trend: [],
    farmer_distribution: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // Time frame filter state
  const [timeFrame, setTimeFrame] = useState('all'); // 'all', 'daily', 'weekly', 'monthly', 'lastMonth'
  const [customDateRange, setCustomDateRange] = useState({
    from: '',
    to: ''
  });

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
  const fetchAllData = async (retryCount = 0) => {
    await measureOperation('fetchAllData', async () => {
      setLoading(true);
      try {
        // Refresh session before fetching data
        await refreshSession().catch(error => {
          console.warn('Session refresh failed, continuing with data fetch', error);
        });
        
        await Promise.all([
          fetchCollections(),
          fetchFarmers(),
          fetchMilkRates()
        ]);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        
        // If it's a 400/401 error and we haven't retried yet, try refreshing the session and retrying
        if ((error.message && (error.message.includes('400') || error.message.includes('401'))) && retryCount < 2) {
          console.log(`Retrying data fetch (attempt ${retryCount + 1}) after session refresh`);
          toast.show({ title: 'Session Refresh', description: 'Refreshing session and retrying...' });
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh session and retry
          await refreshSession().catch(refreshError => {
            console.warn('Session refresh failed during retry', refreshError);
          });
          
          return await fetchAllData(retryCount + 1);
        }
        
        toast.error('Error', 'Failed to fetch data: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    });
  };

  const fetchCollections = async () => {
    await measureOperation('fetchCollections', async () => {
      try {
        // Refresh session before fetching collections
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before fetching collections', error);
        });
        
        let query = supabase
          .from('collections')
          .select(`
            *,
            farmers (
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
          query = query.neq('status', 'Paid');
        } else if (activeTab === 'paid') {
          query = query.eq('status', 'Paid');
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching collections:', error);
          // If it's a 400 error, it might be due to session expiration
          if (error.message && error.message.includes('400')) {
            toast.error('Session Error', 'Your session may have expired. Please refresh the page or log in again.');
          }
          throw error;
        }
        
        setCollections(data || []);
        calculateAnalytics(data || []);
        calculateFarmerSummaries(data || []);
      } catch (error: any) {
        console.error('Error fetching collections:', error);
        toast.error('Error', error.message || 'Failed to fetch collections');
      }
    });
  };

  const fetchFarmers = async () => {
    await measureOperation('fetchFarmers', async () => {
      try {
        // This is handled in the collections fetch with joins
      } catch (error: any) {
        console.error('Error fetching farmers:', error);
        toast.error('Error', error.message || 'Failed to fetch farmers');
      }
    });
  };

  const fetchMilkRates = async () => {
    await measureOperation('fetchMilkRates', async () => {
      try {
        const rate = await milkRateService.getCurrentRate();
        if (rate > 0) {
          setRateConfig({
            ratePerLiter: rate,
            effectiveFrom: new Date().toISOString().split('T')[0]
          });
        }
      } catch (error: any) {
        console.error('Error fetching rates:', error);
        toast.error('Error', error.message || 'Failed to fetch milk rates');
      }
    });
  };

  // Helper function to filter collections by time frame
  const filterCollectionsByTimeFrame = (collectionsData: Collection[]) => {
    if (timeFrame === 'all' && !customDateRange.from && !customDateRange.to) {
      return collectionsData;
    }

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    // Set date range based on selected time frame
    switch (timeFrame) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        const firstDayOfWeek = now.getDate() - now.getDay(); // Sunday as first day
        startDate = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
        endDate = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek + 6, 23, 59, 59);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'custom':
        if (customDateRange.from) {
          startDate = new Date(customDateRange.from);
        }
        if (customDateRange.to) {
          endDate = new Date(customDateRange.to);
          endDate.setHours(23, 59, 59, 999); // End of the day
        }
        break;
      default:
        return collectionsData;
    }

    // Filter collections based on date range
    return collectionsData.filter(collection => {
      const collectionDate = new Date(collection.collection_date);
      
      // If start date is set and collection date is before start date, exclude
      if (startDate && collectionDate < startDate) {
        return false;
      }
      
      // If end date is set and collection date is after end date, exclude
      if (endDate && collectionDate > endDate) {
        return false;
      }
      
      return true;
    });
  };

  // Modified calculateAnalytics to work with filtered data
  const calculateAnalytics = (collectionsData: Collection[]) => {
    // Apply time frame filtering
    const filteredData = filterCollectionsByTimeFrame(collectionsData);
    
    const pendingCollections = filteredData.filter(c => c.status !== 'Paid');
    const paidCollections = filteredData.filter(c => c.status === 'Paid');
    
    const totalPending = pendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const totalPaid = paidCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const uniqueFarmers = new Set(filteredData.map(c => c.farmer_id)).size;
    
    // Calculate daily trend based on time frame
    const dailyTrend = [];
    
    // Determine date range for trend calculation
    let trendStartDate: Date;
    let trendEndDate: Date;
    
    if (timeFrame === 'daily') {
      trendStartDate = new Date();
      trendStartDate.setDate(trendStartDate.getDate() - 6); // Last 7 days including today
      trendEndDate = new Date();
    } else if (timeFrame === 'weekly') {
      trendStartDate = new Date();
      trendStartDate.setDate(trendStartDate.getDate() - 6); // Last 7 days
      trendEndDate = new Date();
    } else if (timeFrame === 'monthly') {
      trendStartDate = new Date();
      trendStartDate.setDate(trendStartDate.getDate() - 29); // Last 30 days
      trendEndDate = new Date();
    } else if (timeFrame === 'lastMonth') {
      const now = new Date();
      trendEndDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
      trendStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // First day of previous month
    } else if (timeFrame === 'custom' && customDateRange.from && customDateRange.to) {
      trendStartDate = new Date(customDateRange.from);
      trendEndDate = new Date(customDateRange.to);
    } else {
      // Default to last 7 days
      trendEndDate = new Date();
      trendStartDate = new Date();
      trendStartDate.setDate(trendStartDate.getDate() - 6);
    }
    
    // Generate daily trend data
    for (let d = new Date(trendStartDate); d <= trendEndDate; d.setDate(d.getDate() + 1)) {
      const dateString = new Date(d).toISOString().split('T')[0];
      
      // Count collections for this date
      const collectionsCount = filteredData
        .filter(c => c.collection_date?.startsWith(dateString))
        .length;
      
      const paidAmount = filteredData
        .filter(c => c.status === 'Paid' && c.collection_date?.startsWith(dateString))
        .reduce((sum, c) => sum + (c.total_amount || 0), 0);
      
      const pendingAmount = filteredData
        .filter(c => c.status !== 'Paid' && c.collection_date?.startsWith(dateString))
        .reduce((sum, c) => sum + (c.total_amount || 0), 0);
      
      dailyTrend.push({ 
        date: dateString, 
        collections: collectionsCount,
        paidAmount,
        pendingAmount
      });
    }
    
    // Calculate farmer distribution (top 5 farmers by payment amount)
    const farmerPayments = filteredData.reduce((acc, collection) => {
      const farmerId = collection.farmer_id;
      if (!farmerId) return acc; // Skip if no farmer_id
      
      if (!acc[farmerId]) {
        acc[farmerId] = {
          name: collection.farmer_id, // We'll update this with the actual name later
          value: 0
        };
      }
      acc[farmerId].value += collection.total_amount || 0;
      return acc;
    }, {} as Record<string, { name: string; value: number }>);
    
    // Map farmer IDs to names
    const farmerNames: Record<string, string> = {};
    filteredData.forEach(collection => {
      if (collection.farmer_id && collection.farmers?.profiles?.full_name) {
        farmerNames[collection.farmer_id] = collection.farmers.profiles.full_name;
      }
    });
    
    Object.keys(farmerPayments).forEach(farmerId => {
      farmerPayments[farmerId].name = farmerNames[farmerId] || `Farmer ${farmerId.substring(0, 8)}`;
    });
    
    const farmerDistribution = Object.values(farmerPayments)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    setAnalytics({
      total_pending: totalPending,
      total_paid: totalPaid,
      total_farmers: uniqueFarmers,
      avg_payment: uniqueFarmers > 0 ? (totalPending + totalPaid) / uniqueFarmers : 0,
      daily_trend: dailyTrend,
      farmer_distribution: farmerDistribution
    });
  };

  // Modified calculateFarmerSummaries to work with filtered data
  const calculateFarmerSummaries = (collectionsData: Collection[]) => {
    // Apply time frame filtering
    const filteredData = filterCollectionsByTimeFrame(collectionsData);
    
    const farmerSummaries = filteredData.reduce((acc, collection) => {
      const farmerId = collection.farmer_id;
      // Skip collections without farmer_id
      if (!farmerId) return acc;
      
      if (!acc[farmerId]) {
        acc[farmerId] = {
          farmer_id: farmerId,
          farmer_name: collection.farmers?.profiles?.full_name || 'Unknown Farmer',
          farmer_phone: collection.farmers?.profiles?.phone || 'No phone',
          total_collections: 0,
          total_liters: 0,
          total_amount: 0,
          paid_amount: 0,
          pending_amount: 0,
          bank_info: `${collection.farmers?.bank_name || 'N/A'} - ${collection.farmers?.bank_account_number || 'No account'}`
        };
      }
      
      acc[farmerId].total_collections += 1;
      acc[farmerId].total_liters += collection.liters || 0;
      acc[farmerId].total_amount += collection.total_amount || 0;
      
      if (collection.status === 'Paid') {
        acc[farmerId].paid_amount += collection.total_amount || 0;
      } else {
        acc[farmerId].pending_amount += collection.total_amount || 0;
      }
      
      return acc;
    }, {} as Record<string, FarmerPaymentSummary>);
    
    setFarmerPaymentSummaries(Object.values(farmerSummaries));
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
          fetchMilkRates();
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
      // Refresh data with new time frame
      fetchAllData();
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
      
      // Set time frame to custom and refresh data
      setTimeFrame('custom');
      fetchAllData();
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
    fetchAllData();
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

  // Refresh data when time frame or custom date range changes
  useEffect(() => {
    if (timeFrame === 'custom' && customDateRange.from && customDateRange.to) {
      // For custom date range, we only refresh when apply button is clicked
      // This useEffect is just for other time frames
      return;
    }
    
    if (timeFrame !== 'custom') {
      fetchAllData();
    }
  }, [timeFrame]);

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
    
    setFilteredCollections(result);
  }, [searchTerm, filterStatus, activeTab, collections]);

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

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
                  <p className="text-sm text-gray-600 mb-1">Avg Payment</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.avg_payment)}</p>
                  <p className="text-xs text-gray-500">Per farmer</p>
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
                      <LineChart
                        data={analytics.daily_trend}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                          }}
                        />
                        <YAxis 
                          yAxisId="left" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => value.toString()}
                          label={{ 
                            value: 'Collections', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle' }
                          }}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `KES ${value.toLocaleString()}`}
                          label={{ 
                            value: 'Amount (KES)', 
                            angle: 90, 
                            position: 'insideRight',
                            style: { textAnchor: 'middle' }
                          }}
                        />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'collections') return [value, 'Collections'];
                            if (name === 'paidAmount') return [`KES ${formatCurrency(Number(value))}`, 'Paid Amount'];
                            if (name === 'pendingAmount') return [`KES ${formatCurrency(Number(value))}`, 'Pending Amount'];
                            return [value, name];
                          }}
                          labelFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            });
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="collections"
                          name="Collections"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="paidAmount"
                          name="Paid Amount"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="pendingAmount"
                          name="Pending Amount"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </div>

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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {farmerPaymentSummaries.map((farmerData, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">
                                {farmerData.farmer_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {farmerData.farmer_phone}
                              </div>
                              <div className="text-sm text-gray-500">
                                {farmerData.bank_info}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-900">{farmerData.total_collections}</td>
                            <td className="px-6 py-4 text-gray-900">{farmerData.total_liters.toFixed(2)}L</td>
                            <td className="px-6 py-4">
                              <span className="text-yellow-600 font-semibold">
                                {formatCurrency(farmerData.pending_amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-green-600 font-semibold">
                                {formatCurrency(farmerData.paid_amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-gray-900">
                                {formatCurrency(farmerData.total_amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {farmerData.pending_amount > 0 ? (
                                <Button
                                  onClick={() => markAllFarmerPaymentsAsPaid(farmerData.farmer_id)}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                >
                                  Mark All Paid
                                </Button>
                              ) : (
                                <span className="text-green-600 font-medium text-sm">✓ All Paid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {farmerPaymentSummaries.map((farmerData, idx) => (
                      <Card key={idx} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{farmerData.farmer_name}</CardTitle>
                          <p className="text-sm text-gray-500">{farmerData.farmer_phone}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Collections:</span>
                              <span className="font-medium">{farmerData.total_collections}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Liters:</span>
                              <span className="font-medium">{farmerData.total_liters.toFixed(2)}L</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Pending:</span>
                              <span className="font-medium text-yellow-600">
                                {formatCurrency(farmerData.pending_amount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Paid:</span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(farmerData.paid_amount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total:</span>
                              <span className="font-bold">
                                {formatCurrency(farmerData.total_amount)}
                              </span>
                            </div>
                            <div className="pt-2">
                              {farmerData.pending_amount > 0 ? (
                                <Button
                                  onClick={() => markAllFarmerPaymentsAsPaid(farmerData.farmer_id)}
                                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                >
                                  Mark All Paid
                                </Button>
                              ) : (
                                <span className="text-green-600 font-medium text-sm flex justify-center items-center">
                                  <CheckCircle className="w-4 h-4 mr-1" /> All Paid
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Payment Trend */}
                <Card className="bg-white rounded-xl shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Daily Payment Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={analytics.daily_trend}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Area type="monotone" dataKey="paidAmount" stackId="1" stroke="#10B981" fill="#10B981" name="Paid" />
                          <Area type="monotone" dataKey="pendingAmount" stackId="1" stroke="#F59E0B" fill="#F59E0B" name="Pending" />
                          <Legend />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Farmer Distribution */}
                <Card className="bg-white rounded-xl shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary" />
                      Top Farmers by Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={analytics.farmer_distribution}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {analytics.farmer_distribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Analytics */}
              <Card className="bg-white rounded-xl shadow-lg">
                <CardHeader>
                  <CardTitle>Payment Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">
                        {analytics.total_farmers}
                      </p>
                      <p className="text-gray-600">Active Farmers</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(analytics.total_paid)}
                      </p>
                      <p className="text-gray-600">Total Paid</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-3xl font-bold text-yellow-600">
                        {formatCurrency(analytics.total_pending)}
                      </p>
                      <p className="text-gray-600">Pending Payments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pending and Paid Tabs */}
          {(activeTab === 'pending' || activeTab === 'paid') && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search farmer name or collection ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="Collected">Collected</option>
                  <option value="Verified">Verified</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <Button
                  onClick={() => {}}
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
                    {filteredCollections.map((collection) => (
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
                        <td className="px-6 py-4 text-gray-900">{(collection.liters || 0).toFixed(2)}L</td>
                        <td className="px-6 py-4 text-gray-900">
                          {formatCurrency(collection.rate_per_liter || 0)}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatCurrency(collection.total_amount || 0)}
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

              {filteredCollections.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {activeTab === 'pending' 
                      ? 'No pending collections found.' 
                      : 'No paid collections found yet.'}
                  </p>
                </div>
              )}
            </div>
          )}

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
                    value={rateConfig.ratePerLiter}
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
                    value={rateConfig.effectiveFrom}
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
                  {formatCurrency(rateConfig.ratePerLiter)} per liter
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSystem;