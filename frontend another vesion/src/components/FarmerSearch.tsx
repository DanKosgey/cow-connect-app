import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, User, MapPin, Phone } from 'lucide-react';
import { useFarmerSearch } from '@/hooks/useFarmerSearch';
import { Farmer } from '@/types';
import { Button } from '@/components/ui/button';
import { useIndexedDB } from '@/hooks/useIndexedDB';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';

interface FarmerSearchProps {
  onFarmerSelect: (farmer: Farmer) => void;
  placeholder?: string;
  disabled?: boolean;
}

const FarmerSearch = ({ onFarmerSelect, placeholder = "Search farmers by name, phone, ID, or location...", disabled = false }: FarmerSearchProps) => {
  const { query, setQuery, results, loading, error } = useFarmerSearch();
  const { addFarmer } = useIndexedDB();
  const { isMobile, isTouchDevice } = useMobileOptimizations();
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectFarmer = async (farmer: Farmer) => {
    onFarmerSelect(farmer);
    setShowResults(false);
    setQuery('');
    
    // Save selected farmer to IndexedDB for offline use
    try {
      await addFarmer({
        id: farmer.id,
        name: farmer.name,
        phone: farmer.phone,
        address: farmer.address,
        gpsLatitude: farmer.location_coordinates?.latitude,
        gpsLongitude: farmer.location_coordinates?.longitude,
        nationalId: farmer.national_id
      });
    } catch (err) {
      console.error('Failed to save farmer to IndexedDB:', err);
    }
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showResults && !(event.target as Element).closest('.farmer-search-container')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResults]);

  return (
    <div className="farmer-search-container relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dairy-400 h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => {
            setShowResults(true);
            setIsFocused(true);
          }}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={`pl-10 pr-10 py-3 w-full rounded-lg border border-dairy-300 focus:ring-2 focus:ring-dairy-blue focus:border-dairy-blue transition-all duration-200 ${isMobile ? 'text-lg' : ''}`}
          // Mobile-specific attributes
          {...(isMobile && {
            inputMode: 'search',
            enterKeyHint: 'search',
            autoComplete: 'off'
          })}
        />
        {isFocused && query && (
          <button 
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dairy-400 hover:text-dairy-600"
            onClick={() => {
              setQuery('');
              setShowResults(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-dairy-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-dairy-600">
              Searching farmers...
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && query && (
            <div className="p-4 text-center text-dairy-600">
              No farmers found matching "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-1 max-h-80 overflow-y-auto">
              {results.map((farmer) => (
                <li key={farmer.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start px-4 py-3 h-auto text-left hover:bg-dairy-100 transition-colors duration-150 ${isMobile ? 'py-4' : ''}`}
                    onClick={() => handleSelectFarmer(farmer)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className="w-10 h-10 bg-dairy-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-dairy-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-dairy-900 truncate ${isMobile ? 'text-base' : ''}`}>{farmer.name}</p>
                        <div className="flex items-center text-sm text-dairy-600 mt-1">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{farmer.phone}</span>
                        </div>
                        {farmer.address && (
                          <div className="flex items-center text-sm text-dairy-600 mt-1">
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{farmer.address}</span>
                          </div>
                        )}
                        <div className="flex items-center text-xs text-dairy-500 mt-1">
                          <span className="truncate">KYC: {farmer.kyc_status || 'Not verified'}</span>
                        </div>
                      </div>
                      <div className="text-xs text-dairy-500 flex-shrink-0">
                        ID: {farmer.id.substring(0, 8)}...
                      </div>
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmerSearch;