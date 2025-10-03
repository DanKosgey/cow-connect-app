import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import apiService from '@/services/ApiService';
import { Collection } from '@/types';

// Cache times in milliseconds
const COLLECTIONS_STALE_TIME = 2 * 60 * 1000; // 2 minutes (more dynamic data)
const COLLECTIONS_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch collections with pagination
 */
export function useCollections(limit = 50, offset = 0, farmerId?: string, staffId?: string) {
  return useQuery({
    queryKey: ['collections', limit, offset, farmerId, staffId],
    queryFn: () => apiService.Collections.list(limit, offset, farmerId, staffId),
    staleTime: COLLECTIONS_STALE_TIME,
    gcTime: COLLECTIONS_CACHE_TIME,
    placeholderData: (prev) => prev, // Keep previous data when fetching next page
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook to fetch a single collection by ID
 */
export function useCollection(id: string) {
  return useQuery({
    queryKey: ['collection', id],
    queryFn: () => apiService.Collections.get(id),
    staleTime: COLLECTIONS_STALE_TIME,
    gcTime: COLLECTIONS_CACHE_TIME,
  });
}

/**
 * Hook to create a new collection with optimistic updates
 */
export function useCreateCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (collectionData: Partial<Collection>) => 
      apiService.Collections.create(collectionData),
    onMutate: async (newCollection) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      
      // Snapshot the previous value
      const previousCollections = queryClient.getQueryData(['collections']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['collections'], (old: any) => {
        if (old && old.items) {
          return {
            ...old,
            items: [newCollection, ...old.items],
            total: old.total + 1
          };
        }
        return old;
      });
      
      return { previousCollections };
    },
    onError: (err, newCollection, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['collections'], context.previousCollections);
    },
    onSettled: () => {
      // Invalidate and refetch collections list
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

/**
 * Hook to update a collection with optimistic updates
 */
export function useUpdateCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, collectionData }: { id: string; collectionData: Partial<Collection> }) => 
      apiService.Collections.update(id, collectionData),
    onMutate: async ({ id, collectionData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['collection', id] });
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      
      // Snapshot the previous values
      const previousCollection = queryClient.getQueryData(['collection', id]);
      const previousCollections = queryClient.getQueryData(['collections']);
      
      // Optimistically update the single collection
      queryClient.setQueryData(['collection', id], (old: any) => ({
        ...old,
        ...collectionData
      }));
      
      // Optimistically update the collections list
      queryClient.setQueryData(['collections'], (old: any) => {
        if (old && old.items) {
          return {
            ...old,
            items: old.items.map((collection: Collection) => 
              collection.id === id ? { ...collection, ...collectionData } : collection
            )
          };
        }
        return old;
      });
      
      return { previousCollection, previousCollections };
    },
    onError: (err, variables, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['collection', variables.id], context.previousCollection);
      queryClient.setQueryData(['collections'], context.previousCollections);
    },
    onSettled: (data, error, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['collection', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

/**
 * Hook to delete a collection with optimistic updates
 */
export function useDeleteCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiService.Collections.delete(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      
      // Snapshot the previous value
      const previousCollections = queryClient.getQueryData(['collections']);
      
      // Optimistically remove the collection
      queryClient.setQueryData(['collections'], (old: any) => {
        if (old && old.items) {
          return {
            ...old,
            items: old.items.filter((collection: Collection) => collection.id !== id),
            total: old.total - 1
          };
        }
        return old;
      });
      
      return { previousCollections };
    },
    onError: (err, id, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['collections'], context.previousCollections);
    },
    onSettled: () => {
      // Invalidate collections list
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}