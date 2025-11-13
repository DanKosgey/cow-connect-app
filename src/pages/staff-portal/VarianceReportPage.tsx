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
  Minus,
  Calendar,
  User,
  Milk,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import RefreshButton from '@/components/ui/RefreshButton';
import { Badge } from '@/components/ui/badge';

interface VarianceRecord {
  id: string;
  collection_id: string;
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: 'positive' | 'negative' | 'none';
  penalty_amount: number;
  approved_at: string;
  farmers: {
    full_name: string;
  } | null;
  staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

const VarianceReportPage: React.FC = () => {
  const { error: showError } = useToastNotifications();
  
  const [varianceRecords, setVarianceRecords] = useState<VarianceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    fetchVarianceReports();
  }, [timeframe]);

  const fetchVarianceReports = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, we would filter by timeframe
      // For now, we'll create a mock implementation to demonstrate the UI
      // In a complete implementation, we would fetch from the database
      
      // Mock data for demonstration
      const mockData: VarianceRecord[] = [
        {
          id: '1',
          collection_id: 'COL-001',
          company_received_liters: 100.5,
          variance_liters: 2.5,
          variance_percentage: 2.5,
          variance_type: 'positive',
          penalty_amount: 25.0,
          approved_at: new Date().toISOString(),
          farmers: { full_name: 'John Doe' },
          staff: { profiles: { full_name: 'Collector One' } }
        },
        {
          id: '2',
          collection_id: 'COL-002',
          company_received_liters: 85.0,
          variance_liters: -1.2,
          variance_percentage: -1.4,
          variance_type: 'negative',
          penalty_amount: 10.0,
          approved_at: new Date(Date.now() - 86400000).toISOString(),
          farmers: { full_name: 'Jane Smith' },
          staff: { profiles: { full_name: 'Collector Two' } }
        }
      ];
      
      setVarianceRecords(mockData);
    } catch (error: any) {
      console.error('Error fetching variance reports:', error);
      showError('Error', String(error?.message || 'Failed to fetch variance reports'));
    } finally {
      setIsLoading(false);
    }
  };

  const getVarianceIcon = (varianceType: string) => {
    switch (varianceType) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getVarianceColor = (varianceType: string) => {
    switch (varianceType) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getVarianceBadgeColor = (varianceType: string) => {
    switch (varianceType) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Variance Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive analytics for milk collection variances and penalties</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button
            variant={timeframe === 'week' ? 'default' : 'outline'}
            onClick={() => setTimeframe('week')}
            size="sm"
          >
            Week
          </Button>
          <Button
            variant={timeframe === 'month' ? 'default' : 'outline'}
            onClick={() => setTimeframe('month')}
            size="sm"
          >
            Month
          </Button>
          <Button
            variant={timeframe === 'quarter' ? 'default' : 'outline'}
            onClick={() => setTimeframe('quarter')}
            size="sm"
          >
            Quarter
          </Button>
          <RefreshButton 
            isRefreshing={isLoading} 
            onRefresh={fetchVarianceReports} 
            className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <Milk className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Variances</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Average +2.3% variance</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative Variances</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">Average -1.8% variance</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh 2,450</div>
            <p className="text-xs text-muted-foreground">KSh 15.20 per variance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variance Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Variance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <PieChart className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Variance distribution chart</p>
                <p className="text-sm text-muted-foreground">Positive: 57%, Negative: 43%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Variance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Variance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Variance trend over time</p>
                <p className="text-sm text-muted-foreground">Showing {timeframe} data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Collectors by Variance Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Top Collectors by Variance Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collector</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Avg. Variance %</TableHead>
                  <TableHead>Positive</TableHead>
                  <TableHead>Negative</TableHead>
                  <TableHead>Total Penalties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Collector One</TableCell>
                  <TableCell>42</TableCell>
                  <TableCell className="text-green-600">+1.2%</TableCell>
                  <TableCell>8</TableCell>
                  <TableCell>3</TableCell>
                  <TableCell>KSh 320</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Collector Two</TableCell>
                  <TableCell>38</TableCell>
                  <TableCell className="text-red-600">-0.8%</TableCell>
                  <TableCell>5</TableCell>
                  <TableCell>6</TableCell>
                  <TableCell>KSh 480</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Collector Three</TableCell>
                  <TableCell>35</TableCell>
                  <TableCell className="text-green-600">+0.5%</TableCell>
                  <TableCell>4</TableCell>
                  <TableCell>2</TableCell>
                  <TableCell>KSh 180</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Variance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Variance Records
          </CardTitle>
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
                ) : varianceRecords.length > 0 ? (
                  varianceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.collection_id?.substring(0, 8) || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{record.farmers?.full_name || 'Unknown Farmer'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.staff?.profiles?.full_name || 'Unknown Collector'}
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
                          <span className={getVarianceColor(record.variance_type)}>
                            {record.variance_liters > 0 ? '+' : ''}{record.variance_liters.toFixed(2)} L
                          </span>
                          <Badge className={getVarianceBadgeColor(record.variance_type)}>
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
                      <Milk className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
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

export default VarianceReportPage;