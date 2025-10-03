import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  CreditCard,
  Smartphone,
  Building
} from "lucide-react";
import { useEffect, useState } from 'react';
import { PaymentsAPI } from '@/services/ApiService';
import { logger } from '../lib/logger';
import { Payment } from '@/types';

const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const fetchedPayments = await PaymentsAPI.list(100, 0);
        setPayments(fetchedPayments);
        logger.info('Payments data fetched successfully');
      } catch (err) {
        logger.error('Error fetching payments data', err);
        setError('Failed to load payments data');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const paidPayments = payments.filter(p => p.status === 'paid');
  const failedPayments = payments.filter(p => p.status === 'failed');
  
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.total_amount, 0);
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.total_amount, 0);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'mpesa':
        return <Smartphone className="h-4 w-4" />;
      case 'bank':
        return <Building className="h-4 w-4" />;
      case 'paystack':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dairy-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-center">
          <p>Error loading payments: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-dairy-50">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="border border-dairy-200" />
              <div>
                <h1 className="text-3xl font-bold text-dairy-900">Payment Management</h1>
                <p className="text-dairy-600">Process and track farmer payments</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" className="border-dairy-300">
                Generate Report
              </Button>
              <Button className="bg-dairy-green hover:bg-dairy-green/90">
                Process All Pending
              </Button>
            </div>
          </div>

          {/* Payment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Pending Payments</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{pendingPayments.length}</div>
                <p className="text-xs text-dairy-600">KSh {totalPending.toLocaleString()} total</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-dairy-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{paidPayments.length}</div>
                <p className="text-xs text-dairy-600">KSh {totalPaid.toLocaleString()} paid</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{failedPayments.length}</div>
                <p className="text-xs text-dairy-600">Require attention</p>
              </CardContent>
            </Card>

            <Card className="border-dairy-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-dairy-700">Total Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-dairy-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-dairy-900">{payments.length}</div>
                <p className="text-xs text-dairy-600">All time</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Payments */}
          <Card className="border-dairy-200 mb-8">
            <CardHeader>
              <CardTitle className="text-dairy-900 flex items-center justify-between">
                Pending Payments
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  {pendingPayments.length} pending
                </Badge>
              </CardTitle>
              <CardDescription>Payments awaiting processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPayments.map((payment: any) => (
                  <div key={payment.id} className="border border-dairy-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          {getPaymentIcon(payment.paymentMethod)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-dairy-900">{payment.farmerName}</h3>
                          <p className="text-sm text-dairy-600">
                            {payment.period_month} • {payment.total_liters}L @ KSh {payment.rate_per_liter}/L
                          </p>
                          <p className="text-xs text-dairy-500">
                            {payment.payment_method === 'mpesa' ? `M-Pesa: ${payment.phone_number}` : 
                             payment.payment_method === 'bank' ? `Bank: ${payment.account_number}` : 
                             'Paystack Payment'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-dairy-900">
                          KSh {payment.total_amount.toLocaleString()}
                        </div>
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          Pending
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" className="bg-dairy-green hover:bg-dairy-green/90">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Process Payment
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-300 text-red-700">
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Completed Payments */}
          <Card className="border-dairy-200">
            <CardHeader>
              <CardTitle className="text-dairy-900">Recent Completed Payments</CardTitle>
              <CardDescription>Successfully processed payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paidPayments.slice(0, 5).map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border border-dairy-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-dairy-green/10 rounded-full flex items-center justify-center">
                        {getPaymentIcon(payment.paymentMethod)}
                      </div>
                      <div>
                        <p className="font-medium text-dairy-900">{payment.farmerName}</p>
                        <p className="text-sm text-dairy-600">{payment.period_month}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-dairy-900">KSh {payment.total_amount.toLocaleString()}</p>
                      <Badge className="bg-dairy-green">Paid</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminPayments;