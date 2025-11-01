import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

// Cache keys for error tracking
export const ERROR_CACHE_KEYS = {
  RECENT_ERRORS: 'recent-errors',
  ERROR_STATS: 'error-stats',
  ERROR_LOGS: 'error-logs'
};

// Main hook for Error Tracking data
export const useErrorTracking = () => {
  const queryClient = useQueryClient();

  // Get recent errors with caching
  const useRecentErrors = (limit: number = 50) => {
    return useQuery({
      queryKey: [ERROR_CACHE_KEYS.RECENT_ERRORS, limit],
      queryFn: () => {
        // This would typically fetch recent errors from a logging service
        // For now, we'll return an empty array as a placeholder
        return [];
      },
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Get error statistics with caching
  const useErrorStats = () => {
    return useQuery({
      queryKey: [ERROR_CACHE_KEYS.ERROR_STATS],
      queryFn: () => {
        // This would typically fetch error statistics
        // For now, we'll return a placeholder object
        return {
          totalErrors: 0,
          errorTypes: {},
          recentErrors: []
        };
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get error logs with caching
  const useErrorLogs = (startDate?: string, endDate?: string) => {
    return useQuery({
      queryKey: [ERROR_CACHE_KEYS.ERROR_LOGS, startDate, endDate],
      queryFn: async () => {
        // This would typically fetch error logs from a logging service
        // For now, we'll return an empty array as a placeholder
        return [];
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Mutation to invalidate error tracking cache
  const invalidateErrorCache = () => {
    queryClient.invalidateQueries({ queryKey: [ERROR_CACHE_KEYS.RECENT_ERRORS] });
    queryClient.invalidateQueries({ queryKey: [ERROR_CACHE_KEYS.ERROR_STATS] });
    queryClient.invalidateQueries({ queryKey: [ERROR_CACHE_KEYS.ERROR_LOGS] });
  };

  // Mutation to refresh recent errors
  const refreshRecentErrors = () => {
    return queryClient.refetchQueries({ queryKey: [ERROR_CACHE_KEYS.RECENT_ERRORS] });
  };

  // Mutation to refresh error stats
  const refreshErrorStats = () => {
    return queryClient.refetchQueries({ queryKey: [ERROR_CACHE_KEYS.ERROR_STATS] });
  };

  // Function to log an error
  const logError = (context: string, error: any, additionalInfo?: Record<string, any>) => {
    logger.errorWithContext(context, error, additionalInfo);
    // Invalidate cache to show updated error data
    invalidateErrorCache();
  };

  // Function to log an error event
  const logErrorEvent = (name: string, data?: Record<string, any>) => {
    logger.event(`ERROR_${name}`, data);
  };

  return {
    useRecentErrors,
    useErrorStats,
    useErrorLogs,
    invalidateErrorCache,
    refreshRecentErrors,
    refreshErrorStats,
    logError,
    logErrorEvent
  };
};