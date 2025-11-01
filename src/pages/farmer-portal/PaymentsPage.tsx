import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  Calendar, 
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { formatCurrency } from "@/utils/formatters";

interface Collection {
  id: string;
  collection_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

const PaymentsPage = () => {
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [farmer, setFarmer] = useState<any>(null);
  const [creditInfo, setCreditInfo] = useState<any>(null);

  // Update toast ref whenever toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, []);

  // Fetch collections data for the logged-in farmer
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Fetch farmer profile
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

        setFarmer(farmerData);

        // Fetch credit information
        const { data: creditData, error: creditError } = await supabase
          .from('farmer_credit_limits')
          .select('*')
          .eq('farmer_id', farmerData.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!creditError && creditData) {
          setCreditInfo(creditData);
        }

        // Fetch collections from the collections table for this farmer
        const { data: collectionsData, error } = await supabase
          .from('collections')
          .select(`
            id,
            collection_id,
            liters,
            rate_per_liter,
            total_amount,
            collection_date,
            status
          `)
          .eq('farmer_id', farmerData.id)
          .order('collection_date', { ascending: false });

        if (error) {
          console.error('Error fetching collections:', error);
          toastRef.current.error('Error', 'Failed to load collections data');
          setLoading(false);
          return;
        }
        
        setCollections(collectionsData || []);
      } catch (err) {
        console.error('Error fetching collections:', err);
        toastRef.current.error('Error', 'Failed to load collections data');
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  // Filter collections based on search and filters
  useEffect(() => {
    let result = [...collections];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(collection => 
        collection.total_amount.toString().includes(searchTerm) ||
        collection.collection_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(collection => collection.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter) {
      result = result.filter(collection => 
        new Date(collection.collection_date).toDateString() === new Date(dateFilter).toDateString()
      );
    }
    
    setFilteredCollections(result);
  }, [searchTerm, statusFilter, dateFilter, collections]);

  // Prepare chart data
  const chartData = filteredCollections.slice(0, 10).reverse().map(collection => ({
    date: new Date(collection.collection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: collection.total_amount
  }));

  // Calculate payment statistics
  const totalCollections = collections.reduce((sum, collection) => sum + collection.total_amount, 0);
  const paidCollections = collections.filter(c => c.status === 'Paid').reduce((sum, collection) => sum + collection.total_amount, 0);
  const pendingCollections = collections.filter(c => c.status !== 'Paid').reduce((sum, collection) => sum + collection.total_amount, 0);
  const availableCredit = creditInfo?.current_credit_balance || 0;
  const creditLimit = creditInfo?.max_credit_amount || 0;

  const exportCollections = (format: 'csv' | 'json') => {
    try {
      const exportData = filteredCollections.map(collection => ({
        date: new Date(collection.collection_date).toLocaleDateString(),
        amount: collection.total_amount,
        status: collection.status,
        liters: collection.liters,
        rate: collection.rate_per_liter,
        collection_id: collection.collection_id || 'N/A'
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
        title="Payment History"
        description="Track all your milk collections and payment status"
        actions={
          <div className="flex space-x-3">
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

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Collections"
          value={`KSh ${totalCollections.toFixed(2)}`}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Paid"
          value={`KSh ${paidCollections.toFixed(2)}`}
          icon={<CheckCircle className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Pending"
          value={`KSh ${pendingCollections.toFixed(2)}`}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-100"
        />
        <StatCard
          title="Available Credit"
          value={`KSh ${availableCredit.toFixed(2)}`}
          icon={<CreditCard className="h-6 w-6 text-purple-600" />}
          color="bg-purple-100"
        />
      </div>

      {/* Credit Information Card */}
      {creditInfo && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Credit Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">Credit Limit</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(creditLimit)}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {creditInfo.credit_limit_percentage}% of pending payments
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 font-medium">Available Credit</p>
                <p className="text-xl font-bold text-green-900">{formatCurrency(availableCredit)}</p>
                <p className="text-xs text-green-600 mt-1">
                  {creditLimit > 0 ? ((availableCredit / creditLimit) * 100).toFixed(1) : 0}% of limit
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-amber-700 font-medium">Credit Used</p>
                <p className="text-xl font-bold text-amber-900">
                  {formatCurrency(creditInfo.total_credit_used)}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Total credit utilized
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Trend Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Collection Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`KSh ${value}`, 'Amount']} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={{ fill: '#10b981', r: 4 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search collections..."
          >
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="">All Statuses</option>
                <option value="Collected">Collected</option>
                <option value="Verified">Verified</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
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

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Collection Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Date", "Liters", "Rate", "Amount", "Status", "Collection ID"]}
            data={filteredCollections}
            renderRow={(collection) => (
              <tr key={collection.id} className="hover:bg-muted/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(collection.collection_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {collection.liters.toFixed(2)}L
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  KSh {collection.rate_per_liter.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  KSh {collection.total_amount.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    collection.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    collection.status === 'Verified' ? 'bg-blue-100 text-blue-800' :
                    collection.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {collection.status === 'Paid' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : collection.status === 'Verified' ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : collection.status === 'Cancelled' ? (
                      <XCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {collection.status}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {collection.collection_id || 'N/A'}
                </td>
              </tr>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;