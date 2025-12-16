import React from 'react';
import { 
  Users, 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  PieChart,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';

// Add recharts imports for the dual-axis chart
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface CollectorData {
  id: string;
  name: string;
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  totalPenalties: number;
  pendingPayments: number;
  paidPayments: number;
  performanceScore: number;
  lastCollectionDate?: string;
  totalVariance?: number;
  positiveVariances?: number;
  negativeVariances?: number;
  avgVariancePercentage?: number;
  pendingPenalties?: number;
  penaltyStatus?: 'pending' | 'paid';
}

interface AnalyticsTabProps {
  collectors: CollectorData[];
  stats: {
    totalCollectors: number;
    totalPendingAmount: number;
    totalPaidAmount: number;
    totalPenalties: number;
    avgCollectionsPerCollector: number;
  };
  totalGrossEarnings: number;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  collectors,
  stats,
  totalGrossEarnings
}) => {
  // Prepare data for the charts
  const chartData = collectors.map(collector => ({
    period: collector.name || 'Unknown Collector',
    variance: collector.totalPenalties, // Using penalties as a proxy for variance
    earnings: collector.totalEarnings - collector.totalPenalties,
    collector: collector.name || 'Unknown Collector',
    collections: collector.totalCollections,
    liters: collector.totalLiters,
    performance: collector.performanceScore
  }));

  // Prepare data for payment status distribution chart
  const statusDistributionData = [
    { name: 'Pending', value: collectors.filter(c => c.pendingPayments > 0).length },
    { name: 'Paid', value: collectors.filter(c => c.paidPayments > 0 && c.pendingPayments === 0).length }
  ];

  // Prepare data for top collectors chart
  const topCollectorsData = collectors
    .map(collector => ({
      name: collector.name || 'Unknown Collector',
      earnings: collector.totalEarnings - collector.totalPenalties,
      collections: collector.totalCollections,
      liters: collector.totalLiters,
      performance: collector.performanceScore
    }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 10);

  // Prepare data for performance score distribution
  const performanceDistributionData = [
    { name: 'Excellent (80%+)', value: collectors.filter(c => c.performanceScore >= 80).length },
    { name: 'Good (60-79%)', value: collectors.filter(c => c.performanceScore >= 60 && c.performanceScore < 80).length },
    { name: 'Poor (<60%)', value: collectors.filter(c => c.performanceScore < 60).length }
  ];

  // Calculate additional metrics
  const avgCollectionsPerCollector = stats.totalCollectors > 0 ? 
    Math.round((collectors.reduce((sum, c) => sum + c.totalCollections, 0) / stats.totalCollectors)) : 0;
  
  const avgLitersPerCollector = stats.totalCollectors > 0 ? 
    Math.round(collectors.reduce((sum, c) => sum + c.totalLiters, 0) / stats.totalCollectors) : 0;
  
  const bestPerformanceScore = collectors.length > 0 ? 
    Math.max(...collectors.map(c => c.performanceScore)) : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Collectors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collectors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalCollectors}
            </div>
            <p className="text-xs text-muted-foreground">Active collectors</p>
          </CardContent>
        </Card>

        {/* Avg Collections per Collector */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Collections</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgCollectionsPerCollector}
            </div>
            <p className="text-xs text-muted-foreground">Per collector</p>
          </CardContent>
        </Card>

        {/* Avg Liters per Collector */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Liters</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgLitersPerCollector.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Per collector</p>
          </CardContent>
        </Card>

        {/* Best Performance Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bestPerformanceScore.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Top collector score</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Variance vs Earnings Chart - Dual Axis */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Collector Performance Overview
            </CardTitle>
            <CardDescription>
              Comparison of penalties and net earnings by collector
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="period" 
                    angle={-45} 
                    textAnchor="end" 
                    height={60}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke="#ef4444" 
                    tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#10b981" 
                    tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'variance') {
                        return [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Penalties'];
                      } else if (name === 'earnings') {
                        return [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net Earnings'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Collector: ${label}`}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="variance" 
                    name="Penalties" 
                    fill="#ef4444" 
                    opacity={0.7}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="earnings" 
                    name="Net Earnings" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    strokeLinecap="round"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available for chart
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Collectors by Net Earnings Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Collectors by Net Earnings
            </CardTitle>
            <CardDescription>
              Highest earning collectors after penalty deductions
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {topCollectorsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={topCollectorsData}
                  layout="vertical"
                  margin={{
                    top: 20,
                    right: 30,
                    left: 100,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    scale="band" 
                    width={90}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'earnings') {
                        return [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net Earnings'];
                      }
                      return [value, name];
                    }}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  <Bar 
                    dataKey="earnings" 
                    name="Net Earnings" 
                    fill="#8b5cf6" 
                    barSize={20}
                    radius={[0, 4, 4, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Performance Score Distribution
            </CardTitle>
            <CardDescription>
              Distribution of collectors by performance rating
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {performanceDistributionData.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={performanceDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {performanceDistributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.name.includes('Excellent') ? '#10b981' : 
                          entry.name.includes('Good') ? '#f59e0b' : '#ef4444'
                        } 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [value, 'Collectors']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                  />
                  <Legend 
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Penalties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Total Penalties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center text-red-600">
              {formatCurrency(stats.totalPenalties)}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Deducted from gross earnings
            </p>
          </CardContent>
        </Card>

        {/* Avg Earnings per Collector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Avg Net Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center">
              {formatCurrency(stats.totalCollectors > 0 ? (totalGrossEarnings - stats.totalPenalties) / stats.totalCollectors : 0)}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Average net earnings per collector
            </p>
          </CardContent>
        </Card>

        {/* Collection Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Collection Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center">
              {stats.totalCollectors > 0 && (stats.totalPendingAmount + stats.totalPaidAmount) > 0 ? 
                ((stats.totalPaidAmount / (stats.totalPendingAmount + stats.totalPaidAmount)) * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Percentage of payments processed
            </p>
          </CardContent>
        </Card>

        {/* Top Performing Collector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-center truncate">
              {collectors.length > 0 
                ? [...collectors]
                    .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].name 
                : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              {collectors.length > 0 
                ? formatCurrency(Math.max(0, [...collectors]
                    .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].totalEarnings - 
                  [...collectors]
                    .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].totalPenalties))
                : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collector Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collector Comparison
          </CardTitle>
          <CardDescription>
            Detailed performance metrics for all collectors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Collector</th>
                  <th className="text-right py-2">Collections</th>
                  <th className="text-right py-2">Liters</th>
                  <th className="text-right py-2">Gross Earnings</th>
                  <th className="text-right py-2">Penalties</th>
                  <th className="text-right py-2">Net Earnings</th>
                  <th className="text-right py-2">Performance</th>
                </tr>
              </thead>
              <tbody>
                {collectors.map((collector) => (
                  <tr key={collector.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 font-medium max-w-[150px] truncate">{collector.name}</td>
                    <td className="py-2 text-right">{collector.totalCollections}</td>
                    <td className="py-2 text-right">{collector.totalLiters?.toFixed(0)}</td>
                    <td className="py-2 text-right">{formatCurrency(collector.totalEarnings)}</td>
                    <td className="py-2 text-right text-red-600">{formatCurrency(collector.totalPenalties)}</td>
                    <td className="py-2 text-right font-bold">
                      {formatCurrency(Math.max(0, collector.totalEarnings - collector.totalPenalties))}
                    </td>
                    <td className="py-2 text-right">
                      <Badge 
                        variant={collector.performanceScore >= 80 ? 'default' : 
                               collector.performanceScore >= 60 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {collector.performanceScore.toFixed(0)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};