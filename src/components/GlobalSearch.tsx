import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User, Package, CreditCard, BarChart3 } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { searchResults, loading, error, search } = useGlobalSearch();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      
      // Escape to close search
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      search(searchQuery);
    } else {
      // Clear results when query is empty
    }
  }, [searchQuery, search]);

  const handleResultClick = (url: string) => {
    setIsOpen(false);
    setSearchQuery('');
    navigate(url);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'farmer':
        return <User className="w-4 h-4" />;
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'credit_request':
        return <CreditCard className="w-4 h-4" />;
      case 'transaction':
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'farmer':
        return 'Farmer';
      case 'product':
        return 'Product';
      case 'credit_request':
        return 'Credit Request';
      case 'transaction':
        return 'Transaction';
      default:
        return 'Result';
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 text-sm"
        onClick={() => setIsOpen(true)}
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Ctrl+K</span>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Search Modal */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
        <div className="bg-white rounded-lg shadow-xl border">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search farmers, products, credit requests..."
              className="w-full pl-10 pr-10 py-4 text-lg border-0 rounded-t-lg focus:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-gray-500">
                Searching...
              </div>
            )}
            
            {error && (
              <div className="p-4 text-center text-red-500">
                {error}
              </div>
            )}
            
            {!loading && !error && searchResults.length === 0 && searchQuery && (
              <div className="p-4 text-center text-gray-500">
                No results found for "{searchQuery}"
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="divide-y">
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    onClick={() => handleResultClick(result.url)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                      {getIconForType(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      <div className="text-sm text-gray-500 truncate">{result.description}</div>
                    </div>
                    <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {getTypeLabel(result.type)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!searchQuery && (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Type to search across farmers, products, and credit data</p>
                <p className="text-sm mt-1">Press ESC to close</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;