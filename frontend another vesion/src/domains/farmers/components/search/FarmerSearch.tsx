import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, User, MapPin, Phone } from 'lucide-react';
import { useFarmerSearch } from '@/hooks/useFarmerSearch';
import { Farmer } from '@/types';
import { Button } from '@/components/ui/button';
import { useIndexedDB } from '@/hooks/useIndexedDB';

interface FarmerSearchProps {
  onFarmerSelect: (farmer: Farmer) => void;
  placeholder?: string;
}

const FarmerSearch = ({ onFarmerSelect, placeholder = "Search farmers by name, phone, ID, or location..." }: FarmerSearchProps) => {
  const { query, setQuery, results, loading, error } = useFarmerSearch();
  const { addFarmer } = useIndexedDB();
  const [showResults, setShowResults] = useState(false);

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
      <form 
        role="search" 
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          // Handle search submission if needed
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dairy-400 h-4 w-4" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-dairy-300 focus:ring-2 focus:ring-dairy-blue focus:border-dairy-blue"
            aria-label="Search farmers"
          />
        </div>
      </form>

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
            <ul className="py-1">
              {results.map((farmer) => (
                <li key={farmer.id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-4 py-3 h-auto text-left hover:bg-dairy-100"
                    onClick={() => handleSelectFarmer(farmer)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-dairy-blue/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-dairy-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dairy-900 truncate">{farmer.name}</p>
                        <div className="flex items-center text-sm text-dairy-600 mt-1">
                          <Phone className="h-3 w-3 mr-1" />
                          <span className="truncate">{farmer.phone}</span>
                        </div>
                        {farmer.address && (
                          <div className="flex items-center text-sm text-dairy-600 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{farmer.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-dairy-500">
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