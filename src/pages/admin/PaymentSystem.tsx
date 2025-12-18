import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  BarChart3,
  PieChart,
  List,
  Grid,
  Loader2
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { PaymentService } from '@/services/payment-service';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { milkRateService } from '@/services/milk-rate-service';
import { collectorRateService } from '@/services/collector-rate-service';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/formatters';
import { deductionService } from '@/services/deduction-service';
import RefreshButton from '@/components/ui/RefreshButton';
import { usePaymentSystemData } from '@/hooks/usePaymentSystemData';

// Import the smaller components (lazy load tabs that aren't immediately visible)
import PaymentOverviewChart from '@/components/admin/PaymentOverviewChart';
import FarmerPaymentSummary from '@/components/admin/payments/FarmerPaymentSummary';

// Lazy load tab components for better initial load performance
const PendingPaymentsTab = React.lazy(() => import('@/components/admin/payments/PendingPaymentsTab'));
const PaidPaymentsTab = React.lazy(() => import('@/components/admin/payments/PaidPaymentsTab'));
const SettingsTab = React.lazy(() => import('@/components/admin/payments/SettingsTab'));
const AnalyticsTab = React.lazy(() => import('@/components/admin/payments/AnalyticsTab'));

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

// Memoized Tab Button Component
const TabButton = React.memo(({ 
  id, 
  label, 
  icon: Icon, 
  isActive, 
  onClick 
}: { 
  id: string; 
  label: string; 
  icon: React.ComponentType<any>; 
  isActive: boolean; 
  onClick: (id: string) => void; 
}) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
      isActive
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    <Icon className="w-4 h-4 mr-2" />
    {label}
  </button>
));

TabButton.displayName = 'TabButton';

