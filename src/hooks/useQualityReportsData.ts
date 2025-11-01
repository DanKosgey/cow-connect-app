import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { qualityReportService, QualityReportWithCollection, ServiceResponse } from '@/services/quality-report-service';

// Define interfaces for our data structures
interface QualityReport {
  id: string;
  collectionId: string;
  collectionDate: string;
  fatContent: number;
  proteinContent: number;
  snfContent: number;
  acidityLevel: number;
  temperature: number;
  bacterialCount: number;
  qualityGrade: string;
  status: 'passed' | 'failed' | 'pending';
  notes: string;
}

// Cache keys for different data types
export const QUALITY_REPORTS_CACHE_KEYS = {
  FARMER_REPORTS: 'farmer-quality-reports',
  COLLECTION_REPORTS: 'collection-quality-reports',
  RECENT_REPORTS: 'recent-quality-reports'
};

// Main hook for Quality Reports data
export const useQualityReportsData = () => {
  const queryClient = useQueryClient();

  // Get quality reports for a specific farmer
  const useFarmerQualityReports = (farmerId: string) => {
    return useQuery<QualityReport[]>({
      queryKey: [QUALITY_REPORTS_CACHE_KEYS.FARMER_REPORTS, farmerId],
      queryFn: async () => {
        if (!farmerId) return [];

        // Fetch quality data for the farmer using the service
        const qualityResponse: ServiceResponse<QualityReportWithCollection[]> = await qualityReportService.getReportsByFarmer(farmerId);
        
        if (!qualityResponse.success) {
          throw new Error(qualityResponse.error || 'Failed to load quality reports');
        }

        // Convert service data to UI format
        const formattedReports: QualityReport[] = (qualityResponse.data || []).map(report => {
          // Determine status based on quality parameters
          let status: 'passed' | 'failed' | 'pending' = 'pending';
          if (report.fat_content && report.protein_content && report.bacterial_count !== null) {
            // Simple logic: if bacterial count is low and fat/protein are reasonable, it passes
            status = (report.bacterial_count < 10000 && report.fat_content > 2.5 && report.protein_content > 2.0) 
              ? 'passed' 
              : 'failed';
          }
          
          return {
            id: report.id.toString(),
            collectionId: report.collection?.id || 'N/A',
            collectionDate: report.collection?.collection_date || new Date().toISOString(),
            fatContent: report.fat_content || 0,
            proteinContent: report.protein_content || 0,
            snfContent: report.snf_content || 0,
            acidityLevel: report.acidity_level || 0,
            temperature: report.temperature || 0,
            bacterialCount: report.bacterial_count || 0,
            qualityGrade: report.collection?.quality_grade || 'N/A',
            status: status,
            notes: `Report for collection on ${report.collection?.collection_date ? new Date(report.collection.collection_date).toLocaleDateString() : 'unknown date'}`
          };
        });

        return formattedReports;
      },
      enabled: !!farmerId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get quality reports for a specific collection
  const useCollectionQualityReports = (collectionId: string) => {
    return useQuery({
      queryKey: [QUALITY_REPORTS_CACHE_KEYS.COLLECTION_REPORTS, collectionId],
      queryFn: async () => {
        if (!collectionId) return [];

        const qualityResponse = await qualityReportService.getReportsByCollection(collectionId);
        
        if (!qualityResponse.success) {
          throw new Error(qualityResponse.error || 'Failed to load quality reports');
        }

        return qualityResponse.data || [];
      },
      enabled: !!collectionId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get recent quality reports
  const useRecentQualityReports = (limit: number = 10) => {
    return useQuery({
      queryKey: [QUALITY_REPORTS_CACHE_KEYS.RECENT_REPORTS, limit],
      queryFn: async () => {
        const qualityResponse = await qualityReportService.getRecentReports(limit);
        
        if (!qualityResponse.success) {
          throw new Error(qualityResponse.error || 'Failed to load recent quality reports');
        }

        return qualityResponse.data || [];
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Mutation to invalidate all quality reports caches
  const invalidateQualityReportsCache = () => {
    queryClient.invalidateQueries({ queryKey: [QUALITY_REPORTS_CACHE_KEYS.FARMER_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [QUALITY_REPORTS_CACHE_KEYS.COLLECTION_REPORTS] });
    queryClient.invalidateQueries({ queryKey: [QUALITY_REPORTS_CACHE_KEYS.RECENT_REPORTS] });
  };

  return {
    useFarmerQualityReports,
    useCollectionQualityReports,
    useRecentQualityReports,
    invalidateQualityReportsCache
  };
};