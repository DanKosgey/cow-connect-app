import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NetworkService } from '@/services/network-service';
import { NetworkDiagnostics } from '@/types/network';

// Cache keys for network diagnostics
export const NETWORK_CACHE_KEYS = {
  DIAGNOSTICS: 'network-diagnostics',
  CONNECTION_TEST: 'connection-test'
};

// Main hook for Network Diagnostics data
export const useNetworkDiagnostics = () => {
  const queryClient = useQueryClient();
  const networkService = new NetworkService();

  // Get system diagnostics with caching
  const useSystemDiagnostics = () => {
    return useQuery<NetworkDiagnostics>({
      queryKey: [NETWORK_CACHE_KEYS.DIAGNOSTICS],
      queryFn: () => networkService.runSystemDiagnostics(),
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Test connection with caching
  const useConnectionTest = (enabled: boolean = false) => {
    return useQuery<NetworkDiagnostics>({
      queryKey: [NETWORK_CACHE_KEYS.CONNECTION_TEST],
      queryFn: () => networkService.runSystemDiagnostics(),
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes
      enabled
    });
  };

  // Mutation to invalidate network diagnostics cache
  const invalidateNetworkCache = () => {
    queryClient.invalidateQueries({ queryKey: [NETWORK_CACHE_KEYS.DIAGNOSTICS] });
    queryClient.invalidateQueries({ queryKey: [NETWORK_CACHE_KEYS.CONNECTION_TEST] });
  };

  // Mutation to refresh network diagnostics
  const refreshDiagnostics = () => {
    return queryClient.refetchQueries({ queryKey: [NETWORK_CACHE_KEYS.DIAGNOSTICS] });
  };

  return {
    useSystemDiagnostics,
    useConnectionTest,
    invalidateNetworkCache,
    refreshDiagnostics
  };
};