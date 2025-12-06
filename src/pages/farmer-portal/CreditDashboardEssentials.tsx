import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditServiceEssentials } from "@/services/credit-service-essentials";
import {
  CreditCard,
  Wallet,
  ShoppingCart,
  History,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  FileText,
  Calendar,
  Check,
  RefreshCw,
  Info
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import EnhancedAgrovetShoppingInterface from "@/components/farmer/EnhancedAgrovetShoppingInterface";
import CreditHistory from "@/components/farmer/CreditHistory";

// Types
interface CreditProfile {
  id: string;
  current_credit_balance: number;
  max_credit_amount: number;
  total_credit_used: number;
  credit_tier: string;
  credit_limit_percentage: number;
  is_frozen: boolean;
  freeze_reason?: string;
  next_settlement_date?: string;
  last_settlement_date?: string;
  pending_deductions: number;
}

interface CreditTransaction {
  id: string;
  farmer_id: string;
  transaction_type: 'credit_granted' | 'credit_used' | 'credit_repaid' | 'credit_adjusted' | 'settlement';
  amount: number;
  balance_before: number;
  balance_after: number;
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  reference_id: string | null;
  description: string | null;
  approved_by: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface CreditRequest {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

type TabType = 'dashboard' | 'shop' | 'history';

// Loading skeleton components
const StatCardSkeleton = () => (
  <Card className="border-l-4 border-l-gray-300">
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-2 w-full" />
    </CardContent>
  </Card>
);

const TransactionSkeleton = () => (
  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="text-right">
      <Skeleton className="h-5 w-20 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

// Stat card component
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  borderColor, 
  icon: Icon,
  showProgress,
  progressValue,
  isEmpty = false,
  emptyMessage
}: {
  title: string;
  value: string;
  subtitle?: string;
  borderColor: string;
  icon?: any;
  showProgress?: boolean;
  progressValue?: number;
  isEmpty?: boolean;
  emptyMessage?: string;
}) => (
  <Card className={`border-l-4 ${borderColor} transition-shadow hover:shadow-md`}>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
      </div>
    </CardHeader>
    <CardContent>
      {isEmpty ? (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
          </div>
          {showProgress && progressValue !== undefined && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progressValue, 100)}%` }}
              />
            </div>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

// Transaction item component
const TransactionItem = ({ transaction }: { transaction: CreditTransaction }) => {
  // Defensive check for transaction
  if (!transaction) {
    return (
      <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
        <div className="text-gray-500">Invalid transaction data</div>
      </div>
    );
  }

  const isCredit = transaction.transaction_type === 'credit_granted';
  const isUsed = transaction.transaction_type === 'credit_used';
  
  const iconConfig = {
    credit_granted: { Icon: CheckCircle, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    credit_used: { Icon: ShoppingCart, bgColor: 'bg-red-100', iconColor: 'text-red-600' },
    credit_repaid: { Icon: Clock, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    credit_adjusted: { Icon: RefreshCw, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' },
    settlement: { Icon: TrendingUp, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' }
  };

  // Fallback for unknown transaction types
  const config = iconConfig[transaction.transaction_type] || { 
    Icon: Info, 
    bgColor: 'bg-gray-100', 
    iconColor: 'text-gray-600' 
  };

  // Get display description
  const displayDescription = transaction.description || 
    (transaction.transaction_type ? transaction.transaction_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown Transaction');

  // Format date safely
  let formattedDate = 'Unknown Date';
  try {
    if (transaction.created_at) {
      formattedDate = new Date(transaction.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  } catch (e) {
    console.warn('Error formatting date:', e);
  }

  return (
    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${config.bgColor}`}>
          <config.Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {displayDescription}
          </p>
          <p className="text-sm text-gray-500">
            {formattedDate}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
          {transaction.amount !== undefined ? (
            <>
              {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
            </>
          ) : (
            'N/A'
          )}
        </p>
        <p className="text-sm text-gray-500">
          Bal: {transaction.balance_after !== undefined ? formatCurrency(transaction.balance_after) : 'N/A'}
        </p>
      </div>
    </div>
  );
};

// Request item component
const RequestItem = ({ request }: { request: CreditRequest }) => {
  const statusConfig = {
    pending: { 
      Icon: Clock, 
      bgColor: 'bg-yellow-100', 
      iconColor: 'text-yellow-600',
      badgeColor: 'bg-yellow-100 text-yellow-800'
    },
    approved: { 
      Icon: Check, 
      bgColor: 'bg-green-100', 
      iconColor: 'text-green-600',
      badgeColor: 'bg-green-100 text-green-800'
    },
    rejected: { 
      Icon: AlertCircle, 
      bgColor: 'bg-red-100', 
      iconColor: 'text-red-600',
      badgeColor: 'bg-red-100 text-red-800'
    }
  };

  const config = statusConfig[request.status];

  return (
    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${config.bgColor}`}>
          <config.Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div>
          <p className="font-medium text-gray-900">{request.product_name}</p>
          <p className="text-sm text-gray-500">
            {request.quantity} × {formatCurrency(request.unit_price)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <Badge className={config.badgeColor}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </Badge>
        <p className="text-sm text-gray-500 mt-1">
          {formatCurrency(request.total_amount)}
        </p>
      </div>
    </div>
  );
};

// Empty state component
const EmptyState = ({ 
  icon: Icon, 
  message, 
  description 
}: { 
  icon: any; 
  message: string;
  description?: string;
}) => (
  <div className="text-center py-12">
    <Icon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
    <p className="text-gray-600 font-medium">{message}</p>
    {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
  </div>
);

const CreditDashboardEssentials = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creditProfile, setCreditProfile] = useState<CreditProfile | null>(null);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [farmerId, setFarmerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Memoized values
  const availableCredit = useMemo(() => 
    creditProfile?.current_credit_balance || 0, 
    [creditProfile]
  );

  const creditStats = useMemo(() => {
    if (!creditProfile) return null;
    
    const limit = creditProfile.max_credit_amount || 0;
    const available = creditProfile.current_credit_balance || 0;
    const used = creditProfile.total_credit_used || 0;
    const creditPercentage = limit > 0 ? (available / limit) * 100 : 0;
    const utilizationPercentage = limit > 0 ? ((limit - available) / limit) * 100 : 0;

    return {
      limit,
      available,
      used,
      creditPercentage,
      utilizationPercentage
    };
  }, [creditProfile]);

  // Fetch data function
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get farmer profile
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (farmerError) throw farmerError;
      if (!farmerData) {
        throw new Error("Farmer profile not found");
      }

      const farmerId = farmerData.id;
      setFarmerId(farmerId);

      // Fetch all data in parallel
      const [
        profileResult,
        transactionsResult,
        collectionsResult,
        requestsResult
      ] = await Promise.allSettled([
        CreditServiceEssentials.getCreditProfile(farmerId).then(profile => 
          profile || CreditServiceEssentials.createDefaultCreditProfile(farmerId)
        ),
        CreditServiceEssentials.getCreditTransactions(farmerId, 5),
        supabase
          .from('collections')
          .select('total_amount')
          .eq('farmer_id', farmerId)
          .neq('status', 'Paid'),
        supabase
          .from('credit_requests')
          .select('*')
          .eq('farmer_id', farmerId)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Handle credit profile
      if (profileResult.status === 'fulfilled') {
        setCreditProfile(profileResult.value);
      }

      // Handle transactions
      if (transactionsResult.status === 'fulfilled') {
        setCreditTransactions(transactionsResult.value);
      }

      // Handle pending payments
      if (collectionsResult.status === 'fulfilled' && collectionsResult.value.data) {
        const pendingTotal = collectionsResult.value.data.reduce((sum, collection) =>
          sum + (collection.total_amount || 0), 0);
        setPendingPayments(pendingTotal);
      }

      // Handle credit requests
      if (requestsResult.status === 'fulfilled' && requestsResult.value.data) {
        setCreditRequests(requestsResult.value.data);
      }

    } catch (err) {
      console.error("Error fetching credit data:", err);
      setError(err instanceof Error ? err.message : "Failed to load credit dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 ml-2">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasCreditProfile = !!creditProfile;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credit Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your credit against produce</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              className={`py-3 px-6 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'dashboard' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              Credit Overview
            </button>
            <button
              className={`py-3 px-6 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'shop' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('shop')}
            >
              <ShoppingCart className="w-4 h-4" />
              Shop with Credit
            </button>
            <button
              className={`py-3 px-6 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'history' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('history')}
            >
              <History className="w-4 h-4" />
              Credit History
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {/* Frozen account alert */}
            {creditProfile?.is_frozen && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-700 ml-2">
                  <strong>Account Frozen:</strong> {creditProfile.freeze_reason || 'Please contact support for more information.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Credit Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Available Credit"
                value={hasCreditProfile ? formatCurrency(creditStats?.available || 0) : 'N/A'}
                subtitle={hasCreditProfile ? `of ${formatCurrency(creditStats?.limit || 0)}` : undefined}
                borderColor="border-l-blue-500"
                icon={Wallet}
                showProgress={hasCreditProfile}
                progressValue={creditStats?.creditPercentage}
                isEmpty={!hasCreditProfile}
                emptyMessage="No credit profile available"
              />

              <StatCard
                title="Pending Payments"
                value={formatCurrency(pendingPayments)}
                subtitle="From milk collections"
                borderColor="border-l-green-500"
                icon={DollarSign}
              />

              <StatCard
                title="Credit Used"
                value={hasCreditProfile ? formatCurrency(creditStats?.used || 0) : 'N/A'}
                subtitle={hasCreditProfile ? "Total agrovet purchases" : undefined}
                borderColor="border-l-amber-500"
                icon={ShoppingCart}
                isEmpty={!hasCreditProfile}
                emptyMessage="No credit usage yet"
              />

              <StatCard
                title="Utilization"
                value={hasCreditProfile && creditStats ? `${creditStats.utilizationPercentage.toFixed(1)}%` : 'N/A'}
                subtitle={hasCreditProfile ? "Of your credit limit" : undefined}
                borderColor="border-l-purple-500"
                icon={TrendingUp}
                isEmpty={!hasCreditProfile}
                emptyMessage="No utilization data"
              />
            </div>

            {/* Recent Transactions and Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Recent Transactions
                  </CardTitle>
                  <CardDescription>Your latest credit activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {creditTransactions.length > 0 ? (
                      creditTransactions.map((transaction) => (
                        <TransactionItem key={transaction.id} transaction={transaction} />
                      ))
                    ) : (
                      <EmptyState
                        icon={History}
                        message="No credit transactions yet"
                        description="Your transactions will appear here"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Recent Requests
                  </CardTitle>
                  <CardDescription>Track your credit requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {creditRequests.length > 0 ? (
                      creditRequests.map((request) => (
                        <RequestItem key={request.id} request={request} />
                      ))
                    ) : (
                      <EmptyState
                        icon={FileText}
                        message="No credit requests yet"
                        description="Submit requests to purchase with credit"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Credit Details */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Credit Profile Details
                </CardTitle>
                <CardDescription>Your complete credit information</CardDescription>
              </CardHeader>
              <CardContent>
                {hasCreditProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Credit Profile
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Tier</span>
                          <Badge variant="outline">
                            {creditProfile.credit_tier?.charAt(0).toUpperCase() + creditProfile.credit_tier?.slice(1) || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Credit Percentage</span>
                          <span className="font-medium">{creditProfile.credit_limit_percentage || 0}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Status</span>
                          <Badge className={creditProfile.is_frozen ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {creditProfile.is_frozen ? 'Frozen' : 'Active'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Settlement Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Next Settlement</span>
                          <span className="font-medium">
                            {creditProfile.next_settlement_date
                              ? new Date(creditProfile.next_settlement_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })
                              : 'Not scheduled'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Last Settlement</span>
                          <span className="font-medium">
                            {creditProfile.last_settlement_date
                              ? new Date(creditProfile.last_settlement_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })
                              : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Pending Deductions</span>
                          <span className="font-medium">{formatCurrency(creditProfile.pending_deductions || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={CreditCard}
                    message="No credit profile available"
                    description="Contact admin to set up your credit profile"
                  />
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 shadow-md" 
                onClick={() => setActiveTab('shop')}
                disabled={!hasCreditProfile || creditProfile.is_frozen}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shop with Credit
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('history')}
                className="shadow-sm"
              >
                <History className="w-4 h-4 mr-2" />
                View Full History
              </Button>
            </div>
          </>
        ) : activeTab === 'shop' ? (
          <div key="shop-tab" className="animate-in fade-in duration-300">
            {farmerId ? (
              <EnhancedAgrovetShoppingInterface
                farmerId={farmerId}
                availableCredit={availableCredit}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading shopping interface...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div key="history-tab" className="animate-in fade-in duration-300">
            {farmerId ? (
              <CreditHistory farmerId={farmerId} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading history...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditDashboardEssentials;