import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
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
  Grid
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { PaymentService } from '@/services/payment-service';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { milkRateService } from '@/services/milk-rate-service';
import { collectorRateService } from '@/services/collector-rate-service';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { formatCurrency } from '@/utils/formatters';
import { deductionService } from '@/services/deduction-service';
import RefreshButton from '@/components/ui/RefreshButton';
import { usePaymentSystemData } from '@/hooks/usePaymentSystemData';

// Import the smaller components
import PaymentOverviewChart from '@/components/admin/PaymentOverviewChart';
import FarmerPaymentSummary from '@/components/admin/payments/FarmerPaymentSummary';
import PendingPaymentsTab from '@/components/admin/payments/PendingPaymentsTab';
import PaidPaymentsTab from '@/components/admin/payments/PaidPaymentsTab';
import SettingsTab from '@/components/admin/payments/SettingsTab';
import AnalyticsTab from '@/components/admin/payments/AnalyticsTab';

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

const PaymentSystemSimple = () => {
  const toast = useToastNotifications();
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('credit');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('list');

  // Time frame filter state
  const [timeFrame, setTimeFrame] = useState('all');
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
                  farmerPaymentSummaries.reduce((sum, farmer) => sum + farmer.total_amount, 0) > 0 ? 
      (farmerPaymentSummaries.reduce((sum, farmer) => 
        sum + (farmer.credit_used || 0), 0) / 
       farmerPaymentSummaries.reduce((sum, farmer) => 
        sum + farmer.total_amount, 0)) * 100 : 0,
    creditDistribution: farmerPaymentSummaries
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

        // Refresh session before performing critical operation
        await refreshSession().catch(error => {
          console.warn('Session refresh failed before marking payment as paid', error);
        });

        const result = await PaymentService.markCollectionAsPaid(collectionId, farmerId);
        
        if (!result.success) {
          throw result.error || new Error('Unknown error occurred');
        }

        toast.success('Success', result.message || 'Payment marked as paid successfully!');
        
        // Refresh the data to ensure consistency
        await fetchAllData();
      } catch (error: any) {
        console.error('Error marking payment as paid:', error);
        toast.error('Error', 'Failed to mark payment as paid: ' + (error.message || 'Unknown error'));
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

  // Function to apply custom date range
  const applyCustomDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      setTimeFrame('custom');
    }
  };

  // Function to reset filters
  const resetFilters = () => {
    setTimeFrame('all');
    setCustomDateRange({ from: '', to: '' });
    setSearchTerm('');
    setFilterStatus('all');
  };

  // Effect to filter collections based on search term and filter status
  useEffect(() => {
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
    
    setFilteredCollections(result);
  }, [collections, searchTerm, filterStatus]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error loading payment data: {error?.message || 'Unknown error'}
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="mt-2 text-gray-600">
            Manage farmer payments, track collections, and monitor payment analytics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.total_pending)}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending payments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.total_paid)}
              </div>
              <p className="text-xs text-muted-foreground">
                Payments completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.total_farmers}
              </div>
              <p className="text-xs text-muted-foreground">
                Active farmers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Payment</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.avg_payment)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average per payment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto -mb-px">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'payments', label: 'Payments', icon: DollarSign },
                { id: 'pending', label: 'Pending', icon: Clock },
                { id: 'paid', label: 'Paid', icon: CheckCircle },
                { id: 'analytics', label: 'Analytics', icon: PieChart },
                { id: 'settings', label: 'Settings', icon: Calendar }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Payment Overview</h2>
                <RefreshButton onRefresh={fetchAllData} />
              </div>
              
              <PaymentOverviewChart 
                analytics={analytics} 
                creditAnalytics={creditAnalytics}
                formatCurrency={formatCurrency}
              />
              
              <FarmerPaymentSummary 
                farmerPaymentSummaries={farmerPaymentSummaries}
                collections={collections}
                viewMode={viewMode}
                setViewMode={setViewMode}
                approveCollectionsForPayment={approveCollectionsForPayment}
                markAllFarmerPaymentsAsPaid={markAllFarmerPaymentsAsPaid}
              />
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <FarmerPaymentSummary 
              farmerPaymentSummaries={farmerPaymentSummaries}
              collections={collections}
              viewMode={viewMode}
              setViewMode={setViewMode}
              approveCollectionsForPayment={approveCollectionsForPayment}
              markAllFarmerPaymentsAsPaid={markAllFarmerPaymentsAsPaid}
            />
          )}

          {/* Pending Payments Tab */}
          {activeTab === 'pending' && (
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
          )}

          {/* Paid Payments Tab */}
          {activeTab === 'paid' && (
            <PaidPaymentsTab
              timeFrame={timeFrame}
              customDateRange={customDateRange}
              collections={filteredCollections}
              handleTimeFrameChange={handleTimeFrameChange}
              resetFilters={resetFilters}
              handleCustomDateChange={handleCustomDateChange}
              applyCustomDateRange={applyCustomDateRange}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsTab
              activeAnalyticsTab={activeAnalyticsTab}
              setActiveAnalyticsTab={setActiveAnalyticsTab}
              analytics={analytics}
              creditAnalytics={creditAnalytics}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsTab
              rateConfig={rateConfig}
              collectorRateConfig={collectorRateConfig}
              setRateConfig={setRateConfig}
              setCollectorRateConfig={setCollectorRateConfig}
              updateMilkRate={updateMilkRate}
              updateCollectorRate={updateCollectorRate}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSystemSimple;