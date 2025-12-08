import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Search, Package, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import StatusBadge from '@/components/StatusBadge';
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory';
import { AgrovetProduct } from '@/services/agrovet-inventory-service';

interface ReservedItem {
  id: string;
  product_id: string;
  quantity: number;
  farmer_id: string;
  farmer_name: string;
  reservation_date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

const InventoryReservationSystem = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<AgrovetProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AgrovetProduct[]>([]);
  const [reservedItems, setReservedItems] = useState<ReservedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Setup real-time inventory updates
  useRealtimeInventory({
    onProductsUpdate: (updatedProducts) => {
      setProducts(updatedProducts);
      // If we're not currently filtering, update the filtered products too
      if (!searchTerm) {
        setFilteredProducts(updatedProducts);
      }
    }
  });

  useEffect(() => {
    fetchInventory();
    fetchReservations();
  }, []);

  useEffect(() => {
    // Filter products based on search term
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agrovet_inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setProducts(data as AgrovetProduct[]);
      setFilteredProducts(data as AgrovetProduct[]);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      // In a real implementation, this would fetch actual reservations
      // For now, we'll use mock data to demonstrate the concept
      const mockReservations: ReservedItem[] = [];
      setReservedItems(mockReservations);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      toast({
        title: "Error",
        description: "Failed to load reservation data",
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchInventory();
      await fetchReservations();
      toast({
        title: "Refreshed",
        description: "Inventory data updated successfully"
      });
    } catch (err) {
      console.error("Error refreshing data:", err);
      toast({
        title: "Error",
        description: "Failed to refresh inventory data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStockStatus = (product: AgrovetProduct) => {
    const availableStock = product.current_stock;
    const reservedStock = product.reserved_stock || 0;
    const actualAvailable = availableStock - reservedStock;
    
    if (actualAvailable <= 0) {
      return { status: 'out_of_stock', label: 'Out of Stock', color: 'destructive' };
    } else if (actualAvailable <= product.reorder_level) {
      return { status: 'low_stock', label: 'Low Stock', color: 'warning' };
    } else {
      return { status: 'in_stock', label: 'In Stock', color: 'success' };
    }
  };

  const reserveItem = async (productId: string, quantity: number) => {
    try {
      // In a real implementation, this would create a reservation record
      // and update the reserved_stock field in the database
      
      // For demonstration, we'll just show a success message
      toast({
        title: "Reservation Created",
        description: `Reserved ${quantity} units successfully`
      });
    } catch (err) {
      console.error("Error reserving item:", err);
      toast({
        title: "Error",
        description: "Failed to create reservation",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Reservation System</h2>
          <p className="text-muted-foreground">Reserve products for farmers and track inventory levels</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name, category, or supplier..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Products</div>
                <div className="text-2xl font-bold">{products.length}</div>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">In Stock</div>
                <div className="text-2xl font-bold">
                  {products.filter(p => (p.current_stock - (p.reserved_stock || 0)) > p.reorder_level).length}
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Low Stock</div>
                <div className="text-2xl font-bold">
                  {products.filter(p => {
                    const available = p.current_stock - (p.reserved_stock || 0);
                    return available > 0 && available <= p.reorder_level;
                  }).length}
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Out of Stock</div>
                <div className="text-2xl font-bold">
                  {products.filter(p => (p.current_stock - (p.reserved_stock || 0)) <= 0).length}
                </div>
              </div>
              <div className="h-8 w-8 text-red-500 font-bold text-xl">
                0
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Available Inventory
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredProducts.length} items)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No products found</p>
              <p>
                {searchTerm
                  ? "No products match your search criteria"
                  : "Inventory items will appear here once added"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                const availableStock = product.current_stock - (product.reserved_stock || 0);
                
                return (
                  <div key={product.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">
                            {product.name}
                          </h3>
                          <Badge variant={stockStatus.color as any}>
                            {stockStatus.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Category</div>
                            <div className="font-medium">
                              {product.category}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Supplier</div>
                            <div className="font-medium">
                              {product.supplier}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Price</div>
                            <div className="font-medium">
                              {formatCurrency(product.cost_price)}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              per {product.unit}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Stock Levels</div>
                            <div className="font-medium">
                              {availableStock} {product.unit} available
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {product.current_stock} total / {product.reserved_stock || 0} reserved
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          disabled={availableStock <= 0}
                          onClick={() => reserveItem(product.id, 1)}
                        >
                          Reserve
                        </Button>
                        {product.is_credit_eligible && (
                          <Badge variant="secondary">Credit Eligible</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryReservationSystem;