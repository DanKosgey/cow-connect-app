import { useState, useEffect, useCallback } from 'react';
import { FarmersAPI } from '@/services/ApiService';
import { useIndexedDB } from './useIndexedDB';
import { Farmer } from '@/types';

interface UseFarmerSearchProps {
  initialQuery?: string;
  delay?: number;
}

export const useFarmerSearch = ({ initialQuery = '', delay = 300 }: UseFarmerSearchProps = {}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { searchFarmers: searchOfflineFarmers, getAllFarmers } = useIndexedDB();

  const searchFarmers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First try to search in backend
      const response = await FarmersAPI.list(100, 0, searchQuery);
      
      // The response is paginated, so we need to extract the items
      const farmers = response.items || [];
      
      setResults(farmers);
      
      // Also update local IndexedDB with latest farmers data
      // In a real implementation, you might want to sync this more efficiently
    } catch (err) {
      console.error('Online search failed, trying offline search:', err);
      
      try {
        // Fallback to offline search
        const offlineResults = await searchOfflineFarmers(searchQuery);
        setResults(offlineResults as unknown as Farmer[]);
      } catch (offlineErr) {
        console.error('Offline search also failed:', offlineErr);
        setError('Failed to search farmers');
      }
    } finally {
      setLoading(false);
    }
  }, [searchOfflineFarmers]);

  useEffect(() => {
    const handler = setTimeout(() => {
      searchFarmers(query);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [query, delay, searchFarmers]);

  const setQueryAndSearch = (newQuery: string) => {
    setQuery(newQuery);
  };

  return {
    query,
    setQuery: setQueryAndSearch,
    results,
    loading,
    error
  };
};