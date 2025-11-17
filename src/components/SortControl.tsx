import React from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SortOption {
  id: string;
  label: string;
}

interface SortControlProps {
  options: SortOption[];
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
}

const SortControl = ({ options, currentSort, currentOrder, onSortChange }: SortControlProps) => {
  const getCurrentSortLabel = () => {
    const option = options.find(opt => opt.id === currentSort);
    return option ? option.label : 'Sort by';
  };

  const getSortIcon = () => {
    if (currentSort === '') return <ArrowUpDown className="h-4 w-4" />;
    
    return currentOrder === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          {getSortIcon()}
          {getCurrentSortLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map(option => (
          <DropdownMenuItem 
            key={option.id}
            onClick={() => {
              // If clicking the same sort option, toggle order
              if (currentSort === option.id) {
                onSortChange(option.id, currentOrder === 'asc' ? 'desc' : 'asc');
              } else {
                // Default to ascending when changing sort field
                onSortChange(option.id, 'asc');
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <span>{option.label}</span>
              {currentSort === option.id && (
                <span>
                  {currentOrder === 'asc' ? 
                    <ArrowUp className="h-4 w-4" /> : 
                    <ArrowDown className="h-4 w-4" />
                  }
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SortControl;