import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditServiceEssentials } from "@/services/credit-service-essentials";
import { CreditRequestService } from "@/services/credit-request-service";
import { 
  ShoppingCart, 
  Search, 
  Filter,
  Package,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import RefreshButton from "@/components/ui/RefreshButton";

interface AgrovetProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  selling_price: number;
  current_stock: number;
  is_credit_eligible: boolean;
}

interface CreditRequest {
  id: string;
  farmer_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  product_name: string;
  unit_price: number;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

const AgrovetShoppingInterface = ({ farmerId, availableCredit }: { farmerId: string; availableCredit: number }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<AgrovetProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AgrovetProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<{product: AgrovetProduct, quantity: number}[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get agrovet inventory
      const inventory = await CreditServiceEssentials.getAgrovetInventory();
      
      // Handle case when no products exist
      if (!inventory || inventory.length === 0) {
        console.info("No agrovet inventory found - showing empty state");
        setProducts([]);
        setFilteredProducts([]);
        setCategories([]);
        return;
      }
      
      setProducts(inventory);
      setFilteredProducts(inventory);
      
      // Get unique categories
      const uniqueCategories = Array.from(new Set(inventory.map(item => item.category)));
      setCategories(uniqueCategories);
      
      // Get existing credit requests
      const requests = await CreditRequestService.getFarmerCreditRequests(farmerId);
      setCreditRequests(requests);
    } catch (err) {
      console.error("Error fetching agrovet data:", err);
      toast({
        title: "Error",
        description: "Failed to load agrovet products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (farmerId) {
      fetchData();
    }
  }, [farmerId, toast]);

  useEffect(() => {
    let filtered = products;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Only show credit eligible products
    filtered = filtered.filter(product => product.is_credit_eligible);
    
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  const addToCart = (product: AgrovetProduct) => {
    // Check if product is already in cart
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Increase quantity
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      // Add new item
      setCart([...cart, { product, quantity: 1 }]);
    }
    
    toast({
      title: "Added to Cart",
      description: `${product.name} added to your cart`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity } 
        : item
    ));
  };

  const getTotalCartAmount = () => {
    return cart.reduce((total, item) => 
      total + (item.product.selling_price * item.quantity), 0
    );
  };

  const requestCredit = async () => {
    try {
      const totalAmount = getTotalCartAmount();
      
      // Create credit requests for each item in cart
      for (const item of cart) {
        await CreditRequestService.createCreditRequest(
          farmerId,
          item.product.id,
          item.quantity,
          item.product.name,
          item.product.selling_price
        );
      }
      
      // Clear cart
      setCart([]);
      
      // Refresh requests
      const requests = await CreditRequestService.getFarmerCreditRequests(farmerId);
      setCreditRequests(requests);
      
      toast({
        title: "Request Submitted",
        description: "Your credit request has been submitted for admin approval",
      });
    } catch (error) {
      console.error("Error submitting credit request:", error);
      toast({
        title: "Error",
        description: "Failed to submit credit request",
        variant: "destructive",
      });
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      // Only allow cancellation of pending requests
      const request = creditRequests.find(r => r.id === requestId);
      if (!request || request.status !== 'pending') {
        toast({
          title: "Cannot Cancel",
          description: "Only pending requests can be cancelled",
          variant: "destructive",
        });
        return;
      }

      // Delete the request
      const { error } = await supabase
        .from('credit_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      // Refresh requests
      const requests = await CreditRequestService.getFarmerCreditRequests(farmerId);
      setCreditRequests(requests);
      
      toast({
        title: "Request Cancelled",
        description: "Your credit request has been cancelled",
      });
    } catch (error) {
      console.error("Error cancelling credit request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel credit request",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  const cartTotal = getTotalCartAmount();

  return (
    <div className="space-y-6">
      {/* Shopping Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <RefreshButton 
              isRefreshing={loading} 
              onRefresh={fetchData} 
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-md shadow-sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Catalog */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Agrovet Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <Card key={product.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                            <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(product.selling_price)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-sm text-gray-500">
                            Stock: {product.current_stock} {product.unit}
                          </span>
                          <Button 
                            size="sm" 
                            onClick={() => addToCart(product)}
                            disabled={product.current_stock <= 0}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No products available for credit purchase</p>
                    <p className="text-sm mt-1">Check back later or contact admin</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shopping Cart and Requests */}
        <div>
          {/* Shopping Cart */}
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Your Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length > 0 ? (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                          <p className="text-sm text-gray-500">{formatCurrency(item.product.selling_price)} each</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <span className="font-medium">
                          {formatCurrency(item.product.selling_price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                    
                    <div className="mt-2 text-sm text-blue-600">
                      <span>Your request will be reviewed by an admin</span>
                    </div>
                    
                    <Button 
                      className="w-full mt-4"
                      onClick={requestCredit}
                      disabled={cart.length === 0}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Request Credit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Your cart is empty</p>
                  <p className="text-sm mt-1">Add products to your cart to request credit</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Credit Requests */}
          {creditRequests.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Your Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {creditRequests.slice(0, 5).map(request => (
                    <div key={request.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{request.product_name}</h4>
                          <p className="text-sm text-gray-500">
                            {request.quantity} × {formatCurrency(request.unit_price)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(request.total_amount)}
                        </span>
                      </div>
                      {request.status === 'pending' && (
                        <div className="mt-2 flex justify-end">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => cancelRequest(request.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                      {request.status === 'approved' && (
                        <div className="mt-2 flex items-center text-sm text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approved - Product issued
                        </div>
                      )}
                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mt-2 text-sm text-red-600">
                          Rejected: {request.rejection_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgrovetShoppingInterface;