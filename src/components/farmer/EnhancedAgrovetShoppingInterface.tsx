import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditServiceEssentials } from "@/services/credit-service-essentials";
import { CreditRequestService } from "@/services/credit-request-service";
import { AgrovetInventoryService, ProductPackaging, AgrovetProduct } from "@/services/agrovet-inventory-service";
import PackagingSelector from "@/components/farmer/PackagingSelector";
import UnifiedPackagingDisplay from "@/components/common/UnifiedPackagingDisplay";
import CategoryBrowser from "@/components/farmer/CategoryBrowser";
import PackagingSelectionModal from "@/components/farmer/PackagingSelectionModal";

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
  AlertTriangle,
  Plus,
  Minus,
  X,
  Star,
  TrendingDown,
  Zap,
  Leaf,
  Droplets,
  Wheat
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

// Extended interface to include UI-only fields and packaging options
type EnhancedAgrovetProduct = AgrovetProduct & {
  rating?: number;
  discount_percentage?: number;
  packaging_options?: ProductPackaging[];
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

// Update the cart item to include packaging option
interface CartItem {
  product: EnhancedAgrovetProduct;
  packagingOption?: ProductPackaging;
  quantity: number;
}

const EnhancedAgrovetShoppingInterface = React.memo(({ 
  farmerId, 
  availableCredit 
}: { 
  farmerId: string; 
  availableCredit: number 
}) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<EnhancedAgrovetProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<EnhancedAgrovetProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [creditInfo, setCreditInfo] = useState<{
    isEligible: boolean;
    creditLimit: number;
    availableCredit: number;
    pendingPayments: number;
  } | null>(null);
  const [productPackaging, setProductPackaging] = useState<Record<string, ProductPackaging[]>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EnhancedAgrovetProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
  const [productForPackaging, setProductForPackaging] = useState<EnhancedAgrovetProduct | null>(null);
  const { toast } = useToast();

  // Category icons mapping
  const categoryIcons: Record<string, React.ReactNode> = {
    "Fertilizers": <Leaf className="w-4 h-4" />,
    "Seeds": <Wheat className="w-4 h-4" />,
    "Pesticides": <Droplets className="w-4 h-4" />,
    "Feed": <Zap className="w-4 h-4" />,
    "default": <Package className="w-4 h-4" />
  };

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!farmerId) return;
    
    try {
      setLoading(true);
      
      // Get agrovet inventory - using the same method as creditor portal
      const inventory = await AgrovetInventoryService.getCreditEligibleProducts();
      console.log('Fetched credit-eligible products:', inventory);
      
      // Handle case when no products exist
      if (!inventory || inventory.length === 0) {
        setProducts([]);
        setFilteredProducts([]);
        setCategories([]);
        setProductPackaging({});
        setCreditInfo(null);
        setCreditRequests([]);
        return;
      }
      
      // Enhance products with mock data and attach packaging data directly to products (like creditor portal)
      const productsWithPackaging = await Promise.all(
        inventory.map(async (product) => {
          try {
            console.log(`Fetching packaging for product: ${product.name} (${product.id})`);
            const packaging = await AgrovetInventoryService.getProductPackaging(product.id);
            console.log(`Product ${product.name} (${product.id}) has ${packaging?.length || 0} packaging options`);
            if (packaging && packaging.length > 0) {
              console.log(`Packaging options for ${product.name}:`, packaging);
            } else {
              // If no packaging found, try fetching all packaging to debug
              console.log(`Attempting to fetch all packaging for debugging purposes...`);
              try {
                // This is just for debugging - we won't use this data
                const allPackaging = await AgrovetInventoryService.getProductPackaging(product.id);
                console.log(`All packaging for ${product.id}:`, allPackaging);
              } catch (debugError) {
                console.log(`Debug fetch also failed:`, debugError);
              }
            }
            return { 
              ...product, 
              rating: Math.floor(Math.random() * 2) + 3, // Random rating between 3-5
              discount_percentage: Math.random() > 0.7 ? Math.floor(Math.random() * 15) + 5 : undefined, // 30% chance of discount
              packaging_options: packaging?.filter(p => p.is_credit_eligible) || []
            };
          } catch (error) {
            console.warn(`Failed to fetch packaging for product ${product.id}:`, error);
            // Show a user-friendly message if it's a permissions error
            const errorMessage = (error as Error).message || String(error);
            if (errorMessage.includes('permission')) {
              toast({
                title: "Permission Issue",
                description: "You don't have permission to view product packaging information. Please contact administrator.",
                variant: "destructive",
              });
            }
            // Even if we fail to fetch packaging, we still want to show the product
            return { 
              ...product, 
              rating: Math.floor(Math.random() * 2) + 3,
              discount_percentage: Math.random() > 0.7 ? Math.floor(Math.random() * 15) + 5 : undefined,
              packaging_options: [] 
            };
          }
        })
      );
      
      // Get unique categories
      const uniqueCategories = Array.from(new Set(productsWithPackaging.map(item => item.category)));
      
      // Create packaging data map for backward compatibility with existing components
      const packagingData: Record<string, ProductPackaging[]> = {};
      productsWithPackaging.forEach(product => {
        packagingData[product.id] = product.packaging_options || [];
      });
      
      // Get existing credit requests
      const requests = await CreditRequestService.getFarmerCreditRequests(farmerId);
      
      // Get credit information
      const creditData = await CreditServiceEssentials.calculateCreditEligibility(farmerId);
      
      // Set all state
      setProducts(productsWithPackaging);
      setFilteredProducts(productsWithPackaging);
      setCategories(uniqueCategories);
      setProductPackaging(packagingData);
      setCreditRequests(requests);
      setCreditInfo(creditData);
    } catch (err) {
      console.error("Error fetching agrovet data:", err);
      const errorMessage = (err as Error).message || String(err);
      if (errorMessage.includes('permission')) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to view agrovet products. Please contact administrator.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load agrovet products. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [farmerId, toast]);

  // Initial data fetch - only run once on mount
  useEffect(() => {
    if (farmerId) {
      fetchData();
    }
  }, [farmerId]); // Remove fetchData from dependencies to prevent infinite loop

  // Filter and sort products - only when relevant state changes
  useEffect(() => {
    let result = [...products];
    
    // Apply search filter
    if (searchTerm) {
      const searchValue = searchTerm.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(searchValue) ||
        product.description.toLowerCase().includes(searchValue) ||
        product.category.toLowerCase().includes(searchValue)
      );
    }
    
    // Apply category filter
    if (selectedCategory !== "all") {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    // Only show credit eligible products
    result = result.filter(product => product.is_credit_eligible);
    
    // Apply sorting
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => {
          const aMinPrice = a.packaging_options?.length > 0 
            ? Math.min(...a.packaging_options.map(p => p.price)) 
            : a.cost_price;
          const bMinPrice = b.packaging_options?.length > 0 
            ? Math.min(...b.packaging_options.map(p => p.price)) 
            : b.cost_price;
          return aMinPrice - bMinPrice;
        });
        break;
      case "price-high":
        result.sort((a, b) => {
          const aMaxPrice = a.packaging_options?.length > 0 
            ? Math.max(...a.packaging_options.map(p => p.price)) 
            : a.cost_price;
          const bMaxPrice = b.packaging_options?.length > 0 
            ? Math.max(...b.packaging_options.map(p => p.price)) 
            : b.cost_price;
          return bMaxPrice - aMaxPrice;
        });
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "discount":
        result.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
        break;
      default:
        // Featured - prioritize discounted items and higher rated items
        result.sort((a, b) => {
          const aScore = (a.discount_percentage || 0) * 10 + (a.rating || 0);
          const bScore = (b.discount_percentage || 0) * 10 + (b.rating || 0);
          return bScore - aScore;
        });
    }
    
    setFilteredProducts(result);
  }, [searchTerm, selectedCategory, sortBy, products]); // Remove productPackaging to prevent infinite loop

  // Cart functions
  const addToCart = (product: EnhancedAgrovetProduct, packagingOption?: ProductPackaging, quantity: number = 1) => {
    // If product has packaging options and no packaging was explicitly selected, show packaging selection modal
    if (product.packaging_options && product.packaging_options.length > 0 && !packagingOption) {
      setProductForPackaging(product);
      setIsPackagingModalOpen(true);
      return;
    }
    
    setCart(prevCart => {
      // If no packaging option is selected and product has packaging options, use the first one
      const effectivePackaging = packagingOption || 
        (product.packaging_options?.length > 0 ? product.packaging_options[0] : undefined);
      
      const newItem: CartItem = { product, packagingOption: effectivePackaging, quantity };
      
      // Check if this exact combination (product + packaging) is already in cart
      const existingItemIndex = prevCart.findIndex(item => 
        item.product.id === product.id && 
        item.packagingOption?.id === effectivePackaging?.id
      );
      
      if (existingItemIndex !== -1) {
        // Update quantity of existing item
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity
        };
        return updatedCart;
      } else {
        // Add new item
        return [...prevCart, newItem];
      }
    });
    
    toast({
      title: "Added to Cart",
      description: `${product.name}${packagingOption ? ` (${packagingOption.name})` : ''} added to your cart`,
    });
  };

  const removeFromCart = (productId: string, packagingOptionId?: string) => {
    setCart(prevCart => prevCart.filter(item => 
      !(item.product.id === productId && item.packagingOption?.id === packagingOptionId)
    ));
  };

  const updateQuantity = (productId: string, packagingOptionId: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, packagingOptionId);
      return;
    }
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.product.id === productId && item.packagingOption?.id === packagingOptionId
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const getTotalCartAmount = () => {
    return cart.reduce((total, item) => {
      const price = item.packagingOption?.price || item.product.cost_price;
      return total + (price * item.quantity);
    }, 0);
  };

  const requestCredit = async () => {
    try {
      // Calculate total amount
      let totalAmount = 0;
      const itemsWithPricing = cart.map(item => {
        const price = item.packagingOption?.price || item.product.cost_price;
        const itemTotal = price * item.quantity;
        totalAmount += itemTotal;
        return {
          ...item,
          unitPrice: price,
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
      
      // Create credit requests for each item in cart
      for (const item of itemsWithPricing) {
        const productName = item.packagingOption 
          ? `${item.product.name} (${item.packagingOption.name})` 
          : item.product.name;
          
        await CreditRequestService.createCreditRequest(
          farmerId,
          item.product.id,
          item.quantity,
          productName,
          item.unitPrice,
          item.packagingOption?.id
        );
      }
      
      // Clear cart
      setCart([]);
      setIsCartOpen(false);
      
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

  // Helper functions
  const getMinProductPrice = (productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (product && product.packaging_options?.length > 0) {
      return Math.min(...product.packaging_options.map(p => p.price));
    }
    // Fallback to cost_price if no packaging options
    return product ? product.cost_price : 0;
  };

  const getMaxProductPrice = (productId: string): number => {
    const product = products.find(p => p.id === productId);
    if (product && product.packaging_options?.length > 0) {
      return Math.max(...product.packaging_options.map(p => p.price));
    }
    // Fallback to cost_price if no packaging options
    return product ? product.cost_price : 0;
  };

  const formatPackagingOptions = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    const packagingOptions = product?.packaging_options || [];
    
    if (packagingOptions.length === 0) {
      return "";
    }
    
    return packagingOptions.map(option => 
      `${option.name}: ${formatCurrency(option.price)}`
    ).join(", ");
  };

  const openProductModal = (product: EnhancedAgrovetProduct) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const cartTotal = getTotalCartAmount();
  const canRequestCredit = creditInfo?.isEligible && creditInfo.availableCredit >= cartTotal && cart.length > 0;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credit Status Banner */}
      {creditInfo && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${creditInfo.isEligible ? 'bg-green-100' : 'bg-red-100'}`}>
                <CreditCard className={`w-5 h-5 ${creditInfo.isEligible ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {creditInfo.isEligible ? "Credit Available" : "Credit Not Available"}
                </h3>
                <p className="text-sm text-gray-600">
                  {creditInfo.isEligible 
                    ? "Ready to shop with your available credit" 
                    : "Your credit account is currently frozen or unavailable"}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Available</p>
                <p className="font-semibold text-green-600">{formatCurrency(creditInfo.availableCredit)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Limit</p>
                <p className="font-semibold">{formatCurrency(creditInfo.creditLimit)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="font-semibold text-amber-600">{formatCurrency(creditInfo.pendingPayments)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Utilization</p>
                <p className="font-semibold">
                  {creditInfo.creditLimit > 0 
                    ? `${Math.round(((creditInfo.creditLimit - creditInfo.availableCredit) / creditInfo.creditLimit) * 100)}%` 
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shopping Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products, categories, brands..."
                className="pl-10 h-12 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category} className="flex items-center gap-2">
                      <span className="flex items-center gap-2">
                        {categoryIcons[category] || categoryIcons.default}
                        {category}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-40 h-12 rounded-xl">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="discount">Best Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Browser - NEW ADDITION */}
      <CategoryBrowser 
        onProductSelect={(product) => {
          setSelectedProduct(product);
          setIsProductModalOpen(true);
        }} 
      />

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <Card className="h-full border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl">
                  <div className="relative">
                    {/* Product Image */}
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.src = "https://placehold.co/400x400?text=Product+Image";
                          }}
                        />
                      ) : (
                        <div className="bg-white p-4 rounded-full shadow-sm">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Discount Badge */}
                    {product.discount_percentage && (
                      <Badge className="absolute top-3 left-33 bg-red-500 text-white">
                        -{product.discount_percentage}%
                      </Badge>
                    )}
                    
                    {/* Quick Add Button */}
                    <Button
                      size="sm"
                      className="absolute bottom-3 right-3 rounded-full w-10 h-10 p-0 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => addToCart(product)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-600">{product.rating?.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {categoryIcons[product.category] || categoryIcons.default}
                        <span className="text-xs">{product.category}</span>
                      </Badge>
                      
                      {/* Removed stock display - farmers don't need to see stock levels */}
                    </div>
                    
                    {/* ENHANCED Pricing Information */}
                    <div className="mb-3">
                      {product.packaging_options?.length > 0 ? (
                        <div className="space-y-2">
                          {/* Show the best price option */}
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-gray-900">
                              {formatCurrency(Math.min(...product.packaging_options.map(p => p.price || 0)))}
                            </span>
                            <span className="text-xs text-gray-500">starting price</span>
                          </div>
                          
                          {/* Show packaging options count */}
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Zap className="w-3 h-3" />
                            <span>
                              {product.packaging_options.length} packaging option{product.packaging_options.length !== 1 ? 's' : ''} available
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs">
                              Pricing information temporarily unavailable
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Contact administrator for product pricing
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {product.discount_percentage && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <TrendingDown className="w-3 h-3" />
                          Save {formatCurrency((getMaxProductPrice(product.id) * (product.discount_percentage || 0) / 100))}
                        </div>
                      )}
                      
                      <Button 
                        size="sm" 
                        className="rounded-lg"
                        onClick={() => openProductModal(product)}
                      >
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
              <Button onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Cart Button */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
          <Button 
            className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-xl z-50"
            size="icon"
          >
            <ShoppingCart className="w-6 h-6" />
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 rounded-full w-6 h-6 justify-center p-0">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Your Shopping Cart
            </SheetTitle>
          </SheetHeader>
          
          <div className="py-6 space-y-6">
            {cart.length > 0 ? (
              <>
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <Card key={`${item.product.id}-${item.packagingOption?.id || 'no-packaging'}-${index}`} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="bg-gray-100 rounded-lg w-16 h-16 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                            {item.packagingOption && (
                              <p className="text-sm text-gray-500">{item.packagingOption.name}</p>
                            )}
                            <p className="text-sm text-gray-500">{item.product.category}</p>
                            
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="w-8 h-8 rounded-full"
                                  onClick={() => updateQuantity(item.product.id, item.packagingOption?.id, item.quantity - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="w-8 h-8 rounded-full"
                                  onClick={() => updateQuantity(item.product.id, item.packagingOption?.id, item.quantity + 1)}
                                  // Removed stock validation - farmers can order any quantity
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              <div className="text-right">
                                <p className="font-semibold">
                                  {formatCurrency((item.packagingOption?.price || item.product.cost_price) * item.quantity)}
                                </p>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 p-0 h-auto"
                                  onClick={() => removeFromCart(item.product.id, item.packagingOption?.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(cartTotal)}</span>
                  </div>
                  
                  {creditInfo && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available Credit</span>
                        <span className={creditInfo.availableCredit >= cartTotal ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {formatCurrency(creditInfo.availableCredit)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining After Purchase</span>
                        <span className={
                          creditInfo.availableCredit - cartTotal >= 0 
                            ? "text-green-600 font-medium" 
                            : "text-red-600 font-medium"
                        }>
                          {formatCurrency(creditInfo.availableCredit - cartTotal)}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {!creditInfo?.isEligible && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Credit Not Available</span>
                      </div>
                      <p className="text-xs text-red-700 mt-1">
                        You cannot make credit purchases at this time.
                      </p>
                    </div>
                  )}
                  
                  {creditInfo?.isEligible && creditInfo.availableCredit < cartTotal && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Insufficient Credit</span>
                      </div>
                      <p className="text-xs text-red-700 mt-1">
                        You don't have enough credit for this purchase.
                      </p>
                    </div>
                  )}
                </div>
                
                <SheetFooter>
                  <Button 
                    className="w-full"
                    onClick={requestCredit}
                    disabled={!canRequestCredit}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Request Credit ({formatCurrency(cartTotal)})
                  </Button>
                </SheetFooter>
              </>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Cart is Empty</h3>
                <p className="text-gray-600">Add products to your cart to request credit</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Product Detail Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-2xl">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
                <DialogDescription>{selectedProduct.description}</DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden">
                  {selectedProduct.image_url ? (
                    <img 
                      src={selectedProduct.image_url} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/400x400?text=Product+Image";
                      }}
                    />
                  ) : (
                    <Package className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-medium">{selectedProduct.rating?.toFixed(1)}</span>
                      <span className="text-gray-500">(128 reviews)</span>
                    </div>
                    
                    {selectedProduct.discount_percentage && (
                      <Badge className="bg-red-500 text-white">
                        -{selectedProduct.discount_percentage}%
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(getMinProductPrice(selectedProduct.id))}
                    </span>
                    {(selectedProduct as EnhancedAgrovetProduct).packaging_options && (selectedProduct as EnhancedAgrovetProduct).packaging_options!.length > 1 && (
                      <span className="text-lg text-gray-500">
                        - {formatCurrency(getMaxProductPrice(selectedProduct.id))}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{selectedProduct.category}</Badge>
                    <span className={selectedProduct.current_stock > 10 ? "text-green-600" : "text-amber-600"}>
                      {selectedProduct.current_stock} {selectedProduct.unit} in stock
                    </span>
                  </div>
                  
                  {/* ENHANCED Packaging Options Display */}
                  {selectedProduct.packaging_options && selectedProduct.packaging_options.length > 0 ? (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Available Packaging Options
                      </h4>
                      <div className="space-y-3">
                        <UnifiedPackagingDisplay 
                          packagingOptions={selectedProduct.packaging_options} 
                          compact={false} 
                          showIcons={true} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-900 mb-1">Pricing Information Unavailable</h4>
                          <p className="text-sm text-amber-700">
                            Packaging options for this product are temporarily unavailable. 
                            Please contact the administrator for more information.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // Use the packaging selection flow instead of default packaging
                        addToCart(selectedProduct as EnhancedAgrovetProduct);
                        setIsProductModalOpen(false);
                      }}
                      disabled={selectedProduct.current_stock <= 0 || !creditInfo?.isEligible}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Packaging Selection Modal */}
      <PackagingSelectionModal 
        isOpen={isPackagingModalOpen} 
        onClose={() => setIsPackagingModalOpen(false)}
        product={productForPackaging || {}}
        onConfirm={(packaging) => {
          if (productForPackaging) {
            addToCart(productForPackaging, packaging);
            setIsPackagingModalOpen(false);
            setProductForPackaging(null);
          }
        }}
      />

      {/* Recent Requests Section */}
      {creditRequests.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Credit Requests
            </CardTitle>
            <CardDescription>Track the status of your recent credit requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creditRequests.slice(0, 3).map(request => (
                <Card key={request.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{request.product_name}</h4>
                        <p className="text-sm text-gray-500">
                          {request.quantity} × {formatCurrency(request.unit_price)}
                        </p>
                      </div>
                      <Badge className={
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(request.total_amount)}
                      </span>
                    </div>
                    
                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="mt-2 text-xs text-red-600">
                        Rejected: {request.rejection_reason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {creditRequests.length > 3 && (
              <div className="text-center mt-4">
                <Button variant="outline" size="sm">
                  View All Requests
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default EnhancedAgrovetShoppingInterface;