import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  User, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { CreditService } from '@/services/credit-service';

interface Farmer {
  id: string;
  full_name: string;
  phone: string;
  email: string;
}

interface FarmerCreditLimit {
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

interface FarmerCreditTransaction {
  id: string;
  farmer_id: string;
  transaction_type: 'credit_granted' | 'credit_used' | 'credit_repaid' | 'credit_adjusted';
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
  agrovet_inventory?: {
    name: string;
    category: string;
  };
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: 'cash' | 'credit';
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

const FarmerProfileDetail = () => {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [creditLimit, setCreditLimit] = useState<FarmerCreditLimit | null>(null);
  const [creditHistory, setCreditHistory] = useState<FarmerCreditTransaction[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<AgrovetPurchase[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (farmerId) {
      fetchData();
    }
  }, [farmerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch farmer details
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles:user_id (full_name, phone, email)
        `)
        .eq('id', farmerId)
        .single();

      if (farmerError) throw farmerError;

      if (farmerData) {
        setFarmer({
          id: farmerData.id,
          full_name: farmerData.profiles?.full_name || 'Unknown Farmer',
          phone: farmerData.profiles?.phone || 'No phone',
          email: farmerData.profiles?.email || 'No email'
        });
      }

      // Fetch credit limit
      const creditLimitData = await CreditService.getCreditStatus(farmerId);
      setCreditLimit(creditLimitData);

      // Fetch credit history
      const creditHistoryData = await CreditService.getCreditHistory(farmerId);
      setCreditHistory(creditHistoryData);

      // Fetch purchase history
      const purchaseHistoryData = await CreditService.getPurchaseHistory(farmerId);
      setPurchaseHistory(purchaseHistoryData);
    } catch (err) {
      console.error("Error fetching farmer profile data:", err);
      setError("Failed to load farmer profile data");
      toast({
        title: "Error",
        description: "Failed to load farmer profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch(type) {
      case 'credit_granted': return 'bg-green-100 text-green-800';
      case 'credit_used': return 'bg-blue-100 text-blue-800';
      case 'credit_repaid': return 'bg-purple-100 text-purple-800';
      case 'credit_adjusted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch(type) {
      case 'credit_granted': return 'Credit Granted';
      case 'credit_used': return 'Credit Used';
      case 'credit_repaid': return 'Credit Repaid';
      case 'credit_adjusted': return 'Credit Adjusted';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading farmer profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
          <Button 
            onClick={() => navigate('/creditor/farmer-profiles')}
            className="mt-4"
          >
            Back to Farmer Profiles
          </Button>
        </div>
      </div>
    );
  }

  const utilizationPercentage = creditLimit?.max_credit_amount && creditLimit.max_credit_amount > 0
    ? ((creditLimit.max_credit_amount - creditLimit.current_credit_balance) / creditLimit.max_credit_amount) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/creditor/farmer-profiles')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Farmer Profiles
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Farmer Profile</h1>
          <p className="text-gray-600 mt-2">Detailed credit and purchase history for {farmer?.full_name}</p>
        </div>

        {/* Farmer Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Farmer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{farmer?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{farmer?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{farmer?.email || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Summary */}
        {creditLimit && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Credit Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Credit Limit</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(creditLimit.max_credit_amount)}</p>
                  <p className="text-xs text-gray-500">{creditLimit.credit_limit_percentage}% of pending payments</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Available Credit</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(creditLimit.current_credit_balance)}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Credit Used</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(creditLimit.total_credit_used)}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Utilization</p>
                  <p className="text-2xl font-bold text-orange-600">{utilizationPercentage.toFixed(1)}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${
                        utilizationPercentage > 80 ? 'bg-red-600' : 
                        utilizationPercentage > 60 ? 'bg-yellow-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credit History */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Credit History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {creditHistory.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No credit history found</h3>
                <p className="text-gray-500">Credit transactions will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditHistory.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                            {getTransactionTypeLabel(transaction.transaction_type)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(transaction.amount)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(transaction.balance_after)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">{transaction.description}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Agrovet Purchase History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchaseHistory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No purchase history found</h3>
                <p className="text-gray-500">Agrovet purchases will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {new Date(purchase.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{purchase.agrovet_inventory?.name || 'Unknown Product'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">{purchase.agrovet_inventory?.category || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          {purchase.quantity}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(purchase.unit_price)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(purchase.total_amount)}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.payment_method === 'credit' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {purchase.payment_method === 'credit' ? 'Credit' : 'Cash'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : purchase.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerProfileDetail;