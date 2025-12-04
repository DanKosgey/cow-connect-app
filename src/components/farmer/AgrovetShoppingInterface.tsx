import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  XCircle,
  Info,
  AlertTriangle
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AgrovetInventoryService } from "@/services/agrovet-inventory-service";

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

interface ProductPricing {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  price_per_unit: number;
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

const AgrovetShoppingInterface = React.memo(({ farmerId, availableCredit }: { farmerId: string; availableCredit: number }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<AgrovetProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AgrovetProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<{product: AgrovetProduct, quantity: number}[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [creditInfo, setCreditInfo] = useState<{
    isEligible: boolean;
    creditLimit: number;
    availableCredit: number;
    pendingPayments: number;
  } | null>(null);
  const [productPricing, setProductPricing] = useState<Record<string, ProductPricing[]>>({});
  const { toast } = useToast();
  
  // Ref to prevent multiple fetches
  const hasFetchedRef = useRef(false);
  const renderCountRef = useRef(0);

  // Diagnostic logging
  useEffect(() => {
    renderCountRef.current += 1;
    console.log('🔄 AgrovetShoppingInterface render count:', renderCountRef.current);
    
    if (renderCountRef.current > 10) {
      console.error('⚠️ WARNING: Too many renders detected!');
      console.trace();
    }
    
    return () => {
      renderCountRef.current = 0;
    };
  });

  // Memoize the fetch function with stable dependencies
  const fetchData = useCallback(async () => {
    // Prevent concurrent fetches
    if (!farmerId || hasFetchedRef.current) {
      console.log('AgrovetShoppingInterface: Skipping fetch, already fetched or no farmerId');
      return;
    }
    
    hasFetchedRef.current = true;
    
    // Performance monitoring
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    console.log('AgrovetShoppingInterface: Starting data fetch');
    
    try {
      setLoading(true);
      
      // Get agrovet inventory
      const inventory = await CreditServiceEssentials.getAgrovetInventory();
      const fetchTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.log(`AgrovetShoppingInterface: Fetched inventory in ${(fetchTime - startTime).toFixed(2)}ms, count:`, inventory?.length || 0);
      
      // Handle case when no products exist
      if (!inventory || inventory.length === 0) {
        console.info("No credit-eligible agrovet inventory found - showing empty state");
        // Batch all state updates
        setProducts([]);
        setFilteredProducts([]);
        setCategories([]);
        setProductPricing({});
        setCreditInfo(null);
        setCreditRequests([]);
        return;
      }
      
      // Get unique categories
      const uniqueCategories = Array.from(new Set(inventory.map(item => item.category)));
      
      // Fetch pricing information for all products
      const pricingStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const pricingData: Record<string, ProductPricing[]> = {};
      for (const product of inventory) {
        try {
          const pricing = await AgrovetInventoryService.getProductPricing(product.id);
          pricingData[product.id] = pricing;
        } catch (error) {
          console.warn(`Failed to fetch pricing for product ${product.id}:`, error);
          pricingData[product.id] = [];
        }
      }
      const pricingEndTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.log(`AgrovetShoppingInterface: Fetched pricing data in ${(pricingEndTime - pricingStartTime).toFixed(2)}ms`);
      
      // Get existing credit requests
      const requests = await CreditRequestService.getFarmerCreditRequests(farmerId);
      
      // Get credit information
      const creditData = await CreditServiceEssentials.calculateCreditEligibility(farmerId);
      
      // Batch all state updates to prevent cascading re-renders
      setProducts(inventory);
      setFilteredProducts(inventory);
      setCategories(uniqueCategories);
      setProductPricing(pricingData);
      setCreditRequests(requests);
      setCreditInfo(creditData);
      
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.log(`AgrovetShoppingInterface: Completed data fetch in ${(endTime - startTime).toFixed(2)}ms`);
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
  }, [farmerId, toast]); // Stable dependencies

  // Fetch only once on mount and when farmerId changes
  useEffect(() => {
    console.log('AgrovetShoppingInterface: useEffect triggered', { farmerId, hasFetched: hasFetchedRef.current });
    if (farmerId && !hasFetchedRef.current) {
      fetchData();
    }
  }, [farmerId, fetchData]);

  // Reset fetch flag when farmerId changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [farmerId]);

  // Custom debounce hook
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    let filtered = products;
    
    // Apply search filter
    if (debouncedSearchTerm) {
      const searchValue = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchValue) ||
        product.description.toLowerCase().includes(searchValue)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Only show credit eligible products
    filtered = filtered.filter(product => product.is_credit_eligible);
    
    setFilteredProducts(filtered);
  }, [debouncedSearchTerm, selectedCategory, products]);

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
      // Calculate total amount using bulk pricing
      let totalAmount = 0;
      const itemsWithPricing = cart.map(item => {
        const applicablePrice = getApplicablePrice(item.product.id, item.quantity) || item.product.selling_price;
        const itemTotal = applicablePrice * item.quantity;
        totalAmount += itemTotal;
        return {
          ...item,
          unitPrice: applicablePrice,
          total: itemTotal
        };
      });

      // Validate credit eligibility
      if (!creditInfo?.isEligible) {
        toast({
          title: "Not Eligible",
          description: "You are not currently eligible for credit. Please contact admin.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if farmer has enough credit
      if (creditInfo.availableCredit < totalAmount) {
        toast({
          title: "Insufficient Credit",
          description: `You need ${formatCurrency(totalAmount)} but only have ${formatCurrency(creditInfo.availableCredit)} available.`,
          variant: "destructive",
        });
        return;
      }
      
      // Create credit requests for each item in cart with correct pricing
      for (const item of itemsWithPricing) {
        await CreditRequestService.createCreditRequest(
          farmerId,
          item.product.id,
          item.quantity,
          item.product.name,
          item.unitPrice
        );
      }
      
      // Clear cart
      setCart([]);
      
      // Refresh requests and credit info
      const requests = await CreditRequestService.getFarmerCreditRequests(farmerId);
      setCreditRequests(requests);
      
      const updatedCreditInfo = await CreditServiceEssentials.calculateCreditEligibility(farmerId);
      setCreditInfo(updatedCreditInfo);
      
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

  const refreshData = useCallback(async () => {
    // Reset fetch flag to allow refreshing
    hasFetchedRef.current = false;
    // Also reset the service cache to force fresh data
    CreditServiceEssentials.clearAgrovetInventoryCache();
    console.log('AgrovetShoppingInterface: Refreshing data');
    await fetchData();
  }, [fetchData]);

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
      
      // Refresh credit info
      const updatedCreditInfo = await CreditServiceEssentials.calculateCreditEligibility(farmerId);
      setCreditInfo(updatedCreditInfo);
      
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
  const canRequestCredit = creditInfo?.isEligible && creditInfo.availableCredit >= cartTotal && cart.length > 0;

  // Helper function to get applicable price based on quantity
  const getApplicablePrice = (productId: string, quantity: number): number => {
    const pricingTiers = productPricing[productId] || [];
    
    // Sort tiers by min_quantity to ensure proper matching
    const sortedTiers = [...pricingTiers].sort((a, b) => (a.min_quantity || 0) - (b.min_quantity || 0));
    
    // Find the applicable tier
    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      const tier = sortedTiers[i];
      if (quantity >= (tier.min_quantity || 0)) {
        if (!tier.max_quantity || quantity <= tier.max_quantity) {
          return tier.price_per_unit || 0;
        }
      }
    }
    
    // If no tier matches, return 0
    return 0;
  };

  // Helper function to format pricing tiers for display
  const formatPricingTiers = (productId: string, unit: string): string => {
    const pricingTiers = productPricing[productId] || [];
    
    if (pricingTiers.length === 0) {
      return "";
    }
    
    // Sort tiers by min_quantity
    const sortedTiers = [...pricingTiers].sort((a, b) => (a.min_quantity || 0) - (b.min_quantity || 0));
    
    return sortedTiers.map(tier => {
      if (tier.max_quantity) {
        return `${tier.min_quantity}-${tier.max_quantity} ${unit}: ${formatCurrency(tier.price_per_unit || 0)}`;
      } else {
        return `${tier.min_quantity}+ ${unit}: ${formatCurrency(tier.price_per_unit || 0)}`;
      }
    }).join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Credit Status Banner */}
      {creditInfo && (
        <Alert variant={creditInfo.isEligible ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {creditInfo.isEligible ? "Credit Available" : "Credit Not Available"}
          </AlertTitle>
          <AlertDescription>
            {creditInfo.isEligible ? (
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="font-medium">Available Credit:</span> {formatCurrency(creditInfo.availableCredit)}
                </div>
                <div>
                  <span className="font-medium">Credit Limit:</span> {formatCurrency(creditInfo.creditLimit)}
                </div>
                <div>
                  <span className="font-medium">Pending Payments:</span> {formatCurrency(creditInfo.pendingPayments)}
                </div>
              </div>
            ) : (
              "Your credit account is currently frozen or you don't have a credit profile. Please contact admin for assistance."
            )}
          </AlertDescription>
        </Alert>
      )}

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
              onRefresh={refreshData} 
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
                            {productPricing[product.id] && productPricing[product.id].length > 1 && (
                              <div className="mt-2 text-xs text-blue-600">
                                <p>Bulk pricing available:</p>
                                <p>{formatPricingTiers(product.id, product.unit)}</p>
                              </div>
                            )}
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(getApplicablePrice(product.id, 1) || product.selling_price)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-sm text-gray-500">
                            Stock: {product.current_stock} {product.unit}
                          </span>
                          <Button 
                            size="sm" 
                            onClick={() => addToCart(product)}
                            // Removed stock validation - farmers can place orders regardless of stock levels
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
                    <p className="font-semibold text-gray-900">No Credit-Eligible Products Available</p>
                    <p className="text-sm mt-1">There are currently no products available for credit purchase.</p>
                    <p className="text-xs mt-2 text-gray-400">Please contact the agrovet administrator to add credit-eligible products.</p>
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
                          <p className="text-sm text-gray-500">
                            {formatCurrency(getApplicablePrice(item.product.id, item.quantity) || item.product.selling_price)} each
                            {item.quantity > 1 && (
                              <span className="ml-1 text-blue-600">
                                (Bulk pricing applied)
                              </span>
                            )}
                          </p>
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
                          {formatCurrency((getApplicablePrice(item.product.id, item.quantity) || item.product.selling_price) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                    
                    {creditInfo && (
                      <div className="mt-2 text-sm">
                        <div className="flex justify-between">
                          <span>Available Credit:</span>
                          <span className={creditInfo.availableCredit >= cartTotal ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(creditInfo.availableCredit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Remaining After Purchase:</span>
                          <span className={creditInfo.availableCredit - cartTotal >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(creditInfo.availableCredit - cartTotal)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {!creditInfo?.isEligible && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Credit Not Available</AlertTitle>
                        <AlertDescription>
                          You cannot make credit purchases at this time.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {creditInfo?.isEligible && creditInfo.availableCredit < cartTotal && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Insufficient Credit</AlertTitle>
                        <AlertDescription>
                          You don't have enough credit for this purchase.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button 
                      className="w-full mt-4"
                      onClick={requestCredit}
                      disabled={!canRequestCredit}
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
});

export default AgrovetShoppingInterface;