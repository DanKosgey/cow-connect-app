import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter, 
  Search,
  Calendar,
  MapPin,
  RefreshCw
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { format, subDays } from 'date-fns';
import { useRealtimeMarketPrices } from "@/hooks/useRealtimeMarketPrices";
import { DataVisualizationContainer } from "@/components/DataVisualization";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";

interface MarketPrice {
  id: string;
  date: string;
  product: string;
  region: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

interface PriceHistory {
  date: string;
  price: number;
}

const MarketPricesPage = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<MarketPrice[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState<MarketPrice | null>(null);
  const { prices: realtimePrices, latestPrice } = useRealtimeMarketPrices();

  // Fetch market prices
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        setLoading(true);
        
        // Use real-time prices if available, otherwise generate mock data
        if (realtimePrices.length > 0) {
          setPrices(realtimePrices.map(price => ({
            id: price.id,
            date: price.updated_at,
            product: price.product,
            region: price.region,
            price: price.price,
            previousPrice: price.previous_price,
            change: price.change,
            changePercent: price.change_percent,
            trend: price.change > 0 ? 'up' : price.change < 0 ? 'down' : 'stable'
          })));
        } else {
          // Generate mock market prices data
          const regions = ['Nairobi', 'Kisumu', 'Nakuru', 'Mombasa', 'Eldoret'];
          const products = ['Fresh Milk', 'Pasteurized Milk', 'Butter', 'Cheese', 'Yogurt'];
          
          const mockPrices: MarketPrice[] = [];
          let id = 1;
          
          regions.forEach(region => {
            products.forEach(product => {
              const previousPrice = Math.floor(Math.random() * 200) + 50;
              const currentPrice = previousPrice + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 20);
              const change = currentPrice - previousPrice;
              const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
              const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
              
              mockPrices.push({
                id: `${id++}`,
                date: new Date().toISOString(),
                product,
                region,
                price: currentPrice,
                previousPrice,
                change,
                changePercent,
                trend
              });
            });
          });
          
          setPrices(mockPrices);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching market prices:', err);
        toast.error('Error', 'Failed to load market prices');
        setLoading(false);
      }
    };
    
    fetchMarketPrices();
  }, [realtimePrices, toast]);

  // Export market prices data
  const exportMarketPrices = (format: 'csv' | 'json') => {
    try {
      const exportData = filteredPrices.map(price => ({
        date: new Date(price.date).toLocaleDateString(),
        product: price.product,
        region: price.region,
        current_price: price.price,
        previous_price: price.previousPrice,
        change: price.change,
        change_percent: price.changePercent
      }));
      
      if (format === 'csv') {
        exportToCSV(exportData, 'market-prices-report');
      } else {
        exportToJSON(exportData, 'market-prices-report');
      }
      
      toast.success('Success', `Market prices exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Error exporting market prices:', err);
      toast.error('Error', 'Failed to export market prices');
    }
  };

  // Update filtered prices when prices or filters change
  useEffect(() => {
    let result = [...prices];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(price => 
        price.product.toLowerCase().includes(term) ||
        price.region.toLowerCase().includes(term)
      );
    }
    
    if (regionFilter !== 'all') {
      result = result.filter(price => price.region === regionFilter);
    }
    
    if (productFilter !== 'all') {
      result = result.filter(price => price.product === productFilter);
    }
    
    setFilteredPrices(result);
    
    // Set default selected price if none selected
    if (!selectedPrice && result.length > 0) {
      setSelectedPrice(result[0]);
      generatePriceHistory(result[0]);
    }
    
    // If selected price is filtered out, select the first available one
    if (selectedPrice && !result.find(p => p.id === selectedPrice.id) && result.length > 0) {
      setSelectedPrice(result[0]);
      generatePriceHistory(result[0]);
    } else if (result.length === 0) {
      setSelectedPrice(null);
      setPriceHistory([]);
    }
  }, [searchTerm, regionFilter, productFilter, prices, selectedPrice]);

  // Generate price history for selected price
  const generatePriceHistory = (price: MarketPrice) => {
    // Generate mock price history for the last 30 days
    const history: PriceHistory[] = [];
    let basePrice = price.price;
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const fluctuation = (Math.random() - 0.5) * 10; // Random fluctuation between -5 and +5
      basePrice += fluctuation;
      history.push({
        date: format(date, 'MMM dd'),
        price: parseFloat(basePrice.toFixed(2))
      });
    }
    
    setPriceHistory(history);
  };

  const refreshData = () => {
    toast.success('Success', 'Market prices refreshed');
    // In a real implementation, this would fetch fresh data from the server
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <TrendingUp className="h-4 w-4 text-gray-500 rotate-180" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get unique regions and products for filters
  const regions = Array.from(new Set(prices.map(p => p.region)));
  const products = Array.from(new Set(prices.map(p => p.product)));

  // Prepare data for advanced visualizations
  const priceTrendData = priceHistory.map((item, index) => ({
    ...item,
    index
  }));

  const priceDistributionData = filteredPrices.map(price => ({
    name: `${price.product} (${price.region})`,
    price: price.price,
    previousPrice: price.previousPrice,
    change: price.change
  }));

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
            <h1 className="text-3xl font-bold text-gray-900">Market Prices</h1>
            <p className="text-gray-600 mt-2">Stay updated with current dairy product prices in your region</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Button onClick={refreshData} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={() => exportMarketPrices('csv')} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              onClick={() => exportMarketPrices('json')} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Filters - Responsive */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products or regions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <select
                  className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                >
                  <option value="all">All Regions</option>
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                >
                  <option value="all">All Products</option>
                  {products.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setRegionFilter('all');
                  setProductFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Data Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Price Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Price Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <DataVisualizationContainer
                  data={priceTrendData}
                  chartType="line"
                  options={{ dataKeys: ['price'] }}
                  title="Price Movement Over Time"
                />
              </div>
            </CardContent>
          </Card>

          {/* Price Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                Price Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <DataVisualizationContainer
                  data={priceDistributionData}
                  chartType="bar"
                  options={{ dataKey: 'price' }}
                  title="Current Prices by Product"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Trend Chart - Responsive */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {selectedPrice ? `${selectedPrice.product} Price Trend in ${selectedPrice.region}` : 'Price Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 chart-container-responsive">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} 
                    formatter={(value) => [`KSh ${value}`, 'Price']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={{ fill: '#10b981', r: 4 }} 
                    activeDot={{ r: 6 }} 
                    name="Price (KSh)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Market Prices Table - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Current Market Prices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPrices.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-4">Product</th>
                          <th className="text-left p-4">Region</th>
                          <th className="text-left p-4">Current Price</th>
                          <th className="text-left p-4">Previous Price</th>
                          <th className="text-left p-4">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPrices.map((price) => (
                          <tr 
                            key={price.id} 
                            className={`border-t hover:bg-muted/50 cursor-pointer ${
                              selectedPrice?.id === price.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => {
                              setSelectedPrice(price);
                              generatePriceHistory(price);
                            }}
                          >
                            <td className="p-4 font-medium">{price.product}</td>
                            <td className="p-4">{price.region}</td>
                            <td className="p-4">KSh {price.price.toFixed(2)}</td>
                            <td className="p-4">KSh {price.previousPrice.toFixed(2)}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {getTrendIcon(price.trend)}
                                <span className={getTrendColor(price.trend)}>
                                  {price.change > 0 ? '+' : ''}{price.change.toFixed(2)} (
                                  {price.changePercent > 0 ? '+' : ''}{price.changePercent.toFixed(2)}%)
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No prices found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Price Details - Responsive */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Price Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPrice ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedPrice.product}</h3>
                      <p className="text-muted-foreground">{selectedPrice.region}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-700">Current Price</p>
                        <p className="text-xl font-bold text-green-900">KSh {selectedPrice.price.toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-700">Previous Price</p>
                        <p className="text-xl font-bold text-blue-900">KSh {selectedPrice.previousPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Change</span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(selectedPrice.trend)}
                        <span className={getTrendColor(selectedPrice.trend)}>
                          {selectedPrice.change > 0 ? '+' : ''}{selectedPrice.change.toFixed(2)} (
                          {selectedPrice.changePercent > 0 ? '+' : ''}{selectedPrice.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Market Insights</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedPrice.change > 0 
                          ? 'Prices are rising in your region. Consider selling now for better returns.'
                          : selectedPrice.change < 0
                          ? 'Prices are declining. You might want to hold your produce for now.'
                          : 'Prices are stable. No immediate action required.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No price selected</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Select a product from the table to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketPricesPage;