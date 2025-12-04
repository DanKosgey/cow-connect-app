import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
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
import AdvancedFilter from '@/components/AdvancedFilter';
import SortControl from '@/components/SortControl';
import { Badge } from '@/components/ui/badge';

interface FilterControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterCreditEligible: string;
  setFilterCreditEligible: (eligibility: string) => void;
  filterStockStatus: string;
  setFilterStockStatus: (status: string) => void;
  advancedFilters: Record<string, any>;
  setAdvancedFilters: (filters: Record<string, any>) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  categories: string[];
  setCurrentPage: (page: number) => void;
  clearAllFilters: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterCreditEligible,
  setFilterCreditEligible,
  filterStockStatus,
  setFilterStockStatus,
  advancedFilters,
  setAdvancedFilters,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  categories,
  setCurrentPage,
  clearAllFilters
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
              placeholder="Search products... (Ctrl/Cmd + K)"
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
        
        {/* Stock Status Filter */}
        <Select 
          value={filterStockStatus} 
          onValueChange={(value) => {
            setFilterStockStatus(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="adequate">Adequate Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Advanced Filter Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Advanced Filters</DialogTitle>
              <DialogDescription>
                Apply additional filters to refine your product search
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <AdvancedFilter 
                onFilterChange={(filters) => {
                  setAdvancedFilters(filters);
                  setCurrentPage(1);
                }}
                filterType="product"
                currentFilters={advancedFilters}
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setAdvancedFilters({});
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
              <DialogClose asChild>
                <Button>Apply Filters</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Clear All Filters Button */}
        {(filterCategory !== "all" || filterCreditEligible !== "all" || filterStockStatus !== "all" || Object.keys(advancedFilters).length > 0 || searchTerm) && (
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
      
      {/* Sort Control */}
      <div className="flex items-center gap-2">
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
    </div>
    
    {/* Active Filters Display */}
    {(filterCategory !== "all" || filterCreditEligible !== "all" || filterStockStatus !== "all" || Object.keys(advancedFilters).length > 0) && (
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-blue-800">Active Filters:</span>
            {filterCategory !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Category: {filterCategory}
                <button 
                  onClick={() => setFilterCategory("all")}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterCreditEligible !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Credit: {filterCreditEligible === "yes" ? "Eligible" : "Not Eligible"}
                <button 
                  onClick={() => setFilterCreditEligible("all")}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterStockStatus !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Stock: {filterStockStatus.charAt(0).toUpperCase() + filterStockStatus.slice(1)}
                <button 
                  onClick={() => setFilterStockStatus("all")}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {Object.keys(advancedFilters).length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Advanced Filters
                <button 
                  onClick={() => setAdvancedFilters({})}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default FilterControls;