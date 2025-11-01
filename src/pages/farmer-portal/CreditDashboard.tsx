import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditService } from "@/services/credit-service";
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
  DollarSign
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RefreshButton from "@/components/ui/RefreshButton";
import { useFarmerCreditData } from '@/hooks/useFarmerCreditData';

interface CreditStatus {
  id: string;
  farmer_id: string;
  credit_limit_percentage: number;
  max_credit_amount: number;
  current_credit_balance: number;
  total_credit_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  farmer_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

interface AgrovetPurchase {
  id: string;
  farmer_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  credit_transaction_id?: string;
  status: string;
  purchased_by?: string;
  created_at: string;
  agrovet_inventory?: {
    name: string;
    category: string;
  };
}

const CreditDashboard = () => {
  const { data: creditData, isLoading: loading, isError, error, refetch } = useFarmerCreditData();
  
  const creditStatus = creditData?.creditStatus || null;
  const creditHistory = creditData?.creditHistory || [];
  const purchaseHistory = creditData?.purchaseHistory || [];
  const pendingPayments = creditData?.pendingPayments || 0;
  
  const displayCreditLimit = creditData?.creditLimit || 0;
  const displayAvailableCredit = creditData?.availableCredit || 0;
  const displayCreditUsed = creditData?.creditUsed || 0;
  const displayCreditPercentage = creditData?.creditPercentage || 0;

  const fetchData = useCallback(() => {
    refetch();
  }, [refetch]);

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

  const creditLimit = creditStatus?.max_credit_amount || 0;
  const availableCredit = creditStatus?.current_credit_balance || 0;
  const creditUsed = creditStatus?.total_credit_used || 0;
  const creditPercentage = creditLimit > 0 ? (availableCredit / creditLimit) * 100 : 0;

  // Prepare data for charts
  const recentTransactions = creditHistory.slice(0, 5);
  
  const transactionTypes = creditHistory.reduce((acc, transaction) => {
    acc[transaction.transaction_type] = (acc[transaction.transaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const transactionTypeData = Object.entries(transactionTypes).map(([type, count]) => ({
    name: type.replace('_', ' ').toUpperCase(),
    value: count
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Credit Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your credit against produce and agrovet purchases</p>
          </div>
          <div className="mt-4 md:mt-0">
            <RefreshButton 
              isRefreshing={loading} 
              onRefresh={fetchData} 
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
            />
          </div>
        </div>

        {/* Credit Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Available Credit</CardTitle>
            </CardHeader>
            <CardContent>
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
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(creditUsed)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total agrovet purchases</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Credit Limit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(creditLimit)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {creditStatus?.credit_limit_percentage || 70}% of pending payments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Transaction History Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {transactionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Transactions']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase History */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Recent Agrovet Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Quantity</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.slice(0, 5).map((purchase) => (
                    <tr key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <span>{purchase.agrovet_inventory?.name || 'Unknown Item'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {purchase.agrovet_inventory?.category || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {purchase.quantity}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {formatCurrency(purchase.total_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          purchase.payment_method === 'credit' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {purchase.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Make Agrovet Purchase
          </Button>
          <Button variant="outline">
            <History className="w-4 h-4 mr-2" />
            View Full History
          </Button>
          <Button variant="outline">
            <CreditCard className="w-4 h-4 mr-2" />
            Request Credit Limit Increase
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreditDashboard;