import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qualityReportService } from '@/services/quality-report-service';
import { adminQualityReportService } from '@/services/admin-quality-report-service';

// Cache keys for report generation data
export const REPORT_CACHE_KEYS = {
  FARMER_QUALITY_REPORTS: 'farmer-quality-reports',
  COLLECTION_REPORTS: 'collection-reports',
  RECENT_REPORTS: 'recent-reports',
  QUALITY_GRADE: 'quality-grade'
};

// Main hook for Report Generation data
export const useReportGeneration = () => {
  const queryClient = useQueryClient();

  // Get quality reports for a specific farmer with caching
  const useFarmerQualityReports = (farmerId: string) => {
    return useQuery({
      queryKey: [REPORT_CACHE_KEYS.FARMER_QUALITY_REPORTS, farmerId],
      queryFn: async () => {
        const response = await qualityReportService.getReportsByFarmer(farmerId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch farmer quality reports');
        }
        return response.data || [];
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
      enabled: !!farmerId
    });
  };

  // Get reports for a specific collection with caching
  const useCollectionReports = (collectionId: string) => {
    return useQuery({
      queryKey: [REPORT_CACHE_KEYS.COLLECTION_REPORTS, collectionId],
      queryFn: async () => {
        const response = await qualityReportService.getReportsByCollection(collectionId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch collection reports');
        }
        return response.data || [];
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
      enabled: !!collectionId
    });
  };

  // Get recent reports with caching
  const useRecentReports = (limit: number = 10) => {
    return useQuery({
      queryKey: [REPORT_CACHE_KEYS.RECENT_REPORTS, limit],
      queryFn: async () => {
        const response = await qualityReportService.getRecentReports(limit);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch recent reports');
        }
        return response.data || [];
      },
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Get quality grade for a collection with caching
  const useQualityGrade = (collectionId: string) => {
    return useQuery({
      queryKey: [REPORT_CACHE_KEYS.QUALITY_GRADE, collectionId],
      queryFn: async () => {
        const response = await qualityReportService.getReportsByCollection(collectionId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch quality grade');
        }
        
        const reports = response.data || [];
        if (reports.length > 0) {
          // Use admin service to calculate quality grade
          return adminQualityReportService.calculateQualityGrade(reports[0]);
        }
        return 'N/A';
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
      enabled: !!collectionId
    });
  };

  // Mutation to invalidate report generation cache
  const invalidateReportCache = () => {
    queryClient.invalidateQueries({ queryKey: [REPORT_CACHE_KEYS.FARMER_QUALITY_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [REPORT_CACHE_KEYS.COLLECTION_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [REPORT_CACHE_KEYS.RECENT_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [REPORT_CACHE_KEYS.QUALITY_GRADE] });
  };

  // Mutation to refresh farmer quality reports
  const refreshFarmerQualityReports = (farmerId: string) => {
    return queryClient.refetchQueries({ queryKey: [REPORT_CACHE_KEYS.FARMER_QUALITY_REPORTS, farmerId] });
  };

  // Mutation to refresh collection reports
  const refreshCollectionReports = (collectionId: string) => {
    return queryClient.refetchQueries({ queryKey: [REPORT_CACHE_KEYS.COLLECTION_REPORTS, collectionId] });
  };

  // Mutation to refresh recent reports
  const refreshRecentReports = () => {
    return queryClient.refetchQueries({ queryKey: [REPORT_CACHE_KEYS.RECENT_REPORTS] });
  };

  // Mutation to refresh quality grade
  const refreshQualityGrade = (collectionId: string) => {
    return queryClient.refetchQueries({ queryKey: [REPORT_CACHE_KEYS.QUALITY_GRADE, collectionId] });
  };

  return {
    useFarmerQualityReports,
    useCollectionReports,
    useRecentReports,
    useQualityGrade,
    invalidateReportCache,
    refreshFarmerQualityReports,
    refreshCollectionReports,
    refreshRecentReports,
    refreshQualityGrade
  };
};