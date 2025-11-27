import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, startOfDay, startOfWeek, startOfMonth, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import RefreshButton from '@/components/ui/RefreshButton';
import {
  Calendar,
  User,
  Milk,
  TrendingUp,
  TrendingDown,
  Search,
  CheckCircle
} from 'lucide-react';

interface CollectorApprovalRecord {
  id: string;
  collection_id: string;
  staff_id: string;
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: string;
  penalty_amount: number;
  approval_notes: string | null;
  approved_at: string;
  collector_name: string;
  collection_date: string;
  // Removed collected_liters to prevent fraud
  staff_id_from_collection: string; // Added to store the collector's staff ID
}

interface CollectorSummary {
  staff_id: string;
  collector_name: string;
  total_approvals: number;
  total_collections: number;
  // Removed total_liters_collected to prevent fraud
  total_liters_received: number;
  // Removed variance and penalty data as staff shouldn't see per-collector variance
  // average_variance_percentage: number;
  // total_penalty_amount: number;
  // Add daily collections data as an array instead of Map for serialization
  daily_collections: {
    date: string;
    approvals: number;
    liters_received: number;
    // Removed variance and penalty data as staff shouldn't see per-collector variance
  }[];
}

interface TimeBasedSummary {
  date: string;
  approvals: number;
  liters_received: number;
  collectors: number;
}

const CollectorApprovalHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [approvalRecords, setApprovalRecords] = useState<CollectorApprovalRecord[]>([]);
  const [collectorSummaries, setCollectorSummaries] = useState<CollectorSummary[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<CollectorApprovalRecord[]>([]);
  const [dailySummaries, setDailySummaries] = useState<TimeBasedSummary[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<TimeBasedSummary[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<TimeBasedSummary[]>([]);
  const [specificDateTotal, setSpecificDateTotal] = useState<{ 
    date: string; 
    collector: string; 
    totalLiters: number; 
    totalApprovals: number;
    collectors: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollector, setSelectedCollector] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [specificDate, setSpecificDate] = useState<string>('');
  const [specificCollector, setSpecificCollector] = useState<string>('');

  useEffect(() => {
    fetchApprovalHistory();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, selectedCollector, dateRange, approvalRecords]);

  useEffect(() => {
    calculateSpecificDateTotal();
  }, [specificDate, specificCollector]);

  const fetchApprovalHistory = async () => {
    setIsLoading(true);
    try {
      // Fetch all milk approvals
      const { data: approvals, error: approvalsError } = await supabase
        .from('milk_approvals')
        .select('*')
        .order('approved_at', { ascending: false })
        .limit(1000);

      if (approvalsError) throw approvalsError;

      // Get unique collection IDs
      const collectionIds = approvals?.map(approval => approval.collection_id) || [];
      
      // Fetch collections with staff information
      let collectionsWithStaff: any[] = [];
      if (collectionIds.length > 0) {
        const { data: collections, error: collectionsError } = await supabase
          .from('collections')
          .select(`
            id,
            collection_date,
            staff_id,
            staff!collections_staff_id_fkey (
              profiles (
                full_name
              )
            )
          `)
          .in('id', collectionIds);

        if (collectionsError) throw collectionsError;
        collectionsWithStaff = collections || [];
      }

      // Create a map for quick lookup
      const collectionsMap = new Map(collectionsWithStaff.map(collection => [
        collection.id,
        {
          collection_date: collection.collection_date,
          staff_id: collection.staff_id,
          collector_name: collection.staff?.profiles?.full_name || 'Unknown Collector'
        }
      ]));

      // Transform data for display
      const transformedRecords: CollectorApprovalRecord[] = approvals?.map(approval => {
        const collectionInfo = collectionsMap.get(approval.collection_id) || {
          collection_date: '',
          staff_id: '',
          collector_name: 'Unknown Collector'
        };
        
        return {
          id: approval.id,
          collection_id: approval.collection_id,
          staff_id: approval.staff_id,
          company_received_liters: approval.company_received_liters,
          variance_liters: approval.variance_liters || 0,
          variance_percentage: approval.variance_percentage || 0,
          variance_type: approval.variance_type || 'none',
          penalty_amount: approval.penalty_amount || 0,
          approval_notes: approval.approval_notes,
          approved_at: approval.approved_at,
          collector_name: collectionInfo.collector_name,
          collection_date: collectionInfo.collection_date || '',
          // Removed collected_liters to prevent fraud
          staff_id_from_collection: collectionInfo.staff_id || ''
        };
      }) || [];

      setApprovalRecords(transformedRecords);
      setFilteredRecords(transformedRecords);

      // Calculate summaries
      calculateCollectorSummaries(transformedRecords);
      calculateTimeBasedSummaries(transformedRecords);
    } catch (error) {
      console.error('Error fetching approval history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch approval history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCollectorSummaries = (records: CollectorApprovalRecord[]) => {
    const summariesMap = new Map<string, CollectorSummary>();
    
    records.forEach(record => {
      const collectorId = record.staff_id_from_collection || 'unknown';
      const collectorName = record.collector_name;
      
      if (!summariesMap.has(collectorId)) {
        summariesMap.set(collectorId, {
          staff_id: collectorId,
          collector_name: collectorName,
          total_approvals: 0,
          total_collections: 0,
          // Removed total_liters_collected to prevent fraud
          total_liters_received: 0,
          // Removed variance and penalty data as staff shouldn't see per-collector variance
          // average_variance_percentage: 0,
          // total_penalty_amount: 0,
          // Initialize daily collections array
          daily_collections: []
        });
      }
      
      const summary = summariesMap.get(collectorId)!;
      summary.total_approvals += 1;
      summary.total_collections += 1;
      // Removed adding to total_liters_collected to prevent fraud
      summary.total_liters_received += record.company_received_liters;
      // Removed adding variance and penalty data as staff shouldn't see per-collector variance
      
      // Add daily collection data
      const recordDate = record.approved_at.split('T')[0]; // Extract date part
      
      // Check if we already have an entry for this date
      const existingDailyEntry = summary.daily_collections.find(entry => entry.date === recordDate);
      
      if (existingDailyEntry) {
        // Update existing entry
        existingDailyEntry.approvals += 1;
        existingDailyEntry.liters_received += record.company_received_liters;
        // Removed variance and penalty data as staff shouldn't see per-collector variance
      } else {
        // Create new entry
        summary.daily_collections.push({
          date: recordDate,
          approvals: 1,
          liters_received: record.company_received_liters
          // Removed variance and penalty data as staff shouldn't see per-collector variance
        });
      }
    });
    
    // Calculate average variance percentage for each collector
    summariesMap.forEach(summary => {
      // Removed variance calculation as staff shouldn't see per-collector variance
    });
    
    setCollectorSummaries(Array.from(summariesMap.values()));
  };

  const calculateTimeBasedSummaries = (records: CollectorApprovalRecord[]) => {
    // Group records by date for daily summaries
    const dailyMap = new Map<string, { approvals: number; liters: number; collectors: Set<string> }>();
    
    records.forEach(record => {
      const date = record.approved_at.split('T')[0]; // Extract date part
      const collectorId = record.staff_id_from_collection || 'unknown';
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          approvals: 0,
          liters: 0,
          collectors: new Set()
        });
      }
      
      const dailyData = dailyMap.get(date)!;
      dailyData.approvals += 1;
      dailyData.liters += record.company_received_liters;
      dailyData.collectors.add(collectorId);
    });
    
    // Convert to array and sort by date
    const dailySummariesArray: TimeBasedSummary[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        approvals: data.approvals,
        liters_received: parseFloat(data.liters.toFixed(2)),
        collectors: data.collectors.size
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setDailySummaries(dailySummariesArray);
    
    // Group records by week for weekly summaries
    const weeklyMap = new Map<string, { approvals: number; liters: number; collectors: Set<string> }>();
    
    records.forEach(record => {
      const recordDate = new Date(record.approved_at);
      const weekStart = startOfWeek(recordDate, { weekStartsOn: 1 }); // Monday as start of week
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const collectorId = record.staff_id_from_collection || 'unknown';
      
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          approvals: 0,
          liters: 0,
          collectors: new Set()
        });
      }
      
      const weeklyData = weeklyMap.get(weekKey)!;
      weeklyData.approvals += 1;
      weeklyData.liters += record.company_received_liters;
      weeklyData.collectors.add(collectorId);
    });
    
    // Convert to array and sort by date
    const weeklySummariesArray: TimeBasedSummary[] = Array.from(weeklyMap.entries())
      .map(([week, data]) => ({
        date: week,
        approvals: data.approvals,
        liters_received: parseFloat(data.liters.toFixed(2)),
        collectors: data.collectors.size
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setWeeklySummaries(weeklySummariesArray);
    
    // Group records by month for monthly summaries
    const monthlyMap = new Map<string, { approvals: number; liters: number; collectors: Set<string> }>();
    
    records.forEach(record => {
      const recordDate = new Date(record.approved_at);
      const monthKey = format(recordDate, 'yyyy-MM');
      const collectorId = record.staff_id_from_collection || 'unknown';
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          approvals: 0,
          liters: 0,
          collectors: new Set()
        });
      }
      
      const monthlyData = monthlyMap.get(monthKey)!;
      monthlyData.approvals += 1;
      monthlyData.liters += record.company_received_liters;
      monthlyData.collectors.add(collectorId);
    });
    
    // Convert to array and sort by date
    const monthlySummariesArray: TimeBasedSummary[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        date: month,
        approvals: data.approvals,
        liters_received: parseFloat(data.liters.toFixed(2)),
        collectors: data.collectors.size
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setMonthlySummaries(monthlySummariesArray);
  };

  const calculateSpecificDateTotal = () => {
    // Add validation
    if (!specificDate) {
      toast({
        title: "Validation Error",
        description: "Please select a date",
        variant: "destructive",
      });
      setSpecificDateTotal(null);
      return;
    }

    if (!specificCollector) {
      toast({
        title: "Validation Error",
        description: "Please select a collector",
        variant: "destructive",
      });
      setSpecificDateTotal(null);
      return;
    }

    // Filter records for the specific date and collector
    const filtered = approvalRecords.filter(record => {
      const recordDate = record.approved_at.split('T')[0]; // Extract date part
      const collectorId = record.staff_id_from_collection || '';
      return recordDate === specificDate && collectorId === specificCollector;
    });

    if (filtered.length === 0) {
      const collectorName = collectorSummaries.find(c => c.staff_id === specificCollector)?.collector_name || 'Unknown Collector';
      setSpecificDateTotal({
        date: specificDate,
        collector: collectorName,
        totalLiters: 0,
        totalApprovals: 0,
        collectors: 0
      });
      toast({
        title: "No Data Found",
        description: `No approvals found for ${collectorName} on ${format(new Date(specificDate), 'MMMM dd, yyyy')}`,
        variant: "default",
      });
      return;
    }

    // Calculate totals
    const totalLiters = filtered.reduce((sum, record) => sum + record.company_received_liters, 0);
    const collectorName = filtered[0].collector_name;

    setSpecificDateTotal({
      date: specificDate,
      collector: collectorName,
      totalLiters: parseFloat(totalLiters.toFixed(2)),
      totalApprovals: filtered.length,
      collectors: 1
    });
    
    toast({
      title: "Success",
      description: `Found ${filtered.length} approvals for ${collectorName} on ${format(new Date(specificDate), 'MMMM dd, yyyy')}`,
      variant: "default",
    });
  };

  // Add a function to filter records by specific date and collector
  const filterRecordsBySpecificDateAndCollector = () => {
    if (!specificDate || !specificCollector) {
      return [];
    }

    return approvalRecords.filter(record => {
      const recordDate = record.approved_at.split('T')[0]; // Extract date part
      const collectorId = record.staff_id_from_collection || '';
      return recordDate === specificDate && collectorId === specificCollector;
    });
  };

  const filterRecords = () => {
    let filtered = [...approvalRecords];
    
    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.collector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.collection_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply collector filter
    if (selectedCollector !== 'all') {
      filtered = filtered.filter(record => 
        record.staff_id_from_collection === selectedCollector
      );
    }
    
    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.approved_at);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); // Include the entire end day
        return recordDate >= startDate && recordDate <= endDate;
      });
    }
    
    setFilteredRecords(filtered);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatWeekRange = (startDateString: string) => {
    try {
      const startDate = new Date(startDateString);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
    } catch {
      return 'Invalid Date Range';
    }
  };

  const getVarianceBadgeVariant = (varianceType: string) => {
    switch (varianceType) {
      case 'positive': return 'default';
      case 'negative': return 'destructive';
      default: return 'secondary';
    }
  };

  const getVarianceIcon = (varianceType: string) => {
    switch (varianceType) {
      case 'positive': return <TrendingUp className="h-4 w-4" />;
      case 'negative': return <TrendingDown className="h-4 w-4" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collector Approval History</h1>
          <p className="text-muted-foreground">
            Track all approvals and values recorded for each collector
          </p>
        </div>
        <RefreshButton onRefresh={fetchApprovalHistory} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approvals</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvalRecords.length}</div>
            <p className="text-xs text-muted-foreground">Total collection approvals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Collectors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectorSummaries.length}</div>
            <p className="text-xs text-muted-foreground">Collectors with approvals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liters</CardTitle>
            <Milk className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvalRecords.reduce((sum, record) => sum + record.company_received_liters, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Liters approved for company</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Variance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                approvalRecords.reduce((sum, record) => sum + (record.variance_percentage || 0), 0) / 
                (approvalRecords.length || 1)
              ).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Average variance percentage</p>
          </CardContent>
        </Card>
      </div>

      {/* Time-Based Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Approvals</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    <TableHead className="text-right">Collectors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySummaries.slice(0, 10).map((summary, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(new Date(summary.date), 'MMM dd')}</TableCell>
                      <TableCell className="text-right">{summary.approvals}</TableCell>
                      <TableCell className="text-right">{summary.liters_received.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{summary.collectors}</TableCell>
                    </TableRow>
                  ))}
                  {dailySummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No daily data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Approvals</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    <TableHead className="text-right">Collectors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklySummaries.slice(0, 10).map((summary, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs">{formatWeekRange(summary.date)}</TableCell>
                      <TableCell className="text-right">{summary.approvals}</TableCell>
                      <TableCell className="text-right">{summary.liters_received.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{summary.collectors}</TableCell>
                    </TableRow>
                  ))}
                  {weeklySummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No weekly data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Approvals</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    <TableHead className="text-right">Collectors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummaries.slice(0, 10).map((summary, index) => (
                    <TableRow key={index}>
                      <TableCell>{format(new Date(summary.date + '-01'), 'MMM yyyy')}</TableCell>
                      <TableCell className="text-right">{summary.approvals}</TableCell>
                      <TableCell className="text-right">{summary.liters_received.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{summary.collectors}</TableCell>
                    </TableRow>
                  ))}
                  {monthlySummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No monthly data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Specific Date and Collector Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search by Date and Collector
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specific-date">Select Date</Label>
              <Input
                id="specific-date"
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specific-collector">Select Collector</Label>
              <select
                id="specific-collector"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={specificCollector}
                onChange={(e) => setSpecificCollector(e.target.value)}
              >
                <option value="">Select a Collector</option>
                {collectorSummaries.map(collector => (
                  <option key={collector.staff_id} value={collector.staff_id}>
                    {collector.collector_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={calculateSpecificDateTotal}
                disabled={!specificDate || !specificCollector}
              >
                Calculate Total
              </Button>
            </div>
          </div>
          
          {specificDateTotal && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-lg mb-2">Results for {format(new Date(specificDateTotal.date), 'MMMM dd, yyyy')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground">Collector</p>
                  <p className="font-semibold">{specificDateTotal.collector}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground">Total Approvals</p>
                  <p className="font-semibold text-2xl text-primary">{specificDateTotal.totalApprovals}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground">Total Liters Approved</p>
                  <p className="font-semibold text-2xl text-primary">{specificDateTotal.totalLiters.toLocaleString()} L</p>
                </div>
              </div>
              
              {/* Show detailed records for the specific date and collector */}
              {specificDateTotal.totalApprovals > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Detailed Records:</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Collection ID</TableHead>
                          <TableHead className="text-right">Received (L)</TableHead>
                          {/* Removed variance column as staff shouldn't see per-collection variance */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterRecordsBySpecificDateAndCollector().map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{format(new Date(record.approved_at), 'HH:mm')}</TableCell>
                            <TableCell className="font-mono text-xs">{record.collection_id.substring(0, 8)}...</TableCell>
                            <TableCell className="text-right">{record.company_received_liters.toFixed(2)}</TableCell>
                            {/* Removed variance cell as staff shouldn't see per-collection variance */}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Collector</Label>
              <Input
                id="search"
                placeholder="Enter collector name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="collector">Collector</Label>
              <select
                id="collector"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCollector}
                onChange={(e) => setSelectedCollector(e.target.value)}
              >
                <option value="all">All Collectors</option>
                {collectorSummaries.map(collector => (
                  <option key={collector.staff_id} value={collector.staff_id}>
                    {collector.collector_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSelectedCollector('all');
                setDateRange({ start: '', end: '' });
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Collections Summary - Improved for many collectors */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Collections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {collectorSummaries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collector</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Approvals</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    {/* Removed variance and penalty columns as staff shouldn't see per-collector variance */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectorSummaries.map((summary) => {
                    // Sort daily collections by date (most recent first)
                    const sortedDailyCollections = [...summary.daily_collections].sort((a, b) => 
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                    
                    // Get the most recent date for this collector
                    const mostRecentDailyData = sortedDailyCollections.length > 0 ? sortedDailyCollections[0] : null;
                    
                    return mostRecentDailyData ? (
                      <TableRow key={summary.staff_id}>
                        <TableCell className="font-medium">{summary.collector_name}</TableCell>
                        <TableCell>{format(new Date(mostRecentDailyData.date), 'MMM dd')}</TableCell>
                        <TableCell className="text-right">{mostRecentDailyData.approvals}</TableCell>
                        <TableCell className="text-right">{mostRecentDailyData.liters_received.toFixed(0)} L</TableCell>
                        {/* Removed variance and penalty cells as staff shouldn't see per-collector variance */}
                      </TableRow>
                    ) : null;
                  }).filter(row => row !== null)}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No daily collection data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Approval Records */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Approval Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Collection ID</TableHead>
                  {/* Removed "Collected (L)" column to prevent fraud */}
                  <TableHead className="text-right">Received (L)</TableHead>
                  {/* Removed variance columns as staff shouldn't see per-collection variance */}
                  {/* <TableHead className="text-right">Variance (L)</TableHead> */}
                  {/* <TableHead className="text-right">Variance %</TableHead> */}
                  {/* <TableHead className="text-right">Penalty (KSh)</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No approval records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.approved_at)}</TableCell>
                      <TableCell>{record.collector_name}</TableCell>
                      <TableCell className="font-mono text-xs">{record.collection_id.substring(0, 8)}...</TableCell>
                      {/* Removed collected_liters display to prevent fraud */}
                      <TableCell className="text-right">{record.company_received_liters.toFixed(2)}</TableCell>
                      {/* Removed variance cells as staff shouldn't see per-collection variance */}
                      {/* <TableCell className="text-right">
                        <Badge variant={getVarianceBadgeVariant(record.variance_type)}>
                          <div className="flex items-center gap-1">
                            {getVarianceIcon(record.variance_type)}
                            {record.variance_liters.toFixed(2)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getVarianceBadgeVariant(record.variance_type)}>
                          {record.variance_percentage.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {record.penalty_amount.toFixed(2)}
                      </TableCell> */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectorApprovalHistoryPage;