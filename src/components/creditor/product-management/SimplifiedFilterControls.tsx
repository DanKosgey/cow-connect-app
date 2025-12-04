import React from 'react';
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
import { Badge } from '@/components/ui/badge';

interface SimplifiedFilterControlsProps {
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
}

const SimplifiedFilterControls: React.FC<SimplifiedFilterControlsProps> = ({
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
  </div>
  );
};

export default SimplifiedFilterControls;