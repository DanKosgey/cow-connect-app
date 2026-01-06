import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  Users,
  CreditCard,
  Milk,
  Clock,
  ArrowDownRight,
  AlertTriangle,
  Download,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CreditKPIs {
  totalOutstanding: number;
  creditIssuedPeriod: number;
  activeUsers: number;
  avgUtilization: number;
  totalPendingMilkValue: number;
  coverageRatio: number;
}

interface FarmerCreditStatus {
  farmer_id: string;
  farmer_name: string;
  credit_limit: number;
  credit_used: number;
  pending_milk_value: number;
  coverage_percent: number;
  status: 'Fully Covered' | 'Partially Covered' | 'Uncovered';
}

interface CreditTrend {
  date: string;
  issued: number;
  repaid: number;
}

interface ProductCategory {
  category: string;
  amount: number;
}

const CreditReports = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [kpis, setKpis] = useState<CreditKPIs>({
    totalOutstanding: 0,
    creditIssuedPeriod: 0,
    activeUsers: 0,
    avgUtilization: 0,
    totalPendingMilkValue: 0,
    coverageRatio: 0
  });
  const [farmersList, setFarmersList] = useState<FarmerCreditStatus[]>([]);
  const [creditTrends, setCreditTrends] = useState<CreditTrend[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [operationalStats, setOperationalStats] = useState({
    pendingApprovals: 0,
    settlementsPending: 0,
    failedTransactions: 0,
    farmersBelowCoverage: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateIso = startDate.toISOString();

      // 1. Fetch Credit Transactions (Trends & Period Totals)
      const { data: transactions, error: txError } = await supabase
        .from('credit_transactions')
        .select('*')
        .gte('created_at', startDateIso)
        .order('created_at', { ascending: true });

      if (txError) throw txError;

      // 2. Fetch Farmer Profiles & Limits
      const { data: profiles, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select(`
          farmer_id,
          max_credit_amount,
          total_credit_used,
          current_credit_balance,
          farmers!farmer_credit_profiles_farmer_id_fkey (full_name)
        `)
        .eq('is_frozen', false);

      if (profileError) throw profileError;

      // 3. Fetch Pending Milk Collections (Security)
      const { data: collections, error: colError } = await supabase
        .from('collections')
        .select('farmer_id, total_amount')
        .eq('approved_for_company', true)
        .neq('status', 'Paid');

      if (colError) throw colError;

      // 4. Fetch Operational Counts
      const { count: pendingApprovals } = await supabase
        .from('credit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: pendingSettlements } = await supabase
        .from('credit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('agrovet_settlement_status', 'pending')
        .eq('status', 'approved');

      // --- Processing Data ---

      // A. Aggregate Collections by Farmer
      const pendingMilkMap = new Map<string, number>();
      let totalPendingMilk = 0;
      (collections || []).forEach((c: any) => {
        const amt = c.total_amount || 0;
        const current = pendingMilkMap.get(c.farmer_id) || 0;
        pendingMilkMap.set(c.farmer_id, current + amt);
        totalPendingMilk += amt;
      });

      // B. Process Farmer List & Coverage
      let totalLimit = 0;
      let totalUsed = 0;
      let farmersBelowCoverageCount = 0;

      const processedFarmers: FarmerCreditStatus[] = (profiles || []).map((p: any) => {
        const used = p.total_credit_used || 0;
        const limit = p.max_credit_amount || 0;
        const pending = pendingMilkMap.get(p.farmer_id) || 0;

        totalUsed += used;
        totalLimit += limit;

        const coverage = used > 0 ? (pending / used) * 100 : 100;

        let status: 'Fully Covered' | 'Partially Covered' | 'Uncovered' = 'Fully Covered';
        if (used > 0) {
          if (pending === 0) status = 'Uncovered';
          else if (pending < used) status = 'Partially Covered';
        }

        if (status !== 'Fully Covered' && used > 0) farmersBelowCoverageCount++;

        return {
          farmer_id: p.farmer_id,
          farmer_name: p.farmers?.full_name || 'Unknown',
          credit_limit: limit,
          credit_used: used,
          pending_milk_value: pending,
          coverage_percent: coverage,
          status
        };
      }).sort((a, b) => b.credit_used - a.credit_used); // Sort by credit used descending

      // C. Process Trends
      const trendsMap = new Map<string, { used: number, repaid: number }>();
      let periodIssued = 0;
      const activeUsersSet = new Set<string>();

      (transactions || []).forEach((tx: any) => {
        const date = new Date(tx.created_at).toLocaleDateString();
        if (!trendsMap.has(date)) trendsMap.set(date, { used: 0, repaid: 0 });

        const entry = trendsMap.get(date)!;
        const amt = tx.amount || 0;

        if (tx.transaction_type === 'credit_used' || tx.transaction_type === 'credit_granted') {
          // Assuming credit_used is when they buy, credit_granted might be limit increase? 
          // Usually 'credit_used' is the transaction.
          entry.used += amt;
          periodIssued += amt;
          activeUsersSet.add(tx.farmer_id);
        } else if (tx.transaction_type === 'credit_repaid') {
          entry.repaid += amt;
        }
      });

      const processedTrends = Array.from(trendsMap.entries()).map(([date, val]) => ({
        date,
        issued: val.used,
        repaid: val.repaid
      }));

      // D. Product Categories
      // Attempt to fetch if table exists, otherwise mock or use simple logic
      // Assuming 'agrovet_inventory' stores categories.
      // Trying simpler approach: Fetch agrovet_purchases which link inventory
      let processedCategories: ProductCategory[] = [];
      try {
        const { data: purchases } = await supabase
          .from('agrovet_purchases')
          .select('total_amount, agrovet_inventory!inner(category)')
          .gte('created_at', startDateIso);

        const categoryMap = new Map<string, number>();
        (purchases || []).forEach((p: any) => {
          const cat = p.agrovet_inventory?.category || 'Uncategorized';
          const amt = p.total_amount || 0;
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + amt);
        });

        processedCategories = Array.from(categoryMap.entries()).map(([category, amount]) => ({
          category,
          amount
        })).sort((a, b) => b.amount - a.amount);
      } catch (e) {
        // Fallback if relation fails
        console.warn("Could not fetch categories", e);
      }


      // Set States
      setKpis({
        totalOutstanding: totalUsed,
        creditIssuedPeriod: periodIssued,
        activeUsers: activeUsersSet.size,
        avgUtilization: totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0,
        totalPendingMilkValue: totalPendingMilk,
        coverageRatio: totalUsed > 0 ? (totalPendingMilk / totalUsed) * 100 : 100
      });

      setFarmersList(processedFarmers);
      setCreditTrends(processedTrends);
      setProductCategories(processedCategories);
      setOperationalStats({
        pendingApprovals: pendingApprovals || 0,
        settlementsPending: pendingSettlements || 0,
        failedTransactions: 0, // Placeholder
        farmersBelowCoverage: farmersBelowCoverageCount
      });

    } catch (err) {
      console.error("Error fetching report data:", err);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCoverageColor = (status: string) => {
    switch (status) {
      case 'Fully Covered': return 'text-green-600 bg-green-50 border-green-200';
      case 'Partially Covered': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Uncovered': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading && farmersList.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Credit Reports & Analytics</h1>
            <p className="text-slate-500 mt-1">Insights into credit usage vs milk collection coverage</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 bg-white">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-600 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Credit Outstanding</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(kpis.totalOutstanding)}</h3>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">{kpis.activeUsers}</span> farmers with active credit
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Milk Security Value</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(kpis.totalPendingMilkValue)}</h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Milk className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Badge variant="outline" className={kpis.coverageRatio >= 100 ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50"}>
                  {kpis.coverageRatio.toFixed(0)}% Coverage
                </Badge>
                <span className="text-slate-500">of outstanding credit</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Issued This Period</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(kpis.creditIssuedPeriod)}</h3>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">
                New credit granted
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-600 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">Avg Utilization</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{kpis.avgUtilization.toFixed(1)}%</h3>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">
                Of assigned limits
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Credit Trend (Issued vs Repaid)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={creditTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `K${val / 1000}k`} />
                    <Tooltip formatter={(val) => formatCurrency(val as number)} />
                    <Legend />
                    <Bar dataKey="issued" name="Credit Issued" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="repaid" name="Repayment" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Top Product Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productCategories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="category" type="category" width={100} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val) => formatCurrency(val as number)} />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Farmers Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b">
            <div className="flex justify-between items-center">
              <CardTitle>Top Farmers by Credit Utilization</CardTitle>
              <Badge variant="outline" className="font-normal">
                {farmersList.filter(f => f.credit_used > 0).length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold">Farmer</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Credit Used</TableHead>
                  <TableHead>Pending Milk Value</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmersList.slice(0, 10).map((farmer) => (
                  <TableRow key={farmer.farmer_id}>
                    <TableCell className="font-medium text-slate-900">{farmer.farmer_name}</TableCell>
                    <TableCell>{formatCurrency(farmer.credit_limit)}</TableCell>
                    <TableCell className="font-bold text-slate-700">{formatCurrency(farmer.credit_used)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(farmer.pending_milk_value)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${farmer.coverage_percent >= 100 ? 'bg-green-500' : farmer.coverage_percent > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(farmer.coverage_percent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{farmer.coverage_percent.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCoverageColor(farmer.status)}>
                        {farmer.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Operational Footer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border shadow-sm">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pending Approvals</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{operationalStats.pendingApprovals}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-100" />
            </CardContent>
          </Card>
          <Card className="bg-white border shadow-sm">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Settlements Pending</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{operationalStats.settlementsPending}</p>
              </div>
              <ArrowDownRight className="w-8 h-8 text-blue-100" />
            </CardContent>
          </Card>
          <Card className="bg-white border shadow-sm">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Below Coverage</p>
                <p className="text-xl font-bold text-red-600 mt-1">{operationalStats.farmersBelowCoverage}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-100" />
            </CardContent>
          </Card>
          <Card className="bg-white border shadow-sm">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Today</p>
                <p className="text-xl font-bold text-green-600 mt-1">{kpis.activeUsers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-100" />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default CreditReports;