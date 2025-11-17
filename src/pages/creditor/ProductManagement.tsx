import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgrovetInventoryService, AgrovetProduct, ProductPricing } from '@/services/agrovet-inventory-service';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  CreditCard,
  Package,
  DollarSign,
  Layers,
  AlertTriangle,
  Bell,
  BellOff
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import AdvancedFilter from '@/components/AdvancedFilter';
import SortControl from '@/components/SortControl';
import PaginationControl from '@/components/PaginationControl';

const ProductManagement = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<AgrovetProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AgrovetProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCreditEligible, setFilterCreditEligible] = useState("all");
  const [filterStockStatus, setFilterStockStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AgrovetProduct | null>(null);
  const [formData, setFormData] = useState<Partial<AgrovetProduct>>({
    name: '',
    description: '',
    category: '',
    unit: '',
    current_stock: 0,
    reorder_level: 0,
    supplier: '',
    cost_price: 0,
    selling_price: 0,
    is_credit_eligible: false
  });
  const [pricingData, setPricingData] = useState<Partial<ProductPricing>[]>([
    { min_quantity: 1, max_quantity: null, price_per_unit: 0, is_credit_eligible: true }
  ]);
  // Add new state for advanced filters, sorting, and pagination
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get unique categories for filter
  const categories = Array.from(new Set(products.map(p => p.category)));

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter products based on search term, category, credit eligibility, and stock status
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(product => product.category === filterCategory);
    }

    if (filterCreditEligible !== "all") {
      const isCreditEligible = filterCreditEligible === "yes";
      filtered = filtered.filter(product => product.is_credit_eligible === isCreditEligible);
    }

    if (filterStockStatus !== "all") {
      if (filterStockStatus === "low") {
        filtered = filtered.filter(product => product.current_stock <= product.reorder_level);
      } else if (filterStockStatus === "out") {
        filtered = filtered.filter(product => product.current_stock === 0);
      } else if (filterStockStatus === "adequate") {
        filtered = filtered.filter(product => product.current_stock > product.reorder_level);
      }
    }

    // Apply advanced filters
    if (advancedFilters.category && advancedFilters.category !== "all") {
      filtered = filtered.filter(product => product.category === advancedFilters.category);
    }

    if (advancedFilters.creditEligible && advancedFilters.creditEligible !== "all") {
      const isCreditEligible = advancedFilters.creditEligible === "yes";
      filtered = filtered.filter(product => product.is_credit_eligible === isCreditEligible);
    }

    if (advancedFilters.stockStatus && advancedFilters.stockStatus !== "all") {
      if (advancedFilters.stockStatus === "low") {
        filtered = filtered.filter(product => product.current_stock <= product.reorder_level);
      } else if (advancedFilters.stockStatus === "out") {
        filtered = filtered.filter(product => product.current_stock === 0);
      } else if (advancedFilters.stockStatus === "adequate") {
        filtered = filtered.filter(product => product.current_stock > product.reorder_level);
      }
    }

    if (advancedFilters.minPrice !== undefined) {
      filtered = filtered.filter(product => product.selling_price >= advancedFilters.minPrice);
    }

    if (advancedFilters.maxPrice !== undefined) {
      filtered = filtered.filter(product => product.selling_price <= advancedFilters.maxPrice);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "selling_price":
          comparison = a.selling_price - b.selling_price;
          break;
        case "current_stock":
          comparison = a.current_stock - b.current_stock;
          break;
        case "is_credit_eligible":
          comparison = (a.is_credit_eligible === b.is_credit_eligible) ? 0 : a.is_credit_eligible ? -1 : 1;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);
    
    setFilteredProducts(paginated);
  }, [searchTerm, filterCategory, filterCreditEligible, filterStockStatus, products, advancedFilters, sortBy, sortOrder, currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await AgrovetInventoryService.getInventory();
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products");
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') || name.includes('stock') || name.includes('level') 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_credit_eligible: checked
    }));
  };

  const handlePricingChange = (index: number, field: string, value: any) => {
    const newPricingData = [...pricingData];
    newPricingData[index] = {
      ...newPricingData[index],
      [field]: field.includes('quantity') || field.includes('price') ? parseFloat(value) || 0 : value
    };
    setPricingData(newPricingData);
  };

  const addPricingTier = () => {
    setPricingData([
      ...pricingData,
      { min_quantity: 1, max_quantity: null, price_per_unit: 0, is_credit_eligible: true }
    ]);
  };

  const removePricingTier = (index: number) => {
    if (pricingData.length > 1) {
      const newPricingData = [...pricingData];
      newPricingData.splice(index, 1);
      setPricingData(newPricingData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      unit: '',
      current_stock: 0,
      reorder_level: 0,
      supplier: '',
      cost_price: 0,
      selling_price: 0,
      is_credit_eligible: false
    });
    setPricingData([
      { min_quantity: 1, max_quantity: null, price_per_unit: 0, is_credit_eligible: true }
    ]);
    setEditingProduct(null);
  };

  const openEditDialog = async (product: AgrovetProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      unit: product.unit,
      current_stock: product.current_stock,
      reorder_level: product.reorder_level,
      supplier: product.supplier,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      is_credit_eligible: product.is_credit_eligible
    });
    
    // Fetch existing pricing data for the product
    try {
      const pricingData = await AgrovetInventoryService.getProductPricing(product.id);
      if (pricingData && pricingData.length > 0) {
        setPricingData(pricingData.map(p => ({
          min_quantity: p.min_quantity,
          max_quantity: p.max_quantity,
          price_per_unit: p.price_per_unit,
          is_credit_eligible: p.is_credit_eligible
        })));
      } else {
        // Default pricing tier if none exists
        setPricingData([
          { min_quantity: 1, max_quantity: null, price_per_unit: product.selling_price, is_credit_eligible: product.is_credit_eligible }
        ]);
      }
    } catch (err) {
      console.warn("Failed to fetch pricing data, using default", err);
      setPricingData([
        { min_quantity: 1, max_quantity: null, price_per_unit: product.selling_price, is_credit_eligible: product.is_credit_eligible }
      ]);
    }
    
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let productId: string;
      
      if (editingProduct) {
        // Update existing product
        const updatedProduct = await AgrovetInventoryService.updateInventoryItem(editingProduct.id, formData);
        productId = updatedProduct.id;
        toast({
          title: "Success",
          description: "Product updated successfully"
        });
      } else {
        // Create new product
        const newProduct = await AgrovetInventoryService.createInventoryItem(formData as any);
        productId = newProduct.id;
        toast({
          title: "Success",
          description: "Product created successfully"
        });
      }
      
      // Save pricing data
      if (productId) {
        // For simplicity, we'll delete existing pricing and create new ones
        // In a production app, you might want to update existing records
        try {
          // First, get existing pricing to delete
          const existingPricing = await AgrovetInventoryService.getProductPricing(productId);
          for (const pricing of existingPricing) {
            await AgrovetInventoryService.deleteProductPricing(pricing.id);
          }
          
          // Create new pricing tiers
          for (const pricing of pricingData) {
            await AgrovetInventoryService.createProductPricing({
              product_id: productId,
              min_quantity: pricing.min_quantity || 1,
              max_quantity: pricing.max_quantity || null,
              price_per_unit: pricing.price_per_unit || 0,
              is_credit_eligible: pricing.is_credit_eligible || false
            });
          }
        } catch (pricingError) {
          console.warn("Failed to save pricing data", pricingError);
        }
      }
      
      closeDialog();
      fetchData();
    } catch (err) {
      console.error("Error saving product:", err);
      toast({
        title: "Error",
        description: `Failed to ${editingProduct ? 'update' : 'create'} product`,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }
    
    try {
      await AgrovetInventoryService.deleteInventoryItem(id);
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
      fetchData();
    } catch (err) {
      console.error("Error deleting product:", err);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const toggleCreditEligibility = async (product: AgrovetProduct) => {
    try {
      await AgrovetInventoryService.updateInventoryItem(product.id, {
        is_credit_eligible: !product.is_credit_eligible
      });
      toast({
        title: "Success",
        description: `Product ${!product.is_credit_eligible ? 'enabled' : 'disabled'} for credit purchases`
      });
      fetchData();
    } catch (err) {
      console.error("Error updating credit eligibility:", err);
      toast({
        title: "Error",
        description: "Failed to update credit eligibility",
        variant: "destructive"
      });
    }
  };

  const getStockStatus = (product: AgrovetProduct) => {
    if (product.current_stock === 0) return "out";
    if (product.current_stock <= product.reorder_level) return "low";
    return "adequate";
  };

  const getStockStatusBadge = (product: AgrovetProduct) => {
    const status = getStockStatus(product);
    switch (status) {
      case "out":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "low":
        return <Badge variant="secondary">Low Stock</Badge>;
      default:
        return <Badge variant="default">Adequate</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product management data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate total pages for pagination
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-2">Manage agrovet products available for farmer purchases</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by product name, description, or supplier..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            
            <Select 
              value={filterCategory} 
              onValueChange={(value) => {
                setFilterCategory(value);
                setCurrentPage(1); // Reset to first page when filtering
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={filterCreditEligible} 
              onValueChange={(value) => {
                setFilterCreditEligible(value);
                setCurrentPage(1); // Reset to first page when filtering
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Credit eligible" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="yes">Credit Eligible</SelectItem>
                <SelectItem value="no">Not Eligible</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filterStockStatus} 
              onValueChange={(value) => {
                setFilterStockStatus(value);
                setCurrentPage(1); // Reset to first page when filtering
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Stock status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="adequate">Adequate Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            
            <AdvancedFilter 
              onFilterChange={(filters) => {
                setAdvancedFilters(filters);
                setCurrentPage(1); // Reset to first page when applying filters
              }}
              filterType="product"
              currentFilters={advancedFilters}
            />
          </div>
          
          <SortControl
            options={[
              { id: "name", label: "Name" },
              { id: "category", label: "Category" },
              { id: "selling_price", label: "Price" },
              { id: "current_stock", label: "Stock" },
              { id: "is_credit_eligible", label: "Credit Eligible" }
            ]}
            currentSort={sortBy}
            currentOrder={sortOrder}
            onSortChange={(newSortBy, newSortOrder) => {
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
          />
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Agrovet Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterCategory !== "all" || filterCreditEligible !== "all" || filterStockStatus !== "all"
                    ? "No products match your search criteria" 
                    : "Products will appear here once added"}
                </p>
                <div className="mt-4">
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Product
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock Status</TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Credit Eligible</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.description}</div>
                            <div className="text-xs text-gray-400">Supplier: {product.supplier}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {product.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStockStatusBadge(product)}
                        </TableCell>
                        <TableCell>
                          <div className={getStockStatus(product) === "low" || getStockStatus(product) === "out" ? "text-red-600 font-medium" : ""}>
                            {product.current_stock} {product.unit}
                          </div>
                          <div className="text-xs text-gray-500">
                            Reorder at: {product.reorder_level} {product.unit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(product.selling_price)}</div>
                          <div className="text-xs text-gray-500">
                            Cost: {formatCurrency(product.cost_price)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Switch
                              checked={product.is_credit_eligible}
                              onCheckedChange={() => toggleCreditEligibility(product)}
                            />
                            {product.is_credit_eligible ? (
                              <CreditCard className="w-4 h-4 ml-2 text-green-600" />
                            ) : (
                              <CreditCard className="w-4 h-4 ml-2 text-gray-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControl
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default ProductManagement;