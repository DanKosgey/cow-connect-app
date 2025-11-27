import React, { useState, useEffect, useCallback } from 'react';
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
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  User,
  Milk,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Check,
  X,
  Users,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import RefreshButton from '@/components/ui/RefreshButton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  // Removed liters (collected data) to prevent fraud
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: 'positive' | 'negative' | 'none';
  penalty_amount: number;
  approved_at: string;
  farmers: {
    full_name: string;
  } | null;
  collection_staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
  approval_staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
  // Add the collections property to match the transformed data
  collections?: {
    staff_id: string;
  } | null;
}

interface CollectorVarianceSummary {
  collector_id: string;
  collector_name: string;
  total_collections: number;
  // Removed total_collected_liters to prevent fraud
  total_received_liters: number;
  variance_type: 'positive' | 'negative' | 'none';
  collections: VarianceRecord[];
  first_approval_date: string;
  approved_collections?: number;
  pending_collections?: number;
}

interface SummaryStats {
  totalCollections: number;
  positiveVariances: number;
  negativeVariances: number;
  totalPenalties: number;
  // Removed totalCollectedLiters to prevent fraud
  totalReceivedLiters: number;
  overallVariancePercentage: number;
}

// Chart data interfaces
interface VarianceDistributionData {
  name: string;
  value: number;
  color: string;
}

interface CollectorPerformanceData {
  collector_name: string;
  total_variance: number;
  collection_count: number;
}

const COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  none: '#6b7280'
};

const VarianceReportPage: React.FC = () => {
  const { error: showError, success: showSuccess } = useToastNotifications();
  
  const [varianceRecords, setVarianceRecords] = useState<VarianceRecord[]>([]);
  const [collectorSummaries, setCollectorSummaries] = useState<CollectorVarianceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [summaryData, setSummaryData] = useState<SummaryStats>({
    totalCollections: 0,
    positiveVariances: 0,
    negativeVariances: 0,
    totalPenalties: 0,
    // Removed totalCollectedLiters to prevent fraud
    totalReceivedLiters: 0,
    overallVariancePercentage: 0
  });

  // Fetch staff names in batch
  const fetchStaffNames = async (staffIds: string[]): Promise<Map<string, string>> => {
    if (staffIds.length === 0) return new Map();

    try {
      const { data: staffProfiles, error } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          profiles (
            full_name
          )
        `)
        .in('id', staffIds);

      if (error) {
        console.error('Error fetching staff profiles:', error);
        return new Map();
      }

      const staffMap = new Map<string, string>();
      staffProfiles?.forEach(staff => {
        const name = staff.profiles?.full_name || `Unknown (${staff.id.substring(0, 8)})`;
        staffMap.set(staff.id, name);
      });

      return staffMap;
    } catch (error) {
      console.error('Error in staff profile fetch:', error);
      return new Map();
    }
  };

  const fetchVarianceReports = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date range directly to avoid infinite loop
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
      }
      
      console.log('Fetching variance data for date range:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });

      // Fetch variance records with proper joins
      const { data: varianceData, error: varianceError } = await supabase
        .from('milk_approvals')
        .select(`
          id,
          collection_id,
          company_received_liters,
          variance_liters,
          variance_percentage,
          variance_type,
          penalty_amount,
          approved_at,
          collections!milk_approvals_collection_id_fkey (
            id,
            staff_id,
            farmers (
              full_name
            )
          ),
          staff!milk_approvals_staff_id_fkey (
            profiles!staff_user_id_fkey (
              full_name
            )
          )
        `)
        .gte('approved_at', startDate.toISOString())
        .lte('approved_at', endDate.toISOString())
        .order('approved_at', { ascending: false });

      if (varianceError) {
        throw new Error(`Failed to fetch variance data: ${varianceError.message}`);
      }

      console.log('Raw variance data count:', varianceData?.length || 0);

      if (!varianceData || varianceData.length === 0) {
        setVarianceRecords([]);
        setCollectorSummaries([]);
        setSummaryData({
          totalCollections: 0,
          positiveVariances: 0,
          negativeVariances: 0,
          totalPenalties: 0,
          // Removed totalCollectedLiters to prevent fraud
          totalReceivedLiters: 0,
          overallVariancePercentage: 0
        });
        setIsLoading(false);
        return;
      }

      // Transform data
      const transformedData: VarianceRecord[] = varianceData.map(item => ({
        id: item.id,
        collection_id: item.collection_id,
        // Removed liters (collected data) to prevent fraud
        company_received_liters: item.company_received_liters,
        variance_liters: item.variance_liters,
        variance_percentage: item.variance_percentage,
        variance_type: item.variance_type,
        penalty_amount: item.penalty_amount,
        approved_at: item.approved_at,
        farmers: item.collections?.farmers || null,
        collection_staff: null, // Will be populated later
        approval_staff: item.staff ? { profiles: item.staff.profiles } : null
      }));

      // Get unique staff IDs for collector names
      const staffIds = new Set(
        varianceData
          .map(item => item.collections?.staff_id)
          .filter(Boolean) as string[]
      );

      const staffNameMap = await fetchStaffNames(Array.from(staffIds));

      // Group by collector and create summaries
      const collectorMap = new Map<string, CollectorVarianceSummary>();

      transformedData.forEach(record => {
        const staffId = record.collections?.staff_id;
        const groupingId = staffId || 'unassigned';
        
        const collectorName = staffId 
          ? staffNameMap.get(staffId) || `Collector (${staffId.substring(0, 8)})`
          : 'Unassigned Collector';

        if (!collectorMap.has(groupingId)) {
          collectorMap.set(groupingId, {
            collector_id: groupingId,
            collector_name: collectorName,
            total_collections: 0,
            // Removed total_collected_liters to prevent fraud
            total_received_liters: 0,
            variance_type: 'none',
            collections: [],
            first_approval_date: record.approved_at
          });
        }

        const summary = collectorMap.get(groupingId)!;
        summary.total_collections += 1;
        // Removed adding to total_collected_liters to prevent fraud
        summary.total_received_liters += record.company_received_liters;
        summary.collections.push({
          ...record,
          collection_staff: staffId ? { 
            profiles: { full_name: collectorName } 
          } : null
        } as VarianceRecord);
      });

      // Calculate averages and determine variance types
      collectorMap.forEach(summary => {
        // Removed calculation based on collected liters to prevent fraud
        // Using a simple average of variance percentages instead
        // if (summary.collections.length > 0) {
        //   const totalVariancePercentage = summary.collections.reduce((sum, record) => 
        //     sum + record.variance_percentage, 0);
        //   summary.average_variance_percentage = totalVariancePercentage / summary.collections.length;
        // }
        // 
        // if (summary.total_variance_liters > 0) {
        //   summary.variance_type = 'positive';
        // } else if (summary.total_variance_liters < 0) {
        //   summary.variance_type = 'negative';
        // } else {
        //   summary.variance_type = 'none';
        // }
        
        // Set a default variance type since we're not calculating per-collector variance
        summary.variance_type = 'none';
        
        // Calculate approved vs pending collections for this collector
        const approvedCollections = summary.collections.filter(isCollectionApproved).length;
        const pendingCollections = summary.collections.filter(isCollectionPending).length;
        
        // Add these properties to the summary
        summary.approved_collections = approvedCollections;
        summary.pending_collections = pendingCollections;
      });

      const summariesArray = Array.from(collectorMap.values());
      
      // Calculate overall summary data
      const totalCollections = varianceData.length;
      const positiveVariances = varianceData.filter(v => v.variance_type === 'positive').length;
      const negativeVariances = varianceData.filter(v => v.variance_type === 'negative').length;
      const totalPenalties = varianceData.reduce((sum, v) => sum + (v.penalty_amount || 0), 0);
      // Removed totalCollectedLiters calculation to prevent fraud
      const totalReceivedLiters = varianceData.reduce((sum, v) => sum + (v.company_received_liters || 0), 0);
      // Keep overallVariancePercentage calculation for total variance information
      const overallVariancePercentage = varianceData.length > 0 
        ? (varianceData.reduce((sum, v) => sum + (v.variance_liters || 0), 0) / totalReceivedLiters) * 100
        : 0;

      setVarianceRecords(transformedData);
      setCollectorSummaries(summariesArray);
      setSummaryData({
        totalCollections,
        positiveVariances,
        negativeVariances,
        totalPenalties,
        // Removed totalCollectedLiters to prevent fraud
        totalReceivedLiters,
        overallVariancePercentage
      });

      showSuccess('Variance reports loaded successfully');

    } catch (error) {
      console.error('Error fetching variance reports:', error);
      showError(error instanceof Error ? error.message : 'Failed to load variance reports');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, showError, showSuccess]);

  useEffect(() => {
    fetchVarianceReports();
  }, [timeframe]);

  // Function to determine if collection is approved
  const isCollectionApproved = (record: VarianceRecord) => {
    // A collection is approved if it has a company_approval_id and approved_for_company is true
    // Based on the schema, this is determined by the presence of an approval record in milk_approvals
    return record.approved_at !== null && record.approved_at !== undefined && record.approved_at.length > 0;
  };

  // Function to determine if collection is pending
  const isCollectionPending = (record: VarianceRecord) => {
    // A collection is pending if it doesn't have an approval timestamp
    return !record.approved_at || record.approved_at.length === 0;
  };

  // Chart data preparation
  const varianceDistributionData: VarianceDistributionData[] = [
    { name: 'Positive', value: summaryData.positiveVariances, color: COLORS.positive },
    { name: 'Negative', value: summaryData.negativeVariances, color: COLORS.negative },
    { name: 'No Variance', value: summaryData.totalCollections - summaryData.positiveVariances - summaryData.negativeVariances, color: COLORS.none }
  ];

  const collectorPerformanceData: CollectorPerformanceData[] = collectorSummaries.map(summary => ({
    collector_name: summary.collector_name,
    total_variance: 0, // Set to 0 since we're not showing per-collector variance
    collection_count: summary.total_collections
  }));

  const getVarianceIcon = (type: 'positive' | 'negative' | 'none') => {
    switch (type) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getVarianceBadge = (type: 'positive' | 'negative' | 'none') => {
    const variants = {
      positive: 'default',
      negative: 'destructive',
      none: 'secondary'
    } as const;

    return (
      <Badge variant={variants[type]} className="capitalize">
        {type}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading variance reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Milk Collection Variance Report</h1>
          <p className="text-muted-foreground">
            Monitor and analyze milk collection variances (Note: Only negative variances incur penalties)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={fetchVarianceReports} />
        </div>
      </div>

      {/* Timeframe Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Timeframe:</span>
            </div>
            <div className="flex gap-2">
              {(['week', 'month', 'quarter'] as const).map((period) => (
                <Button
                  key={period}
                  variant={timeframe === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe(period)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalCollections}</div>
            <p className="text-xs text-muted-foreground">
              {summaryData.totalReceivedLiters.toFixed(1)}L received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summaryData.overallVariancePercentage > 0 ? 'text-green-600' : 
              summaryData.overallVariancePercentage < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {summaryData.overallVariancePercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall variance percentage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance Distribution</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData.positiveVariances} / {summaryData.negativeVariances}
            </div>
            <p className="text-xs text-muted-foreground">
              Positive / Negative variances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {summaryData.totalPenalties.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total penalty amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Views - Only Analytics Tab */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Variance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={varianceDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {varianceDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VarianceReportPage;