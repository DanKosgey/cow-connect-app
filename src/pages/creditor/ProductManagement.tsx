import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgrovetInventoryService, AgrovetProduct, ProductPackaging } from '@/services/agrovet-inventory-service';
import { ProductCategoryService, ProductCategory } from '@/services/product-category-service';
import { Plus, Package, X, CreditCard, DollarSign, Search, Filter, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import PaginationControl from '@/components/PaginationControl';
import FilterControls from '@/components/creditor/product-management/SimplifiedFilterControls';
import ProductTable from '@/components/creditor/product-management/SimplifiedProductTable';
import ProductDialogs from '@/components/creditor/product-management/ProductDialogs';
import CsvImportExport from '@/components/creditor/product-management/CsvImportExport';
import CategoryManagement from '@/components/creditor/product-management/CategoryManagement';
import BarcodeScanner from '@/components/creditor/product-management/BarcodeScanner';
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory';
import { fuzzySearchWithScore } from '@/utils/fuzzySearch';
import PackagingOptionsDisplay from '@/components/creditor/product-management/PackagingOptionsDisplay';
import PackagingSelector from '@/components/creditor/product-management/PackagingSelector';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ProductManagement = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<AgrovetProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AgrovetProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCreditEligible, setFilterCreditEligible] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AgrovetProduct | null>(null);
  
  // Add loading states for actions
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [dialogLoading, setDialogLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<AgrovetProduct> & { category_id?: string | null }>({
    name: '',
    description: '',
    category: '',
    category_id: null,
    unit: '',
    supplier: '',
    cost_price: 0,
    is_credit_eligible: false,
    image_url: '',
    image_alt_text: ''
  });
  
  // Updated to use packaging data instead of pricing data
  const [packagingData, setPackagingData] = useState<Partial<ProductPackaging>[]>([
    { name: '', weight: 0, unit: '', price: 0, is_credit_eligible: true }
  ]);
  
  // Add new state for advanced filters, sorting, and pagination
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [managedCategories, setManagedCategories] = useState<ProductCategory[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load managed categories from the database
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categories = await ProductCategoryService.getActiveCategories();
      setManagedCategories(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    }
  };

  // Get unique categories for filter (now from database)
  const allCategories = managedCategories.map(cat => cat.name);

  useEffect(() => {
    console.log('ProductManagement: Initiating data fetch');
    fetchData();
  }, []);

  // Setup real-time inventory updates
  const { isSubscribed } = useRealtimeInventory({
    onProductsUpdate: (updatedProducts) => {
      // Enhance products with category names from the join
      const enhancedProducts = updatedProducts.map((product: AgrovetProduct) => ({
        ...product,
        category: product.product_categories?.name || product.category || 'Uncategorized'
      }));
      
      setProducts(enhancedProducts);
      // If we're not currently filtering/searching, update the filtered products too
      if (!searchTerm && filterCategory === "all" && filterCreditEligible === "all" && Object.keys(advancedFilters).length === 0) {
        setFilteredProducts(enhancedProducts);
      }
    }
  });

  useEffect(() => {
    // Filter products based on search term, category, and credit eligibility
    let filtered = products;

    if (searchTerm) {
      // Use fuzzy search for better matching
      filtered = fuzzySearchWithScore(searchTerm, products, ['name', 'description', 'supplier', 'category']);
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(product => product.category === filterCategory);
    }

    if (filterCreditEligible !== "all") {
      const isCreditEligible = filterCreditEligible === "yes";
      filtered = filtered.filter(product => product.is_credit_eligible === isCreditEligible);
    }

    // Apply advanced filters
    if (advancedFilters.category && advancedFilters.category !== "all") {
      filtered = filtered.filter(product => product.category === advancedFilters.category);
    }

    if (advancedFilters.creditEligible && advancedFilters.creditEligible !== "all") {
      const isCreditEligible = advancedFilters.creditEligible === "yes";
      filtered = filtered.filter(product => product.is_credit_eligible === isCreditEligible);
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
        case "cost_price":
          comparison = a.cost_price - b.cost_price;
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
  }, [searchTerm, filterCategory, filterCreditEligible, products, advancedFilters, sortBy, sortOrder, currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      console.log('ProductManagement: Starting data fetch');
      setLoading(true);
      // Fetch products with category details
      const productData = await AgrovetInventoryService.getInventory();
      
      // Fetch packaging data for each product
      const productsWithPackaging = await Promise.all(
        productData.map(async (product) => {
          try {
            const packaging = await AgrovetInventoryService.getProductPackaging(product.id);
            return { ...product, packaging_options: packaging };
          } catch (error) {
            console.warn(`Failed to fetch packaging for product ${product.id}:`, error);
            return { ...product, packaging_options: [] };
          }
        })
      );
      
      setProducts(productsWithPackaging);
      setFilteredProducts(productsWithPackaging);
      console.log('ProductManagement: Products set, count:', productsWithPackaging?.length || 0);
    } catch (err) {
      console.error("ProductManagement: Error fetching products:", err);
      console.error("ProductManagement: Error details:", (err as Error).message || String(err));
      
      // Check if this is a permission error
      if ((err as Error).message?.includes('permission')) {
        setError("Permission Error: " + (err as Error).message);
      } else {
        setError("Failed to load products: " + (err as Error).message || String(err));
      }
      
      toast({
        title: "Error",
        description: (err as Error).message || String(err),
        variant: "destructive"
      });
    } finally {
      console.log('ProductManagement: Setting loading to false');
      setLoading(false);
    }
  };

  // Handle category updates - refresh categories from database
  const handleCategoriesUpdate = () => {
    loadCategories();
    fetchData(); // Also refresh products to show updated categories
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const parsedValue = name.includes('price') || name.includes('stock') || name.includes('level') 
      ? parseFloat(value) || 0 
      : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_credit_eligible: checked
    }));
  };

  // Updated to handle packaging changes instead of pricing changes
  const handlePackagingChange = (index: number, field: string, value: any) => {
    const newPackagingData = [...packagingData];
    newPackagingData[index] = {
      ...newPackagingData[index],
      [field]: field.includes('price') || field.includes('weight') 
        ? (value === '' ? null : parseFloat(value) || 0) 
        : value
    };
    setPackagingData(newPackagingData);
  };

  // Updated to add packaging option instead of pricing tier
  const addPackagingOption = () => {
    setPackagingData([
      ...packagingData,
      { 
        name: '', 
        weight: 0, 
        unit: '', 
        price: 0, 
        is_credit_eligible: true
      }
    ]);
  };

  // Updated to remove packaging option instead of pricing tier
  const removePackagingOption = (index: number) => {
    if (packagingData.length > 1) {
      const newPackagingData = [...packagingData];
      newPackagingData.splice(index, 1);
      setPackagingData(newPackagingData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      category_id: null,
      unit: '',
      supplier: '',
      cost_price: 0,
      is_credit_eligible: false,
      image_url: '',
      image_alt_text: ''
    });
    setPackagingData([
      { 
        name: '', 
        weight: 0, 
        unit: '', 
        price: 0, 
        is_credit_eligible: true
      }
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
      supplier: product.supplier,
      cost_price: product.cost_price,
      is_credit_eligible: product.is_credit_eligible,
      image_url: product.image_url || '',
      image_alt_text: product.image_alt_text || ''
    });
    
    // Fetch existing packaging data for the product
    try {
      const packagingData = await AgrovetInventoryService.getProductPackaging(product.id);
      if (packagingData && packagingData.length > 0) {
        setPackagingData(packagingData.map(p => ({
          name: p.name,
          weight: p.weight,
          unit: p.unit,
          price: p.price,
          is_credit_eligible: p.is_credit_eligible
        })));
      } else {
        // Default packaging option if none exists
        setPackagingData([
          { 
            name: '', 
            weight: 0, 
            unit: product.unit, 
            price: 0, 
            is_credit_eligible: product.is_credit_eligible
          }
        ]);
      }
    } catch (err) {
      console.warn("Failed to fetch packaging data, using default", err);
      setPackagingData([
        { 
          name: '', 
          weight: 0, 
          unit: product.unit, 
          price: 0, 
          is_credit_eligible: product.is_credit_eligible
        }
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

  // Removed handleStockAdjustment function - stock tracking is no longer needed
  /*
  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, you would update the product's stock level
    console.log('Adjusting stock:', productToAdjust, stockAdjustment);
    toast({
      title: "Stock Adjustment",
      description: `Stock adjustment recorded. In a full implementation, this would update the database.`
    });
    setIsStockAdjustDialogOpen(false);
    setStockAdjustment({ adjustment: 0, reason: '' });
  };
  */

  // Enhanced handleSubmit with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('ProductManagement: Form submission started');
    console.log('FormData:', formData);
    console.log('PackagingData:', packagingData);
    
    // Set dialog loading state
    setDialogLoading(true);
    
    try {
      let productId: string;
      
      if (editingProduct) {
        console.log('ProductManagement: Updating existing product', editingProduct.id);
        // Update existing product
        const updatedProduct = await AgrovetInventoryService.updateInventoryItem(editingProduct.id, formData);
        productId = updatedProduct.id;
        toast({
          title: "Success",
          description: "Product updated successfully"
        });
      } else {
        console.log('ProductManagement: Creating new product');
        // Create new product
        const newProduct = await AgrovetInventoryService.createInventoryItem(formData as any);
        productId = newProduct.id;
        toast({
          title: "Success",
          description: "Product created successfully"
        });
      }
      
      console.log('ProductManagement: Product saved with ID:', productId);
      
      // Save packaging data
      if (productId) {
        console.log('ProductManagement: Saving packaging data for product', productId);
        try {
          // First, get existing packaging to delete
          const existingPackaging = await AgrovetInventoryService.getProductPackaging(productId);
          console.log('ProductManagement: Existing packaging data:', existingPackaging);
          for (const packaging of existingPackaging) {
            await AgrovetInventoryService.deleteProductPackaging(packaging.id);
          }
          
          // Create new packaging options
          for (const packaging of packagingData) {
            // Only save packaging options that have a name
            if (packaging.name && packaging.name.trim() !== '') {
              console.log('ProductManagement: Creating packaging option:', packaging);
              await AgrovetInventoryService.createProductPackaging({
                product_id: productId,
                name: packaging.name || '',
                weight: packaging.weight || 0,
                unit: packaging.unit || '',
                price: packaging.price || 0,
                is_credit_eligible: packaging.is_credit_eligible || false
              });
            }
          }
          
          toast({
            title: "Packaging Saved",
            description: "Product packaging options saved successfully"
          });
        } catch (packagingError) {
          console.warn("Failed to save packaging data", packagingError);
          // Check if this is a permissions error
          const errorMessage = (packagingError as Error).message || String(packagingError);
          const isPermissionsError = errorMessage.includes('42501') || errorMessage.includes('permission') || errorMessage.includes('row-level security');
          
          toast({
            title: isPermissionsError ? "Permission Required" : "Packaging Warning",
            description: isPermissionsError 
              ? "You don't have permission to manage packaging options. Contact your administrator to update your permissions."
              : "Failed to save packaging data. In a full implementation, this would be handled properly.",
            variant: "destructive"
          });
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
    } finally {
      // Remove dialog loading state
      setDialogLoading(false);
    }
  };

  const toggleCreditEligibility = async (product: AgrovetProduct) => {
    // Set loading state for this specific product
    setActionLoading(prev => ({ ...prev, [`credit-${product.id}`]: true }));
    
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
    } finally {
      // Remove loading state
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[`credit-${product.id}`];
        return newState;
      });
    }
  };

  // Add the handleDelete function
  const handleDelete = async (id: string) => {
    // Set loading state for this specific product
    setActionLoading(prev => ({ ...prev, [id]: true }));
    
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
    } finally {
      // Remove loading state
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
  };

  if (loading) {
    console.log('ProductManagement: Component is in loading state');
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
            <h3 className="text-lg font-semibold text-red-900">Error Loading Products</h3>
          </div>
          <p className="text-red-700">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={() => {
                setError(null);
                fetchData();
              }}
              variant="outline"
            >
              Retry
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="default"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate total pages for pagination
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Clear all filters function
  const clearAllFilters = () => {
    setFilterCategory("all");
    setFilterCreditEligible("all");
    setAdvancedFilters({});
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Get packaging data for a product
  const getProductPackaging = async (productId: string) => {
    try {
      const packaging = await AgrovetInventoryService.getProductPackaging(productId);
      return packaging;
    } catch (error) {
      console.error('Error fetching packaging data:', error);
      return [];
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
              <p className="text-gray-600 mt-2">Manage agrovet products and pricing options</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
              <CsvImportExport products={products} onProductsImported={fetchData} />
              <BarcodeScanner onBarcodeScanned={(barcode) => {
                toast({
                  title: "Barcode Scanned",
                  description: `Scanned barcode: ${barcode}. In a full implementation, this would search for or create a product.`
                });
                // In a real implementation, you would search for the product by barcode
                // or open a dialog to create a new product with this barcode
              }} />
            </div>
          </div>
        </div>

        {/* Top Section - Category Overview, Quick Stats, and Category Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Category Overview */}
          <div className="lg:col-span-2">
            <Card className="h-full shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Category Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allCategories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="font-medium">No categories found</p>
                    <p className="text-sm mt-1">Add products to see category overview</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allCategories.map(category => {
                      const categoryProducts = products.filter(p => p.category === category);
                      const creditEligibleCount = categoryProducts.filter(p => p.is_credit_eligible).length;
                      
                      return (
                        <div 
                          key={category} 
                          className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-gray-900">{category}</h3>
                              <p className="text-sm text-gray-600 mt-1">{categoryProducts.length} products</p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {creditEligibleCount} credit
                            </span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Credit rate</span>
                              <span className="font-medium">
                                {categoryProducts.length > 0 
                                  ? `${Math.round((creditEligibleCount / categoryProducts.length) * 100)}%` 
                                  : '0%'}
                              </span>
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

          {/* Quick Stats and Category Management */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total Products</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{products.length}</p>
                    </div>
                    <div className="bg-blue-200 p-2 rounded-full">
                      <Package className="w-6 h-6 text-blue-700" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-700">Credit Eligible</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {products.filter(p => p.is_credit_eligible).length}
                      </p>
                    </div>
                    <div className="bg-green-200 p-2 rounded-full">
                      <CreditCard className="w-6 h-6 text-green-700" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Management */}
            <CategoryManagement 
              onCategoriesUpdate={handleCategoriesUpdate}
            />
          </div>
        </div>

        {/* Search and Filter Controls - Enhanced */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name, category, or supplier..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
              >
                <option value="all">All Categories</option>
                {allCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Status</label>
              <select
                value={filterCreditEligible}
                onChange={(e) => setFilterCreditEligible(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
              >
                <option value="all">All Products</option>
                <option value="yes">Credit Eligible</option>
                <option value="no">Cash Only</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </Button>
          </div>
        </div>

        {/* Products Table - Larger and More Prominent */}
        <Card className="shadow-lg border border-gray-200">
          <CardHeader className="bg-gray-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Available Products
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredProducts.length} items)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterCategory !== "all" || filterCreditEligible !== "all"
                    ? "No products match your search criteria" 
                    : "Products will appear here once added"}
                </p>
                <div className="mt-4">
                  <Button 
                    onClick={openCreateDialog}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Product
                  </Button>
                </div>
              </div>
            ) : (
              <ProductTable
                products={filteredProducts}
                toggleCreditEligibility={toggleCreditEligibility}
                actionLoading={actionLoading}
                openEditDialog={openEditDialog}
                handleDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>
        
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
      
      {/* Product Dialogs - Updated to use packaging props and pass categories */}
      <ProductDialogs
        isDialogOpen={isDialogOpen}
        closeDialog={closeDialog}
        editingProduct={editingProduct}
        formData={formData}
        handleInputChange={handleInputChange}
        handleSwitchChange={handleSwitchChange}
        packagingData={packagingData}
        handlePackagingChange={handlePackagingChange}
        addPackagingOption={addPackagingOption}
        removePackagingOption={removePackagingOption}
        handleSubmit={handleSubmit}
        dialogLoading={dialogLoading}
        categories={managedCategories}
      />
    </div>
  );
};

export default ProductManagement;