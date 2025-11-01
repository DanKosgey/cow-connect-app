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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [farmerPaymentSummaries, setFarmerPaymentSummaries] = useState<FarmerPaymentSummary[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics>({
    total_pending: 0,
    total_paid: 0,
    total_farmers: 0,
    avg_payment: 0,
    daily_trend: [],
    farmer_distribution: [],
    total_credit_used: 0,
    total_net_payment: 0
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
            ),
            collection_payments!collection_payments_collection_id_fkey (
              credit_used
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
    
    // Calculate gross pending and paid amounts
    const grossPending = pendingCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const totalPaid = paidCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const uniqueFarmers = new Set(filteredData.map(c => c.farmer_id)).size;
    
    // Calculate credit usage from collection payments
    const totalCreditUsed = filteredData.reduce((sum, c) => {
      const collectionCredit = c.collection_payments?.[0]?.credit_used || 0;
      return sum + collectionCredit;
    }, 0);
    
    // Calculate net pending (gross pending - credit used)
    const netPending = Math.max(0, grossPending - totalCreditUsed);
    const totalNetPayment = totalPaid + netPending;
    
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
      
      // Calculate gross pending amount for this date
      const grossPendingAmount = filteredData
        .filter(c => c.status !== 'Paid' && c.collection_date?.startsWith(dateString))
        .reduce((sum, c) => sum + (c.total_amount || 0), 0);
      
      // Calculate credit used for this date
      const creditUsed = filteredData
        .filter(c => c.collection_date?.startsWith(dateString))
        .reduce((sum, c) => {
          const collectionCredit = c.collection_payments?.[0]?.credit_used || 0;
          return sum + collectionCredit;
        }, 0);
      
      // Calculate net pending amount (gross pending - credit used)
      const netPendingAmount = Math.max(0, grossPendingAmount - creditUsed);
      
      dailyTrend.push({ 
        date: dateString, 
        collections: collectionsCount,
        paidAmount,
        pendingAmount: netPendingAmount, // Use net pending instead of gross pending
        creditUsed
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
      total_pending: netPending, // Use net pending instead of gross pending
      total_paid: totalPaid,
      total_farmers: uniqueFarmers,
      avg_payment: uniqueFarmers > 0 ? (netPending + totalPaid) / uniqueFarmers : 0, // Use net pending
      daily_trend: dailyTrend,
      farmer_distribution: farmerDistribution,
      total_credit_used: totalCreditUsed,
      total_net_payment: totalNetPayment
    });
  };

  // Modified calculateFarmerSummaries to work with filtered data
  const calculateFarmerSummaries = async (collectionsData: Collection[]) => {
    // Apply time frame filtering
    const filteredData = filterCollectionsByTimeFrame(collectionsData);
    
    // Group collections by farmer
    const farmerCollections = filteredData.reduce((acc, collection) => {
      const farmerId = collection.farmer_id;
      if (!farmerId) return acc;
      
      if (!acc[farmerId]) {
        acc[farmerId] = [];
      }
      acc[farmerId].push(collection);
      return acc;
    }, {} as Record<string, Collection[]>);
    
    // Calculate summaries for each farmer
    const farmerSummaries: FarmerPaymentSummary[] = [];
    
    for (const farmerId of Object.keys(farmerCollections)) {
      const farmerCollectionsList = farmerCollections[farmerId];
      const firstCollection = farmerCollectionsList[0];
      
      // Calculate totals
      const totalCollections = farmerCollectionsList.length;
      const totalLiters = farmerCollectionsList.reduce((sum, c) => sum + (c.liters || 0), 0);
      const totalAmount = farmerCollectionsList.reduce((sum, c) => sum + (c.total_amount || 0), 0);
      const paidAmount = farmerCollectionsList
        .filter(c => c.status === 'Paid')
        .reduce((sum, c) => sum + (c.total_amount || 0), 0);
      const grossPendingAmount = totalAmount - paidAmount;
      
      // Calculate credit used and net payment from collection payments
      let creditUsed = 0;
      
      // Sum credit used from all collections for this farmer
      creditUsed = farmerCollectionsList.reduce((sum, c) => {
        const collectionCredit = c.collection_payments?.[0]?.credit_used || 0;
        return sum + collectionCredit;
      }, 0);
      
      // Fetch credit data for the farmer
      try {
        const { data: creditData, error: creditError } = await supabase
          .from('farmer_credit_limits')
          .select('current_credit_balance, total_credit_used')
          .eq('farmer_id', farmerId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!creditError && creditData) {
          creditUsed = creditData.total_credit_used || 0;
        }
      } catch (error) {
        console.warn('Error fetching credit data for farmer:', farmerId, error);
      }

      // Calculate net pending amount (gross pending - credit used)
      const netPendingAmount = Math.max(0, grossPendingAmount - creditUsed);
      
      // Calculate net payment (same as paid amount since we're looking at what's actually paid)
      const netPayment = paidAmount;
      
      farmerSummaries.push({
        farmer_id: farmerId,
        farmer_name: firstCollection.farmers?.profiles?.full_name || 'Unknown Farmer',
        farmer_phone: firstCollection.farmers?.profiles?.phone || 'No phone',
        total_collections: totalCollections,
        total_liters: totalLiters,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: netPendingAmount, // Use net pending instead of gross pending
        bank_info: `${firstCollection.farmers?.bank_name || 'N/A'} - ${firstCollection.farmers?.bank_account_number || 'No account'}`,
        credit_used: creditUsed,
        net_payment: netPayment
      });
    }
    
    setFarmerPaymentSummaries(farmerSummaries);
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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