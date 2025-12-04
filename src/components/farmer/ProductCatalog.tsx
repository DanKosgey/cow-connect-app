import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Package, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import { AgrovetProduct } from '@/services/agrovet-inventory-service';

interface ProductCatalogProps {
  products: AgrovetProduct[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterCreditEligible: string;
  setFilterCreditEligible: (eligibility: string) => void;
  advancedFilters: Record<string, any>;
  setAdvancedFilters: (filters: Record<string, any>) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  categories: string[];
  setCurrentPage: (page: number) => void;
  clearAllFilters: () => void;
  onViewProduct: (product: AgrovetProduct) => void;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterCreditEligible,
  setFilterCreditEligible,
  advancedFilters,
  setAdvancedFilters,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  categories,
  setCurrentPage,
  clearAllFilters,
  onViewProduct
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          {/* Search Input with Clear Button */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              id="product-search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-full sm:w-64"
              aria-label="Search products"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        
        {/* Category Filter */}
        <Select 
          value={filterCategory} 
          onValueChange={(value) => {
            setFilterCategory(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
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
        
        {/* Credit Eligibility Filter */}
        <Select 
          value={filterCreditEligible} 
          onValueChange={(value) => {
            setFilterCreditEligible(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Credit Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="yes">Credit Eligible</SelectItem>
            <SelectItem value="no">Not Eligible</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Clear All Filters Button */}
        {(filterCategory !== "all" || filterCreditEligible !== "all" || Object.keys(advancedFilters).length > 0 || searchTerm) && (
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={clearAllFilters}
          >
            <X className="h-4 w-4" />
            Clear All Filters
          </Button>
        )}
      </div>
    </div>
    
    {/* Products Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {products.map((product) => (
        <div 
          key={product.id} 
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-300 cursor-pointer"
          onClick={() => onViewProduct(product)}
        >
          <div className="flex items-start gap-4">
            <div 
              className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
              role="img"
              aria-label={product.image_alt_text || `${product.name} product image`}
            >
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.image_alt_text || product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/64x64?text=Product";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
                  <Package className="w-6 h-6" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{product.name}</div>
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {product.category}
                </span>
                <div className="font-medium text-gray-900">
                  {formatCurrency(product.selling_price)}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500">
                  Supplier: {product.supplier}
                </div>
                {product.is_credit_eligible && (
                  <CreditCard className="w-4 h-4 text-green-600" aria-label="Credit eligible" />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
  );
};

export default ProductCatalog;