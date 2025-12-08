import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  TrendingUp,
  User,
  BarChart3,
  FileText,
  Calendar,
  Package,
  CheckCircle
} from 'lucide-react';
import RefreshButton from '@/components/ui/RefreshButton';
import { CreditService } from '@/services/credit-service';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DisbursementStatusTracker from '@/components/creditor/DisbursementStatusTracker';

const CreditorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    pendingApplications: 0,
    totalCreditIssued: 0,
    activeFarmers: 0,
    creditRepaymentRate: 0
  });
  const [utilizationTrends, setUtilizationTrends] = useState<{ month: string; utilization: number }[]>([]);
  const [repaymentBreakdown, setRepaymentBreakdown] = useState<
    { label: string; value: number; color: string }[]
  >([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchDashboardCharts();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const stats = await CreditService.getDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const fetchDashboardCharts = async () => {
    try {
      // Look back 6 months for portfolio-level trends
      const from = new Date();
      from.setMonth(from.getMonth() - 5);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('farmer_credit_transactions')
        .select('transaction_type, amount, created_at')
        .gte('created_at', from.toISOString());

      if (error) {
        throw error;
      }

      const byMonth: Record<string, { used: number; repaid: number }> = {};

      (data || []).forEach((tx: any) => {
        const d = new Date(tx.created_at);
        const key = d.toLocaleString('en-KE', { month: 'short', year: '2-digit' });

        if (!byMonth[key]) {
          byMonth[key] = { used: 0, repaid: 0 };
        }

        const amount = tx.amount || 0;
        if (tx.transaction_type === 'credit_used') {
          byMonth[key].used += amount;
        } else if (tx.transaction_type === 'credit_repaid') {
          byMonth[key].repaid += amount;
        }
      });

      const trendSeries = Object.entries(byMonth).map(([month, v]) => {
        const denom = v.used + v.repaid;
        const utilization = denom > 0 ? (v.used / denom) * 100 : 0;
        return { month, utilization: Number(utilization.toFixed(1)) };
      });

      setUtilizationTrends(trendSeries);

      let totalUsed = 0;
      let totalRepaid = 0;

      (data || []).forEach((tx: any) => {
        const amount = tx.amount || 0;
        if (tx.transaction_type === 'credit_used') totalUsed += amount;
        if (tx.transaction_type === 'credit_repaid') totalRepaid += amount;
      });

      const outstanding = Math.max(totalUsed - totalRepaid, 0);

      setRepaymentBreakdown([
        { label: 'Repaid', value: totalRepaid, color: '#10B981' },
        { label: 'Outstanding', value: outstanding, color: '#F97316' }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard charts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard charts',
        variant: 'destructive'
      });
      setUtilizationTrends([]);
      setRepaymentBreakdown([]);
    }
  };

  const features = [
    {
      title: "Credit Management",
      description: `Manage farmer credit applications and approvals • Pending: ${dashboardStats.pendingApplications}`,
      icon: <CreditCard className="h-8 w-8" />,
      path: "/creditor/credit-management",
      color: "bg-blue-500"
    },
    {
      title: "Product Management",
      description: "Manage agrovet products and credit eligibility",
      icon: <Package className="h-8 w-8" />,
      path: "/creditor/product-management",
      color: "bg-indigo-500"
    },
    {
      title: "Disbursement",
      description: "Confirm product collection by farmers",
      icon: <CheckCircle className="h-8 w-8" />,
      path: "/creditor/disbursement",
      color: "bg-emerald-500"
    },
    {
      title: "Credit Reports",
      description: "View detailed credit analytics and reports",
      icon: <TrendingUp className="h-8 w-8" />,
      path: "/creditor/credit-reports",
      color: "bg-orange-500"
    },
    {
      title: "Farmer Profiles",
      description: "View and manage farmer credit profiles",
      icon: <User className="h-8 w-8" />,
      path: "/creditor/farmer-profiles",
      color: "bg-purple-500"
    },
    {
      title: "Payment Tracking",
      description: "Track credit repayments and outstanding balances",
      icon: <BarChart3 className="h-8 w-8" />,
      path: "/creditor/payment-tracking",
      color: "bg-green-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 text-primary-foreground shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, Agrovet Creditor!</h1>
            <div className="text-primary-foreground/90 mt-2">
              Manage farmer credits, applications, and repayments
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <RefreshButton
              isRefreshing={loading}
              onRefresh={fetchDashboardStats}
              className="bg-white/20 border-white/30 hover:bg-white/30 text-white rounded-md shadow-sm"
              variant="outline"
            />
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {features.map((feature, index) => (
          <Card
            key={feature.title}
            className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border"
          >
            <CardHeader className="pb-2">
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center text-white mb-4`}>
                {feature.icon}
              </div>
              <CardTitle className="text-xl">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground mb-4">{feature.description}</div>
              <Button
                onClick={() => navigate(feature.path)}
                className="w-full"
                variant="outline"
              >
                Access
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats Preview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Pending Applications</div>
                <div className="text-2xl font-bold">{dashboardStats.pendingApplications}</div>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Credit Issued</div>
                <div className="text-2xl font-bold">{formatCurrency(dashboardStats.totalCreditIssued)}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Active Farmers</div>
                <div className="text-2xl font-bold">{dashboardStats.activeFarmers}</div>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Repayment Rate</div>
                <div className="text-2xl font-bold">{dashboardStats.creditRepaymentRate}%</div>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disbursement Status Tracker */}
      <DisbursementStatusTracker />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credit Utilization Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Credit Utilization Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={utilizationTrends}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
                  <Legend />
                  <Bar dataKey="utilization" name="Credit Utilization" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Repayment Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Repayment Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={repaymentBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="label"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {repaymentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value, 'Farmers']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreditorDashboard;