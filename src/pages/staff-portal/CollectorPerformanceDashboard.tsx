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

const CollectorPerformanceDashboard: React.FC = () => {
  const { error: showError } = useToastNotifications();
  
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchPerformanceData();
  }, [timeframe]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, we would fetch from the database
      // For now, we'll create mock data to demonstrate the UI
      
      // Mock data for demonstration
      const mockData: PerformanceRecord[] = [
        {
          id: '1',
          staff_id: 'staff-1',
          period_start: '2025-10-01',
          period_end: '2025-10-31',
          total_collections: 142,
          total_liters_collected: 14200,
          total_liters_received: 14150,
          total_variance: -50,
          average_variance_percentage: -0.35,
          positive_variances: 24,
          negative_variances: 18,
          total_penalty_amount: 2450,
          performance_score: 85,
          staff: { profiles: { full_name: 'John Collector' } }
        },
        {
          id: '2',
          staff_id: 'staff-2',
          period_start: '2025-10-01',
          period_end: '2025-10-31',
          total_collections: 138,
          total_liters_collected: 13800,
          total_liters_received: 13850,
          total_variance: 50,
          average_variance_percentage: 0.36,
          positive_variances: 19,
          negative_variances: 15,
          total_penalty_amount: 1980,
          performance_score: 88,
          staff: { profiles: { full_name: 'Jane Collector' } }
        },
        {
          id: '3',
          staff_id: 'staff-3',
          period_start: '2025-10-01',
          period_end: '2025-10-31',
          total_collections: 125,
          total_liters_collected: 12500,
          total_liters_received: 12400,
          total_variance: -100,
          average_variance_percentage: -0.80,
          positive_variances: 12,
          negative_variances: 22,
          total_penalty_amount: 3200,
          performance_score: 75,
          staff: { profiles: { full_name: 'Bob Collector' } }
        }
      ];
      
      setPerformanceRecords(mockData);
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
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Active collectors</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82.5</div>
            <p className="text-xs text-muted-foreground">Average score</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Jane Collector</div>
            <p className="text-xs text-muted-foreground">Score: 95</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
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
                <p className="text-sm text-muted-foreground">90+: 8, 80-89: 10, 70-79: 4, &lt;70: 2</p>
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
                <p className="text-sm text-muted-foreground">Showing {timeframe} data</p>
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