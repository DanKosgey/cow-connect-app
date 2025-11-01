import { useQuery, useQueryClient } from '@tanstack/react-query';

// Cache keys for search and filter functionality
export const SEARCH_CACHE_KEYS = {
  SEARCH_RESULTS: 'search-results',
  FILTER_PREFERENCES: 'filter-preferences',
  SORT_PREFERENCES: 'sort-preferences'
};

// Main hook for Search and Filter/Sort functionality
export const useSearchAndFilters = () => {
  const queryClient = useQueryClient();

  // Get search results with caching
  const useSearchResults = (query: string, filters: Record<string, any> = {}, sortBy: string = '') => {
    return useQuery({
      queryKey: [SEARCH_CACHE_KEYS.SEARCH_RESULTS, query, filters, sortBy],
      queryFn: async () => {
        // This would typically perform the actual search
        // For now, we'll return an empty array as a placeholder
        return [];
      },
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      enabled: query.length > 0
    });
  };

  // Get filter preferences with caching
  const useFilterPreferences = (userId: string, component: string) => {
    return useQuery({
      queryKey: [SEARCH_CACHE_KEYS.FILTER_PREFERENCES, userId, component],
      queryFn: async () => {
        // This would typically fetch filter preferences from storage or database
        // For now, we'll return an empty object as a placeholder
        const savedFilters = localStorage.getItem(`filters_${userId}_${component}`);
        return savedFilters ? JSON.parse(savedFilters) : {};
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
      enabled: !!userId
    });
  };

  // Get sort preferences with caching
  const useSortPreferences = (userId: string, component: string) => {
    return useQuery({
      queryKey: [SEARCH_CACHE_KEYS.SORT_PREFERENCES, userId, component],
      queryFn: async () => {
        // This would typically fetch sort preferences from storage or database
        // For now, we'll return a default sort preference
        const savedSort = localStorage.getItem(`sort_${userId}_${component}`);
        return savedSort || 'created_at:desc';
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
      enabled: !!userId
    });
  };

  // Mutation to invalidate search and filter cache
  const invalidateSearchCache = () => {
    queryClient.invalidateQueries({ queryKey: [SEARCH_CACHE_KEYS.SEARCH_RESULTS] });
    queryClient.invalidateQueries({ queryKey: [SEARCH_CACHE_KEYS.FILTER_PREFERENCES] });
    queryClient.invalidateQueries({ queryKey: [SEARCH_CACHE_KEYS.SORT_PREFERENCES] });
  };

  // Mutation to refresh search results
  const refreshSearchResults = (query: string, filters: Record<string, any> = {}, sortBy: string = '') => {
    return queryClient.refetchQueries({ queryKey: [SEARCH_CACHE_KEYS.SEARCH_RESULTS, query, filters, sortBy] });
  };

  // Function to save filter preferences
  const saveFilterPreferences = (userId: string, component: string, filters: Record<string, any>) => {
    localStorage.setItem(`filters_${userId}_${component}`, JSON.stringify(filters));
    // Invalidate cache to refresh the data
    queryClient.invalidateQueries({ queryKey: [SEARCH_CACHE_KEYS.FILTER_PREFERENCES, userId, component] });
  };

  // Function to save sort preferences
  const saveSortPreferences = (userId: string, component: string, sort: string) => {
    localStorage.setItem(`sort_${userId}_${component}`, sort);
    // Invalidate cache to refresh the data
    queryClient.invalidateQueries({ queryKey: [SEARCH_CACHE_KEYS.SORT_PREFERENCES, userId, component] });
  };

  // Function to clear filter preferences
  const clearFilterPreferences = (userId: string, component: string) => {
    localStorage.removeItem(`filters_${userId}_${component}`);
    // Invalidate cache to refresh the data
    queryClient.invalidateQueries({ queryKey: [SEARCH_CACHE_KEYS.FILTER_PREFERENCES, userId, component] });
  };

  // Function to clear sort preferences
  const clearSortPreferences = (userId: string, component: string) => {
    localStorage.removeItem(`sort_${userId}_${component}`);
    // Invalidate cache to refresh the data
    queryClient.invalidateQueries({ queryKey: [SEARCH_CACHE_KEYS.SORT_PREFERENCES, userId, component] });
  };

  return {
    useSearchResults,
    useFilterPreferences,
    useSortPreferences,
    invalidateSearchCache,
    refreshSearchResults,
    saveFilterPreferences,
    saveSortPreferences,
    clearFilterPreferences,
    clearSortPreferences
  };
};