const PaymentSystemSimple = () => {
  const toast = useToastNotifications();
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('credit');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; // Increased items per page for better performance

  // Farmer deductions state
  const [farmerDeductions, setFarmerDeductions] = useState<Record<string, number>>({});

  // Auto-refresh state
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false); // Default to false to reduce initial load
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use React Query hook for data fetching with manual control
  const { data: paymentData, isLoading, isError, error, refetch } = usePaymentSystemData(timeFrame, customDateRange);
  
  // Set up auto-refresh only when explicitly enabled
  useEffect(() => {
    if (isAutoRefreshEnabled) {
      autoRefreshIntervalRef.current = setInterval(() => {
        refetch();
      }, 60000); // 60 seconds for less frequent refreshes
    }

    // Clean up interval on unmount or when auto-refresh is disabled
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [isAutoRefreshEnabled, refetch]);

  // Toggle auto-refresh (memoized)
  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled(prev => {
      if (!prev) {
        // If enabling auto-refresh, immediately fetch fresh data
        refetch();
      }
      return !prev;
    });
  }, [refetch]);

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

  // Filter collections based on search term and filter status (optimized with useMemo)
  const filteredCollections = useMemo(() => {
    let result = [...collections];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(collection => 
        collection.farmers?.profiles?.full_name?.toLowerCase().includes(term) ||
        collection.collection_id?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(collection => collection.status === filterStatus);
    }
    
    return result;
  }, [collections, searchTerm, filterStatus]);

  // Paginate filtered collections
  const paginatedCollections = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCollections.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCollections, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredCollections.length / itemsPerPage);
  }, [filteredCollections.length, itemsPerPage]);

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

  // Calculate credit analytics based on the correct model (optimized with useMemo)
  const creditAnalytics = useMemo(() => {
    const totalCreditUsed = farmerPaymentSummaries.reduce((sum, farmer) => 
      sum + (farmer.credit_used || 0), 0
    );

    const totalAmount = farmerPaymentSummaries.reduce((sum, farmer) => 
      sum + farmer.total_amount, 0
    );

    const creditImpact = farmerPaymentSummaries.length > 0 && totalAmount > 0 ? 
      (totalCreditUsed / totalAmount) * 100 : 0;

    const creditDistribution = farmerPaymentSummaries
      .filter(farmer => (farmer.credit_used || 0) > 0)
      .map(farmer => ({
        name: farmer.farmer_name,
        totalAmount: farmer.total_amount,
        creditUsed: farmer.credit_used || 0,
        netPayment: farmer.net_payment || 0,
        creditPercentage: farmer.total_amount > 0 ? 
          ((farmer.credit_used || 0) / farmer.total_amount) * 100 : 0,
        status: 'Active'
      }))
      .sort((a, b) => b.creditUsed - a.creditUsed);

    return {
      totalCreditUsed,
      creditImpact,
      creditDistribution,
      totalPendingDeductions: totalCreditUsed
    };
  }, [farmerPaymentSummaries]);

  // Fetch current milk rate and collector rate on component mount - but defer to reduce initial load
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

    // Defer rate fetching to reduce initial load
    const timer = setTimeout(() => {
      fetchRates();
    }, 500);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array to run only once on mount

  // Add effect to refresh rates when settings tab is activated
  useEffect(() => {
    if (activeTab === 'settings') {
      // Clear caches to force fresh fetch
      milkRateService.clearCache();
      collectorRateService.clearCache();
      
      // Fetch fresh rates
      const fetchRates = async () => {
        try {
          const currentRate = await milkRateService.getCurrentRate();
          setRateConfig({
            ratePerLiter: currentRate,
            effectiveFrom: new Date().toISOString().split('T')[0]
          });

          const currentCollectorRate = await collectorRateService.getCurrentRate();
          setCollectorRateConfig({
            ratePerLiter: currentCollectorRate,
            effectiveFrom: new Date().toISOString().split('T')[0]
          });
        } catch (error) {
          console.error('Error fetching rates:', error);
          // Use toast.error instead of toast.show to avoid dependency issues
          console.error('Failed to fetch rates');
        }
      };

      fetchRates();
    }
  }, [activeTab]); // Remove toast from dependencies to prevent infinite loops

  // Fetch farmer deductions - but defer to reduce initial load
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
        console.error('Failed to fetch farmer deductions');
      }
    };

    // Defer deduction fetching to reduce initial load
    const timer = setTimeout(() => {
      fetchFarmerDeductions();
    }, 1000);

    return () => clearTimeout(timer);
  }, []); // Remove toast from dependencies to prevent infinite loops

  // Initialize performance monitoring
  const { measureOperation } = usePerformanceMonitor({ 
    componentName: 'PaymentSystemPage',
    enabled: process.env.NODE_ENV === 'development'
  });

  // Simplified session refresh - don't auto-refresh on mount
  const { refreshSession } = useSessionRefresh({ 
    enabled: false, // Disable automatic session refresh to prevent interference
    refreshInterval: 30 * 60 * 1000 
  });

  // Fetch all data with retry logic (memoized)
  const fetchAllData = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error fetching payment data:', error);
      console.error('Failed to fetch payment data. Please try again.');
    }
  }, [refetch]); // Remove toast dependency

  // Manual refresh function that handles session refresh more carefully
  const manualRefresh = useCallback(async () => {
    try {
      // Only refresh session when explicitly requested
      await refreshSession();
      await refetch();
      console.log('Success', 'Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      console.error('Failed to refresh data. Please try again.');
    }
  }, [refreshSession, refetch]); // Remove toast dependency

  // Memoized callbacks for rate updates
  const updateMilkRate = useCallback(async () => {
    // Remove measureOperation dependency to avoid issues
    try {
      if (rateConfig.ratePerLiter <= 0) {
        console.error('Rate per liter must be greater than zero');
        return;
      }
      
      if (!rateConfig.effectiveFrom) {
        console.error('Effective date is required');
        return;
      }
      
      const success = await milkRateService.updateRate(rateConfig.ratePerLiter, rateConfig.effectiveFrom);
      
      if (success) {
        // Clear cache to ensure fresh data on next fetch
        milkRateService.clearCache();
        console.log('Success', 'Milk rate updated successfully!');
      } else {
        throw new Error('Failed to update milk rate');
      }
    } catch (error: any) {
      console.error('Error updating rate:', error);
      console.error('Failed to update rate: ' + (error.message || 'Unknown error'));
    }
  }, [rateConfig.ratePerLiter, rateConfig.effectiveFrom]); // Remove toast and measureOperation dependencies

  const updateCollectorRate = useCallback(async () => {
    // Remove measureOperation dependency to avoid issues
    try {
      if (collectorRateConfig.ratePerLiter <= 0) {
        console.error('Rate per liter must be greater than zero');
        return;
      }
      
      if (!collectorRateConfig.effectiveFrom) {
        console.error('Effective date is required');
        return;
      }
      
      const success = await collectorRateService.updateRate(collectorRateConfig.ratePerLiter, collectorRateConfig.effectiveFrom);
      
      if (success) {
        // Clear cache to ensure fresh data on next fetch
        collectorRateService.clearCache();
        console.log('Success', 'Collector rate updated successfully!');
      } else {
        throw new Error('Failed to update collector rate');
      }
    } catch (error: any) {
      console.error('Error updating collector rate:', error);
      console.error('Failed to update collector rate: ' + (error.message || 'Unknown error'));
    }
  }, [collectorRateConfig.ratePerLiter, collectorRateConfig.effectiveFrom]); // Remove toast and measureOperation dependencies

  const markAsPaid = useCallback(async (collectionId: string, farmerId: string) => {
    await measureOperation('markAsPaid', async () => {
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
    });
  }, [measureOperation, userRole, refreshSession, collections, toast, fetchAllData]);

  const markAllFarmerPaymentsAsPaid = useCallback(async (farmerId: string) => {
    // Set loading state for this farmer
    setProcessingAllPayments(prev => ({ ...prev, [farmerId]: true }));
    
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
    });
  }, [measureOperation, userRole, collections, refreshSession, toast, fetchAllData]);

  // New function to approve collections for payment
  const approveCollectionsForPayment = useCallback(async (farmerId: string, collectionIds: string[]) => {
    // Set loading state for this farmer
    setProcessingPayments(prev => ({ ...prev, [farmerId]: true }));
    
    await measureOperation('approveCollectionsForPayment', async () => {
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
    });
  }, [measureOperation, userRole, refreshSession, collections, user?.id, toast, fetchAllData]);

  // New function to approve all collections for payment
  const approveAllCollections = useCallback(async () => {
    // Set loading state for approve all
    setProcessingApproveAll(true);
    
    await measureOperation('approveAllCollections', async () => {
      try {
        if (userRole !== 'admin') {
          toast.error('Access Denied', 'Only administrators can approve collections for payment');
          return;
        }

        // Refresh session before performing critical operation with better error handling
        try {
          await refreshSession().catch(error => {
            console.warn('Session refresh failed before approving all collections for payment', error);
            // Continue with operation even if refresh fails
          });
        } catch (sessionError) {
          console.warn('Session refresh error, continuing with operation', sessionError);
        }

        // Get all unapproved collections across all farmers
        const unapprovedCollections = collections.filter(c => 
          !c.approved_for_payment && c.status !== 'Paid' && 
          (c.status === 'Collected' || c.status === 'Paid')
        );

        if (unapprovedCollections.length === 0) {
          toast.show({ title: 'Info', description: 'No collections need approval.' });
          return;
        }

        // Group collections by farmer
        const collectionsByFarmer: Record<string, string[]> = {};
        unapprovedCollections.forEach(collection => {
          if (!collectionsByFarmer[collection.farmer_id]) {
            collectionsByFarmer[collection.farmer_id] = [];
          }
          collectionsByFarmer[collection.farmer_id].push(collection.id);
        });

        // Approve collections for each farmer
        let successCount = 0;
        let errorCount = 0;
        
        for (const [farmerId, collectionIds] of Object.entries(collectionsByFarmer)) {
          try {
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

            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              console.error(`Failed to approve collections for farmer ${farmerId}:`, result.error);
            }
          } catch (error) {
            errorCount++;
            console.error(`Error approving collections for farmer ${farmerId}:`, error);
          }
        }

        if (errorCount === 0) {
          toast.success('Success', `Approved collections for ${successCount} farmers successfully!`);
        } else {
          toast.show({ 
            title: 'Partial Success', 
            description: `Approved collections for ${successCount} farmers. ${errorCount} farmers had errors.` 
          });
        }
        
        // Refresh the data to ensure consistency
        await fetchAllData();
      } catch (error: any) {
        console.error('Error approving all collections for payment:', error);
        toast.error('Error', 'Failed to approve all collections for payment: ' + (error.message || 'Unknown error'));
      } finally {
        // Reset loading state
        setProcessingApproveAll(false);
      }
    });
  }, [measureOperation, userRole, refreshSession, collections, user?.id, toast, fetchAllData]);

  // State for approve all processing
  const [processingApproveAll, setProcessingApproveAll] = useState(false);

  // Function to deduct collector fees from pending payments (individual processing)
  const deductCollectorFees = useCallback(async () => {
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
  }, [measureOperation, userRole, filteredCollections, toast, fetchAllData]);

  // Function to handle time frame change (memoized)
  const handleTimeFrameChange = useCallback((newTimeFrame: string) => {
    setTimeFrame(newTimeFrame);
    
    // If switching to custom, don't trigger data refresh yet
    // Wait for user to input dates
    if (newTimeFrame !== 'custom') {
      // Reset custom date range when not using custom
      setCustomDateRange({ from: '', to: '' });
      // React Query will automatically refetch when timeFrame changes
    }
  }, []);

  // Function to handle custom date range change (memoized)
  const handleCustomDateChange = useCallback((field: 'from' | 'to', value: string) => {
    setCustomDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Function to apply custom date range (memoized)
  const applyCustomDateRange = useCallback(() => {
    if (customDateRange.from && customDateRange.to) {
      setTimeFrame('custom');
    }
  }, [customDateRange.from, customDateRange.to]);

  // Function to reset filters (memoized)
  const resetFilters = useCallback(() => {
    setTimeFrame('all');
    setCustomDateRange({ from: '', to: '' });
    setSearchTerm('');
    setFilterStatus('all');
  }, []);

  // Memoized tab configuration
  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'paid', label: 'Paid', icon: CheckCircle },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'settings', label: 'Settings', icon: Calendar }
  ], []);

  // Memoized tab change handler
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // Function to handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
        <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <p className="mt-2 text-gray-600">
          Manage farmer payments, track collections, and monitor payment analytics
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
          icon={CheckCircle}
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
          icon={TrendingUp}
        />
      </div>

      {/* Tab Navigation - Memoized */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto -mb-px">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                id={tab.id}
                label={tab.label}
                icon={tab.icon}
                isActive={activeTab === tab.id}
                onClick={handleTabChange}
              />
            ))}
          </nav>
        </div>
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

      {/* Tab Content with Lazy Loading */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Payment Overview</h2>
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
            
            <PaymentOverviewChart 
              data={analytics.daily_trend.map(item => ({
                date: item.date,
                collections: item.collections,
                pendingAmount: item.pendingAmount,
                paidAmount: item.paidAmount,
                creditUsed: item.creditUsed
              }))}
            />
            
            <FarmerPaymentSummary 
              farmerPaymentSummaries={farmerPaymentSummaries}
              collections={collections}
              viewMode={viewMode}
              setViewMode={setViewMode}
              approveCollectionsForPayment={approveCollectionsForPayment}
              markAllFarmerPaymentsAsPaid={markAllFarmerPaymentsAsPaid}
              processingPayments={processingPayments}
              processingAllPayments={processingAllPayments}
              approveAllCollections={approveAllCollections}
              processingApproveAll={processingApproveAll}
            />
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
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
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCollections.length)}</span> of{' '}
                      <span className="font-medium">{filteredCollections.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              pageNum === currentPage
                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <React.Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
            <SettingsTab 
              rateConfig={rateConfig}
              collectorRateConfig={collectorRateConfig}
              setRateConfig={setRateConfig}
              setCollectorRateConfig={setCollectorRateConfig}
              updateMilkRate={updateMilkRate}
              updateCollectorRate={updateCollectorRate}
            />
          </React.Suspense>
        )}

        {/* Pending Payments Tab */}
        {activeTab === 'pending' && (
          <React.Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
            <PendingPaymentsTab
              timeFrame={timeFrame}
              customDateRange={customDateRange}
              collections={collections}
              handleTimeFrameChange={handleTimeFrameChange}
              resetFilters={resetFilters}
              handleCustomDateChange={handleCustomDateChange}
              applyCustomDateRange={applyCustomDateRange}
              markAsPaid={markAsPaid}
              approveCollectionsForPayment={approveCollectionsForPayment}
            />
          </React.Suspense>
        )}

        {/* Paid Payments Tab */}
        {activeTab === 'paid' && (
          <React.Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
            <PaidPaymentsTab
              timeFrame={timeFrame}
              customDateRange={customDateRange}
              collections={collections}
              handleTimeFrameChange={handleTimeFrameChange}
              resetFilters={resetFilters}
              handleCustomDateChange={handleCustomDateChange}
              applyCustomDateRange={applyCustomDateRange}
            />
          </React.Suspense>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <React.Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
            <AnalyticsTab 
              activeAnalyticsTab={activeAnalyticsTab}
              setActiveAnalyticsTab={setActiveAnalyticsTab}
              analytics={analytics}
              creditAnalytics={creditAnalytics}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  );
};

export default PaymentSystemSimple;