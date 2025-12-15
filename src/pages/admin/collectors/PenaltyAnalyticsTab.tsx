import React from 'react';
import { 
  AlertTriangle, 
  BarChart3, 
  PieChart, 
  Clock, 
  TrendingUp,
  FileBarChart,
  FileText
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

interface PenaltyAnalyticsData {
  overallPenaltyStats: {
    totalPenalties: number;
    avgPenaltyPerCollector: number;
    highestPenaltyCollector: string;
    highestPenaltyAmount: number;
  };
  collectorPenaltyData: CollectorPenaltyAnalytics[];
}

interface CollectorPenaltyAnalytics {
  collectorId: string;
  collectorName: string;
  totalPenalties: number;
  pendingPenalties: number;
  paidPenalties: number;
  penaltyBreakdown: {
    positiveVariancePenalties: number;
    negativeVariancePenalties: number;
    totalPositiveVariances: number;
    totalNegativeVariances: number;
  };
  recentPenalties: any[];
  penaltyTrend: {
    date: string;
    penalties: number;
  }[];
}

interface PenaltyAnalyticsTabProps {
  penaltyAnalytics: PenaltyAnalyticsData | null;
  penaltyAnalyticsLoading: boolean;
}

export const PenaltyAnalyticsTab: React.FC<PenaltyAnalyticsTabProps> = ({
  penaltyAnalytics,
  penaltyAnalyticsLoading
}) => {
  if (penaltyAnalyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!penaltyAnalytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No penalty analytics data available</p>
      </div>
    );
  }

  // Prepare data for charts
  const penaltyBreakdownData = [
    { 
      name: 'Positive Variance', 
      value: penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector > 0 ? 
        (penaltyAnalytics.collectorPenaltyData.reduce((sum, c) => sum + c.penaltyBreakdown.positiveVariancePenalties, 0) / penaltyAnalytics.collectorPenaltyData.length) : 0 
    },
    { 
      name: 'Negative Variance', 
      value: penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector > 0 ? 
        (penaltyAnalytics.collectorPenaltyData.reduce((sum, c) => sum + c.penaltyBreakdown.negativeVariancePenalties, 0) / penaltyAnalytics.collectorPenaltyData.length) : 0 
    }
  ];

  const COLORS = ['#ef4444', '#3b82f6'];

  // Top penalty collectors (top 5)
  const topPenaltyCollectors = [...penaltyAnalytics.collectorPenaltyData]
    .sort((a, b) => b.totalPenalties - a.totalPenalties)
    .slice(0, 5)
    .map(collector => ({
      name: collector.collectorName,
      penalties: collector.totalPenalties,
      positive: collector.penaltyBreakdown.positiveVariancePenalties,
      negative: collector.penaltyBreakdown.negativeVariancePenalties
    }));

  // Prepare data for penalty trend analysis
  // Aggregate penalty trends across all collectors
  const aggregatedPenaltyTrend = penaltyAnalytics.collectorPenaltyData
    .flatMap(c => c.penaltyTrend)
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.date === curr.date);
      if (existing) {
        existing.penalties += curr.penalties;
      } else {
        acc.push({ ...curr });
      }
      return acc;
    }, [] as { date: string; penalties: number }[])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate additional metrics
  const highPenaltyCollectors = penaltyAnalytics.collectorPenaltyData
    .filter(c => c.totalPenalties > penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector)
    .length;

  const lowPenaltyCollectors = penaltyAnalytics.collectorPenaltyData
    .filter(c => c.totalPenalties < penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector * 0.5)
    .length;

  return (
    <div className="space-y-6">
      {/* Enhanced Penalty Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(penaltyAnalytics.overallPenaltyStats.totalPenalties)}
            </div>
            <p className="text-xs text-muted-foreground">Across all collectors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Penalty per Collector</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector)}
            </div>
            <p className="text-xs text-muted-foreground">Average penalties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Penalty Collectors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {highPenaltyCollectors}
            </div>
            <p className="text-xs text-muted-foreground">Above average penalties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Penalty Collectors</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {lowPenaltyCollectors}
            </div>
            <p className="text-xs text-muted-foreground">Below 50% of average</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Penalty Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Penalty Trend Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Penalty Trend Analysis
            </CardTitle>
            <CardDescription>
              Total penalties over time across all collectors
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {aggregatedPenaltyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={aggregatedPenaltyTrend}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45} 
                    textAnchor="end" 
                    height={60}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis 
                    orientation="left" 
                    stroke="#ef4444" 
                    tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Penalties']}
                    labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="penalties" 
                    name="Daily Penalties" 
                    fill="#ef4444" 
                    opacity={0.7}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="penalties" 
                    name="Trend" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No penalty trend data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Penalty Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Penalty Breakdown (Average)
            </CardTitle>
            <CardDescription>
              Distribution of penalties by variance type
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {penaltyBreakdownData.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={penaltyBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {penaltyBreakdownData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name.includes('Positive') ? '#ef4444' : '#3b82f6'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No penalty data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Penalty Collectors with Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Penalty Collectors
            </CardTitle>
            <CardDescription>
              Collectors with highest penalties (with breakdown)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {topPenaltyCollectors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={topPenaltyCollectors}
                  layout="vertical"
                  margin={{
                    top: 20,
                    right: 30,
                    left: 120,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    scale="band" 
                    width={110}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'penalties') {
                        return [formatCurrency(Number(value)), 'Total Penalties'];
                      } else if (name === 'positive') {
                        return [formatCurrency(Number(value)), 'Positive Variance'];
                      } else if (name === 'negative') {
                        return [formatCurrency(Number(value)), 'Negative Variance'];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="positive" 
                    name="Positive Variance" 
                    fill="#ef4444" 
                    stackId="a"
                  />
                  <Bar 
                    dataKey="negative" 
                    name="Negative Variance" 
                    fill="#3b82f6" 
                    stackId="a"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No penalty data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collector-Specific Penalty Details with Enhanced Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Collector Penalty Analysis
          </CardTitle>
          <CardDescription>
            Detailed penalty information and performance insights for each collector
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Collector</th>
                  <th className="text-right py-2">Total Penalties</th>
                  <th className="text-right py-2">Positive Penalties</th>
                  <th className="text-right py-2">Negative Penalties</th>
                  <th className="text-right py-2">Positive Variances</th>
                  <th className="text-right py-2">Negative Variances</th>
                  <th className="text-right py-2">Penalty Ratio</th>
                  <th className="text-right py-2">Performance Impact</th>
                </tr>
              </thead>
              <tbody>
                {penaltyAnalytics.collectorPenaltyData.map((collector) => {
                  const totalVariances = collector.penaltyBreakdown.totalPositiveVariances + collector.penaltyBreakdown.totalNegativeVariances;
                  const penaltyRatio = totalVariances > 0 ? 
                    ((collector.totalPenalties / totalVariances) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <tr key={collector.collectorId} className="border-b hover:bg-muted/50">
                      <td className="py-2 font-medium max-w-[150px] truncate">{collector.collectorName}</td>
                      <td className="py-2 text-right font-bold text-red-600">
                        {formatCurrency(collector.totalPenalties)}
                      </td>
                      <td className="py-2 text-right text-red-600">
                        {formatCurrency(collector.penaltyBreakdown.positiveVariancePenalties)}
                      </td>
                      <td className="py-2 text-right text-red-600">
                        {formatCurrency(collector.penaltyBreakdown.negativeVariancePenalties)}
                      </td>
                      <td className="py-2 text-right">
                        {collector.penaltyBreakdown.totalPositiveVariances}
                      </td>
                      <td className="py-2 text-right">
                        {collector.penaltyBreakdown.totalNegativeVariances}
                      </td>
                      <td className="py-2 text-right">
                        {penaltyRatio}%
                      </td>
                      <td className="py-2 text-right">
                        <Badge 
                          variant={collector.totalPenalties > penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector ? 'destructive' : 
                                 collector.totalPenalties < penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector * 0.5 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {collector.totalPenalties > penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector ? 'High' : 
                           collector.totalPenalties < penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector * 0.5 ? 'Low' : 'Average'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Penalties with Enhanced Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Penalty Records
          </CardTitle>
          <CardDescription>
            Most recent penalty records across all collectors with detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {penaltyAnalytics.collectorPenaltyData.some(c => c.recentPenalties.length > 0) ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Collector</th>
                    <th className="text-left py-2">Variance Type</th>
                    <th className="text-right py-2">Variance %</th>
                    <th className="text-right py-2">Variance Liters</th>
                    <th className="text-right py-2">Penalty Amount</th>
                    <th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {penaltyAnalytics.collectorPenaltyData.flatMap(collector => 
                    collector.recentPenalties.map((penalty, index) => (
                      <tr key={`${collector.collectorId}-${index}`} className="border-b hover:bg-muted/50">
                        <td className="py-2">
                          {penalty.collection_date ? new Date(penalty.collection_date).toLocaleDateString() : 
                           penalty.approved_at ? new Date(penalty.approved_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-2 max-w-[120px] truncate">{collector.collectorName}</td>
                        <td className="py-2">
                          <Badge 
                            variant={penalty.variance_type === 'positive' ? 'default' : 
                                   penalty.variance_type === 'negative' ? 'destructive' : 'secondary'}
                            className={penalty.variance_type === 'positive' ? 'bg-blue-100 text-blue-800' : 
                                      penalty.variance_type === 'negative' ? 'bg-red-100 text-red-800' : ''}
                          >
                            {penalty.variance_type || 'None'}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          {penalty.variance_percentage ? `${penalty.variance_percentage.toFixed(2)}%` : 'N/A'}
                        </td>
                        <td className="py-2 text-right">
                          {penalty.variance_liters ? penalty.variance_liters.toFixed(2) : 'N/A'}
                        </td>
                        <td className="py-2 text-right font-bold text-red-600">
                          {formatCurrency(penalty.total_penalty_amount || penalty.penalty_amount || 0)}
                        </td>
                        <td className="py-2 max-w-xs truncate">
                          {penalty.notes || penalty.approval_notes || 'N/A'}
                        </td>
                      </tr>
                    ))
                  ).sort((a, b) => {
                    // Sort by date descending
                    const dateA = a.props?.children[0]?.props?.children || a.children[0];
                    const dateB = b.props?.children[0]?.props?.children || b.children[0];
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                  }).slice(0, 15)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent penalties found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Actionable Insights
          </CardTitle>
          <CardDescription>
            Recommendations based on penalty analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Training Opportunities</h3>
              <p className="text-sm text-blue-700">
                {highPenaltyCollectors > 0 ? 
                  `${highPenaltyCollectors} collectors have above-average penalties and may benefit from additional training.` : 
                  "Most collectors are performing within acceptable penalty ranges."}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Recognition</h3>
              <p className="text-sm text-green-700">
                {lowPenaltyCollectors > 0 ? 
                  `${lowPenaltyCollectors} collectors have exceptionally low penalties and deserve recognition.` : 
                  "Several collectors are demonstrating excellent performance with minimal penalties."}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Process Improvement</h3>
              <p className="text-sm text-yellow-700">
                {penaltyBreakdownData[0].value > penaltyBreakdownData[1].value ? 
                  "Focus on reducing positive variance penalties through better collection practices." : 
                  "Address negative variance penalties by improving accuracy in measurements."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};