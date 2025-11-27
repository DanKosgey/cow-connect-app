import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import RefreshButton from '@/components/ui/RefreshButton';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Filter,
  Download,
  AlertTriangle
} from 'lucide-react';
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
  Cell
} from 'recharts';

interface VarianceRecord {
  id: string;
  collection_id: string;
  collection_details: {
    collection_id: string;
    liters: number;
    collection_date: string;
    farmers: {
      full_name: string;
    } | null;
  } | null;
  staff_id: string;
  staff_details: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: string;
  penalty_amount: number;
  approval_notes: string | null;
  approved_at: string;
}

interface CollectorPerformance {
  collector_id: string;
  collector_name: string;
  total_collections: number;
  total_variance: number;
  average_variance_percentage: number;
  total_penalty_amount: number;
  positive_variances: number;
  negative_variances: number;
  performance_score: number;
  last_collection_date: string;
}

interface VarianceSummary {
  total_variances: number;
  positive_variances: number;
  negative_variances: number;
  total_penalty_amount: number;
  average_variance_percentage: number;
}

const VarianceInsightsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  
  const [variances, setVariances] = useState<VarianceRecord[]>([]);
  const [collectorPerformance, setCollectorPerformance] = useState<CollectorPerformance[]>([]);
  const [varianceSummary, setVarianceSummary] = useState<VarianceSummary>({
    total_variances: 0,
    positive_variances: 0,
    negative_variances: 0,
    total_penalty_amount: 0,
    average_variance_percentage: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
  }>({
    from: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  const [filterCollector, setFilterCollector] = useState<string>('all');
  // Add timeframe state
  const [timeframe, setTimeframe] = useState<string>('monthly'); // daily, weekly, monthly
  const [collectors, setCollectors] = useState<{id: string, full_name: string}[]>([]);

  useEffect(() => {
    fetchCollectors();
  }, []);

  useEffect(() => {
    fetchVarianceData();
  }, [dateRange, filterCollector, timeframe]);

  const fetchCollectors = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, profiles (full_name)')
        .order('full_name', { foreignTable: 'profiles' });

      if (error) {
        console.error('Error fetching collectors:', error);
        setCollectors([]);
        return;
      }

      const collectorData = (data || []).map((staff: any) => ({
        id: staff.id,
        full_name: staff.profiles?.full_name || 'Unknown Collector'
      }));

      setCollectors(collectorData);
    } catch (error: any) {
      console.error('Error fetching collectors:', error);
      setCollectors([]);
    }
  };

  const fetchVarianceData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Build the query for variance records
      let query = supabase
        .from('milk_approvals')
        .select(`
          id,
          collection_id,
          staff_id,
          company_received_liters,
          variance_liters,
          variance_percentage,
          variance_type,
          penalty_amount,
          approval_notes,
          approved_at,
          collections!milk_approvals_collection_id_fkey (
            collection_id,
            liters,
            collection_date,
            farmers (
              full_name
            )
          ),
          staff!milk_approvals_staff_id_fkey (
            profiles (
              full_name
            )
          )
        `)
        .gte('approved_at', `${dateRange.from}T00:00:00Z`)
        .lte('approved_at', `${dateRange.to}T23:59:59Z`)
        .order('approved_at', { ascending: false })
        .limit(50);

      // Apply collector filter
      if (filterCollector && filterCollector !== 'all') {
        query = query.eq('staff_id', filterCollector);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform the data to match our interface
      let transformedData = (data || []).map((item: any) => ({
        ...item,
        collection_details: item.collections || null,
        staff_details: item.staff || null
      }));

      setVariances(transformedData);
      
      // Fetch summary data
      await fetchSummaryData();
      await fetchCollectorPerformance();
    } catch (error: any) {
      console.error('Error fetching variances:', error);
      showError('Error', String(error?.message || 'Failed to fetch variances'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummaryData = async () => {
    try {
      // Get summary statistics
      let summaryQuery = supabase
        .from('milk_approvals')
        .select('variance_type, variance_percentage, penalty_amount')
        .gte('approved_at', `${dateRange.from}T00:00:00Z`)
        .lte('approved_at', `${dateRange.to}T23:59:59Z`);

      if (filterCollector && filterCollector !== 'all') {
        summaryQuery = summaryQuery.eq('staff_id', filterCollector);
      }

      const { data, error } = await summaryQuery;

      if (error) throw error;

      const summary: VarianceSummary = {
        total_variances: data?.length || 0,
        positive_variances: data?.filter((v: any) => v.variance_type === 'positive').length || 0,
        negative_variances: data?.filter((v: any) => v.variance_type === 'negative').length || 0,
        total_penalty_amount: data?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0,
        average_variance_percentage: data?.length ? 
          data.reduce((sum: number, v: any) => sum + (v.variance_percentage || 0), 0) / data.length : 0
      };

      setVarianceSummary(summary);
    } catch (error: any) {
      console.error('Error fetching summary data:', error);
      showError('Error', String(error?.message || 'Failed to fetch summary data'));
    }
  };

  const fetchCollectorPerformance = async () => {
    try {
      // Calculate date range based on selected timeframe
      let startDate = new Date(dateRange.from);
      let endDate = new Date(dateRange.to);
      
      // Adjust dates based on timeframe selection
      switch (timeframe) {
        case 'daily':
          // For daily, we'll use the to date as the specific day
          startDate = new Date(dateRange.to);
          endDate = new Date(dateRange.to);
          break;
        case 'weekly':
          // For weekly, we'll use the to date as the end of the week
          endDate = new Date(dateRange.to);
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 6); // 7 days including end date
          break;
        case 'monthly':
          // For monthly, we'll use the to date as the end of the month
          endDate = new Date(dateRange.to);
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          break;
      }

      // Use the new database function to calculate collector performance
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('calculate_collector_performance', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });

      if (performanceError) {
        console.warn('Error calculating collector performance:', performanceError);
        setCollectorPerformance([]);
        return;
      }

      // Transform the data to match our interface
      const transformedData = (performanceData || []).map((item: any) => ({
        collector_id: item.collector_id,
        collector_name: item.collector_name || 'Unknown Collector',
        total_collections: item.total_collections || 0,
        total_variance: parseFloat(item.total_variance?.toFixed(2) || '0.00'),
        average_variance_percentage: parseFloat(item.average_variance_percentage?.toFixed(2) || '0.00'),
        total_penalty_amount: parseFloat(item.total_penalty_amount?.toFixed(2) || '0.00'),
        positive_variances: item.positive_variances || 0,
        negative_variances: item.negative_variances || 0,
        performance_score: parseFloat(item.performance_score?.toFixed(0) || '0'),
        last_collection_date: item.last_collection_date || ''
      }));

      setCollectorPerformance(transformedData);
    } catch (error: any) {
      console.error('Error calculating collector performance:', error);
      setCollectorPerformance([]);
    }
  };

  const getVarianceTypeColor = (varianceType: string) => {
    switch (varianceType) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVarianceIcon = (varianceType: string) => {
    switch (varianceType) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getVarianceSeverityColor = (percentage: number) => {
    const absPercentage = Math.abs(percentage);
    if (absPercentage >= 10) return 'bg-red-500 text-white';
    if (absPercentage >= 5) return 'bg-orange-500 text-white';
    if (absPercentage > 0) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  // Prepare data for charts
  const varianceTypeData = [
    { name: 'Positive', value: varianceSummary.positive_variances },
    { name: 'Negative', value: varianceSummary.negative_variances }
  ];

  const COLORS = ['#10B981', '#EF4444'];

  const collectorPerformanceData = collectorPerformance
    .sort((a, b) => b.average_variance_percentage - a.average_variance_percentage)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Variance Insights Dashboard</h1>
          <p className="text-muted-foreground">Monitor and analyze milk collection variances across collectors</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <RefreshButton 
            isRefreshing={isLoading} 
            onRefresh={fetchVarianceData} 
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Collector</label>
              <select
                value={filterCollector}
                onChange={(e) => setFilterCollector(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Collectors</option>
                {collectors.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Variances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{varianceSummary.total_variances}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positive Variances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{varianceSummary.positive_variances}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Negative Variances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{varianceSummary.negative_variances}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Variance %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${varianceSummary.average_variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {varianceSummary.average_variance_percentage >= 0 ? '+' : ''}{varianceSummary.average_variance_percentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Penalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {varianceSummary.total_penalty_amount.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Variance Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={varianceTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {varianceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Collectors by Avg. Variance %</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={collectorPerformanceData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="collector_name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average_variance_percentage" name="Avg. Variance %" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Collector Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collector Performance ({timeframe.charAt(0).toUpperCase() + timeframe.slice(1)})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collector</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Total Variance (L)</TableHead>
                  <TableHead>Avg. Variance %</TableHead>
                  <TableHead>Positive</TableHead>
                  <TableHead>Negative</TableHead>
                  <TableHead>Penalties (KSh)</TableHead>
                  <TableHead>Performance Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collectorPerformance.length > 0 ? (
                  collectorPerformance.map((collector) => (
                    <TableRow key={collector.collector_id}>
                      <TableCell className="font-medium">{collector.collector_name}</TableCell>
                      <TableCell>{collector.total_collections}</TableCell>
                      <TableCell>
                        <span className={collector.total_variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {collector.total_variance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getVarianceSeverityColor(collector.average_variance_percentage)}>
                          {collector.average_variance_percentage >= 0 ? '+' : ''}{collector.average_variance_percentage.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-600">{collector.positive_variances}</TableCell>
                      <TableCell className="text-red-600">{collector.negative_variances}</TableCell>
                      <TableCell className="font-medium text-red-600">
                        {collector.total_penalty_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={collector.performance_score >= 80 ? 'default' : collector.performance_score >= 60 ? 'secondary' : 'destructive'}
                        >
                          {collector.performance_score.toFixed(0)}/100
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">No collector performance data found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Variance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Variance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection ID</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : variances.length > 0 ? (
                  variances.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.collection_details?.collection_id?.substring(0, 8) || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {record.collection_details?.farmers?.full_name || 'Unknown Farmer'}
                      </TableCell>
                      <TableCell>
                        {record.staff_details?.profiles?.full_name || 'Unknown Collector'}
                      </TableCell>
                      <TableCell>
                        {(record.company_received_liters - record.variance_liters).toFixed(2)} L
                      </TableCell>
                      <TableCell>
                        {record.company_received_liters.toFixed(2)} L
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getVarianceIcon(record.variance_type)}
                          <span className={record.variance_liters >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {record.variance_liters > 0 ? '+' : ''}{record.variance_liters.toFixed(2)} L
                          </span>
                          <Badge className={getVarianceTypeColor(record.variance_type)}>
                            {record.variance_percentage > 0 ? '+' : ''}{record.variance_percentage.toFixed(2)}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        KSh {record.penalty_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.approved_at), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No variance records found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VarianceInsightsDashboard;