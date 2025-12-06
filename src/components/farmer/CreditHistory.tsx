import { useState, useEffect } from "react";
import EnhancedAgrovetShoppingInterface from "./EnhancedAgrovetShoppingInterface";
import { supabase } from "@/integrations/supabase/client";
import { 
  History, 
  CheckCircle, 
  ShoppingCart, 
  Clock,
  TrendingUp,
  RefreshCw,
  Info
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  description: string | null;
  created_at: string;
}

const CreditHistory = ({ farmerId }: { farmerId: string }) => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('farmer_id', farmerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Handle case when no transactions exist
        setTransactions(data ? (data as CreditTransaction[]) : []);
      } catch (err) {
        console.error("Error fetching credit transactions:", err);
        // Set empty array on error to prevent UI issues
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    if (farmerId) {
      fetchTransactions();
    }
  }, [farmerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading credit history...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Detailed Credit History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.length > 0 ? (
            transactions.map(transaction => (
              <div key={transaction.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.transaction_type === 'credit_granted' ? 'bg-green-100' :
                      transaction.transaction_type === 'credit_used' ? 'bg-red-100' :
                      transaction.transaction_type === 'credit_repaid' ? 'bg-blue-100' :
                      transaction.transaction_type === 'settlement' ? 'bg-purple-100' :
                      transaction.transaction_type === 'credit_adjusted' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {transaction.transaction_type === 'credit_granted' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : transaction.transaction_type === 'credit_used' ? (
                        <ShoppingCart className="w-4 h-4 text-red-600" />
                      ) : transaction.transaction_type === 'credit_repaid' ? (
                        <Clock className="w-4 h-4 text-blue-600" />
                      ) : transaction.transaction_type === 'settlement' ? (
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                      ) : transaction.transaction_type === 'credit_adjusted' ? (
                        <RefreshCw className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <Info className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {transaction.description || transaction.transaction_type.replace('_', ' ')}
                      </h4>
                      {transaction.product_name && (
                        <p className="text-sm text-gray-500">
                          {transaction.product_name} ({transaction.quantity} × {formatCurrency(transaction.unit_price || 0)})
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-lg ${
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
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">No credit transactions found</p>
              <p className="text-sm mb-6">Start shopping to build your credit history</p>
              <div className="max-w-md mx-auto">
                <EnhancedAgrovetShoppingInterface farmerId={farmerId} availableCredit={0} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditHistory;