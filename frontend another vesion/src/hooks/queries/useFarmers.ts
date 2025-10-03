import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import apiService from '@/services/ApiService';
import { Farmer } from '@/types';

// Cache times in milliseconds
const FARMERS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const FARMERS_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to fetch farmers with pagination and search
 */
export function useFarmers(limit = 100, offset = 0, search?: string, status?: string) {
  return useQuery({
    queryKey: ['farmers', limit, offset, search, status],
    queryFn: () => apiService.Farmers.list(limit, offset, search, status),
    staleTime: FARMERS_STALE_TIME,
    gcTime: FARMERS_CACHE_TIME,
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook to fetch a single farmer by ID
 */
export function useFarmer(id: string) {
  return useQuery({
    queryKey: ['farmer', id],
    queryFn: () => apiService.Farmers.get(id),
    staleTime: FARMERS_STALE_TIME,
    gcTime: FARMERS_CACHE_TIME,
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook to create a new farmer with optimistic updates
 */
export function useCreateFarmer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (farmerData: Partial<Farmer>) => apiService.Farmers.create(farmerData),
    onMutate: async (newFarmer) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['farmers'] });
      
      // Snapshot the previous value
      const previousFarmers = queryClient.getQueryData(['farmers']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['farmers'], (old: any) => {
        if (old && old.items) {
          return {
            ...old,
            items: [newFarmer, ...old.items],
            total: old.total + 1
          };
        }
        return old;
      });
      
      return { previousFarmers };
    },
    onError: (err, newFarmer, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['farmers'], context.previousFarmers);
    },
    onSettled: () => {
      // Invalidate and refetch farmers list
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
    },
  });
}

/**
 * Hook to update a farmer with optimistic updates
 */
export function useUpdateFarmer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, farmerData }: { id: string; farmerData: Partial<Farmer> }) => 
      apiService.Farmers.update(id, farmerData),
    onMutate: async ({ id, farmerData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['farmer', id] });
      await queryClient.cancelQueries({ queryKey: ['farmers'] });
      
      // Snapshot the previous values
      const previousFarmer = queryClient.getQueryData(['farmer', id]);
      const previousFarmers = queryClient.getQueryData(['farmers']);
      
      // Optimistically update the single farmer
      queryClient.setQueryData(['farmer', id], (old: any) => ({
        ...old,
        ...farmerData
      }));
      
      // Optimistically update the farmers list
      queryClient.setQueryData(['farmers'], (old: any) => {
        if (old && old.items) {
          return {
            ...old,
            items: old.items.map((farmer: Farmer) => 
              farmer.id === id ? { ...farmer, ...farmerData } : farmer
            )
          };
        }
        return old;
      });
      
      return { previousFarmer, previousFarmers };
    },
    onError: (err, variables, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['farmer', variables.id], context.previousFarmer);
      queryClient.setQueryData(['farmers'], context.previousFarmers);
    },
    onSettled: (data, error, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['farmer', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
    },
  });
}

/**
 * Hook to delete a farmer with optimistic updates
 */
export function useDeleteFarmer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiService.Farmers.delete(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['farmers'] });
      
      // Snapshot the previous value
      const previousFarmers = queryClient.getQueryData(['farmers']);
      
      // Optimistically remove the farmer
      queryClient.setQueryData(['farmers'], (old: any) => {
        if (old && old.items) {
          return {
            ...old,
            items: old.items.filter((farmer: Farmer) => farmer.id !== id),
            total: old.total - 1
          };
        }
        return old;
      });
      
      return { previousFarmers };
    },
    onError: (err, id, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['farmers'], context.previousFarmers);
    },
    onSettled: () => {
      // Invalidate farmers list
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
    },
  });
}