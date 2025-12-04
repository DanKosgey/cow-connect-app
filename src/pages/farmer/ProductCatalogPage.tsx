import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgrovetProduct, ProductPricing } from '@/services/agrovet-inventory-service';
import { Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import PaginationControl from '@/components/PaginationControl';
import StatisticsCards from '@/components/creditor/product-management/StatisticsCards';
import ProductCatalog from '@/components/farmer/ProductCatalog';
import ProductViewDialog from '@/components/farmer/ProductViewDialog';
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory';
import { fuzzySearchWithScore } from '@/utils/fuzzySearch';

const ProductCatalogPage = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<AgrovetProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AgrovetProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCreditEligible, setFilterCreditEligible] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AgrovetProduct | null>(null);
  const [selectedProductPricing, setSelectedProductPricing] = useState<ProductPricing[]>([]);
  
  const [formData, setFormData] = useState<Partial<AgrovetProduct>>({
    name: '',
    description: '',
    category: '',
    unit: '',
    supplier: '',
    cost_price: 0,
    selling_price: 0,
    is_credit_eligible: false,
    image_url: '',
    image_alt_text: ''
  });
  const [pricingData, setPricingData] = useState<Partial<ProductPricing>[]>([
    { min_quantity: 1, max_quantity: null, price_per_unit: 0, is_credit_eligible: true }
  ]);
  // Add new state for advanced filters, sorting, and pagination
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get unique categories for filter
  const categories = Array.from(new Set(products.map(p => p.category)));

  useEffect(() => {
    console.log('ProductCatalogPage: Initiating data fetch');
    fetchData();
  }, []);

  // Setup real-time inventory updates
  const { isSubscribed } = useRealtimeInventory({
    onProductsUpdate: (updatedProducts) => {
      setProducts(updatedProducts);
      // If we're not currently filtering/searching, update the filtered products too
      if (!searchTerm && filterCategory === "all" && filterCreditEligible === "all" && Object.keys(advancedFilters).length === 0) {
        setFilteredProducts(updatedProducts);
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
      console.log('ProductCatalogPage: Starting data fetch');
      setLoading(true);
      // Mock data for demonstration
      const mockData: AgrovetProduct[] = [
        {
          id: '1',
          name: 'Maize Seeds',
          description: 'High-quality hybrid maize seeds suitable for various soil conditions',
          category: 'Seeds',
          unit: 'kg',
          current_stock: 100,
          reorder_level: 20,
          supplier: 'AgroTech Ltd',
          cost_price: 200,
          selling_price: 250,
          is_credit_eligible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'NPK Fertilizer',
          description: 'Balanced NPK fertilizer for crops with slow-release nutrients',
          category: 'Fertilizers',
          unit: 'bags',
          current_stock: 50,
          reorder_level: 10,
          supplier: 'FarmCare Supplies',
          cost_price: 800,
          selling_price: 1000,
          is_credit_eligible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Herbicide Solution',
          description: 'Broad-spectrum herbicide for weed control in maize fields',
          category: 'Herbicides',
          unit: 'liters',
          current_stock: 30,
          reorder_level: 5,
          supplier: 'CropGuard Chemicals',
          cost_price: 1200,
          selling_price: 1500,
          is_credit_eligible: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setProducts(mockData);
      setFilteredProducts(mockData);
      console.log('ProductCatalogPage: Products set, count:', mockData.length);
    } catch (err) {
      console.error("ProductCatalogPage: Error fetching products:", err);
      console.error("ProductCatalogPage: Error details:", (err as Error).message || String(err));
      
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
      console.log('ProductCatalogPage: Setting loading to false');
      setLoading(false);
    }
  };

  const handleViewProduct = async (product: AgrovetProduct) => {
    setSelectedProduct(product);
    
    // Mock pricing data for demonstration
    const mockPricingData: ProductPricing[] = [
      {
        id: 'p1',
        product_id: product.id,
        min_quantity: 1,
        max_quantity: 10,
        price_per_unit: product.selling_price,
        is_credit_eligible: product.is_credit_eligible,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'p2',
        product_id: product.id,
        min_quantity: 11,
        max_quantity: 50,
        price_per_unit: product.selling_price * 0.95, // 5% discount
        is_credit_eligible: product.is_credit_eligible,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'p3',
        product_id: product.id,
        min_quantity: 51,
        max_quantity: null,
        price_per_unit: product.selling_price * 0.90, // 10% discount
        is_credit_eligible: product.is_credit_eligible,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    setSelectedProductPricing(mockPricingData);
    setIsViewDialogOpen(true);
  };

  const closeViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedProduct(null);
    setSelectedProductPricing([]);
  };

  if (loading) {
    console.log('ProductCatalogPage: Component is in loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product catalog...</p>
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
  
  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-600 mt-2">Browse available agrovet products and pricing</p>
        </div>

        {/* Statistics Cards */}
        <StatisticsCards products={products} />

        {/* Product Catalog */}
        <ProductCatalog
          products={filteredProducts}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterCreditEligible={filterCreditEligible}
          setFilterCreditEligible={setFilterCreditEligible}
          advancedFilters={advancedFilters}
          setAdvancedFilters={setAdvancedFilters}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          categories={categories}
          setCurrentPage={setCurrentPage}
          clearAllFilters={clearAllFilters}
          onViewProduct={handleViewProduct}
        />

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
      
      {/* Product View Dialog */}
      <ProductViewDialog
        isOpen={isViewDialogOpen}
        onClose={closeViewDialog}
        product={selectedProduct}
        pricingData={selectedProductPricing}
      />
    </div>
  );
};

export default ProductCatalogPage;