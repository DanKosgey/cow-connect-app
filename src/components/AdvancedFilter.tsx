import React, { useState } from 'react';
import { 
  Filter, 
  X, 
  Calendar, 
  CreditCard, 
  User, 
  Package,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

interface AdvancedFilterProps {
  onFilterChange: (filters: Record<string, any>) => void;
  filterType: 'credit' | 'farmer' | 'product' | 'transaction';
  currentFilters: Record<string, any>;
}

const AdvancedFilter = ({ onFilterChange, filterType, currentFilters }: AdvancedFilterProps) => {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(currentFilters);

  const applyFilters = () => {
    onFilterChange(localFilters);
    setOpen(false);
  };

  const clearFilters = () => {
    setLocalFilters({});
    onFilterChange({});
    setOpen(false);
  };

  const updateFilter = (key: string, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderCreditFilters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Status</Label>
        <Select 
          value={localFilters.status || 'all'} 
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Date Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="From"
              className="pl-8"
              value={localFilters.dateFrom || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="To"
              className="pl-8"
              value={localFilters.dateTo || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Amount Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min Amount"
            value={localFilters.minAmount || ''}
            onChange={(e) => updateFilter('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="Max Amount"
            value={localFilters.maxAmount || ''}
            onChange={(e) => updateFilter('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );

  const renderFarmerFilters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Status</Label>
        <Select 
          value={localFilters.status || 'all'} 
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Credit Utilization</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="high-utilization" 
              checked={localFilters.utilizationHigh || false}
              onCheckedChange={(checked) => updateFilter('utilizationHigh', checked)}
            />
            <Label htmlFor="high-utilization">High (80%+)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="medium-utilization" 
              checked={localFilters.utilizationMedium || false}
              onCheckedChange={(checked) => updateFilter('utilizationMedium', checked)}
            />
            <Label htmlFor="medium-utilization">Medium (60-80%)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="low-utilization" 
              checked={localFilters.utilizationLow || false}
              onCheckedChange={(checked) => updateFilter('utilizationLow', checked)}
            />
            <Label htmlFor="low-utilization">Low (&lt;60%)</Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Credit Limit Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min Limit"
            value={localFilters.minCreditLimit || ''}
            onChange={(e) => updateFilter('minCreditLimit', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="Max Limit"
            value={localFilters.maxCreditLimit || ''}
            onChange={(e) => updateFilter('maxCreditLimit', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );

  const renderProductFilters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Category</Label>
        <Input
          placeholder="Category"
          value={localFilters.category || ''}
          onChange={(e) => updateFilter('category', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Credit Eligibility</Label>
        <Select 
          value={localFilters.creditEligible || 'all'} 
          onValueChange={(value) => updateFilter('creditEligible', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Credit eligibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="yes">Credit Eligible</SelectItem>
            <SelectItem value="no">Not Credit Eligible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Stock Status</Label>
        <Select 
          value={localFilters.stockStatus || 'all'} 
          onValueChange={(value) => updateFilter('stockStatus', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Stock status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="adequate">Adequate Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Price Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min Price"
            value={localFilters.minPrice || ''}
            onChange={(e) => updateFilter('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="Max Price"
            value={localFilters.maxPrice || ''}
            onChange={(e) => updateFilter('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );

  const renderTransactionFilters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Transaction Type</Label>
        <Select 
          value={localFilters.type || 'all'} 
          onValueChange={(value) => updateFilter('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Transaction type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="credit_granted">Credit Granted</SelectItem>
            <SelectItem value="credit_repaid">Credit Repaid</SelectItem>
            <SelectItem value="credit_adjusted">Credit Adjusted</SelectItem>
            <SelectItem value="penalty_applied">Penalty Applied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Date Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="From"
              className="pl-8"
              value={localFilters.dateFrom || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="To"
              className="pl-8"
              value={localFilters.dateTo || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Amount Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min Amount"
            value={localFilters.minAmount || ''}
            onChange={(e) => updateFilter('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="Max Amount"
            value={localFilters.maxAmount || ''}
            onChange={(e) => updateFilter('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        </div>
      </div>
    </div>
  );

  const getFilterCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== null && value !== '' && value !== 'all'
    ).length;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {getFilterCount() > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {getFilterCount()}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Advanced Filters</h4>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {filterType === 'credit' && renderCreditFilters()}
          {filterType === 'farmer' && renderFarmerFilters()}
          {filterType === 'product' && renderProductFilters()}
          {filterType === 'transaction' && renderTransactionFilters()}

          <div className="flex justify-between">
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdvancedFilter;