import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
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
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [farmer, setFarmer] = useState<any>(null);
  const { collections: realtimeCollections, recentCollection } = useRealtimeFarmerCollections(farmer?.id);

  // Fetch collections data
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
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
          toast.error('Error', 'Failed to load farmer profile');
          setLoading(false);
          return;
        }

        if (!farmerData) {
          console.warn('No farmer data found for user:', user.id);
          toast.error('Warning', 'Farmer profile not found. Please complete your registration.');
          setLoading(false);
          return;
        }

        setFarmer(farmerData);

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
            .eq('farmer_id', farmerData.id)
            .order('collection_date', { ascending: false });

          if (error) {
            console.error('Error fetching collections:', error);
            toast.error('Error', 'Failed to load collections data');
            setLoading(false);
            return;
          }
          setCollections(collectionsData || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching collections:', err);
        toast.error('Error', 'Failed to load collections data');
        setLoading(false);
      }
    };

    fetchCollections();
  }, [realtimeCollections, toast]);

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

  // Prepare chart data
  const chartData = filteredCollections.slice(0, 10).reverse().map(collection => ({
    date: new Date(collection.collection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    liters: collection.liters
  }));

  // Get unique quality grades for filter
  const qualityGrades = Array.from(new Set(collections.map(c => c.quality_grade))).filter(Boolean);

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
        toast.success('Success', 'Collections exported as CSV');
      } else {
        exportToJSON(exportData, 'collections-report');
        toast.success('Success', 'Collections exported as JSON');
      }
    } catch (err) {
      console.error('Error exporting collections:', err);
      toast.error('Error', 'Failed to export collections');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Collections</h1>
            <p className="text-gray-600 mt-2">View and manage all your milk collections</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
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
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
              <Button variant="outline" className="flex items-center gap-2" onClick={() => {
                setSearchTerm("");
                setDateFilter("");
                setQualityFilter("");
              }}>
                <Filter className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quality</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No collections found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map((collection) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredCollections.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredCollections.length} of {collections.length} collections
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Previous</Button>
                  <Button variant="outline" size="sm">Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CollectionsPage;