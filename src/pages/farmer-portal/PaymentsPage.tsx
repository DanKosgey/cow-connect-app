import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  Calendar, 
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useRealtimePayments } from "@/hooks/use-realtime";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  payment_method: string;
  transaction_id: string;
}

const PaymentsPage = () => {
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [farmer, setFarmer] = useState<any>(null);
  const realtimePayments = useRealtimePayments();

  // Update toast ref whenever toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, []);

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch farmer profile with better error handling
        const { data: farmerData, error: farmerError } = await supabase
          .from('farmers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (farmerError) {
          console.error('Error fetching farmer data:', farmerError);
          toastRef.current.error('Error', 'Failed to load farmer profile');
          setLoading(false);
          return;
        }

        if (!farmerData) {
          console.warn('No farmer data found for user:', user.id);
          toastRef.current.error('Warning', 'Farmer profile not found. Please complete your registration.');
          setLoading(false);
          return;
        }

        setFarmer(farmerData);

        // Fetch payments from the farmer_payments table
        const { data: paymentsData, error } = await supabase
          .from('farmer_payments')
          .select(`
            id,
            total_amount,
            approval_status,
            created_at,
            paid_at,
            notes
          `)
          .eq('farmer_id', farmerData.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching payments:', error);
          toastRef.current.error('Error', 'Failed to load payments data');
          setLoading(false);
          return;
        }
        
        // Transform the data to match the existing interface
        const transformedPayments = paymentsData?.map(payment => ({
          id: payment.id,
          amount: payment.total_amount,
          status: payment.approval_status,
          created_at: payment.created_at,
          processed_at: payment.paid_at,
          payment_method: 'Bank Transfer', // Default payment method
          transaction_id: payment.id // Use payment ID as transaction ID
        })) || [];
        
        setPayments(transformedPayments);
      } catch (err) {
        console.error('Error fetching payments:', err);
        toastRef.current.error('Error', 'Failed to load payments data');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Filter payments based on search and filters
  useEffect(() => {
    let result = [...payments];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(payment => 
        payment.amount.toString().includes(searchTerm) ||
        payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter (map farmer_payments statuses to the expected values)
    if (statusFilter) {
      result = result.filter(payment => {
        // Map farmer_payments approval_status to expected status values
        if (statusFilter === 'completed') {
          return payment.status === 'paid';
        } else if (statusFilter === 'processing') {
          return payment.status === 'approved';
        } else if (statusFilter === 'failed') {
          return payment.status === 'pending';
        }
        return payment.status === statusFilter;
      });
    }
    
    // Apply date filter
    if (dateFilter) {
      result = result.filter(payment => 
        new Date(payment.created_at).toDateString() === new Date(dateFilter).toDateString()
      );
    }
    
    setFilteredPayments(result);
  }, [searchTerm, statusFilter, dateFilter, payments]);

  // Prepare chart data
  const chartData = filteredPayments.slice(0, 10).reverse().map(payment => ({
    date: new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: payment.amount
  }));

  // Calculate payment statistics (map farmer_payments statuses correctly)
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const completedPayments = payments.filter(p => p.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'approved').reduce((sum, payment) => sum + payment.amount, 0);

  const exportPayments = (format: 'csv' | 'json') => {
    try {
      const exportData = filteredPayments.map(payment => ({
        date: new Date(payment.created_at).toLocaleDateString(),
        amount: payment.amount,
        status: payment.status,
        payment_method: payment.payment_method || 'N/A',
        transaction_id: payment.transaction_id || 'N/A',
        processed_at: payment.processed_at ? new Date(payment.processed_at).toLocaleDateString() : 'N/A'
      }));
      
      if (format === 'csv') {
        exportToCSV(exportData, 'payments-report');
        toastRef.current.success('Success', 'Payments exported as CSV');
      } else {
        exportToJSON(exportData, 'payments-report');
        toastRef.current.success('Success', 'Payments exported as JSON');
      }
    } catch (err) {
      console.error('Error exporting payments:', err);
      toastRef.current.error('Error', 'Failed to export payments');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Payment History"
        description="Track all your payments and disbursements"
        actions={
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportPayments('csv')}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportPayments('json')}>
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        }
      />

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Payments"
          value={`KSh ${totalPayments.toFixed(2)}`}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Completed"
          value={`KSh ${completedPayments.toFixed(2)}`}
          icon={<CheckCircle className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Pending"
          value={`KSh ${pendingPayments.toFixed(2)}`}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-100"
        />
      </div>

      {/* Payment Trend Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Payment Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`KSh ${value}`, 'Amount']} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={{ fill: '#10b981', r: 4 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search payments..."
          >
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </FilterBar>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Payment Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Date", "Amount", "Status", "Payment Method", "Transaction ID"]}
            data={filteredPayments}
            renderRow={(payment) => (
              <tr key={payment.id} className="hover:bg-muted/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(payment.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  KSh {payment.amount.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                    payment.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {payment.status === 'paid' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : payment.status === 'approved' ? (
                      <Clock className="w-3 h-3 mr-1" />
                    ) : payment.status === 'pending' ? (
                      <Clock className="w-3 h-3 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {payment.status === 'paid' ? 'Completed' : 
                     payment.status === 'approved' ? 'Processing' : 
                     payment.status === 'pending' ? 'Pending' : 
                     payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment.payment_method || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payment.transaction_id || 'N/A'}
                </td>
              </tr>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;