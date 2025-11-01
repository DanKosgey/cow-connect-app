import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Milk, 
  Droplets, 
  Award, 
  Calendar,
  Search,
  Filter,
  Download,
  Plus
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useRealtimeFarmerCollections } from "@/hooks/useRealtimeCollections";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import RefreshButton from '@/components/ui/RefreshButton';
import { useFarmerCollectionsData } from '@/hooks/useFarmerCollectionsData';
import { TimeframeSelector } from "@/components/TimeframeSelector";

interface Collection {
  id: string;
  collection_date: string;
  liters: number;
  total_amount: number;
  status: string;
  rate_per_liter: number;
}

const CollectionsPage = () => {
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("month"); // Add timeframe state
  
  const { data: collectionsData, isLoading: loading, isError, error, refetch } = useFarmerCollectionsData(farmerId, timeframe);
  
  const collections = collectionsData?.collections || [];
  const totalLiters = collectionsData?.totalLiters || 0;
  const totalAmount = collectionsData?.totalAmount || 0;
  const recentCollection = collectionsData?.recentCollection;
  
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  
  const { collections: realtimeCollections } = useRealtimeFarmerCollections(farmerId || undefined);

  // Update timeframe handler
  const handleTimeframeChange = (timeframeValue: string, start: Date, end: Date) => {
    setTimeframe(timeframeValue);
    // The data will be refetched automatically due to the query key dependency
  };

  // Update toast ref whenever toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Fetch farmer data - wrapped in useCallback to prevent recreation on every render
  const fetchFarmerData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch farmer profile with better error handling
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (farmerError) {
        console.error('Error fetching farmer data:', farmerError);
        toastRef.current.error('Error', 'Failed to load farmer profile');
        return;
      }

      if (!farmerData) {
        console.warn('No farmer data found for user:', user.id);
        toastRef.current.error('Warning', 'Farmer profile not found. Please complete your registration.');
        return;
      }

      setFarmerId(farmerData.id);
    } catch (err) {
      console.error('Error fetching farmer data:', err);
      toastRef.current.error('Error', 'Failed to load farmer profile');
    }
  }, []); // Empty dependency array - only created once

  // Fetch farmer data effect
  useEffect(() => {
    fetchFarmerData();
  }, [fetchFarmerData]); // Depend on the memoized function

  // Update filtered collections when collections or filters change
  // Use useCallback to memoize the filtering function
  const updateFilteredCollections = useCallback(() => {
    let result = [...collections];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(collection => 
        collection.liters.toString().includes(searchTerm)
      );
    }
    
    // Apply date filter
    if (dateFilter) {
      result = result.filter(collection => 
        new Date(collection.collection_date).toDateString() === new Date(dateFilter).toDateString()
      );
    }
    
    setFilteredCollections(result);
  }, [searchTerm, dateFilter, collectionsData]);

  // Run the filtering when dependencies change
  useEffect(() => {
    updateFilteredCollections();
  }, [searchTerm, dateFilter, collectionsData]);

  // Prepare chart data with useMemo to prevent unnecessary recalculations
  const chartData = React.useMemo(() => {
    // Sort collections by date for proper time series visualization
    const sortedCollections = [...filteredCollections].sort((a, b) => 
      new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime()
    );
    
    // Take last 30 collections for the chart
    const recentCollections = sortedCollections.slice(-30);
    
    return recentCollections.map(collection => ({
      date: new Date(collection.collection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      liters: collection.liters,
      amount: collection.total_amount,
      rate: collection.rate_per_liter
    }));
  }, [filteredCollections]);

  const exportCollections = (format: 'csv' | 'json') => {
    try {
      const exportData = filteredCollections.map(collection => ({
        date: new Date(collection.collection_date).toLocaleDateString(),
        liters: collection.liters,
        rate_per_liter: collection.rate_per_liter,
        total_amount: collection.total_amount,
        status: collection.status
      }));
      
      if (format === 'csv') {
        exportToCSV(exportData, 'collections-report');
        toastRef.current.success('Success', 'Collections exported as CSV');
      } else {
        exportToJSON(exportData, 'collections-report');
        toastRef.current.success('Success', 'Collections exported as JSON');
      }
    } catch (err) {
      console.error('Error exporting collections:', err);
      toastRef.current.error('Error', 'Failed to export collections');
    }
  };

  // Get timeframe label
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      default: return 'This Period';
    }
  };

  // Get timeframe description
  const getTimeframeDescription = () => {
    switch (timeframe) {
      case 'day': return 'Collections today';
      case 'week': return 'Collections this week';
      case 'month': return 'Collections this month';
      case 'quarter': return 'Collections this quarter';
      case 'year': return 'Collections this year';
      default: return 'Collections this period';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const timeframeLabel = getTimeframeLabel();
  const timeframeDescription = getTimeframeDescription();

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="My Collections"
        description="View and manage all your milk collections"
        actions={
          <div className="flex space-x-3">
            <TimeframeSelector onTimeframeChange={handleTimeframeChange} defaultValue={timeframe} />
            <RefreshButton 
              isRefreshing={loading} 
              onRefresh={refetch} 
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
            />
            {/* Removed New Collection button as requested */}
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportCollections('csv')}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportCollections('json')}>
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={`${timeframeLabel}'s Collections`}
          value={collections.filter(c => new Date(c.collection_date).toDateString() === new Date().toDateString()).length}
          description={timeframeDescription}
          icon={<Milk className="h-6 w-6 text-blue-500" />}
          color="bg-blue-100"
        />
        <StatCard
          title={`${timeframeLabel}`}
          value={`${collections.reduce((sum, c) => sum + c.liters, 0)} L`}
          description={`Total liters collected ${timeframe === 'month' ? 'this month' : timeframe === 'week' ? 'this week' : timeframe === 'day' ? 'today' : timeframe === 'quarter' ? 'this quarter' : timeframe === 'year' ? 'this year' : 'this period'}`}
          icon={<Droplets className="h-6 w-6 text-green-500" />}
          color="bg-green-100"
        />

        <StatCard
          title="Total Earnings"
          value={`KSh ${collections.reduce((sum, c) => sum + (c.total_amount || 0), 0).toFixed(2)}`}
          description={`${timeframeLabel} earnings`}
          icon={<Calendar className="h-6 w-6 text-yellow-500" />}
          color="bg-yellow-100"
        />
      </div>

      {/* Filters and Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search collections..."
          >
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

          </FilterBar>
        </CardContent>
      </Card>

      {/* Enhanced Collection Trend Chart with Dual Axis */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Collection Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                />
                <YAxis 
                  yAxisId="left" 
                  stroke="#10b981" 
                  tickFormatter={(value) => `${value} L`}
                  label={{ value: 'Liters', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#10b981' } }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#3b82f6" 
                  tickFormatter={(value) => `KSh${value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}`}
                  label={{ value: 'Earnings (KSh)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#3b82f6' } }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} 
                  formatter={(value, name) => {
                    if (name === 'liters') return [`${value} L`, 'Liters'];
                    if (name === 'amount') return [`KSh ${Number(value).toLocaleString()}`, 'Earnings'];
                    if (name === 'rate') return [`KSh ${value}/L`, 'Rate'];
                    return [value, name];
                  }}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="liters" 
                  fill="#10b981" 
                  name="Liters Collected"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: '#3b82f6' }} 
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  name="Earnings"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5 text-primary" />
            Collection History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Date", "Liters", "Rate (KSh/L)", "Amount (KSh)", "Status"]}
            data={filteredCollections}
            renderRow={(collection) => (
              <tr key={collection.id} className="hover:bg-muted/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {new Date(collection.collection_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {collection.liters} L
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {collection.rate_per_liter?.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {collection.total_amount?.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    collection.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    collection.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {collection.status}
                  </span>
                </td>
              </tr>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionsPage;