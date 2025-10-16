import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

interface FilterBarProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  onClearFilters?: () => void;
  className?: string;
}

export const FilterBar = ({ 
  searchTerm, 
  onSearchChange, 
  searchPlaceholder = "Search...", 
  children, 
  onClearFilters,
  className = "" 
}: FilterBarProps) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}
      {children}
      {onClearFilters && (
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={onClearFilters}
        >
          <Filter className="h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
};