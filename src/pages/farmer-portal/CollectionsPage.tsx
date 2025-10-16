import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useRealtimeFarmerCollections } from "@/hooks/useRealtimeCollections";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";

interface Collection {
  id: string;
  collection_date: string;
  liters: number;
  quality_grade: string;
  total_amount: number;
  status: string;
  rate_per_liter: number;
}

const CollectionsPage = () => {
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const { collections: realtimeCollections, recentCollection, totalLiters, totalAmount, isLoading: realtimeLoading } = useRealtimeFarmerCollections(farmerId || undefined);

  // Update toast ref whenever toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, []); // Empty dependencies to avoid infinite loop

  // Fetch farmer data
  useEffect(() => {
    const fetchFarmerData = async () => {
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
          setLoading(false);
          return;
        }

        if (!farmerData) {
          console.warn('No farmer data found for user:', user.id);
          toastRef.current.error('Warning', 'Farmer profile not found. Please complete your registration.');
          setLoading(false);
          return;
        }

        setFarmerId(farmerData.id);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching farmer data:', err);
        toastRef.current.error('Error', 'Failed to load farmer profile');
        setLoading(false);
      }
    };

    fetchFarmerData();
  }, []);

  // Fetch collections data when farmerId changes
  useEffect(() => {
    if (!farmerId) return;

    const fetchCollections = async () => {
      try {
        // Use real-time collections if available, otherwise fetch from database
        if (realtimeCollections.length > 0) {
          setCollections(realtimeCollections.map(collection => ({
            id: collection.id,
            collection_date: collection.collection_date,
            liters: collection.liters,
            quality_grade: collection.quality_grade,
            total_amount: collection.total_amount,
            status: collection.status,
            rate_per_liter: 0 // Default value, will be updated when fetched from DB
          })));
        } else {
          // Fetch collections
          const { data: collectionsData, error } = await supabase
            .from('collections')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('collection_date', { ascending: false });

          if (error) {
            console.error('Error fetching collections:', error);
            toastRef.current.error('Error', 'Failed to load collections data');
            return;
          }
          setCollections(collectionsData || []);
        }
      } catch (err) {
        console.error('Error fetching collections:', err);
        toastRef.current.error('Error', 'Failed to load collections data');
      }
    };

    fetchCollections();
  }, [farmerId]); // Removed realtimeCollections from dependencies to prevent infinite loop

  // Update filtered collections when collections or filters change
  useEffect(() => {
    let result = [...collections];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(collection => 
        collection.liters.toString().includes(searchTerm) ||
        collection.quality_grade.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply date filter
    if (dateFilter) {
      result = result.filter(collection => 
        new Date(collection.collection_date).toDateString() === new Date(dateFilter).toDateString()
      );
    }
    
    // Apply quality filter
    if (qualityFilter) {
      result = result.filter(collection => 
        collection.quality_grade === qualityFilter
      );
    }
    
    setFilteredCollections(result);
  }, [searchTerm, dateFilter, qualityFilter, collections]);

  // Prepare chart data with useMemo to prevent unnecessary recalculations
  const chartData = React.useMemo(() => {
    return filteredCollections.slice(0, 10).reverse().map(collection => ({
      date: new Date(collection.collection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      liters: collection.liters
    }));
  }, [filteredCollections]);

  // Get unique quality grades for filter with useMemo
  const qualityGrades = React.useMemo(() => {
    return Array.from(new Set(collections.map(c => c.quality_grade))).filter(Boolean);
  }, [collections]);

  const exportCollections = (format: 'csv' | 'json') => {
    try {
      const exportData = filteredCollections.map(collection => ({
        date: new Date(collection.collection_date).toLocaleDateString(),
        liters: collection.liters,
        quality_grade: collection.quality_grade,
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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="My Collections"
        description="View and manage all your milk collections"
        actions={
          <div className="flex space-x-3">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Collection
            </Button>
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
          title="Today's Collections"
          value={collections.filter(c => new Date(c.collection_date).toDateString() === new Date().toDateString()).length}
          description="Collections today"
          icon={<Milk className="h-6 w-6 text-blue-500" />}
          color="bg-blue-100"
        />
        <StatCard
          title="This Month"
          value={`${collections.reduce((sum, c) => sum + c.liters, 0)} L`}
          description="Total liters collected"
          icon={<Droplets className="h-6 w-6 text-green-500" />}
          color="bg-green-100"
        />
        <StatCard
          title="Avg. Quality"
          value={collections.length > 0 ? (collections.reduce((sum, c) => sum + (c.quality_grade === 'A+' ? 4 : c.quality_grade === 'A' ? 3 : c.quality_grade === 'B' ? 2 : 1), 0) / collections.length).toFixed(1) : "0"}
          description="Average quality grade"
          icon={<Award className="h-6 w-6 text-purple-500" />}
          color="bg-purple-100"
        />
        <StatCard
          title="Total Earnings"
          value={`KSh ${collections.reduce((sum, c) => sum + (c.total_amount || 0), 0).toFixed(2)}`}
          description="Total earnings"
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
            <div>
              <select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="">All Quality Grades</option>
                {qualityGrades.map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
          </FilterBar>
        </CardContent>
      </Card>

      {/* Collection Trend Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5 text-primary" />
            Collection Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="liters" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Collection History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Date", "Quantity", "Quality", "Rate", "Amount", "Status"]}
            data={filteredCollections}
            renderRow={(collection) => (
              <tr key={collection.id} className="hover:bg-muted/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(collection.collection_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {collection.liters} L
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    collection.quality_grade === 'A+' ? 'bg-green-100 text-green-800' :
                    collection.quality_grade === 'A' ? 'bg-blue-100 text-blue-800' :
                    collection.quality_grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Grade {collection.quality_grade}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  KSh {collection.rate_per_liter?.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  KSh {collection.total_amount?.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    collection.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    collection.status === 'Verified' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
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