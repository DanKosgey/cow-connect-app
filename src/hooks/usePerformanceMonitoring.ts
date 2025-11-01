import { useQuery, useQueryClient } from '@tanstack/react-query';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Cache keys for performance monitoring
export const PERFORMANCE_CACHE_KEYS = {
  METRICS: 'performance-metrics',
  TIMINGS: 'performance-timings'
};

// Main hook for Performance Monitoring data
export const usePerformanceMonitoring = () => {
  const queryClient = useQueryClient();

  // Get performance metrics with caching
  const usePerformanceMetrics = (componentName: string, enabled: boolean = true) => {
    return useQuery({
      queryKey: [PERFORMANCE_CACHE_KEYS.METRICS, componentName],
      queryFn: () => {
        // This would typically collect metrics from the performance monitor
        // For now, we'll return the current metrics
        return performanceMonitor.getMetrics();
      },
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes
      enabled
    });
  };

  // Get timing entries with caching
  const useTimingEntries = (enabled: boolean = true) => {
    return useQuery({
      queryKey: [PERFORMANCE_CACHE_KEYS.TIMINGS],
      queryFn: () => {
        // This would typically collect timing data
        // For now, we'll return an empty array as a placeholder
        return [];
      },
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 10, // 10 minutes
      enabled
    });
  };

  // Mutation to invalidate performance cache
  const invalidatePerformanceCache = () => {
    queryClient.invalidateQueries({ queryKey: [PERFORMANCE_CACHE_KEYS.METRICS] });
    queryClient.invalidateQueries({ queryKey: [PERFORMANCE_CACHE_KEYS.TIMINGS] });
  };

  // Mutation to refresh performance metrics
  const refreshPerformanceMetrics = (componentName: string) => {
    return queryClient.refetchQueries({ queryKey: [PERFORMANCE_CACHE_KEYS.METRICS, componentName] });
  };

  // Function to start timing
  const startTiming = (name: string): string => {
    return performanceMonitor.startTiming(name);
  };

  // Function to end timing
  const endTiming = (id: string, name?: string): number | null => {
    return performanceMonitor.endTiming(id, name);
  };

  // Function to log metrics
  const logMetrics = (componentName: string) => {
    performanceMonitor.logMetrics(componentName);
  };

  return {
    usePerformanceMetrics,
    useTimingEntries,
    invalidatePerformanceCache,
    refreshPerformanceMetrics,
    startTiming,
    endTiming,
    logMetrics
  };
};