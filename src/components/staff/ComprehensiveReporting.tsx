import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  BarChart3, 
  PieChart, 
  Calendar,
  Users,
  Milk,
  Beaker,
  Package,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import useToastNotifications from '@/hooks/useToastNotifications';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useStaffInfo } from '@/hooks/useStaffData';

interface CollectionReport {
  id: string;
  collection_id: string;
  farmer_name: string;
  liters: number;
  quality_grade: string;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

interface PaymentReport {
  id: string;
  farmer_name: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string;
}

interface QualityReport {
  id: string;
  collection_id: string;
  farmer_name: string;
  test_type: string;
  test_result: string;
  test_date: string;
}

interface InventoryReport {
  id: string;
  item_name: string;
  category: string;
  current_stock: number;
  unit: string;
  reorder_level: number;
  last_transaction: string;
}

interface PerformanceReport {
  date: string;
  collections: number;
  liters: number;
  farmers: number;
  avg_quality_score: number;
  earnings: number;
}

export default function ComprehensiveReporting() {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('collections');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Report data
  const [collectionData, setCollectionData] = useState<CollectionReport[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentReport[]>([]);
  const [qualityData, setQualityData] = useState<QualityReport[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryReport[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceReport[]>([]);
  
  // Summary data
  const [collectionSummary, setCollectionSummary] = useState({
    totalCollections: 0,
    totalLiters: 0,
    totalEarnings: 0,
    avgQuality: 0
  });
  
  const [paymentSummary, setPaymentSummary] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    if (staffInfo) {
      fetchData();
    }
  }, [staffInfo, dateRange, startDate, endDate]);

  const fetchData = async () => {
    if (!staffInfo?.id) return;

    setLoading(true);
    try {
      // Calculate date ranges
      const now = new Date();
      let from_date: Date;
      let to_date: Date = now;
      
      switch (dateRange) {
        case 'week':
          from_date = subDays(now, 7);
          break;
        case 'month':
          from_date = startOfMonth(now);
          break;
        case 'quarter':
          from_date = subDays(now, 90);
          break;
        case 'custom':
          from_date = startDate ? new Date(startDate) : subDays(now, 30);
          to_date = endDate ? new Date(endDate) : now;
          to_date.setHours(23, 59, 59, 999);
          break;
        default:
          from_date = subDays(now, 30);
      }

      // Fetch collections report data
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          liters,
          quality_grade,
          rate_per_liter,
          total_amount,
          collection_date,
          status,
          farmers!farmer_id (
            full_name
          )
        `)
        .eq('staff_id', staffInfo.id)
        .gte('collection_date', from_date.toISOString())
        .lte('collection_date', to_date.toISOString())
        .order('collection_date', { ascending: false });

      if (collectionsError) throw collectionsError;
      
      const formattedCollections = collectionsData?.map(collection => ({
        id: collection.id,
        collection_id: collection.collection_id,
        farmer_name: collection.farmers?.full_name || 'Unknown Farmer',
        liters: collection.liters,
        quality_grade: collection.quality_grade,
        rate_per_liter: collection.rate_per_liter || 0,
        total_amount: collection.total_amount || 0,
        collection_date: collection.collection_date,
        status: collection.status
      })) || [];
      
      setCollectionData(formattedCollections);
      
      // Calculate collection summary
      const totalCollections = formattedCollections.length;
      const totalLiters = formattedCollections.reduce((sum, c) => sum + c.liters, 0);
      const totalEarnings = formattedCollections.reduce((sum, c) => sum + c.total_amount, 0);
      const qualityScores = formattedCollections
        .filter(c => c.quality_grade)
        .map(c => c.quality_grade === 'A+' ? 10 : c.quality_grade === 'A' ? 8 : c.quality_grade === 'B' ? 6 : 4);
      const avgQuality = qualityScores.length > 0 ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;
      
      setCollectionSummary({
        totalCollections,
        totalLiters,
        totalEarnings,
        avgQuality
      });

      // Fetch payments report data
      // Fixed the ambiguous relationship by specifying the foreign key constraint name
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          created_at,
          status,
          payment_method,
          farmers!payments_farmer_id_fkey (
            full_name
          )
        `)
        .eq('farmer_id', staffInfo.id)
        .gte('created_at', from_date.toISOString())
        .lte('created_at', to_date.toISOString())
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      
      const formattedPayments = paymentsData?.map(payment => ({
        id: payment.id,
        farmer_name: payment.farmers?.full_name || 'Unknown Farmer',
        amount: payment.amount,
        payment_date: payment.created_at,
        status: payment.status,
        payment_method: payment.payment_method
      })) || [];
      
      setPaymentData(formattedPayments);
      
      // Calculate payment summary
      const totalPayments = formattedPayments.length;
      const totalPaymentAmount = formattedPayments.reduce((sum, p) => sum + p.amount, 0);
      const pendingPayments = formattedPayments.filter(p => p.status === 'pending').length;
      
      setPaymentSummary({
        totalPayments,
        totalAmount: totalPaymentAmount,
        pendingPayments
      });

      // Fetch quality tests report data
      const { data: qualityData, error: qualityError } = await supabase
        .from('quality_tests')
        .select(`
          id,
          test_type,
          test_result,
          test_date,
          collection!collection_id (
            collection_id,
            farmers (
              full_name
            )
          )
        `)
        .eq('performed_by', staffInfo.id)
        .gte('test_date', from_date.toISOString())
        .lte('test_date', to_date.toISOString())
        .order('test_date', { ascending: false });

      if (qualityError) throw qualityError;
      
      const formattedQuality = qualityData?.map(test => ({
        id: test.id,
        collection_id: test.collection?.collection_id || 'N/A',
        farmer_name: test.collection?.farmers?.full_name || 'Unknown Farmer',
        test_type: test.test_type,
        test_result: test.test_result,
        test_date: test.test_date
      })) || [];
      
      setQualityData(formattedQuality);

      // Fetch inventory report data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          category,
          current_stock,
          unit,
          reorder_level,
          updated_at
        `)
        .order('name', { ascending: true });

      if (inventoryError) throw inventoryError;
      
      const formattedInventory = inventoryData?.map(item => ({
        id: item.id,
        item_name: item.name,
        category: item.category,
        current_stock: item.current_stock,
        unit: item.unit,
        reorder_level: item.reorder_level,
        last_transaction: item.updated_at
      })) || [];
      
      setInventoryData(formattedInventory);

      // Generate performance data (simplified for this example)
      const performanceData: PerformanceReport[] = [];
      const days = Math.min(30, Math.ceil((to_date.getTime() - from_date.getTime()) / (1000 * 60 * 60 * 24)));
      
      for (let i = 0; i < days; i++) {
        const date = new Date(from_date);
        date.setDate(date.getDate() + i);
        
        // Filter collections for this date
        const dailyCollections = formattedCollections.filter(c => {
          const collectionDate = new Date(c.collection_date);
          return collectionDate.toDateString() === date.toDateString();
        });
        
        performanceData.push({
          date: date.toISOString().split('T')[0],
          collections: dailyCollections.length,
          liters: dailyCollections.reduce((sum, c) => sum + c.liters, 0),
          farmers: new Set(dailyCollections.map(c => c.farmer_name)).size,
          avg_quality_score: dailyCollections.length > 0 
            ? dailyCollections.reduce((sum, c) => {
                const score = c.quality_grade === 'A+' ? 100 : 
                             c.quality_grade === 'A' ? 8 : 
                             c.quality_grade === 'B' ? 6 : 4;
                return sum + score;
              }, 0) / dailyCollections.length
            : 0,
          earnings: dailyCollections.reduce((sum, c) => sum + c.total_amount, 0)
        });
      }
      
      setPerformanceData(performanceData);
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      // Handle the specific PGRST201 error
      if (error.code === 'PGRST201') {
        const hint = error.hint || 'Failed to load report data. Check network tab for more details.';
        showError('Error', `Failed to load report data: ${error.message}. ${hint}`);
      } else {
        showError('Error', error.message || 'Failed to load report data');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      let csvContent = '';
      let filename = '';
      
      switch (reportType) {
        case 'collections':
          // Create CSV content for collections
          const collectionHeaders = ['Collection ID', 'Farmer Name', 'Date', 'Liters', 'Quality Grade', 'Rate per Liter', 'Total Amount', 'Status'];
          const collectionRows = collectionData.map(collection => [
            collection.collection_id,
            collection.farmer_name,
            format(new Date(collection.collection_date), 'yyyy-MM-dd HH:mm'),
            collection.liters,
            collection.quality_grade,
            collection.rate_per_liter,
            collection.total_amount,
            collection.status
          ]);
          
          csvContent = [
            collectionHeaders.join(','),
            ...collectionRows.map(row => row.join(','))
          ].join('\n');
          
          filename = `collections_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
          
        case 'payments':
          // Create CSV content for payments
          const paymentHeaders = ['Farmer Name', 'Amount', 'Date', 'Status', 'Payment Method'];
          const paymentRows = paymentData.map(payment => [
            payment.farmer_name,
            payment.amount,
            format(new Date(payment.payment_date), 'yyyy-MM-dd HH:mm'),
            payment.status,
            payment.payment_method
          ]);
          
          csvContent = [
            paymentHeaders.join(','),
            ...paymentRows.map(row => row.join(','))
          ].join('\n');
          
          filename = `payments_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
          
        case 'quality':
          // Create CSV content for quality tests
          const qualityHeaders = ['Collection ID', 'Farmer Name', 'Test Type', 'Test Result', 'Date'];
          const qualityRows = qualityData.map(test => [
            test.collection_id,
            test.farmer_name,
            test.test_type,
            test.test_result,
            format(new Date(test.test_date), 'yyyy-MM-dd HH:mm')
          ]);
          
          csvContent = [
            qualityHeaders.join(','),
            ...qualityRows.map(row => row.join(','))
          ].join('\n');
          
          filename = `quality_tests_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
          
        case 'inventory':
          // Create CSV content for inventory
          const inventoryHeaders = ['Item Name', 'Category', 'Current Stock', 'Unit', 'Reorder Level', 'Last Updated'];
          const inventoryRows = inventoryData.map(item => [
            item.item_name,
            item.category,
            item.current_stock,
            item.unit,
            item.reorder_level,
            format(new Date(item.last_transaction), 'yyyy-MM-dd HH:mm')
          ]);
          
          csvContent = [
            inventoryHeaders.join(','),
            ...inventoryRows.map(row => row.join(','))
          ].join('\n');
          
          filename = `inventory_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
          
        case 'performance':
          // Create CSV content for performance
          const performanceHeaders = ['Date', 'Collections', 'Liters', 'Farmers', 'Avg Quality Score', 'Earnings'];
          const performanceRows = performanceData.map(data => [
            data.date,
            data.collections,
            data.liters,
            data.farmers,
            data.avg_quality_score.toFixed(2),
            data.earnings.toFixed(2)
          ]);
          
          csvContent = [
            performanceHeaders.join(','),
            ...performanceRows.map(row => row.join(','))
          ].join('\n');
          
          filename = `performance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
          
        default:
          showError('Error', 'Invalid report type');
          return;
      }
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      show({ title: 'Success', description: 'Report exported successfully' });
    } catch (error: any) {
      console.error('Error exporting report:', error);
      showError('Error', 'Failed to export report');
    }
  };

