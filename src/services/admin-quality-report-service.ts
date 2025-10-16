import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { QualityReport, qualityReportService } from './quality-report-service';

// Make all fields required except id and created_at to match the service expectation
export interface QualityReportInput {
  collection_id: string;
  fat_content: number | null;
  protein_content: number | null;
  snf_content: number | null;
  acidity_level: number | null;
  temperature: number | null;
  bacterial_count: number | null;
  measured_by: string | null;
}

// Response types for better error handling
export interface AdminServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processed?: number;
  errors?: string[];
}

class AdminQualityReportService {
  private static instance: AdminQualityReportService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): AdminQualityReportService {
    if (!AdminQualityReportService.instance) {
      AdminQualityReportService.instance = new AdminQualityReportService();
    }
    return AdminQualityReportService.instance;
  }

  /**
   * Add a new quality report
   */
  async addReport(reportData: QualityReportInput): Promise<AdminServiceResponse<QualityReport>> {
    try {
      // Validate data using the main service
      const validation = qualityReportService.validateQualityReport(reportData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const result = await qualityReportService.addReport(reportData);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Fetch the created record to return it
      const { data, error } = await supabase
        .from('milk_quality_parameters')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        logger.errorWithContext('AdminQualityReportService - addReport fetch created', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as QualityReport };
    } catch (error: any) {
      logger.errorWithContext('AdminQualityReportService - addReport exception', error);
      return { success: false, error: error.message || 'Failed to add quality report' };
    }
  }

  /**
   * Update an existing quality report
   */
  async updateReport(id: number, reportData: Partial<QualityReportInput>): Promise<AdminServiceResponse<QualityReport>> {
    try {
      // Validate input
      if (!id) {
        return { success: false, error: 'Report ID is required' };
      }

      // Validate data if provided
      if (Object.keys(reportData).length > 0) {
        const validation = qualityReportService.validateQualityReport(reportData);
        if (!validation.isValid) {
          return { success: false, error: validation.errors.join(', ') };
        }
      }

      const result = await qualityReportService.updateReport(id, reportData);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Fetch the updated record to return it
      const { data, error } = await supabase
        .from('milk_quality_parameters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.errorWithContext('AdminQualityReportService - updateReport fetch updated', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as QualityReport };
    } catch (error: any) {
      logger.errorWithContext('AdminQualityReportService - updateReport exception', error);
      return { success: false, error: error.message || 'Failed to update quality report' };
    }
  }

  /**
   * Delete a quality report
   */
  async deleteReport(id: number): Promise<AdminServiceResponse<boolean>> {
    try {
      // Validate input
      if (!id) {
        return { success: false, error: 'Report ID is required' };
      }

      const result = await qualityReportService.deleteReport(id);
      return result as AdminServiceResponse<boolean>;
    } catch (error: any) {
      logger.errorWithContext('AdminQualityReportService - deleteReport exception', error);
      return { success: false, error: error.message || 'Failed to delete quality report' };
    }
  }

  /**
   * Generate quality report for a collection
   */
  async generateReportForCollection(collectionId: string, testData: {
    fat_content?: number;
    protein_content?: number;
    snf_content?: number;
    acidity_level?: number;
    temperature?: number;
    bacterial_count?: number;
  }, measuredBy?: string): Promise<AdminServiceResponse<QualityReport>> {
    try {
      // Validate input
      if (!collectionId || collectionId.trim() === '') {
        return { success: false, error: 'Collection ID is required' };
      }

      // Check if a report already exists for this collection
      const { data: existingReport, error: fetchError } = await supabase
        .from('milk_quality_parameters')
        .select('*')
        .eq('collection_id', collectionId)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('AdminQualityReportService - generateReportForCollection fetch', fetchError);
        return { success: false, error: fetchError.message };
      }

      const reportData: QualityReportInput = {
        collection_id: collectionId,
        fat_content: testData.fat_content !== undefined ? testData.fat_content : null,
        protein_content: testData.protein_content !== undefined ? testData.protein_content : null,
        snf_content: testData.snf_content !== undefined ? testData.snf_content : null,
        acidity_level: testData.acidity_level !== undefined ? testData.acidity_level : null,
        temperature: testData.temperature !== undefined ? testData.temperature : null,
        bacterial_count: testData.bacterial_count !== undefined ? testData.bacterial_count : null,
        measured_by: measuredBy || null
      };

      let result;
      if (existingReport) {
        // Update existing report
        result = await this.updateReport(existingReport.id, reportData);
      } else {
        // Create new report
        result = await this.addReport(reportData);
      }

      return result as AdminServiceResponse<QualityReport>;
    } catch (error: any) {
      logger.errorWithContext('AdminQualityReportService - generateReportForCollection exception', error);
      return { success: false, error: error.message || 'Failed to generate quality report' };
    }
  }

  /**
   * Bulk generate quality reports from test data
   */
  async bulkGenerateReports(reports: Array<{
    collection_id: string;
    test_data: {
      fat_content?: number;
      protein_content?: number;
      snf_content?: number;
      acidity_level?: number;
      temperature?: number;
      bacterial_count?: number;
    };
    measured_by?: string;
  }>): Promise<AdminServiceResponse<boolean>> {
    try {
      const errors: string[] = [];
      let processed = 0;

      for (const report of reports) {
        try {
          const result = await this.generateReportForCollection(
            report.collection_id,
            report.test_data,
            report.measured_by
          );

          if (result.success) {
            processed++;
          } else {
            errors.push(`Failed to process collection ${report.collection_id}: ${result.error}`);
          }
        } catch (error: any) {
          errors.push(`Exception processing collection ${report.collection_id}: ${error.message || error}`);
        }
      }

      return { 
        success: errors.length === 0, 
        processed, 
        errors,
        data: errors.length === 0
      };
    } catch (error: any) {
      logger.errorWithContext('AdminQualityReportService - bulkGenerateReports exception', error);
      return { 
        success: false, 
        error: error.message || 'Failed to bulk generate reports', 
        processed: 0, 
        errors: ['Failed to bulk generate reports'] 
      };
    }
  }

  /**
   * Calculate quality grade based on parameters
   */
  calculateQualityGrade(report: QualityReport): string {
    // Simple quality grading algorithm
    // In a real implementation, this would be more sophisticated
    let score = 0;
    let count = 0;

    if (report.fat_content !== null) {
      // Fat content: ideal range 3.5-4.5%
      const fatScore = Math.max(0, 10 - Math.abs(report.fat_content - 4) * 2);
      score += fatScore;
      count++;
    }

    if (report.protein_content !== null) {
      // Protein content: ideal range 3.0-3.5%
      const proteinScore = Math.max(0, 10 - Math.abs(report.protein_content - 3.25) * 4);
      score += proteinScore;
      count++;
    }

    if (report.snf_content !== null) {
      // SNF content: ideal range 8.5-9.0%
      const snfScore = Math.max(0, 10 - Math.abs(report.snf_content - 8.75) * 4);
      score += snfScore;
      count++;
    }

    if (report.acidity_level !== null) {
      // Acidity: ideal range 6.4-6.8
      const acidityScore = Math.max(0, 10 - Math.abs(report.acidity_level - 6.6) * 5);
      score += acidityScore;
      count++;
    }

    if (report.temperature !== null) {
      // Temperature: ideal range 2-4°C
      const tempScore = Math.max(0, 10 - Math.abs(report.temperature - 3) * 2);
      score += tempScore;
      count++;
    }

    if (report.bacterial_count !== null) {
      // Bacterial count: lower is better, ideal < 1000
      const bacteriaScore = Math.max(0, 10 - (report.bacterial_count / 1000));
      score += bacteriaScore;
      count++;
    }

    const avgScore = count > 0 ? score / count : 0;

    // Assign grade based on average score
    if (avgScore >= 9) return 'A+';
    if (avgScore >= 8) return 'A';
    if (avgScore >= 7) return 'B';
    return 'C';
  }

  /**
   * Update collection quality grade based on its quality report
   */
  async updateCollectionQualityGrade(collectionId: string): Promise<AdminServiceResponse<boolean>> {
    try {
      // Validate input
      if (!collectionId || collectionId.trim() === '') {
        return { success: false, error: 'Collection ID is required' };
      }

      // Get the quality report for this collection
      const { data: report, error: reportError } = await supabase
        .from('milk_quality_parameters')
        .select('*')
        .eq('collection_id', collectionId)
        .maybeSingle();

      if (reportError) {
        logger.errorWithContext('AdminQualityReportService - updateCollectionQualityGrade fetch report', reportError);
        return { success: false, error: reportError.message };
      }

      if (!report) {
        return { success: false, error: 'No quality report found for this collection' };
      }

      // Calculate quality grade
      const qualityGrade = this.calculateQualityGrade(report as QualityReport);

      // Update the collection with the quality grade
      const { error: updateError } = await supabase
        .from('collections')
        .update({ quality_grade: qualityGrade })
        .eq('id', collectionId);

      if (updateError) {
        logger.errorWithContext('AdminQualityReportService - updateCollectionQualityGrade update', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, data: true };
    } catch (error: any) {
      logger.errorWithContext('AdminQualityReportService - updateCollectionQualityGrade exception', error);
      return { success: false, error: error.message || 'Failed to update collection quality grade' };
    }
  }
}

// Export singleton instance
export const adminQualityReportService = AdminQualityReportService.getInstance();