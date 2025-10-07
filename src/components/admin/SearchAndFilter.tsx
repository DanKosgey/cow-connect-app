import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { ReactNode } from 'react';

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  onClearFilters?: () => void;
  additionalActions?: ReactNode;
}

export const SearchAndFilter = ({ 
  searchTerm, 
  onSearchChange, 
  searchPlaceholder = "Search...", 
  children,
  onClearFilters,
  additionalActions
}: SearchAndFilterProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 py-3"
          />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {children}
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
        {additionalActions}
      </div>
    </div>
  );
};