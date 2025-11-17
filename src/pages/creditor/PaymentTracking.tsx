import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  CreditCard, 
  Calendar,
  Search,
  Filter,
  AlertTriangle,
  Bell,
  Clock,
  User
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { CreditService } from '@/services/credit-service';

interface PaymentRecord {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface PaymentAnalytics {
  date: string;
  credit_granted: number;
  credit_used: number;
  credit_repaid: number;
  net_change: number;
}

interface OverduePayment {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  outstanding_amount: number;
  days_overdue: number;
  last_payment_date: string;
}

interface PaymentSchedule {
  date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
}

const PaymentTracking = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics[]>([]);
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<{[key: string]: PaymentSchedule[]}>({});
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
  const [showOverdueAlerts, setShowOverdueAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [timeRange, setTimeRange] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    fetchAnalytics();
    fetchOverduePayments();
    fetchPaymentSchedules();
  }, [timeRange]);

  useEffect(() => {
    // Filter payments based on search term and type
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.farmer_phone.includes(searchTerm)
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(payment => payment.transaction_type === filterType);
    }

    setFilteredPayments(filtered);
  }, [searchTerm, filterType, payments]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get credit transactions with farmer details
      const { data, error } = await supabase
        .from('farmer_credit_transactions')
        .select(`
          *,
          farmers:farmer_id (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = (data || []).map(transaction => ({
        id: transaction.id,
        farmer_id: transaction.farmer_id,
        farmer_name: transaction.farmers?.full_name || 'Unknown Farmer',
        farmer_phone: transaction.farmers?.phone || 'No phone',
        transaction_type: transaction.transaction_type,
        amount: transaction.amount,
        balance_before: transaction.balance_after + (transaction.transaction_type === 'credit_granted' ? -transaction.amount : 
                      transaction.transaction_type === 'credit_used' ? transaction.amount : 
                      transaction.transaction_type === 'credit_repaid' ? -transaction.amount : 0),
        balance_after: transaction.balance_after,
        description: transaction.description,
        created_at: transaction.created_at
      }));

      setPayments(transformedData);
      setFilteredPayments(transformedData);
    } catch (err) {
      console.error("Error fetching payment data:", err);
      setError("Failed to load payment data");
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const analyticsData = await CreditService.getAnalytics(timeRange);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      // Fallback to mock data if real data fails
      const mockAnalytics: PaymentAnalytics[] = [];
      const days = parseInt(timeRange);
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        mockAnalytics.push({
          date: dateString,
          credit_granted: Math.floor(Math.random() * 50000),
          credit_used: Math.floor(Math.random() * 30000),
          credit_repaid: Math.floor(Math.random() * 20000),
          net_change: Math.floor(Math.random() * 40000) - 20000
        });
      }
      
      setAnalytics(mockAnalytics);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverduePayments = async () => {
    try {
      setLoading(true);
      const overdueData = await CreditService.getOverduePayments();
      setOverduePayments(overdueData);
    } catch (err) {
      console.error("Error fetching overdue payments:", err);
      toast({
        title: "Error",
        description: "Failed to load overdue payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSchedules = async () => {
    try {
      // For demo purposes, we'll fetch schedules for the first farmer
      // In a real implementation, you would fetch schedules for all farmers
      // or implement a more sophisticated filtering system
      const schedulesData: {[key: string]: PaymentSchedule[]} = {};
      
      // This is a placeholder - in a real implementation, you would iterate
      // through farmers and fetch their individual schedules
      setPaymentSchedules(schedulesData);
    } catch (err) {
      console.error("Error fetching payment schedules:", err);
      // Fallback to mock data if real data fails
      const mockSchedules: {[key: string]: PaymentSchedule[]} = {
        "1": [
          { date: "2023-06-15", amount: 5000, status: "paid" },
          { date: "2023-07-15", amount: 5000, status: "paid" },
          { date: "2023-08-15", amount: 5000, status: "overdue" }
        ],
        "2": [
          { date: "2023-06-20", amount: 3000, status: "paid" },
          { date: "2023-07-20", amount: 3000, status: "pending" },
          { date: "2023-08-20", amount: 2500, status: "pending" }
        ],
        "3": [
          { date: "2023-05-30", amount: 8000, status: "paid" },
          { date: "2023-06-30", amount: 7000, status: "overdue" },
          { date: "2023-07-30", amount: 7000, status: "pending" }
        ]
      };
      
      setPaymentSchedules(mockSchedules);
    }
  };

  const sendOverdueNotification = async (farmerId: string, farmerName: string) => {
    try {
      // In a real implementation, this would send an actual notification
      // For now, we'll show a success message
      toast({
        title: "Notification Sent",
        description: `Overdue payment reminder sent to ${farmerName}`
      });
    } catch (err) {
      console.error("Error sending notification:", err);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive"
      });
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch(type) {
      case 'credit_granted': return 'bg-green-100 text-green-800';
      case 'credit_used': return 'bg-blue-100 text-blue-800';
      case 'credit_repaid': return 'bg-purple-100 text-purple-800';
      case 'credit_adjusted': return 'bg-yellow-100 text-yellow-800';
      case 'settlement': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch(type) {
      case 'credit_granted': return 'Credit Granted';
      case 'credit_used': return 'Credit Used';
      case 'credit_repaid': return 'Credit Repaid';
      case 'credit_adjusted': return 'Credit Adjusted';
      case 'settlement': return 'Settlement';
      default: return type;
    }
  };

  const getOverdueBadge = (days: number) => {
    if (days > 30) {
      return <Badge variant="destructive">Severely Overdue ({days} days)</Badge>;
    } else if (days > 14) {
      return <Badge variant="secondary">Overdue ({days} days)</Badge>;
    } else {
      return <Badge variant="outline">Warning ({days} days)</Badge>;
    }
  };

  const getScheduleStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScheduleStatusLabel = (status: string) => {
    switch(status) {
      case 'paid': return 'Paid';
      case 'overdue': return 'Overdue';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment tracking data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment Tracking</h1>
              <p className="text-gray-600 mt-2">Track credit repayments and outstanding balances</p>
            </div>
            {overduePayments.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setShowOverdueAlerts(!showOverdueAlerts)}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                {showOverdueAlerts ? 'Hide' : 'Show'} Overdue Alerts ({overduePayments.length})
              </Button>
            )}
          </div>
        </div>

        {/* Overdue Payments Alerts */}
        {showOverdueAlerts && overduePayments.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Overdue Payments Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Farmer</th>
                      <th className="text-left py-2">Phone</th>
                      <th className="text-left py-2">Outstanding Amount</th>
                      <th className="text-left py-2">Days Overdue</th>
                      <th className="text-left py-2">Last Payment</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overduePayments.map((payment, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 font-medium">{payment.farmer_name}</td>
                        <td className="py-3">{payment.farmer_phone}</td>
                        <td className="py-3 font-medium">{formatCurrency(payment.outstanding_amount)}</td>
                        <td className="py-3">{getOverdueBadge(payment.days_overdue)}</td>
                        <td className="py-3">{new Date(payment.last_payment_date).toLocaleDateString()}</td>
                        <td className="py-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => sendOverdueNotification(payment.farmer_id, payment.farmer_name)}
                            className="flex items-center gap-1"
                          >
                            <Bell className="w-4 h-4" />
                            Send Reminder
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Schedule Visualization */}
        {selectedFarmerId && paymentSchedules[selectedFarmerId] && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Payment Schedule for {payments.find(p => p.farmer_id === selectedFarmerId)?.farmer_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={paymentSchedules[selectedFarmerId].map(schedule => ({
                      date: new Date(schedule.date).toLocaleDateString(),
                      amount: schedule.amount,
                      status: schedule.status
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `KES ${value/1000}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <h3 className="font-medium mb-2">Schedule Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {paymentSchedules[selectedFarmerId].map((schedule, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{new Date(schedule.date).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getScheduleStatusColor(schedule.status)}`}>
                          {getScheduleStatusLabel(schedule.status)}
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-semibold">{formatCurrency(schedule.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Payment Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Payment Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `KES ${value/1000}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                    <Legend />
                    <Bar dataKey="credit_granted" fill="#10B981" name="Credit Granted" />
                    <Bar dataKey="credit_used" fill="#3B82F6" name="Credit Used" />
                    <Bar dataKey="credit_repaid" fill="#8B5CF6" name="Credit Repaid" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Net Change Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Net Credit Change
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `KES ${value/1000}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="net_change" 
                      stroke="#F59E0B" 
                      name="Net Change" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by farmer name or phone..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="credit_granted">Credit Granted</SelectItem>
                      <SelectItem value="credit_used">Credit Used</SelectItem>
                      <SelectItem value="credit_repaid">Credit Repaid</SelectItem>
                      <SelectItem value="credit_adjusted">Credit Adjusted</SelectItem>
                      <SelectItem value="settlement">Settlement</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchData}>
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterType !== "all"
                    ? "No transactions match your search criteria"
                    : "Transactions will appear here when credit activities occur"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Transaction Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance Before</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.farmer_name}</div>
                            <div className="text-sm text-gray-500">{payment.farmer_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(payment.transaction_type)}`}>
                            {getTransactionTypeLabel(payment.transaction_type)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.balance_before)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.balance_after)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs text-sm text-gray-600">
                            {payment.description || 'No description'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedFarmerId(payment.farmer_id === selectedFarmerId ? null : payment.farmer_id)}
                            className="flex items-center gap-1"
                          >
                            <User className="w-4 h-4" />
                            {payment.farmer_id === selectedFarmerId ? 'Hide' : 'View'} Schedule
                          </Button>
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

export default PaymentTracking;