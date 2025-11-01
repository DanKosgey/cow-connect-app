import { useState, useEffect } from "react";
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
  Check
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AgrovetShoppingInterface from "@/components/farmer/AgrovetShoppingInterface";
import CreditHistory from "@/components/farmer/CreditHistory";

const CreditDashboardEssentials = () => {
  const [loading, setLoading] = useState(true);
  const [creditProfile, setCreditProfile] = useState<any>(null);
  const [creditTransactions, setCreditTransactions] = useState<any[]>([]);
  const [creditRequests, setCreditRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [farmerId, setFarmerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'shop' | 'history'>('dashboard');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        // Get farmer profile
        const { data: farmerData, error: farmerError } = await supabase
          .from('farmers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (farmerError) throw farmerError;
        if (!farmerData) {
          setError("Farmer profile not found");
          setLoading(false);
          return;
        }

        const farmerId = farmerData.id;
        setFarmerId(farmerId);

        // Get credit profile
        let profile = await CreditServiceEssentials.getCreditProfile(farmerId);
        
        // If no credit profile exists, create a default one
        if (!profile) {
          try {
            profile = await CreditServiceEssentials.createDefaultCreditProfile(farmerId);
          } catch (creationError) {
            console.warn("Failed to create default credit profile:", creationError);
            // Continue with null profile, UI will handle this case
          }
        }
        setCreditProfile(profile);

        // Get credit transactions
        const transactions = await CreditServiceEssentials.getCreditTransactions(farmerId, 5);
        setCreditTransactions(transactions);

        // Get pending payments
        const { data: pendingCollections, error: collectionsError } = await supabase
          .from('collections')
          .select('total_amount')
          .eq('farmer_id', farmerId)
          .neq('status', 'Paid');

        if (collectionsError) throw collectionsError;
        const pendingTotal = pendingCollections?.reduce((sum, collection) => 
          sum + (collection.total_amount || 0), 0) || 0;
        setPendingPayments(pendingTotal);

        // Get credit requests
        const { data: requests, error: requestsError } = await supabase
          .from('credit_requests')
          .select('*')
          .eq('farmer_id', farmerId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!requestsError && requests) {
          setCreditRequests(requests);
        }

      } catch (err) {
        console.error("Error fetching credit data:", err);
        setError("Failed to load credit dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your credit dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const creditLimit = creditProfile?.max_credit_amount || 0;
  const availableCredit = creditProfile?.current_credit_balance || 0;
  const creditUsed = creditProfile?.total_credit_used || 0;
  const creditPercentage = creditLimit > 0 ? (availableCredit / creditLimit) * 100 : 0;
  const utilizationPercentage = creditLimit > 0 ? ((creditLimit - availableCredit) / creditLimit) * 100 : 0;

  // Handle case when no credit profile exists
  const hasCreditProfile = !!creditProfile;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Credit Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your credit against produce</p>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mt-6">
            <button
              className={`py-2 px-4 font-medium text-sm ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Credit Overview
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm ${activeTab === 'shop' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('shop')}
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Shop with Credit
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('history')}
            >
              <History className="w-4 h-4 inline mr-2" />
              Credit History
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {/* Credit Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Available Credit</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasCreditProfile ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatCurrency(availableCredit)}
                        </span>
                        <span className="text-sm text-gray-500">
                          of {formatCurrency(creditLimit)}
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${creditPercentage}%` }}
                        ></div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No credit profile found</p>
                      <p className="text-sm text-gray-400 mt-1">Contact admin to set up your credit profile</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Pending Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(pendingPayments)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">From milk collections</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Credit Used</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasCreditProfile ? (
                    <>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(creditUsed)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Total agrovet purchases</p>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No credit usage yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasCreditProfile && creditLimit > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-gray-900">
                        {utilizationPercentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Of your credit limit</p>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No utilization data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {creditTransactions.length > 0 ? (
                      creditTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              transaction.transaction_type === 'credit_granted' ? 'bg-green-100' :
                              transaction.transaction_type === 'credit_used' ? 'bg-red-100' :
                              'bg-blue-100'
                            }`}>
                              {transaction.transaction_type === 'credit_granted' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : transaction.transaction_type === 'credit_used' ? (
                                <ShoppingCart className="w-4 h-4 text-red-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {transaction.description || transaction.transaction_type.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              transaction.transaction_type === 'credit_granted' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.transaction_type === 'credit_granted' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Balance: {formatCurrency(transaction.balance_after)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No credit transactions yet</p>
                      </div>
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {creditRequests.length > 0 ? (
                      creditRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              request.status === 'pending' ? 'bg-yellow-100' :
                              request.status === 'approved' ? 'bg-green-100' :
                              'bg-red-100'
                            }`}>
                              {request.status === 'pending' ? (
                                <Clock className="w-4 h-4 text-yellow-600" />
                              ) : request.status === 'approved' ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {request.product_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {request.quantity} × {formatCurrency(request.unit_price)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatCurrency(request.total_amount)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No credit requests yet</p>
                      </div>
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
                  Credit Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasCreditProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Credit Profile</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tier:</span>
                          <span className="font-medium">
                            {creditProfile?.credit_tier?.charAt(0).toUpperCase() + creditProfile?.credit_tier?.slice(1) || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Credit Percentage:</span>
                          <span className="font-medium">{creditProfile?.credit_limit_percentage || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`font-medium ${creditProfile?.is_frozen ? 'text-red-600' : 'text-green-600'}`}>
                            {creditProfile?.is_frozen ? 'Frozen' : 'Active'}
                          </span>
                        </div>
                        {creditProfile?.is_frozen && creditProfile?.freeze_reason && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Freeze Reason:</span>
                            <span className="font-medium text-red-600">{creditProfile.freeze_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Settlement Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next Settlement:</span>
                          <span className="font-medium">
                            {creditProfile?.next_settlement_date 
                              ? new Date(creditProfile.next_settlement_date).toLocaleDateString() 
                              : 'Not scheduled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Settlement:</span>
                          <span className="font-medium">
                            {creditProfile?.last_settlement_date 
                              ? new Date(creditProfile.last_settlement_date).toLocaleDateString() 
                              : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pending Deductions:</span>
                          <span className="font-medium">{formatCurrency(creditProfile?.pending_deductions || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No credit profile available</p>
                    <p className="text-sm text-gray-400 mt-1">Contact admin to set up your credit profile</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setActiveTab('shop')}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shop with Credit
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('history')}>
                <History className="w-4 h-4 mr-2" />
                View Full History
              </Button>
            </div>
          </>
        ) : activeTab === 'shop' ? (
          <AgrovetShoppingInterface 
            farmerId={farmerId} 
            availableCredit={availableCredit} 
          />
        ) : (
          <CreditHistory farmerId={farmerId} />
        )}
      </div>
    </div>
  );
};

export default CreditDashboardEssentials;