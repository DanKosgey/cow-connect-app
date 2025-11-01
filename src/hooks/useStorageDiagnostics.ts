import { useQuery, useQueryClient } from '@tanstack/react-query';
import { diagnoseStorageIssues, checkStoragePolicies, verifyDocumentRecords } from '@/utils/storageDiagnostics';

// Cache keys for storage diagnostics
export const STORAGE_CACHE_KEYS = {
  DIAGNOSTICS: 'storage-diagnostics',
  POLICIES: 'storage-policies',
  DOCUMENT_RECORDS: 'document-records'
};

// Main hook for Storage Diagnostics data
export const useStorageDiagnostics = () => {
  const queryClient = useQueryClient();

  // Get storage diagnostics with caching
  const useStorageDiagnosticsData = () => {
    return useQuery({
      queryKey: [STORAGE_CACHE_KEYS.DIAGNOSTICS],
      queryFn: () => diagnoseStorageIssues(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get storage policies with caching
  const useStoragePoliciesData = () => {
    return useQuery({
      queryKey: [STORAGE_CACHE_KEYS.POLICIES],
      queryFn: () => checkStoragePolicies(),
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    });
  };

  // Get document records with caching
  const useDocumentRecordsData = (pendingFarmerId: string) => {
    return useQuery({
      queryKey: [STORAGE_CACHE_KEYS.DOCUMENT_RECORDS, pendingFarmerId],
      queryFn: () => verifyDocumentRecords(pendingFarmerId),
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      enabled: !!pendingFarmerId
    });
  };

  // Mutation to invalidate storage diagnostics cache
  const invalidateStorageCache = () => {
    queryClient.invalidateQueries({ queryKey: [STORAGE_CACHE_KEYS.DIAGNOSTICS] });
    queryClient.invalidateQueries({ queryKey: [STORAGE_CACHE_KEYS.POLICIES] });
    queryClient.invalidateQueries({ queryKey: [STORAGE_CACHE_KEYS.DOCUMENT_RECORDS] });
  };

  // Mutation to refresh storage diagnostics
  const refreshStorageDiagnostics = () => {
    return queryClient.refetchQueries({ queryKey: [STORAGE_CACHE_KEYS.DIAGNOSTICS] });
  };

  // Mutation to refresh storage policies
  const refreshStoragePolicies = () => {
    return queryClient.refetchQueries({ queryKey: [STORAGE_CACHE_KEYS.POLICIES] });
  };

  // Mutation to refresh document records
  const refreshDocumentRecords = (pendingFarmerId: string) => {
    return queryClient.refetchQueries({ queryKey: [STORAGE_CACHE_KEYS.DOCUMENT_RECORDS, pendingFarmerId] });
  };

  return {
    useStorageDiagnosticsData,
    useStoragePoliciesData,
    useDocumentRecordsData,
    invalidateStorageCache,
    refreshStorageDiagnostics,
    refreshStoragePolicies,
    refreshDocumentRecords
  };
};