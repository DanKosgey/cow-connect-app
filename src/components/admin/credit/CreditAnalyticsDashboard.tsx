import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    CreditCard,
    AlertTriangle,
    CheckCircle,
    Clock,
    BarChart3,
    PieChart,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Target,
    Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadialBarChart,
    RadialBar,
    ComposedChart
} from 'recharts';

interface AnalyticsData {
    totalCreditIssued: number;
    totalCreditUsed: number;
    totalCreditAvailable: number;
    activeFarmers: number;
    totalFarmers: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    averageCreditUtilization: number;
    creditRepaymentRate: number;
    topFarmers: Array<{ name: string; creditUsed: number; utilization: number }>;
    creditTrends: Array<{ month: string; issued: number; used: number; repaid: number }>;
    categoryDistribution: Array<{ category: string; amount: number; count: number }>;
    riskDistribution: Array<{ risk: string; count: number; amount: number }>;
    dailyActivity: Array<{ date: string; requests: number; approvals: number; disbursements: number }>;
    // Growth metrics
    creditIssuedGrowth: number;
    creditAvailableGrowth: number;
    activeFarmersGrowth: number;
    utilizationGrowth: number;
}


const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    indigo: '#6366F1',
    teal: '#14B8A6',
};

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.pink];

export const CreditAnalyticsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        totalCreditIssued: 0,
        totalCreditUsed: 0,
        totalCreditAvailable: 0,
        activeFarmers: 0,
        totalFarmers: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        averageCreditUtilization: 0,
        creditRepaymentRate: 0,
        topFarmers: [],
        creditTrends: [],
        categoryDistribution: [],
        riskDistribution: [],
        dailyActivity: [],
        creditIssuedGrowth: 0,
        creditAvailableGrowth: 0,
        activeFarmersGrowth: 0,
        utilizationGrowth: 0
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            // Fetch credit profiles
            const { data: profiles } = await supabase
                .from('farmer_credit_profiles')
                .select('*');

            // Fetch credit requests
            const { data: requests } = await supabase
                .from('credit_requests')
                .select('*, farmers(profiles(full_name))');

            // Fetch credit transactions
            const { data: transactions } = await supabase
                .from('credit_transactions')
                .select('*');

            // Fetch agrovet purchases
            const { data: purchases } = await supabase
                .from('agrovet_purchases')
                .select('*, agrovet_inventory(category)');

            // Calculate metrics
            const totalCreditIssued = profiles?.reduce((sum, p) => sum + (p.max_credit_amount || 0), 0) || 0;
            const totalCreditUsed = profiles?.reduce((sum, p) => sum + (p.total_credit_used || 0), 0) || 0;
            const totalCreditAvailable = profiles?.reduce((sum, p) => sum + (p.current_credit_balance || 0), 0) || 0;
            const activeFarmers = profiles?.filter(p => !p.is_frozen && p.current_credit_balance > 0).length || 0;
            const totalFarmers = profiles?.length || 0;

            const pendingRequests = requests?.filter(r => r.status === 'pending').length || 0;
            const approvedRequests = requests?.filter(r => r.status === 'approved').length || 0;
            const rejectedRequests = requests?.filter(r => r.status === 'rejected').length || 0;

            const averageCreditUtilization = totalFarmers > 0
                ? ((totalCreditUsed / totalCreditIssued) * 100) || 0
                : 0;

            // Calculate actual repayment rate from transactions
            const totalRepaid = transactions?.filter(t => t.transaction_type === 'credit_repaid')
                .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
            const creditRepaymentRate = totalCreditUsed > 0
                ? ((totalRepaid / totalCreditUsed) * 100)
                : 0;

            // Top farmers by credit usage - fetch actual names and filter those with usage
            const topFarmerProfiles = profiles
                ?.filter(p => (p.total_credit_used || 0) > 0)
                .map(p => ({
                    farmer_id: p.farmer_id,
                    creditUsed: p.total_credit_used || 0,
                    utilization: p.max_credit_amount > 0
                        ? ((p.total_credit_used / p.max_credit_amount) * 100)
                        : 0
                }))
                .sort((a, b) => b.creditUsed - a.creditUsed)
                .slice(0, 5) || [];

            // Fetch farmer names
            let topFarmers: Array<{ name: string; creditUsed: number; utilization: number }> = [];
            if (topFarmerProfiles.length > 0) {
                const topFarmerIds = topFarmerProfiles.map(f => f.farmer_id);
                const { data: farmerDetails } = await supabase
                    .from('farmers')
                    .select('id, profiles(full_name)')
                    .in('id', topFarmerIds);
                topFarmers = topFarmerProfiles.map(fp => {
                    const farmerDetail = farmerDetails?.find((fd: any) => fd.id === fp.farmer_id);
                    return {
                        name: farmerDetail?.profiles?.full_name || `Farmer #${fp.farmer_id.substring(0, 8)}`,
                        creditUsed: fp.creditUsed,
                        utilization: fp.utilization
                    };
                });
            }

            // Credit trends (last 6 months)
            const creditTrends = generateCreditTrends(transactions || []);

            // Category distribution
            const categoryDistribution = generateCategoryDistribution(purchases || []);

            // Risk distribution
            const riskDistribution = generateRiskDistribution(profiles || []);

            // Daily activity (last 7 days)
            const dailyActivity = generateDailyActivity(requests || [], purchases || []);

            // Calculate growth percentages (current month vs previous month)
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

            // Credit issued growth
            const currentMonthIssued = transactions?.filter(t => {
                const tDate = new Date(t.created_at);
                return t.transaction_type === 'credit_granted' && tDate >= currentMonthStart;
            }).reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

            const lastMonthIssued = transactions?.filter(t => {
                const tDate = new Date(t.created_at);
                return t.transaction_type === 'credit_granted' && tDate >= lastMonthStart && tDate <= lastMonthEnd;
            }).reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

            const creditIssuedGrowth = lastMonthIssued > 0
                ? ((currentMonthIssued - lastMonthIssued) / lastMonthIssued) * 100
                : 0;

            // Credit available growth (compare total available now vs 30 days ago)
            const creditAvailableGrowth = 0; // Would need historical snapshots to calculate accurately

            // Active farmers growth (compare current vs last month)
            const activeFarmersGrowth = 0; // Would need historical snapshots

            // Utilization growth
            const utilizationGrowth = 0; // Would need historical snapshots

            setAnalytics({
                totalCreditIssued,
                totalCreditUsed,
                totalCreditAvailable,
                activeFarmers,
                totalFarmers,
                pendingRequests,
                approvedRequests,
                rejectedRequests,
                averageCreditUtilization,
                creditRepaymentRate,
                topFarmers,
                creditTrends,
                categoryDistribution,
                riskDistribution,
                dailyActivity,
                creditIssuedGrowth,
                creditAvailableGrowth,
                activeFarmersGrowth,
                utilizationGrowth
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateCreditTrends = (transactions: any[]) => {
        // Get last 6 months of actual transaction data
        const now = new Date();
        const months = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthTransactions = transactions.filter(t => {
                const tDate = new Date(t.created_at);
                return tDate >= monthStart && tDate <= monthEnd;
            });

            const issued = monthTransactions
                .filter(t => t.transaction_type === 'credit_granted')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const used = monthTransactions
                .filter(t => t.transaction_type === 'credit_used')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const repaid = monthTransactions
                .filter(t => t.transaction_type === 'credit_repaid')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            months.push({
                month: monthName,
                issued,
                used,
                repaid
            });
        }

        return months;
    };

    const generateCategoryDistribution = (purchases: any[]) => {
        // Group purchases by actual category from agrovet_inventory
        const categoryMap = new Map<string, { amount: number; count: number }>();

        purchases.forEach(purchase => {
            const category = purchase.agrovet_inventory?.category || 'Other';
            const existing = categoryMap.get(category) || { amount: 0, count: 0 };
            categoryMap.set(category, {
                amount: existing.amount + (purchase.total_amount || 0),
                count: existing.count + 1
            });
        });

        // Convert to array and sort by amount
        return Array.from(categoryMap.entries())
            .map(([category, data]) => ({
                category,
                amount: data.amount,
                count: data.count
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5); // Top 5 categories
    };

    const generateRiskDistribution = (profiles: any[]) => {
        const lowRisk = profiles.filter(p => {
            const util = p.max_credit_amount > 0 ? (p.total_credit_used / p.max_credit_amount) * 100 : 0;
            return util < 50;
        });

        const mediumRisk = profiles.filter(p => {
            const util = p.max_credit_amount > 0 ? (p.total_credit_used / p.max_credit_amount) * 100 : 0;
            return util >= 50 && util < 80;
        });

        const highRisk = profiles.filter(p => {
            const util = p.max_credit_amount > 0 ? (p.total_credit_used / p.max_credit_amount) * 100 : 0;
            return util >= 80;
        });

        return [
            {
                risk: 'Low Risk',
                count: lowRisk.length,
                amount: lowRisk.reduce((sum, p) => sum + (p.total_credit_used || 0), 0)
            },
            {
                risk: 'Medium Risk',
                count: mediumRisk.length,
                amount: mediumRisk.reduce((sum, p) => sum + (p.total_credit_used || 0), 0)
            },
            {
                risk: 'High Risk',
                count: highRisk.length,
                amount: highRisk.reduce((sum, p) => sum + (p.total_credit_used || 0), 0)
            }
        ];
    };

    const generateDailyActivity = (requests: any[], purchases: any[]) => {
        // Get last 7 days of actual activity
        const days = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayName = date.toLocaleString('default', { weekday: 'short' });

            const dayRequests = requests.filter(r => {
                const rDate = new Date(r.created_at);
                return rDate >= date && rDate < nextDate;
            }).length;

            const dayApprovals = requests.filter(r => {
                const rDate = new Date(r.processed_at || r.created_at);
                return r.status === 'approved' && rDate >= date && rDate < nextDate;
            }).length;

            const dayDisbursements = purchases.filter(p => {
                const pDate = new Date(p.created_at);
                return p.payment_method === 'credit' && pDate >= date && pDate < nextDate;
            }).length;

            days.push({
                date: dayName,
                requests: dayRequests,
                approvals: dayApprovals,
                disbursements: dayDisbursements
            });
        }

        return days;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const utilizationData = [
        {
            name: 'Utilization',
            value: analytics.averageCreditUtilization,
            fill: analytics.averageCreditUtilization > 80 ? COLORS.danger :
                analytics.averageCreditUtilization > 60 ? COLORS.warning : COLORS.success
        }
    ];

    return (
        <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Total Credit Issued</p>
                                <h3 className="text-3xl font-bold mt-2">{formatCurrency(analytics.totalCreditIssued)}</h3>
                                <div className="flex items-center mt-2 text-blue-100">
                                    <ArrowUpRight className="w-4 h-4 mr-1" />
                                    <span className="text-sm">+12.5% from last month</span>
                                </div>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                                <DollarSign className="w-8 h-8" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-medium">Credit Available</p>
                                <h3 className="text-3xl font-bold mt-2">{formatCurrency(analytics.totalCreditAvailable)}</h3>
                                <div className="flex items-center mt-2 text-green-100">
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    <span className="text-sm">{((analytics.totalCreditAvailable / analytics.totalCreditIssued) * 100).toFixed(1)}% available</span>
                                </div>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                                <Wallet className="w-8 h-8" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Active Farmers</p>
                                <h3 className="text-3xl font-bold mt-2">{analytics.activeFarmers}</h3>
                                <div className="flex items-center mt-2 text-purple-100">
                                    <Users className="w-4 h-4 mr-1" />
                                    <span className="text-sm">{analytics.totalFarmers} total farmers</span>
                                </div>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                                <Users className="w-8 h-8" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">Avg. Utilization</p>
                                <h3 className="text-3xl font-bold mt-2">{analytics.averageCreditUtilization.toFixed(1)}%</h3>
                                <div className="flex items-center mt-2 text-orange-100">
                                    <Activity className="w-4 h-4 mr-1" />
                                    <span className="text-sm">
                                        {analytics.averageCreditUtilization > 70 ? 'High usage' : 'Healthy'}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full">
                                <Target className="w-8 h-8" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Request Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Pending Requests</p>
                                <h3 className="text-2xl font-bold mt-2 text-yellow-600">{analytics.pendingRequests}</h3>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Approved Requests</p>
                                <h3 className="text-2xl font-bold mt-2 text-green-600">{analytics.approvedRequests}</h3>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Rejected Requests</p>
                                <h3 className="text-2xl font-bold mt-2 text-red-600">{analytics.rejectedRequests}</h3>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Credit Trends */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Credit Trends (6 Months)
                        </CardTitle>
                        <CardDescription>Monthly credit issued, used, and repaid</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analytics.creditTrends}>
                                <defs>
                                    <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRepaid" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                <Legend />
                                <Area type="monotone" dataKey="issued" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorIssued)" name="Issued" />
                                <Area type="monotone" dataKey="used" stroke={COLORS.success} fillOpacity={1} fill="url(#colorUsed)" name="Used" />
                                <Area type="monotone" dataKey="repaid" stroke={COLORS.purple} fillOpacity={1} fill="url(#colorRepaid)" name="Repaid" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Credit Utilization Gauge */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Credit Utilization
                        </CardTitle>
                        <CardDescription>Overall credit usage percentage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <RadialBarChart
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="100%"
                                data={utilizationData}
                                startAngle={180}
                                endAngle={0}
                            >
                                <RadialBar
                                    minAngle={15}
                                    background
                                    clockWise
                                    dataKey="value"
                                    cornerRadius={10}
                                />
                                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold">
                                    {analytics.averageCreditUtilization.toFixed(1)}%
                                </text>
                                <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="text-sm text-gray-500">
                                    Utilization Rate
                                </text>
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 flex justify-around text-center">
                            <div>
                                <p className="text-2xl font-bold text-green-600">{analytics.creditRepaymentRate}%</p>
                                <p className="text-sm text-gray-600">Repayment Rate</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.totalCreditUsed)}</p>
                                <p className="text-sm text-gray-600">Total Used</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            Credit by Category
                        </CardTitle>
                        <CardDescription>Distribution of credit across product categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsPieChart>
                                <Pie
                                    data={analytics.categoryDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="amount"
                                >
                                    {analytics.categoryDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Risk Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Risk Distribution
                        </CardTitle>
                        <CardDescription>Farmers categorized by credit risk level</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.riskDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="risk" />
                                <YAxis yAxisId="left" orientation="left" stroke={COLORS.primary} />
                                <YAxis yAxisId="right" orientation="right" stroke={COLORS.success} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="left" dataKey="count" fill={COLORS.primary} name="Farmers" radius={[8, 8, 0, 0]} />
                                <Bar yAxisId="right" dataKey="amount" fill={COLORS.success} name="Amount" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Daily Activity (Last 7 Days)
                    </CardTitle>
                    <CardDescription>Credit requests, approvals, and disbursements</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={analytics.dailyActivity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="requests" fill={COLORS.primary} name="Requests" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="approvals" fill={COLORS.success} name="Approvals" radius={[8, 8, 0, 0]} />
                            <Line type="monotone" dataKey="disbursements" stroke={COLORS.purple} strokeWidth={3} name="Disbursements" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Top Farmers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Top 5 Farmers by Credit Usage
                    </CardTitle>
                    <CardDescription>Farmers with highest credit utilization</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics.topFarmers.map((farmer, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                                        index === 1 ? 'bg-gray-400' :
                                            index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium">Farmer #{farmer.name}</p>
                                        <p className="text-sm text-gray-600">Utilization: {farmer.utilization.toFixed(1)}%</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{formatCurrency(farmer.creditUsed)}</p>
                                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                                        <div
                                            className={`h-2 rounded-full ${farmer.utilization > 80 ? 'bg-red-500' :
                                                farmer.utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${Math.min(farmer.utilization, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreditAnalyticsDashboard;

