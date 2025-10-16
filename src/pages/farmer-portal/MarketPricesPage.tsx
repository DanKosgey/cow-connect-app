import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";
import { format, subDays } from 'date-fns';
import { useRealtimeMarketPrices } from "@/hooks/useRealtimeMarketPrices";
import { DataVisualizationContainer } from "@/components/DataVisualization";
import { exportToCSV, exportToJSON } from "@/utils/exportUtils";
import { marketPriceService, MarketPrice } from "@/services/market-price-service";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/FilterBar";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";

interface PriceHistory {
  date: string;
  price: number;
}

const MarketPricesPage = () => {
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<MarketPrice[]>([]); // This is already correctly initialized as an array
  const [filteredPrices, setFilteredPrices] = useState<MarketPrice[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState<MarketPrice | null>(null);
  const { prices: realtimePrices, latestPrice, error } = useRealtimeMarketPrices();

  // Update toast ref whenever toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, []);

  // Fetch market prices from database
  const fetchMarketPrices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if there's an error from the hook
      if (error) {
        console.error('Market prices error:', error);
        toastRef.current.error('Error', 'Failed to load market prices. The feature may not be available yet.');
        setLoading(false);
        return;
      }
      
      // Use real-time prices if available, otherwise fetch from database
      if (realtimePrices.length > 0) {
        // Convert realtime prices to match our interface
        const convertedPrices = realtimePrices.map(price => ({
          id: price.id,
          product: price.product,
          region: price.region,
          price: price.price,
          previous_price: price.previous_price,
          change: price.change,
          change_percent: price.change_percent,
          updated_at: price.updated_at,
          created_at: price.updated_at // Using updated_at as created_at for now
        }));
        setPrices(convertedPrices);
      } else {
        // Fetch prices from database using our service
        const response = await marketPriceService.getAllPrices();
        if (response.success && response.data) {
          setPrices(response.data);
        } else {
          console.error('Failed to fetch market prices:', response.error);
          toastRef.current.error('Error', response.error || 'Failed to load market prices');
          setPrices([]); // Ensure prices is always an array
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching market prices:', err);
      toastRef.current.error('Error', 'Failed to load market prices');
      setPrices([]); // Ensure prices is always an array
      setLoading(false);
    }
  }, [realtimePrices, error]);

  // Fetch market prices
  useEffect(() => {
    fetchMarketPrices();
  }, [fetchMarketPrices]);

  // Export market prices data
  const exportMarketPrices = useCallback((format: 'csv' | 'json') => {
    try {
      const exportData = filteredPrices.map(price => ({
        date: new Date(price.updated_at).toLocaleDateString(),
        product: price.product,
        region: price.region,
        current_price: price.price,
        previous_price: price.previous_price,
        change: price.change,
        change_percent: price.change_percent
      }));
      
      if (format === 'csv') {
        exportToCSV(exportData, 'market-prices-report');
      } else {
        exportToJSON(exportData, 'market-prices-report');
      }
      
      toastRef.current.success('Success', `Market prices exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Error exporting market prices:', err);
      toastRef.current.error('Error', 'Failed to export market prices');
    }
  }, [filteredPrices]);

  // Memoize regions and products for filters
  const regions = useMemo(() => {
    // Ensure prices is an array before mapping
    if (!Array.isArray(prices)) return [];
    return Array.from(new Set(prices.map(p => p.region)));
  }, [prices]);
  
  const products = useMemo(() => {
    // Ensure prices is an array before mapping
    if (!Array.isArray(prices)) return [];
    return Array.from(new Set(prices.map(p => p.product)));
  }, [prices]);

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
    
    // Only set default selected price if none selected AND we have results
    if (!selectedPrice && result.length > 0) {
      const newSelectedPrice = result[0];
      setSelectedPrice(newSelectedPrice);
      generatePriceHistory(newSelectedPrice);
    }
    
    // If selected price is filtered out, select the first available one
    if (selectedPrice && !result.find(p => p.id === selectedPrice.id) && result.length > 0) {
      const newSelectedPrice = result[0];
      setSelectedPrice(newSelectedPrice);
      generatePriceHistory(newSelectedPrice);
    } else if (result.length === 0 && selectedPrice) {
      // Only clear selected price if we had one and now have no results
      setSelectedPrice(null);
      setPriceHistory([]);
    }
  }, [searchTerm, regionFilter, productFilter, prices]); // Remove selectedPrice from dependencies

  // Generate price history for selected price
  const generatePriceHistory = useCallback((price: MarketPrice) => {
    // In a real implementation, this would fetch historical data for the selected product/region
    // For now, we'll generate mock data based on the current price
    const history: PriceHistory[] = [];
    let basePrice = price.price;
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      // Simulate price fluctuations
      const fluctuation = (Math.random() - 0.5) * (basePrice * 0.1); // ±5% fluctuation
      basePrice += fluctuation;
      history.push({
        date: format(date, 'MMM dd'),
        price: parseFloat(basePrice.toFixed(2))
      });
    }
    
    setPriceHistory(history);
  }, []);

  const refreshData = useCallback(() => {
    fetchMarketPrices();
    toastRef.current.success('Success', 'Market prices refreshed');
  }, [fetchMarketPrices]);

  const getTrendIcon = useCallback((trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <TrendingUp className="h-4 w-4 text-gray-500 rotate-180" />;
    }
  }, []);

  const getTrendColor = useCallback((trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }, []);

  // Prepare data for advanced visualizations
  const priceTrendData = useMemo(() => priceHistory.map((item, index) => ({
    ...item,
    index
  })), [priceHistory]);

  // Group prices by product for comparison
  const productComparisonData = useMemo(() => {
    // Ensure prices is an array before processing
    if (!Array.isArray(prices)) return [];
    
    const productMap = new Map<string, { product: string; avgPrice: number; minPrice: number; maxPrice: number }>();
    
    prices.forEach(price => {
      if (!productMap.has(price.product)) {
        productMap.set(price.product, {
          product: price.product,
          avgPrice: price.price,
          minPrice: price.price,
          maxPrice: price.price
        });
      } else {
        const existing = productMap.get(price.product)!;
        productMap.set(price.product, {
          product: price.product,
          avgPrice: (existing.avgPrice + price.price) / 2,
          minPrice: Math.min(existing.minPrice, price.price),
          maxPrice: Math.max(existing.maxPrice, price.price)
        });
      }
    });
    
    return Array.from(productMap.values());
  }, [prices]);

  // Group prices by region for regional analysis
  const regionalAnalysisData = useMemo(() => {
    // Ensure prices is an array before processing
    if (!Array.isArray(prices)) return [];
    
    const regionMap = new Map<string, { region: string; avgPrice: number; products: number }>();
    
    prices.forEach(price => {
      if (!regionMap.has(price.region)) {
        regionMap.set(price.region, {
          region: price.region,
          avgPrice: price.price,
          products: 1
        });
      } else {
        const existing = regionMap.get(price.region)!;
        regionMap.set(price.region, {
          region: price.region,
          avgPrice: (existing.avgPrice + price.price) / 2,
          products: existing.products + 1
        });
      }
    });
    
    return Array.from(regionMap.values());
  }, [prices]);

  // Prepare price distribution data
  const priceDistributionData = useMemo(() => {
    // Ensure prices is an array before mapping
    if (!Array.isArray(prices)) return [];
    
    return prices.map(price => ({
      product: price.product,
      region: price.region,
      price: price.price,
      previous_price: price.previous_price,
      change: price.change,
      change_percent: price.change_percent
    }));
  }, [prices]);

  // Determine trend based on change value
  const getTrend = (change: number): 'up' | 'down' | 'stable' => {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'stable';
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

  
  // Show error message if there's an error and no data
  if (error && prices.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Market Prices Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We're unable to load market price data at the moment. This could be because:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
              <li>The market prices feature is not yet fully set up</li>
              <li>There might be a temporary connection issue</li>
              <li>You might not have permission to access this data</li>
            </ul>
            <p className="text-muted-foreground">
              In the meantime, you can view mock data or try again later.
            </p>
            <div className="mt-6 flex gap-2">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Market Prices"
        description="Stay updated with current market prices for dairy products"
        actions={
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportMarketPrices('csv')}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => exportMarketPrices('json')}>
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        }
      />

      {/* Market Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Average Price"
          value={`KSh ${filteredPrices.length > 0 ? (filteredPrices.reduce((sum, p) => sum + p.price, 0) / filteredPrices.length).toFixed(2) : "0.00"}`}
          description="Current average market price"
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Highest Price"
          value={`KSh ${filteredPrices.length > 0 ? Math.max(...filteredPrices.map(p => p.price)).toFixed(2) : "0.00"}`}
          description="Highest recorded price"
          icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Lowest Price"
          value={`KSh ${filteredPrices.length > 0 ? Math.min(...filteredPrices.map(p => p.price)).toFixed(2) : "0.00"}`}
          description="Lowest recorded price"
          icon={<TrendingDown className="h-6 w-6 text-red-600" />}
          color="bg-red-100"
        />
      </div>

      {/* Price Trend Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Price Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`KSh ${value}`, 'Price']} />
                <Line 
                  type="monotone" 
                  dataKey="price" 
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
            searchPlaceholder="Search products or regions..."
          >
            <div>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">All Products</option>
                {products.map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>
          </FilterBar>
        </CardContent>
      </Card>

      {/* Market Prices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Current Market Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={["Product", "Region", "Current Price", "Previous Price", "Change", "Updated"]}
            data={filteredPrices}
            renderRow={(price) => (
              <tr key={price.id} className="hover:bg-muted/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {price.product}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {price.region}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  KSh {price.price.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  KSh {price.previous_price?.toFixed(2) || "N/A"}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    price.change > 0 ? 'bg-green-100 text-green-800' :
                    price.change < 0 ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {price.change > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : price.change < 0 ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : null}
                    {price.change_percent?.toFixed(2) || "0.00"}%
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(price.updated_at).toLocaleDateString()}
                </td>
              </tr>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketPricesPage;