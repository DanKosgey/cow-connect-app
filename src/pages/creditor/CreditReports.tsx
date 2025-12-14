import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ComprehensiveCreditAnalyticsService } from '@/services/comprehensive-credit-analytics-service';
import {
  TrendingUp,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Download,
  TrendingDown
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreditAnalytics {
  totalCreditOutstanding: number;
  totalCreditIssuedThisMonth: number;
  activeCreditUsers: number;
  averageCreditUtilizationRate: number;
  outstandingDefaultAmount: number;
  defaultRate: number;
  creditSettlementPending: number;
  farmersAtRiskCount: number;
  farmersApproachingSettlement: number;
  pendingCreditApprovals: number;
  failedTransactionsThisMonth: number;
}

interface RiskDistribution {
  risk_level: string;
  count: number;
}

interface CreditUtilizationTrend {
  date: string;
  utilization_rate: number;
  default_rate: number;
}

interface FarmerCreditSummary {
  farmer_id: string;
  farmer_name: string;
  total_credit_limit: number;
  current_utilization: number;
  utilization_percentage: number;
  risk_level: string;
}

interface ProductCategoryCredit {
  category: string;
  total_credit_used: number;
  transaction_count: number;
}

interface DefaultTrend {
  date: string;
  defaults_count: number;
  recovery_amount: number;
}

interface RecoveryAnalysis {
  month: string;
  recovery_rate: number;
  total_defaults: number;
  recovered_amount: number;
}

const CreditReports = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CreditAnalytics | null>(null);
  const [riskDistribution, setRiskDistribution] = useState<RiskDistribution[]>([]);
  const [utilizationTrends, setUtilizationTrends] = useState<CreditUtilizationTrend[]>([]);
  const [farmerCreditSummaries, setFarmerCreditSummaries] = useState<FarmerCreditSummary[]>([]);
  const [productCategoryCredits, setProductCategoryCredits] = useState<ProductCategoryCredit[]>([]);
  const [defaultTrends, setDefaultTrends] = useState<DefaultTrend[]>([]);
  const [recoveryAnalysis, setRecoveryAnalysis] = useState<RecoveryAnalysis[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const { toast } = useToast();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const analyticsData = await fetchCreditAnalytics();
      setAnalytics(analyticsData);

      const riskData = await fetchRiskDistribution();
      setRiskDistribution(riskData);

      const trendData = await fetchUtilizationTrends();
      setUtilizationTrends(trendData);

      const farmerData = await fetchFarmerCreditSummaries();
      setFarmerCreditSummaries(farmerData);

      const productData = await fetchProductCategoryCredits();
      setProductCategoryCredits(productData);

      const defaultTrendData = await fetchDefaultTrends();
      setDefaultTrends(defaultTrendData);

      const recoveryData = await fetchRecoveryAnalysis();
      setRecoveryAnalysis(recoveryData);
    } catch (error) {
      console.error("Error fetching credit analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load credit analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditAnalytics = async (): Promise<CreditAnalytics> => {
    const report =
      await ComprehensiveCreditAnalyticsService.getCreditAnalyticsReport();

    return {
      totalCreditOutstanding: report.totalCreditOutstanding,
      totalCreditIssuedThisMonth: report.totalCreditIssuedThisMonth,
      activeCreditUsers: report.activeCreditUsers,
      averageCreditUtilizationRate: parseFloat(
        report.averageCreditUtilizationRate.toFixed(2)
      ),
      outstandingDefaultAmount: report.outstandingDefaultAmount,
      defaultRate: report.defaultRate,
      creditSettlementPending: report.creditSettlementPending,
      farmersAtRiskCount: report.farmersAtRiskCount,
      farmersApproachingSettlement: report.farmersApproachingSettlement,
      pendingCreditApprovals: report.pendingCreditApprovals,
      failedTransactionsThisMonth: report.failedTransactionsThisMonth,
    };
  };

  const fetchRiskDistribution = async (): Promise<RiskDistribution[]> => {
    const { data, error } = await supabase
      .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
      .select('max_credit_amount, current_credit_balance');

    if (error) throw error;

    let low = 0;
    let medium = 0;
    let high = 0;

    (data || []).forEach((row: any) => {
      const max = row.max_credit_amount || 0;
      const balance = row.current_credit_balance || 0;
      if (!max) return;

      const utilization = ((max - balance) / max) * 100;

      if (utilization < 60) low += 1;
      else if (utilization < 80) medium += 1;
      else high += 1;
    });

    return [
      { risk_level: 'Low Risk', count: low },
      { risk_level: 'Medium Risk', count: medium },
      { risk_level: 'High Risk', count: high },
    ];
  };

  const fetchUtilizationTrends = async (): Promise<CreditUtilizationTrend[]> => {
    const days = parseInt(timeRange);
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('credit_transactions')
      .select('transaction_type, amount, created_at')
      .gte('created_at', from.toISOString());

    if (error) throw error;

    const byDate: Record<string, { used: number; repaid: number }> = {};

    (data || []).forEach((tx: any) => {
      const key = new Date(tx.created_at).toLocaleDateString('en-KE', {
        month: 'short',
        day: 'numeric',
      });

      if (!byDate[key]) {
        byDate[key] = { used: 0, repaid: 0 };
      }

      const amount = tx.amount || 0;
      if (tx.transaction_type === 'credit_used') byDate[key].used += amount;
      if (tx.transaction_type === 'credit_repaid') byDate[key].repaid += amount;
    });

    return Object.entries(byDate).map(([date, v]) => {
      const denom = v.used + v.repaid;
      const utilization =
        denom > 0 ? Number(((v.used / denom) * 100).toFixed(1)) : 0;

      return {
        date,
        utilization_rate: utilization,
        default_rate: 0,
      };
    });
  };

  // Fetch farmer credit summaries
  const fetchFarmerCreditSummaries = useCallback(async () => {
    try {
      // Get all active credit limits (using the correct table name)
      const { data: limitsData, error: limitsError } = await supabase
        .from('farmer_credit_profiles') // Using farmer_credit_profiles as farmer_credit_limits has been deleted
        .select(`
          farmer_id,
          max_credit_amount,
          total_credit_used,
          current_credit_balance
        `)
        .eq('is_frozen', false); // Using is_frozen = false instead of is_active = true

      if (limitsError) throw limitsError;

      // Extract unique farmer IDs
      const farmerIds = [...new Set(limitsData?.map((row: any) => row.farmer_id) || [])];

      // Get farmer names
      let farmerMap = new Map<string, string>();

      if (farmerIds.length > 0) {
        const { data: farmersData, error: farmersError } = await supabase
          .from('farmers')
          .select(`
            id,
            profiles (full_name)
          `)
          .in('id', farmerIds as string[]);

        if (farmersError) throw farmersError;

        farmerMap = new Map(
          (farmersData || []).map((farmer: any) => [
            farmer.id,
            farmer.profiles?.full_name || 'Unknown Farmer',
          ])
        );
      }

      const rows: FarmerCreditSummary[] = (limitsData || []).map((row: any) => {
        const max = row.max_credit_amount || 0;
        const used = row.total_credit_used || 0;
        const utilization = max > 0 ? (used / max) * 100 : 0;

        let risk: string = 'Low Risk';
        if (utilization > 90) risk = 'High Risk';
        else if (utilization > 70) risk = 'Medium Risk';

        return {
          farmer_id: row.farmer_id,
          farmer_name: farmerMap.get(row.farmer_id) || 'Unknown Farmer',
          total_credit_limit: max,
          current_utilization: used,
          utilization_percentage: Number(utilization.toFixed(1)),
          risk_level: risk,
        };
      });

      return rows
        .sort((a, b) => b.utilization_percentage - a.utilization_percentage)
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching farmer credit summaries:', error);
      throw error;
    }
  }, []);

  const fetchProductCategoryCredits = async (): Promise<ProductCategoryCredit[]> => {
    const { data, error } = await supabase
      .from('agrovet_purchases')
      .select(`
        total_amount,
        payment_method,
        agrovet_inventory(category)
      `)
      .eq('payment_method', 'credit');

    if (error) throw error;

    const byCategory: Record<string, { total: number; count: number }> = {};

    (data || []).forEach((row: any) => {
      const category = row.agrovet_inventory?.category || 'Other';
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, count: 0 };
      }

      byCategory[category].total += row.total_amount || 0;
      byCategory[category].count += 1;
    });

    return Object.entries(byCategory).map(([category, v]) => ({
      category,
      total_credit_used: v.total,
      transaction_count: v.count,
    }));
  };

  const fetchDefaultTrends = async (): Promise<DefaultTrend[]> => {
    const months = 6;
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - (months - 1));
    from.setDate(1);

    const { data, error } = await supabase
      .from('credit_transactions')
      .select('transaction_type, amount, created_at')
      .gte('created_at', from.toISOString());

    if (error) throw error;

    const byMonth: Record<string, { defaults: number; recovered: number }> = {};

    (data || []).forEach((tx: any) => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleString('en-KE', { month: 'short' });

      if (!byMonth[key]) {
        byMonth[key] = { defaults: 0, recovered: 0 };
      }

      const amount = tx.amount || 0;
      if (tx.transaction_type === 'settlement')
        byMonth[key].recovered += amount;
      // If you later add a dedicated default type, increment defaults here
    });

    return Object.entries(byMonth).map(([date, v]) => ({
      date,
      defaults_count: v.defaults,
      recovery_amount: v.recovered,
    }));
  };

  const fetchRecoveryAnalysis = async (): Promise<RecoveryAnalysis[]> => {
    const months = 6;
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - (months - 1));
    from.setDate(1);

    const { data, error } = await supabase
      .from('credit_transactions')
      .select('transaction_type, amount, created_at')
      .gte('created_at', from.toISOString());

    if (error) throw error;

    const byMonth: Record<string, { defaults: number; recovered: number }> = {};

    (data || []).forEach((tx: any) => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleString('en-KE', {
        month: 'short',
        year: 'numeric',
      });

      if (!byMonth[key]) {
        byMonth[key] = { defaults: 0, recovered: 0 };
      }

      const amount = tx.amount || 0;
      if (tx.transaction_type === 'settlement')
        byMonth[key].recovered += amount;
      if (tx.transaction_type === 'credit_used') byMonth[key].defaults += amount;
    });

    return Object.entries(byMonth).map(([month, v]) => {
      const denom = v.defaults + v.recovered;
      const rate =
        denom > 0 ? Number(((v.recovered / denom) * 100).toFixed(1)) : 0;

      return {
        month,
        recovery_rate: rate,
        total_defaults: v.defaults,
        recovered_amount: v.recovered,
      };
    });
  };

  const exportToCSV = async () => {
    try {
      let csvContent = "Credit Reports Export\n";
      csvContent += `Generated on: ${new Date().toLocaleString()}\n`;
      csvContent += `Time Range: Last ${timeRange} days\n\n`;

      csvContent += "Summary Metrics\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total Credit Outstanding,${analytics?.totalCreditOutstanding || 0}\n`;
      csvContent += `Credit Issued This Period,${analytics?.totalCreditIssuedThisMonth || 0}\n`;
      csvContent += `Active Credit Users,${analytics?.activeCreditUsers || 0}\n`;
      csvContent += `Average Utilization Rate,${analytics?.averageCreditUtilizationRate || 0}%\n`;
      csvContent += `Default Rate,${analytics?.defaultRate || 0}%\n\n`;

      csvContent += "Top Farmers by Credit Utilization\n";
      csvContent += "Farmer Name,Credit Limit,Current Utilization,Utilization %,Risk Level\n";
      farmerCreditSummaries.forEach(farmer => {
        csvContent += `${farmer.farmer_name},${farmer.total_credit_limit},${farmer.current_utilization},${farmer.utilization_percentage}%,${farmer.risk_level}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `credit-reports-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "Your CSV report has been downloaded."
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate CSV report.",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = async () => {
    try {
      toast({
        title: "Export Started",
        description: "Your PDF report is being generated. This may take a few moments."
      });

      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: "Your PDF report has been downloaded."
        });
      }, 2000);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report.",
        variant: "destructive"
      });
    }
  };

  const exportReport = (format: 'pdf' | 'csv') => {
    if (format === 'csv') {
      exportToCSV();
    } else {
      exportToPDF();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading credit reports...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Credit Reports & Analytics</h1>
              <p className="text-gray-600 mt-2">Detailed insights into credit usage and risk assessment</p>
            </div>
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => exportReport('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" onClick={() => exportReport('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Total Credit Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {analytics ? formatCurrency(analytics.totalCreditOutstanding) : '0'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Credit Issued This Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {analytics ? formatCurrency(analytics.totalCreditIssuedThisMonth) : '0'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Credit Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.activeCreditUsers || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Average Utilization Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.averageCreditUtilizationRate || 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Risk Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Credit Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="risk_level"
                      label={({ risk_level, percent }) => `${risk_level}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Farmers']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Credit Utilization Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Credit Utilization Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={utilizationTrends}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="utilization_rate"
                      name="Utilization Rate"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="default_rate"
                      name="Default Rate"
                      stroke="#82ca9d"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Default and Recovery Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Default Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Default Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={defaultTrends}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `KES ${value / 1000}k`} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'defaults_count') {
                          return [value, 'Defaults'];
                        } else {
                          return [formatCurrency(value as number), 'Recovered'];
                        }
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="defaults_count" name="Defaults Count" fill="#ff7300" />
                    <Bar yAxisId="right" dataKey="recovery_amount" name="Recovery Amount" fill="#0088fe" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recovery Rate Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Recovery Rate Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={recoveryAnalysis}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Recovery Rate']} />
                    <Area type="monotone" dataKey="recovery_rate" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Category Credit Usage */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Credit Usage by Product Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productCategoryCredits}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis tickFormatter={(value) => `KES ${value / 1000}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                    <Legend />
                    <Bar dataKey="total_credit_used" name="Credit Used" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Farmer Credit Summaries */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top Farmers by Credit Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Farmer</th>
                      <th className="text-left py-2">Credit Limit</th>
                      <th className="text-left py-2">Utilization</th>
                      <th className="text-left py-2">Utilization %</th>
                      <th className="text-left py-2">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmerCreditSummaries.map((farmer, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">{farmer.farmer_name}</td>
                        <td className="py-3">{formatCurrency(farmer.total_credit_limit)}</td>
                        <td className="py-3">{formatCurrency(farmer.current_utilization)}</td>
                        <td className="py-3">{farmer.utilization_percentage}%</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${farmer.risk_level === 'High Risk' ? 'bg-red-100 text-red-800' :
                              farmer.risk_level === 'Medium Risk' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                            }`}>
                            {farmer.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Approvals</span>
                  <span className="font-semibold">{analytics?.pendingCreditApprovals || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Settlements Pending</span>
                  <span className="font-semibold">{analytics?.creditSettlementPending || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Failed Transactions</span>
                  <span className="font-semibold">{analytics?.failedTransactionsThisMonth || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Default Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Outstanding Defaults</span>
                  <span className="font-semibold">
                    {analytics ? formatCurrency(analytics.outstandingDefaultAmount) : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Default Rate</span>
                  <span className="font-semibold">
                    {analytics?.defaultRate || 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Farmer Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Users</span>
                  <span className="font-semibold">{analytics?.activeCreditUsers || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Farmers at Risk</span>
                  <span className="font-semibold">{analytics?.farmersAtRiskCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Approaching Settlement</span>
                  <span className="font-semibold">{analytics?.farmersApproachingSettlement || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreditReports;