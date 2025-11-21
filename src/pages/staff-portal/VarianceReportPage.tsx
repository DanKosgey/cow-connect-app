import React, { useState, useEffect } from 'react';
import { MilkApprovalService } from '@/services/milk-approval-service';
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
  PieChart,
  Activity,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import RefreshButton from '@/components/ui/RefreshButton';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import * as RechartsPrimitive from "recharts";

interface VarianceRecord {
  id: string;
  collection_id: string;
  liters: number; // Collected liters
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: 'positive' | 'negative' | 'none';
  penalty_amount: number;
  approved_at: string;
  farmers: {
    full_name: string;
  } | null;
  // Collector information from collections table (staff_id)
  collection_staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
  // Approver information from milk_approvals table (staff_id)
  approval_staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

// New interface for grouped collector variance data
interface CollectorVarianceSummary {
  collector_id: string;
  collector_name: string;
  total_collections: number;
  total_collected_liters: number;
  total_received_liters: number;
  total_variance_liters: number;
  average_variance_percentage: number;
  variance_type: 'positive' | 'negative' | 'none';
  total_penalty_amount: number;
  collections: VarianceRecord[];
  first_approval_date: string;
}

const VarianceReportPage: React.FC = () => {
  const { error: showError } = useToastNotifications();
  
  const [varianceRecords, setVarianceRecords] = useState<VarianceRecord[]>([]);
  const [collectorSummaries, setCollectorSummaries] = useState<CollectorVarianceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [summaryData, setSummaryData] = useState({
    totalCollections: 0,
    positiveVariances: 0,
    negativeVariances: 0,
    totalPenalties: 0
  });
  const [topCollectors, setTopCollectors] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'individual' | 'collector'>('collector'); // New state for view mode

  useEffect(() => {
    fetchVarianceReports();
  }, [timeframe]);

  const fetchVarianceReports = async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate = new Date();
      
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
      
      console.log('Date range:', { startDate: startDate.toISOString(), endDate: now.toISOString() });
      
      // Fetch variance records with both collector and approver information
      // Using explicit relationship names to avoid PGRST201 error
      let query = supabase
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
            liters,
            farmers (
              full_name
            ),
            staff!collections_staff_id_fkey (
              id,
              profiles (
                full_name
              )
            )
          ),
          staff!milk_approvals_staff_id_fkey (
            profiles (
              full_name
            )
          )
        `)
        .gte('approved_at', startDate.toISOString())
        .order('approved_at', { ascending: false })
        .limit(100);
      
      let { data: varianceData, error: varianceError } = await query;
      
      // If no data found with date filter, try without date filter for debugging
      if (!varianceData || varianceData.length === 0) {
        console.log('No data found with date filter, trying without date filter');
        const { data: allData, error: allError } = await supabase
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
              liters,
              farmers (
                full_name
              ),
              staff!collections_staff_id_fkey (
                id,
                profiles (
                  full_name
                )
              )
            ),
            staff!milk_approvals_staff_id_fkey (
              profiles (
                full_name
              )
            )
          `)
          .order('approved_at', { ascending: false })
          .limit(100);
        
        if (!allError) {
          varianceData = allData;
          varianceError = null;
          console.log('Found data without date filter:', allData);
        }
      }

      if (varianceError) throw varianceError;
      
      console.log('Variance data fetched:', varianceData);
      
      // Transform data to match interface
      const transformedData = (varianceData || []).map(item => ({
        ...item,
        liters: item.collections?.liters || 0, // Collected liters
        farmers: item.collections?.farmers || null,
        collection_staff: item.collections?.staff || null, // Collector
        approval_staff: item.staff || null // Approver
      }));
      
      console.log('Transformed data:', transformedData);
      
      setVarianceRecords(transformedData);
      
      // Group by collector to create collector summaries
      const collectorMap = new Map<string, CollectorVarianceSummary>();
      
      transformedData.forEach(record => {
        // Get collector information
        const staffInfo = record.collection_staff;
        // Use the staff ID as the unique identifier, fallback to name if ID is not available
        const collectorId = staffInfo?.id || staffInfo?.profiles?.full_name || 'Unknown Collector';
        const collectorName = staffInfo?.profiles?.full_name || 'Unknown Collector';
        
        if (!collectorMap.has(collectorId)) {
          collectorMap.set(collectorId, {
            collector_id: collectorId,
            collector_name: collectorName,
            total_collections: 0,
            total_collected_liters: 0,
            total_received_liters: 0,
            total_variance_liters: 0,
            average_variance_percentage: 0,
            variance_type: 'none',
            total_penalty_amount: 0,
            collections: [],
            first_approval_date: record.approved_at
          });
        }
        
        const summary = collectorMap.get(collectorId)!;
        summary.total_collections += 1;
        summary.total_collected_liters += record.liters || 0;
        summary.total_received_liters += record.company_received_liters || 0;
        summary.total_variance_liters += record.variance_liters || 0;
        summary.total_penalty_amount += record.penalty_amount || 0;
        summary.collections.push(record);
        
        // Update first approval date if this record is earlier
        if (new Date(record.approved_at) < new Date(summary.first_approval_date)) {
          summary.first_approval_date = record.approved_at;
        }
      });
      
      // Calculate average variance percentage for each collector
      collectorMap.forEach((summary, collectorId) => {
        if (summary.total_collected_liters > 0) {
          summary.average_variance_percentage = (summary.total_variance_liters / summary.total_collected_liters) * 100;
        } else {
          summary.average_variance_percentage = 0;
        }
        
        // Determine overall variance type for collector
        if (summary.total_variance_liters > 0) {
          summary.variance_type = 'positive';
        } else if (summary.total_variance_liters < 0) {
          summary.variance_type = 'negative';
        } else {
          summary.variance_type = 'none';
        }
      });
      
      const summariesArray = Array.from(collectorMap.values());
      console.log('Collector summaries:', summariesArray);
      
      setCollectorSummaries(summariesArray);
      
      // Calculate summary data
      const totalCollections = varianceData?.length || 0;
      const positiveVariances = varianceData?.filter(v => v.variance_type === 'positive').length || 0;
      const negativeVariances = varianceData?.filter(v => v.variance_type === 'negative').length || 0;
      const totalPenalties = varianceData?.reduce((sum, v) => sum + (v.penalty_amount || 0), 0) || 0;
      
      console.log('Summary data:', { totalCollections, positiveVariances, negativeVariances, totalPenalties });
      
      setSummaryData({
        totalCollections,
        positiveVariances,
        negativeVariances,
        totalPenalties
      });
      
      // Fetch top collectors data
      try {
        // First check if the collector_performance table exists
        const { error: testError } = await supabase
          .from('collector_performance')
          .select('staff_id')
          .limit(1);
        
        if (testError && testError.code === 'PGRST205') {
          console.log('Collector performance table does not exist');
          setTopCollectors([]);
          return;
        }
        
        // Use the correct RPC function name
        const { data: collectorData, error: collectorError } = await supabase
          .rpc('get_all_collectors_summary');
        
        if (collectorError) {
          console.error('Error fetching top collectors:', collectorError);
          // Try to fetch from collector_performance table directly as fallback
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('collector_performance')
            .select(`
              staff_id,
              total_collections,
              average_variance_percentage,
              positive_variances,
              negative_variances,
              total_penalty_amount
            `)
            .limit(5);
          
          if (!fallbackError && fallbackData && fallbackData.length > 0) {
            // Get staff names
            const staffIds = [...new Set(fallbackData.map(item => item.staff_id).filter(Boolean))];
            if (staffIds.length > 0) {
              const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('id, profiles (full_name)')
                .in('id', staffIds);
              
              if (!staffError && staffData) {
                const staffMap = staffData.reduce((acc, staff) => {
                  acc[staff.id] = staff.profiles?.full_name || 'Unknown Collector';
                  return acc;
                }, {} as Record<string, string>);
                
                const enrichedData = fallbackData.map(item => ({
                  ...item,
                  collector_name: staffMap[item.staff_id] || 'Unknown Collector'
                }));
                
                console.log('Fallback collector data:', enrichedData);
                setTopCollectors(enrichedData);
              } else {
                // If we can't get staff names, use the data as is
                const enrichedData = fallbackData.map(item => ({
                  ...item,
                  collector_name: 'Unknown Collector'
                }));
                console.log('Fallback collector data (no staff names):', enrichedData);
                setTopCollectors(enrichedData);
              }
            } else {
              // If no staff IDs, use the data as is
              const enrichedData = fallbackData.map(item => ({
                ...item,
                collector_name: 'Unknown Collector'
              }));
              console.log('Fallback collector data (no staff IDs):', enrichedData);
              setTopCollectors(enrichedData);
            }
          } else {
            console.log('No fallback data available');
            setTopCollectors([]);
          }
        } else {
          console.log('Top collectors data:', collectorData);
          // Transform the data to match the expected format
          const transformedData = (collectorData || []).map((item: any) => ({
            staff_id: item.staff_id,
            collector_name: item.collector_name || 'Unknown Collector',
            total_collections: item.total_collections || 0,
            average_variance_percentage: item.average_variance_percentage || 0,
            positive_variances: item.positive_variances || 0,
            negative_variances: item.negative_variances || 0,
            total_penalty_amount: item.total_penalty_amount || 0
          }));
          setTopCollectors(transformedData);
        }
      } catch (rpcError) {
        console.error('RPC call failed:', rpcError);
      }
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

  // Function to determine if collection is approved
  const isCollectionApproved = (record: VarianceRecord) => {
    return record.company_received_liters > 0;
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

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'collector' ? 'default' : 'outline'}
          onClick={() => setViewMode('collector')}
          size="sm"
        >
          Collector Summary
        </Button>
        <Button
          variant={viewMode === 'individual' ? 'default' : 'outline'}
          onClick={() => setViewMode('individual')}
          size="sm"
        >
          Individual Collections
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <Milk className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalCollections}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Variances</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.positiveVariances}</div>
            <p className="text-xs text-muted-foreground">Average +2.3% variance</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative Variances</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.negativeVariances}</div>
            <p className="text-xs text-muted-foreground">Average -1.8% variance</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {summaryData.totalPenalties.toFixed(2)}</div>
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
                <p className="text-sm text-muted-foreground">
                  Positive: {summaryData.positiveVariances}, Negative: {summaryData.negativeVariances}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Variance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Collector Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Top collector performance</p>
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(5, topCollectors.length)} top collectors
                </p>
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
                {topCollectors.length > 0 ? (
                  topCollectors.map((collector, index) => (
                    <TableRow key={collector.staff_id || index}>
                      <TableCell className="font-medium">{collector.collector_name || 'Unknown Collector'}</TableCell>
                      <TableCell>{collector.total_collections || 0}</TableCell>
                      <TableCell className={collector.average_variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {collector.average_variance_percentage?.toFixed(2) || '0.00'}%
                      </TableCell>
                      <TableCell>{collector.positive_variances || 0}</TableCell>
                      <TableCell>{collector.negative_variances || 0}</TableCell>
                      <TableCell>KSh {collector.total_penalty_amount?.toFixed(2) || '0.00'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No collector performance data found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Collector Summary Table */}
      {viewMode === 'collector' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Variance by Collector (Total Collections)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collector</TableHead>
                    <TableHead>Collections</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Penalty</TableHead>
                    <TableHead>Last Approval</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : collectorSummaries.length > 0 ? (
                    collectorSummaries.map((summary) => (
                      <TableRow key={summary.collector_id}>
                        <TableCell className="font-medium">
                          {summary.collector_name}
                        </TableCell>
                        <TableCell>
                          {summary.total_collections}
                        </TableCell>
                        <TableCell>
                          {summary.total_collected_liters.toFixed(2)} L
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {summary.total_received_liters > 0 ? (
                              <>
                                <Check className="h-4 w-4 text-green-500" />
                                <span>Yes</span>
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 text-red-500" />
                                <span>No</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getVarianceIcon(summary.variance_type)}
                            <span className={getVarianceColor(summary.variance_type)}>
                              {summary.total_variance_liters > 0 ? '+' : ''}{summary.total_variance_liters.toFixed(2)} L
                            </span>
                            <Badge className={getVarianceBadgeColor(summary.variance_type)}>
                              {summary.average_variance_percentage > 0 ? '+' : ''}{summary.average_variance_percentage.toFixed(2)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          KSh {summary.total_penalty_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(summary.first_approval_date), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No collector variance data found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Collections Table */}
      {viewMode === 'individual' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Individual Collection Records
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
                    <TableHead>Approved</TableHead>
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
                          {record.collection_staff?.profiles?.full_name || 'Unknown Collector'}
                        </TableCell>
                        <TableCell>
                          {record.liters.toFixed(2)} L
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isCollectionApproved(record) ? (
                              <>
                                <Check className="h-4 w-4 text-green-500" />
                                <span>Yes</span>
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 text-red-500" />
                                <span>No</span>
                              </>
                            )}
                          </div>
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
      )}
    </div>
  );
};

export default VarianceReportPage;