  const exportToPDF = () => {
    show({ title: 'Info', description: 'PDF export functionality would be implemented here. For now, please use CSV export.' });
  };

  // Chart data
  const qualityDistribution = [
    { name: 'A+', value: collectionData.filter(c => c.quality_grade === 'A+').length },
    { name: 'A', value: collectionData.filter(c => c.quality_grade === 'A').length },
    { name: 'B', value: collectionData.filter(c => c.quality_grade === 'B').length },
    { name: 'C', value: collectionData.filter(c => c.quality_grade === 'C').length },
  ];

  const paymentStatusDistribution = [
    { name: 'Completed', value: paymentData.filter(p => p.status === 'completed').length },
    { name: 'Pending', value: paymentData.filter(p => p.status === 'pending').length },
    { name: 'Failed', value: paymentData.filter(p => p.status === 'failed').length },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comprehensive Reporting</h1>
          <p className="text-gray-600 mt-1">
            Generate detailed reports and export data for analysis
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="collections">
                <div className="flex items-center gap-2">
                  <Milk className="h-4 w-4" />
                  Collections
                </div>
              </SelectItem>
              <SelectItem value="payments">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Payments
                </div>
              </SelectItem>
              <SelectItem value="quality">
                <div className="flex items-center gap-2">
                  <Beaker className="h-4 w-4" />
                  Quality Tests
                </div>
              </SelectItem>
              <SelectItem value="inventory">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Inventory
                </div>
              </SelectItem>
              <SelectItem value="performance">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            className="flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={exportToPDF}
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Custom Date Range */}
      {dateRange === 'custom' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Custom Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={fetchData}>Apply Date Range</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Collections</CardTitle>
            <Milk className="h-6 w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {collectionSummary.totalCollections}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {collectionSummary.totalLiters.toFixed(1)}L collected
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
            <Wallet className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              KSh {collectionSummary.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Avg. KSh {(collectionSummary.totalEarnings / (collectionSummary.totalCollections || 1)).toFixed(2)} per collection
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Quality Score</CardTitle>
            <Beaker className="h-6 w-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {collectionSummary.avgQuality.toFixed(1)}/10
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Average quality rating
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Payments Processed</CardTitle>
            <Users className="h-6 w-6 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {paymentSummary.totalPayments}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              KSh {paymentSummary.totalAmount.toFixed(2)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={qualityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {qualityDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === 'A+' ? '#10b981' :
                        entry.name === 'A' ? '#3b82f6' :
                        entry.name === 'B' ? '#f59e0b' :
                        '#ef4444'
                      } 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Collections']} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentStatusDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Payments" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                formatter={(value, name) => {
                  if (name === 'liters') return [`${value}L`, 'Liters'];
                  if (name === 'earnings') return [`KSh ${value}`, 'Earnings'];
                  return [value, name];
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="collections" 
                stroke="#3b82f6" 
                name="Collections" 
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="liters" 
                stroke="#10b981" 
                name="Liters" 
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="earnings" 
                stroke="#f59e0b" 
                name="Earnings (KSh)" 
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Report Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {reportType === 'collections' && 'Collections Report'}
            {reportType === 'payments' && 'Payments Report'}
            {reportType === 'quality' && 'Quality Tests Report'}
            {reportType === 'inventory' && 'Inventory Report'}
            {reportType === 'performance' && 'Performance Report'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-96 overflow-auto">
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {reportType === 'collections' && (
                    <>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Collection ID</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Farmer</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Liters</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Quality</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    </>
                  )}
                  
                  {reportType === 'payments' && (
                    <>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Farmer</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Method</th>
                    </>
                  )}
                  
                  {reportType === 'quality' && (
                    <>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Collection ID</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Farmer</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Test Type</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Result</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                    </>
                  )}
                  
                  {reportType === 'inventory' && (
                    <>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Item Name</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Current Stock</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Reorder Level</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Last Updated</th>
                    </>
                  )}
                  
                  {reportType === 'performance' && (
                    <>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Collections</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Liters</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Farmers</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Avg Quality</th>
                      <th className="p-3 text-left text-sm font-medium text-muted-foreground">Earnings</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {reportType === 'collections' && collectionData.map((collection) => (
                  <tr key={collection.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm font-medium">{collection.collection_id}</td>
                    <td className="p-3 text-sm">{collection.farmer_name}</td>
                    <td className="p-3 text-sm">{format(new Date(collection.collection_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 text-sm">{collection.liters}L</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        collection.quality_grade === 'A+' ? 'default' :
                        collection.quality_grade === 'A' ? 'secondary' :
                        collection.quality_grade === 'B' ? 'outline' : 'destructive'
                      }>
                        {collection.quality_grade}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">KSh {collection.total_amount.toFixed(2)}</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        collection.status === 'Collected' ? 'default' :
                        collection.status === 'Verified' ? 'secondary' :
                        collection.status === 'Paid' ? 'outline' : 'destructive'
                      }>
                        {collection.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                
                {reportType === 'payments' && paymentData.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">{payment.farmer_name}</td>
                    <td className="p-3 text-sm">KSh {payment.amount.toFixed(2)}</td>
                    <td className="p-3 text-sm">{format(new Date(payment.payment_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        payment.status === 'completed' ? 'default' :
                        payment.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{payment.payment_method}</td>
                  </tr>
                ))}
                
                {reportType === 'quality' && qualityData.map((test) => (
                  <tr key={test.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">{test.collection_id}</td>
                    <td className="p-3 text-sm">{test.farmer_name}</td>
                    <td className="p-3 text-sm">{test.test_type}</td>
                    <td className="p-3 text-sm">
                      <Badge variant={
                        test.test_result === 'Pass' ? 'default' :
                        test.test_result === 'Fail' ? 'destructive' : 'secondary'
                      }>
                        {test.test_result}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{format(new Date(test.test_date), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
                
                {reportType === 'inventory' && inventoryData.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`border-b hover:bg-muted/50 ${
                      item.current_stock <= item.reorder_level ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="p-3 text-sm">{item.item_name}</td>
                    <td className="p-3 text-sm">
                      <Badge variant="secondary">{item.category}</Badge>
                    </td>
                    <td className="p-3 text-sm">{item.current_stock} {item.unit}</td>
                    <td className="p-3 text-sm">{item.reorder_level} {item.unit}</td>
                    <td className="p-3 text-sm">{format(new Date(item.last_transaction), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
                
                {reportType === 'performance' && performanceData.map((data) => (
                  <tr key={data.date} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">{format(new Date(data.date), 'MMM d, yyyy')}</td>
                    <td className="p-3 text-sm">{data.collections}</td>
                    <td className="p-3 text-sm">{data.liters.toFixed(1)}L</td>
                    <td className="p-3 text-sm">{data.farmers}</td>
                    <td className="p-3 text-sm">{data.avg_quality_score.toFixed(1)}/10</td>
                    <td className="p-3 text-sm">KSh {data.earnings.toFixed(2)}</td>
                  </tr>
                ))}
                
                {((reportType === 'collections' && collectionData.length === 0) ||
                  (reportType === 'payments' && paymentData.length === 0) ||
                  (reportType === 'quality' && qualityData.length === 0) ||
                  (reportType === 'inventory' && inventoryData.length === 0) ||
                  (reportType === 'performance' && performanceData.length === 0)) && (
                  <tr>
                    <td 
                      colSpan={
                        reportType === 'collections' ? 7 :
                        reportType === 'payments' ? 5 :
                        reportType === 'quality' ? 5 :
                        reportType === 'inventory' ? 5 : 6
                      } 
                      className="p-6 text-center text-muted-foreground"
                    >
                      No data available for the selected report type and date range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {reportType === 'collections' && collectionData.length > 10 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Showing 10 of {collectionData.length} collections. Export to CSV to see all data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
