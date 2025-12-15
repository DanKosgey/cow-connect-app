import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  BarChart3,
  List,
  Grid,
  Loader2
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { PaymentService } from '@/services/payment-service';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/formatters';
import RefreshButton from '@/components/ui/RefreshButton';
import { usePaymentSystemData } from '@/hooks/usePaymentSystemData';

// Import the FarmerPaymentSummary component
import FarmerPaymentSummary from '@/components/admin/payments/FarmerPaymentSummary';

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

interface FarmerPaymentSummaryType {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  total_collections: number;
  total_liters: number;
  pending_payments: number;
  paid_amount: number;
  total_deductions: number;
  credit_used: number;
  net_payment: number;
  total_amount: number;
  bank_info: string;
}

interface PaymentAnalytics {
  total_pending: number;
  total_paid: number;
  total_farmers: number;
  avg_payment: number;
  daily_trend: { date: string; collections: number; paidAmount: number; pendingAmount: number; creditUsed: number }[];
  farmer_distribution: { name: string; value: number }[];
  total_credit_used: number;
  total_deductions: number;
  total_net_payment: number;
  total_amount: number;
}

// Memoized Stats Card Component
const StatsCard = React.memo(({ 
  title, 
  value, 
  description, 
  icon: Icon 
}: { 
  title: string; 
  value: string; 
  description: string; 
  icon: React.ComponentType<any>; 
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
));

StatsCard.displayName = 'StatsCard';

const FarmerPaymentsPage = () => {
  const toast = useToastNotifications();
  const { user, userRole } = useAuth();
  const [viewMode, setViewMode] = useState('list');

  // Loading states for payment processing
  const [processingPayments, setProcessingPayments] = useState<Record<string, boolean>>({});
  const [processingAllPayments, setProcessingAllPayments] = useState<Record<string, boolean>>({});

  // Time frame filter state
  const [timeFrame, setTimeFrame] = useState('week'); // Changed default to 'week' for better performance
  const [customDateRange, setCustomDateRange] = useState({
    from: '',
    to: ''
  });

  // Auto-refresh state
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false); // Default to false to reduce initial load

  // Use React Query hook for data fetching with manual control
  const { data: paymentData, isLoading, isError, error, refetch } = usePaymentSystemData(timeFrame, customDateRange);
  
  // Set up auto-refresh only when explicitly enabled
  useEffect(() => {
    if (isAutoRefreshEnabled) {
      const interval = setInterval(() => {
        refetch();
      }, 30000); // 30 seconds instead of 10 for less frequent refreshes

      return () => clearInterval(interval);
    }
  }, [isAutoRefreshEnabled, refetch]);

  // Toggle auto-refresh (memoized)
  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(prev => {
      if (!prev) {
        // If enabling auto-refresh, immediately fetch fresh data
        refetch();
      }
      return !prev;
    });
  };

  // Memoized data extraction
  const collections = useMemo(() => paymentData?.collections || [], [paymentData?.collections]);
  const farmerPaymentSummaries = useMemo(() => paymentData?.farmerPaymentSummaries || [], [paymentData?.farmerPaymentSummaries]);
  const analytics = useMemo(() => paymentData?.analytics || {
    total_pending: 0,
    total_paid: 0,
    total_farmers: 0,
    avg_payment: 0,
    daily_trend: [],
    farmer_distribution: [],
    total_credit_used: 0,
    total_deductions: 0,
    total_net_payment: 0,
    total_amount: 0
  }, [paymentData?.analytics]);

  // Simplified session refresh - don't auto-refresh on mount
  const { refreshSession } = useSessionRefresh({ 
    enabled: false, // Disable automatic session refresh to prevent interference
    refreshInterval: 30 * 60 * 1000 
  });

  // Fetch all data with retry logic (memoized)
  const fetchAllData = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Error', 'Failed to fetch payment data. Please try again.');
    }
  };

  // Manual refresh function that handles session refresh more carefully
  const manualRefresh = async () => {
    try {
      // Only refresh session when explicitly requested
      await refreshSession();
      await refetch();
      toast.success('Success', 'Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Error', 'Failed to refresh data. Please try again.');
    }
  };

  const markAsPaid = async (collectionId: string, farmerId: string) => {
    try {
      if (userRole !== 'admin') {
        toast.error('Access Denied', 'Only administrators can mark payments as paid');
        return;
      }

      // Refresh session before performing critical operation with better error handling
      try {
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before marking payment as paid', error);
          // Continue with operation even if refresh fails
        });
      } catch (sessionError) {
        console.warn('Session refresh error, continuing with operation', sessionError);
      }

      // Find the collection object from collections array
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) {
        throw new Error('Collection not found');
      }
      
      const result = await PaymentService.markCollectionAsPaid(collectionId, farmerId, collection);
      
      if (!result.success) {
        throw result.error || new Error('Unknown error occurred');
      }

      toast.success('Success', result.error?.message || 'Payment marked as paid successfully!');
      
      // Refresh the data to ensure consistency
      await fetchAllData();
    } catch (error: any) {
      console.error('Error marking payment as paid:', error);
      toast.error('Error', 'Failed to mark payment as paid: ' + (error.message || 'Unknown error'));
    }
  };

  const markAllFarmerPaymentsAsPaid = async (farmerId: string) => {
    // Set loading state for this farmer
    setProcessingAllPayments(prev => ({ ...prev, [farmerId]: true }));
    
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
      
      // Refresh session before performing critical operation with better error handling
      try {
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before marking all payments as paid', error);
          // Continue with operation even if refresh fails
        });
      } catch (sessionError) {
        console.warn('Session refresh error, continuing with operation', sessionError);
      }
      
      const result = await PaymentService.markAllFarmerPaymentsAsPaid(farmerId, pendingCollections);
    
      if (!result.success) {
        throw result.error || new Error('Unknown error occurred');
      }

      toast.success('Success', result.data?.['message'] || `Processed ${approvedCollections.length} payments successfully!`);
      
      // Refresh the data to ensure consistency
      await fetchAllData();
    } catch (error: any) {
      console.error('Error marking all farmer payments as paid:', error);
      toast.error('Error', 'Failed to mark all payments as paid: ' + (error.message || 'Unknown error'));
    } finally {
      // Reset loading state for this farmer
      setProcessingAllPayments(prev => {
        const newState = { ...prev };
        delete newState[farmerId];
        return newState;
      });
    }
  };

  // New function to approve collections for payment
  const approveCollectionsForPayment = async (farmerId: string, collectionIds: string[]) => {
    // Set loading state for this farmer
    setProcessingPayments(prev => ({ ...prev, [farmerId]: true }));
    
    try {
      if (userRole !== 'admin') {
        toast.error('Access Denied', 'Only administrators can approve collections for payment');
        return;
      }

      // Refresh session before performing critical operation with better error handling
      try {
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before approving collections for payment', error);
          // Continue with operation even if refresh fails
        });
      } catch (sessionError) {
        console.warn('Session refresh error, continuing with operation', sessionError);
      }

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
    } finally {
      // Reset loading state for this farmer
      setProcessingPayments(prev => {
        const newState = { ...prev };
        delete newState[farmerId];
        return newState;
      });
    }
  };

  // Function to handle time frame change (memoized)
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

  // Function to handle custom date range change (memoized)
  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setCustomDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to apply custom date range (memoized)
  const applyCustomDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setTimeFrame('custom');
    }
  };

  // Function to reset filters (memoized)
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setTimeFrame('week');
    setCustomDateRange({ from: '', to: '' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Calendar className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Error loading payment data: {error?.message || 'Unknown error'}
            </p>
            <button 
              onClick={fetchAllData}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Farmer Payments</h1>
        <p className="mt-2 text-gray-600">
          View and manage farmer payments, track collections, and monitor payment status
        </p>
      </div>

      {/* Stats Cards - Memoized */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Pending"
          value={formatCurrency(analytics.total_pending)}
          description="Pending payments"
          icon={DollarSign}
        />
        <StatsCard
          title="Total Paid"
          value={formatCurrency(analytics.total_paid)}
          description="Payments completed"
          icon={DollarSign}
        />
        <StatsCard
          title="Total Farmers"
          value={analytics.total_farmers.toString()}
          description="Active farmers"
          icon={Users}
        />
        <StatsCard
          title="Avg Payment"
          value={formatCurrency(analytics.avg_payment)}
          description="Average per payment"
          icon={BarChart3}
        />
      </div>

      {/* Time Frame Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Time Frame:</span>
        {['daily', 'weekly', 'monthly', 'all'].map((frame) => (
          <button
            key={frame}
            onClick={() => handleTimeFrameChange(frame)}
            className={`px-3 py-1 text-sm rounded-full ${
              timeFrame === frame
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {frame.charAt(0).toUpperCase() + frame.slice(1)}
          </button>
        ))}
      </div>

      {/* Farmer Payment Summary Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Farmer Payment Summary</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAutoRefresh}
              className={isAutoRefreshEnabled ? "bg-green-100 border-green-300 text-green-800" : ""}
            >
              {isAutoRefreshEnabled ? "Auto Refresh: ON" : "Auto Refresh: OFF"}
            </Button>
            <RefreshButton onRefresh={manualRefresh} /> {/* Use manual refresh */}
          </div>
        </div>
        
        <FarmerPaymentSummary 
          farmerPaymentSummaries={farmerPaymentSummaries}
          collections={collections}
          viewMode={viewMode}
          setViewMode={setViewMode}
          approveCollectionsForPayment={approveCollectionsForPayment}
          markAllFarmerPaymentsAsPaid={markAllFarmerPaymentsAsPaid}
          processingPayments={processingPayments}
          processingAllPayments={processingAllPayments}
        />
      </div>
    </div>
  );
};

export default FarmerPaymentsPage;