import React, { useState, useEffect } from 'react';
import { Tag, Package, CreditCard } from 'lucide-react';
import { ProductCategoryService, ProductCategory } from '@/services/product-category-service';
import { AgrovetInventoryService, AgrovetProduct, ProductPackaging } from '@/services/agrovet-inventory-service';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';

// Extend the AgrovetProduct interface to include packaging_options like in the creditor portal
interface EnhancedAgrovetProduct extends AgrovetProduct {
  packaging_options?: ProductPackaging[];
  rating?: number;
  discount_percentage?: number;
}

interface CategoryBrowserProps {
  onProductSelect: (product: EnhancedAgrovetProduct) => void;
}

const CategoryBrowser: React.FC<CategoryBrowserProps> = ({ onProductSelect }) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, EnhancedAgrovetProduct[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Load categories and products
  useEffect(() => {
    loadCategoriesAndProducts();
  }, []);

  const loadCategoriesAndProducts = async () => {
    try {
      setLoading(true);
      
      // Load all active categories
      const categoryData = await ProductCategoryService.getActiveCategories();
      setCategories(categoryData);
      
      // Load products for each category
      const productsByCat: Record<string, EnhancedAgrovetProduct[]> = {};
      
      for (const category of categoryData) {
        const products = await AgrovetInventoryService.getProductsByCategory(category.id);
        
        // Enhance products with packaging data
        const enhancedProducts = await Promise.all(
          products.map(async (product) => {
            try {
              const packaging = await AgrovetInventoryService.getProductPackaging(product.id);
              return {
                ...product,
                packaging_options: packaging?.filter(p => p.is_credit_eligible) || []
              } as EnhancedAgrovetProduct;
            } catch (error) {
              console.warn(`Failed to fetch packaging for product ${product.id}:`, error);
              return {
                ...product,
                packaging_options: []
              } as EnhancedAgrovetProduct;
            }
          })
        );
        
        productsByCat[category.id] = enhancedProducts;
      }
      
      setProductsByCategory(productsByCat);
    } catch (error) {
      console.error('Error loading categories and products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
    
    // If expanding a category, set it as selected
    if (!expandedCategories[categoryId]) {
      setSelectedCategory(categoryId);
    } else if (selectedCategory === categoryId) {
      setSelectedCategory(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-600" />
          Shop by Category
        </h2>
        
        {categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>No categories available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category.id} className="border border-gray-200 rounded-lg">
                <button
                  className={`w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedCategory === category.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {productsByCategory[category.id]?.length || 0} products
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transform transition-transform ${
                        expandedCategories[category.id] ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {expandedCategories[category.id] && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {productsByCategory[category.id]?.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No credit-eligible products in this category</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {productsByCategory[category.id]?.map((product: EnhancedAgrovetProduct) => (
                          <div 
                            key={product.id} 
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => onProductSelect(product)}
                          >
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-gray-900">{product.name}</h4>
                              {product.is_credit_eligible && (
                                <CreditCard className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            
                            {product.description && (
                              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>
                            )}
                            
                            <div className="mt-3 flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {product.packaging_options?.length > 0 
                                  ? formatCurrency(Math.min(...product.packaging_options.map(p => p.price || 0)))
                                  : 'Pricing N/A'}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {product.unit}
                              </span>
                            </div>
                            {product.packaging_options?.length === 0 && (
                              <div className="text-xs text-amber-600 mt-1">
                                Contact admin for pricing
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryBrowser;