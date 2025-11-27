import React, { useState, useEffect } from 'react';
import { MilkApprovalService } from '@/services/milk-approval-service';
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
import { 
  TrendingUp, 
  TrendingDown, 
  User,
  Award,
  BarChart3,
  CheckCircle
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
  ComposedChart,
  Line
} from 'recharts';
import RefreshButton from '@/components/ui/RefreshButton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface StaffPerformanceRecord {
  id: string;
  staff_id: string;
  period_start: string;
  period_end: string;
  total_approvals: number;
  total_collections_approved: number;
  total_liters_approved: number;
  total_variance_handled: number;
  average_variance_percentage: number;
  positive_variances: number;
  negative_variances: number;
  total_penalty_amount: number;
  accuracy_score: number;
  full_name?: string;
  staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

interface StaffSummaryStats {
  totalStaff: number;
  avgAccuracy: number;
  topPerformer: string;
  topPerformerScore: number;
  needsAttention: number;
}

const StaffPerformanceDashboard: React.FC = () => {
  const { error: showError } = useToastNotifications();
  
  const [performanceRecords, setPerformanceRecords] = useState<StaffPerformanceRecord[]>([]);
  const [summaryStats, setSummaryStats] = useState<StaffSummaryStats>({
    totalStaff: 0,
    avgAccuracy: 0,
    topPerformer: '',
    topPerformerScore: 0,
    needsAttention: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchPerformanceData();
  }, [timeframe]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      // Fetch staff performance records for staff members with staff role (not collectors)
      // First, get all staff IDs with staff role
      const { data: staffRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff')
        .eq('active', true);

      if (rolesError) throw rolesError;
      
      const staffUserIds = staffRoles?.map(role => role.user_id) || [];
      
      if (staffUserIds.length === 0) {
        setPerformanceRecords([]);
        setSummaryStats({
          totalStaff: 0,
          avgAccuracy: 0,
          topPerformer: '',
          topPerformerScore: 0,
          needsAttention: 0
        });
        setIsLoading(false);
        return;
      }
      
      // Get staff records for these user IDs
      const { data: staffRecords, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id, profiles (full_name)')
        .in('user_id', staffUserIds);

      if (staffError) throw staffError;
      
      const staffIds = staffRecords?.map(staff => staff.id) || [];
      
      if (staffIds.length === 0) {
        setPerformanceRecords([]);
        setSummaryStats({
          totalStaff: 0,
          avgAccuracy: 0,
          topPerformer: '',
          topPerformerScore: 0,
          needsAttention: 0
        });
        setIsLoading(false);
        return;
      }
      
      // Format dates as YYYY-MM-DD strings for the database
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = now.toISOString().split('T')[0];
      
      // Fetch actual performance data from the staff_performance table
      // We want to find records that overlap with our date range
      const { data: performanceData, error: performanceError } = await supabase
        .from('staff_performance')
        .select(`
          *,
          staff (
            profiles (
              full_name
            )
          )
        `)
        .in('staff_id', staffIds)
        .lte('period_start', endDateString)  // period starts before or during our range
        .gte('period_end', startDateString)  // period ends after or during our range
        .order('accuracy_score', { ascending: false });

      if (performanceError) throw performanceError;
      
      setPerformanceRecords(performanceData || []);
      
      // Calculate summary statistics
      if (performanceData && performanceData.length > 0) {
        const totalStaff = performanceData.length;
        const avgAccuracy = performanceData.reduce((sum, record) => sum + (record.accuracy_score || 0), 0) / totalStaff;
        
        // Find top performer
        const topPerformerRecord = performanceData.reduce((prev, current) => 
          (prev.accuracy_score > current.accuracy_score) ? prev : current
        );
        const topPerformer = topPerformerRecord.staff?.profiles?.full_name || 'Unknown Staff';
        const topPerformerScore = topPerformerRecord.accuracy_score || 0;
        
        // Count staff needing attention (score < 85)
        const needsAttention = performanceData.filter(record => (record.accuracy_score || 0) < 85).length;
        
        setSummaryStats({
          totalStaff,
          avgAccuracy: parseFloat(avgAccuracy.toFixed(1)),
          topPerformer,
          topPerformerScore,
          needsAttention
        });
      } else {
        setSummaryStats({
          totalStaff: 0,
          avgAccuracy: 0,
          topPerformer: '',
          topPerformerScore: 0,
          needsAttention: 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching performance data:', error);
      showError('Error', String(error?.message || 'Failed to fetch performance data'));
    } finally {
      setIsLoading(false);
    }
  };

  const getAccuracyColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 90) return 'text-blue-600';
    if (score >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBadgeColor = (score: number) => {
    if (score >= 95) return 'bg-green-100 text-green-800';
    if (score >= 90) return 'bg-blue-100 text-blue-800';
    if (score >= 85) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Format period for display
  const formatPeriod = (start: string, end: string) => {
    // Extract month/year for cleaner display
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // If same month, show month name and year
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    // Otherwise show date range
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Generate chart data from performance records
  const generateChartData = () => {
    if (!performanceRecords || performanceRecords.length === 0) return [];
    
    // For simplicity, we'll show data for each performance record
    // In a real implementation, you might want to aggregate by date ranges
    return performanceRecords.map(record => ({
      period: formatPeriod(record.period_start, record.period_end),
      litersApproved: parseFloat(record.total_liters_approved.toString()),
      collectorsServed: record.total_collections_approved || 0,
      staffMember: record.staff?.profiles?.full_name || record.full_name || 'Unknown Staff'
    }));
  };
  
  const chartData = generateChartData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Performance Dashboard</h1>
          <p className="text-muted-foreground">Track and analyze staff performance metrics for milk approvals</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button
            variant={timeframe === 'month' ? 'default' : 'outline'}
            onClick={() => setTimeframe('month')}
            size="sm"
          >
            Monthly
          </Button>
          <Button
            variant={timeframe === 'quarter' ? 'default' : 'outline'}
            onClick={() => setTimeframe('quarter')}
            size="sm"
          >
            Quarterly
          </Button>
          <Button
            variant={timeframe === 'year' ? 'default' : 'outline'}
            onClick={() => setTimeframe('year')}
            size="sm"
          >
            Yearly
          </Button>
          <RefreshButton 
            isRefreshing={isLoading} 
            onRefresh={fetchPerformanceData} 
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                summaryStats.totalStaff
              )}
            </div>
            <p className="text-xs text-muted-foreground">Active staff members</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Accuracy</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                summaryStats.avgAccuracy
              )}
            </div>
            <p className="text-xs text-muted-foreground">Average accuracy score</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                summaryStats.topPerformer || 'N/A'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Score: {isLoading ? '...' : summaryStats.topPerformerScore}%
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                summaryStats.needsAttention
              )}
            </div>
            <p className="text-xs text-muted-foreground">Below 85% accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">
        {/* Performance Trend Chart with Dual Axis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Approval Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 50,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="period" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12, fill: '#666' }}
                      interval={0}
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      stroke="#8884d8" 
                      tick={{ fontSize: 12, fill: '#666' }}
                      tickFormatter={(value) => `${value.toLocaleString()} L`}
                      label={{ 
                        value: 'Liters Approved', 
                        angle: -90, 
                        position: 'insideLeft',
                        offset: -5,
                        fill: '#666'
                      }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#82ca9d" 
                      tick={{ fontSize: 12, fill: '#666' }}
                      label={{ 
                        value: 'Collections Approved', 
                        angle: 90, 
                        position: 'insideRight',
                        offset: 10,
                        fill: '#666'
                      }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'litersApproved' ? `${value} L` : value,
                        name === 'litersApproved' ? 'Liters Approved' : 'Collections Approved'
                      ]}
                      labelFormatter={(value) => `Period: ${value}`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      wrapperStyle={{ paddingBottom: '10px' }}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="litersApproved" 
                      name="Liters Approved" 
                      fill="#8884d8" 
                      radius={[4, 4, 0, 0]}
                      onMouseEnter={(data, index) => console.log('Hovered bar:', data, index)}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="collectorsServed" 
                      name="Collections Approved" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={{ r: 6, fill: '#82ca9d', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, fill: '#82ca9d', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">No trend data available</p>
                    <p className="text-sm text-muted-foreground">
                      {isLoading ? 'Loading...' : 'No performance records found for the selected period'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Staff Performance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Approvals</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Liters Approved</TableHead>
                  <TableHead>Avg. Variance %</TableHead>
                  <TableHead>Positive</TableHead>
                  <TableHead>Negative</TableHead>
                  <TableHead>Penalties</TableHead>
                  <TableHead>Accuracy Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : performanceRecords.length > 0 ? (
                  performanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.staff?.profiles?.full_name || record.full_name || 'Unknown Staff'}
                      </TableCell>
                      <TableCell>{record.total_approvals}</TableCell>
                      <TableCell>{record.total_collections_approved}</TableCell>
                      <TableCell>{record.total_liters_approved.toLocaleString()} L</TableCell>
                      <TableCell>
                        <span className={record.average_variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {record.average_variance_percentage >= 0 ? '+' : ''}{record.average_variance_percentage.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-green-600">{record.positive_variances}</TableCell>
                      <TableCell className="text-red-600">{record.negative_variances}</TableCell>
                      <TableCell>KSh {record.total_penalty_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getAccuracyBadgeColor(record.accuracy_score)}>
                          <span className={getAccuracyColor(record.accuracy_score)}>
                            {record.accuracy_score.toFixed(1)}%
                          </span>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No performance records found</p>
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

export default StaffPerformanceDashboard;