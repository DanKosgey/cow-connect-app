import { useQuery, useQueryClient } from '@tanstack/react-query';
import { exportService, ExportOptions } from '@/services/export-service';

// Cache keys for export data functionality
export const EXPORT_CACHE_KEYS = {
  FARMERS_EXPORT: 'farmers-export',
  COLLECTIONS_EXPORT: 'collections-export',
  PAYMENTS_EXPORT: 'payments-export',
  FILTERED_EXPORT: 'filtered-export'
};

// Main hook for Export Data functionality
export const useExportData = () => {
  const queryClient = useQueryClient();

  // Get farmers export data with caching
  const useFarmersExport = (options: ExportOptions) => {
    return useQuery({
      queryKey: [EXPORT_CACHE_KEYS.FARMERS_EXPORT, options],
      queryFn: () => exportService.exportFarmers(options),
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Get collections export data with caching
  const useCollectionsExport = (options: ExportOptions) => {
    return useQuery({
      queryKey: [EXPORT_CACHE_KEYS.COLLECTIONS_EXPORT, options],
      queryFn: () => exportService.exportCollections(options),
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Get payments export data with caching
  const usePaymentsExport = (options: ExportOptions) => {
    return useQuery({
      queryKey: [EXPORT_CACHE_KEYS.PAYMENTS_EXPORT, options],
      queryFn: () => exportService.exportPayments(options),
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Get filtered export data with caching
  const useFilteredExport = (table: string, filters: Record<string, any>, options: ExportOptions) => {
    return useQuery({
      queryKey: [EXPORT_CACHE_KEYS.FILTERED_EXPORT, table, filters, options],
      queryFn: () => exportService.exportWithFilters(table, filters, options),
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Mutation to invalidate export data cache
  const invalidateExportCache = () => {
    queryClient.invalidateQueries({ queryKey: [EXPORT_CACHE_KEYS.FARMERS_EXPORT] });
    queryClient.invalidateQueries({ queryKey: [EXPORT_CACHE_KEYS.COLLECTIONS_EXPORT] });
    queryClient.invalidateQueries({ queryKey: [EXPORT_CACHE_KEYS.PAYMENTS_EXPORT] });
    queryClient.invalidateQueries({ queryKey: [EXPORT_CACHE_KEYS.FILTERED_EXPORT] });
  };

  // Mutation to refresh farmers export data
  const refreshFarmersExport = (options: ExportOptions) => {
    return queryClient.refetchQueries({ queryKey: [EXPORT_CACHE_KEYS.FARMERS_EXPORT, options] });
  };

  // Mutation to refresh collections export data
  const refreshCollectionsExport = (options: ExportOptions) => {
    return queryClient.refetchQueries({ queryKey: [EXPORT_CACHE_KEYS.COLLECTIONS_EXPORT, options] });
  };

  // Mutation to refresh payments export data
  const refreshPaymentsExport = (options: ExportOptions) => {
    return queryClient.refetchQueries({ queryKey: [EXPORT_CACHE_KEYS.PAYMENTS_EXPORT, options] });
  };

  // Mutation to refresh filtered export data
  const refreshFilteredExport = (table: string, filters: Record<string, any>, options: ExportOptions) => {
    return queryClient.refetchQueries({ queryKey: [EXPORT_CACHE_KEYS.FILTERED_EXPORT, table, filters, options] });
  };

  // Function to download file
  const downloadFile = (data: string | Blob, filename: string, format: 'csv' | 'json' | 'xlsx'): void => {
    exportService.downloadFile(data, filename, format);
  };

  return {
    useFarmersExport,
    useCollectionsExport,
    usePaymentsExport,
    useFilteredExport,
    invalidateExportCache,
    refreshFarmersExport,
    refreshCollectionsExport,
    refreshPaymentsExport,
    refreshFilteredExport,
    downloadFile
  };
};