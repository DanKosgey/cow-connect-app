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
  PieChart
} from 'lucide-react';
import RefreshButton from '@/components/ui/RefreshButton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceRecord {
  id: string;
  staff_id: string;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_liters_collected: number;
  total_liters_received: number;
  total_variance: number;
  average_variance_percentage: number;
  positive_variances: number;
  negative_variances: number;
  total_penalty_amount: number;
  performance_score: number;
  staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

interface SummaryStats {
  totalCollectors: number;
  avgPerformance: number;
  topPerformer: string;
  topPerformerScore: number;
  needsAttention: number;
}

const CollectorPerformanceDashboard: React.FC = () => {
  const { error: showError } = useToastNotifications();
  
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalCollectors: 0,
    avgPerformance: 0,
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
      
      // Fetch collector performance records for staff members with collector role
      // First, get all staff IDs with collector role
      const { data: collectorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'collector')
        .eq('active', true);

      if (rolesError) throw rolesError;
      
      const collectorUserIds = collectorRoles?.map(role => role.user_id) || [];
      
      if (collectorUserIds.length === 0) {
        setPerformanceRecords([]);
        setSummaryStats({
          totalCollectors: 0,
          avgPerformance: 0,
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
        .in('user_id', collectorUserIds);

      if (staffError) throw staffError;
      
      const collectorStaffIds = staffRecords?.map(staff => staff.id) || [];
      
      if (collectorStaffIds.length === 0) {
        setPerformanceRecords([]);
        setSummaryStats({
          totalCollectors: 0,
          avgPerformance: 0,
          topPerformer: '',
          topPerformerScore: 0,
          needsAttention: 0
        });
        setIsLoading(false);
        return;
      }
      
      // Fetch performance records for these collectors
      const { data, error } = await supabase
        .from('collector_performance')
        .select(`
          *,
          staff (
            user_id,
            profiles (
              full_name
            )
          )
        `)
        .in('staff_id', collectorStaffIds)
        .gte('created_at', startDate.toISOString())
        .order('performance_score', { ascending: false });

      if (error) throw error;
      
      // Enhance data with proper collector names
      const enhancedData = (data || []).map(record => ({
        ...record,
        staff: {
          ...record.staff,
          profiles: {
            full_name: record.staff?.profiles?.full_name || 
                      (record.staff?.user_id ? `Collector (${record.staff.user_id.substring(0, 8)})` : 'Unknown Collector')
          }
        }
      }));
      
      setPerformanceRecords(enhancedData);
      
      // Calculate summary statistics
      if (enhancedData && enhancedData.length > 0) {
        const totalCollectors = enhancedData.length;
        const avgPerformance = enhancedData.reduce((sum, record) => sum + (record.performance_score || 0), 0) / totalCollectors;
        
        // Find top performer
        const topPerformerRecord = enhancedData.reduce((prev, current) => 
          (prev.performance_score > current.performance_score) ? prev : current
        );
        const topPerformer = topPerformerRecord.staff?.profiles?.full_name || 'Unknown Collector';
        const topPerformerScore = topPerformerRecord.performance_score || 0;
        
        // Count collectors needing attention (score < 70)
        const needsAttention = enhancedData.filter(record => (record.performance_score || 0) < 70).length;
        
        setSummaryStats({
          totalCollectors,
          avgPerformance: parseFloat(avgPerformance.toFixed(1)),
          topPerformer,
          topPerformerScore,
          needsAttention
        });
      } else {
        setSummaryStats({
          totalCollectors: 0,
          avgPerformance: 0,
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

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collector Performance Dashboard</h1>
          <p className="text-muted-foreground">Track and analyze collector performance metrics</p>
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
            <CardTitle className="text-sm font-medium">Total Collectors</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                summaryStats.totalCollectors
              )}
            </div>
            <p className="text-xs text-muted-foreground">Active collectors</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                summaryStats.avgPerformance
              )}
            </div>
            <p className="text-xs text-muted-foreground">Average score</p>
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
              Score: {isLoading ? '...' : summaryStats.topPerformerScore}
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
            <p className="text-xs text-muted-foreground">Below 70 score</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Performance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <PieChart className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Performance distribution chart</p>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : '90+: 8, 80-89: 10, 70-79: 4, <70: 2'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Performance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Performance trend over time</p>
                <p className="text-sm text-muted-foreground">
                  Showing {timeframe} data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Collector Performance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collector</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Liters Collected</TableHead>
                  <TableHead>Avg. Variance %</TableHead>
                  <TableHead>Positive</TableHead>
                  <TableHead>Negative</TableHead>
                  <TableHead>Penalties</TableHead>
                  <TableHead>Performance Score</TableHead>
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
                ) : performanceRecords.length > 0 ? (
                  performanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.staff?.profiles?.full_name || 'Unknown Collector'}
                      </TableCell>
                      <TableCell>{record.total_collections}</TableCell>
                      <TableCell>{record.total_liters_collected.toLocaleString()} L</TableCell>
                      <TableCell>
                        <span className={record.average_variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {record.average_variance_percentage >= 0 ? '+' : ''}{record.average_variance_percentage.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-green-600">{record.positive_variances}</TableCell>
                      <TableCell className="text-red-600">{record.negative_variances}</TableCell>
                      <TableCell>KSh {record.total_penalty_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getPerformanceBadgeColor(record.performance_score)}>
                          <span className={getPerformanceColor(record.performance_score)}>
                            {record.performance_score.toFixed(1)}
                          </span>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
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

export default CollectorPerformanceDashboard;