import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface QualityReport {
  id: number;
  collection_id: string;
  fat_content: number | null;
  protein_content: number | null;
  snf_content: number | null;
  acidity_level: number | null;
  temperature: number | null;
  bacterial_count: number | null;
  measured_by: string | null;
  created_at: string;
}

export interface QualityReportWithCollection extends QualityReport {
  collection: {
    id: string;
    collection_date: string;
    liters: number;
    quality_grade: string | null;
    total_amount: number | null;
    farmer_id: string;
  };
}

// Validation interface
export interface QualityReportValidation {
  isValid: boolean;
  errors: string[];
}

// Response types for better error handling
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  loading?: boolean;
}

class QualityReportService {
  private static instance: QualityReportService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): QualityReportService {
    if (!QualityReportService.instance) {
      QualityReportService.instance = new QualityReportService();
    }
    return QualityReportService.instance;
  }

  /**
   * Validate quality report data
   */
  validateQualityReport(reportData: Partial<QualityReport>): QualityReportValidation {
    const errors: string[] = [];

    // Validate required fields
    if (!reportData.collection_id || reportData.collection_id.trim() === '') {
      errors.push('Collection ID is required');
    }

    // Validate numeric fields are within reasonable ranges
    if (reportData.fat_content !== null && reportData.fat_content !== undefined) {
      if (reportData.fat_content < 0 || reportData.fat_content > 100) {
        errors.push('Fat content must be between 0 and 100');
      }
    }

    if (reportData.protein_content !== null && reportData.protein_content !== undefined) {
      if (reportData.protein_content < 0 || reportData.protein_content > 100) {
        errors.push('Protein content must be between 0 and 100');
      }
    }

    if (reportData.snf_content !== null && reportData.snf_content !== undefined) {
      if (reportData.snf_content < 0 || reportData.snf_content > 100) {
        errors.push('SNF content must be between 0 and 100');
      }
    }

    if (reportData.acidity_level !== null && reportData.acidity_level !== undefined) {
      if (reportData.acidity_level < 0 || reportData.acidity_level > 20) {
        errors.push('Acidity level must be between 0 and 20');
      }
    }

    if (reportData.temperature !== null && reportData.temperature !== undefined) {
      if (reportData.temperature < -20 || reportData.temperature > 100) {
        errors.push('Temperature must be between -20 and 100 degrees Celsius');
      }
    }

    if (reportData.bacterial_count !== null && reportData.bacterial_count !== undefined) {
      if (reportData.bacterial_count < 0) {
        errors.push('Bacterial count must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Fetch quality reports for a specific farmer
   */
  async getReportsByFarmer(farmerId: string): Promise<ServiceResponse<QualityReportWithCollection[]>> {
    try {
      // Validate input
      if (!farmerId || farmerId.trim() === '') {
        return { success: false, error: 'Farmer ID is required' };
      }

      const { data, error } = await supabase
        .from('milk_quality_parameters')
        .select(`
          *,
          collections!milk_quality_parameters_collection_id_fkey (
            id,
            collection_date,
            liters,
            quality_grade,
            total_amount,
            farmer_id
          )
        `)
        .eq('collections.farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('QualityReportService - getReportsByFarmer', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      logger.errorWithContext('QualityReportService - getReportsByFarmer exception', error);
      return { success: false, error: error.message || 'Failed to fetch quality reports' };
    }
  }

  /**
   * Fetch quality reports for a specific collection
   */
  async getReportsByCollection(collectionId: string): Promise<ServiceResponse<QualityReport[]>> {
    try {
      // Validate input
      if (!collectionId || collectionId.trim() === '') {
        return { success: false, error: 'Collection ID is required' };
      }

      const { data, error } = await supabase
        .from('milk_quality_parameters')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.errorWithContext('QualityReportService - getReportsByCollection', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      logger.errorWithContext('QualityReportService - getReportsByCollection exception', error);
      return { success: false, error: error.message || 'Failed to fetch quality reports by collection' };
    }
  }

  /**
   * Fetch recent quality reports with collection details
   */
  async getRecentReports(limit: number = 10): Promise<ServiceResponse<QualityReportWithCollection[]>> {
    try {
      // Validate input
      if (limit <= 0 || limit > 100) {
        return { success: false, error: 'Limit must be between 1 and 100' };
      }

      const { data, error } = await supabase
        .from('milk_quality_parameters')
        .select(`
          *,
          collections!milk_quality_parameters_collection_id_fkey (
            id,
            collection_date,
            liters,
            quality_grade,
            total_amount,
            farmer_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.errorWithContext('QualityReportService - getRecentReports', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      logger.errorWithContext('QualityReportService - getRecentReports exception', error);
      return { success: false, error: error.message || 'Failed to fetch recent quality reports' };
    }
  }

  /**
   * Add a new quality report
   */
  async addReport(reportData: Omit<QualityReport, 'id' | 'created_at'>): Promise<ServiceResponse<boolean>> {
    try {
      // Validate data
      const validation = this.validateQualityReport(reportData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const { error } = await supabase
        .from('milk_quality_parameters')
        .insert(reportData);

      if (error) {
        logger.errorWithContext('QualityReportService - addReport', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: true };
    } catch (error: any) {
      logger.errorWithContext('QualityReportService - addReport exception', error);
      return { success: false, error: error.message || 'Failed to add quality report' };
    }
  }

  /**
   * Update a quality report
   */
  async updateReport(id: number, reportData: Partial<Omit<QualityReport, 'id' | 'created_at'>>): Promise<ServiceResponse<boolean>> {
    try {
      // Validate input
      if (!id) {
        return { success: false, error: 'Report ID is required' };
      }

      // Validate data if provided
      if (Object.keys(reportData).length > 0) {
        const validation = this.validateQualityReport(reportData);
        if (!validation.isValid) {
          return { success: false, error: validation.errors.join(', ') };
        }
      }

      const { error } = await supabase
        .from('milk_quality_parameters')
        .update(reportData)
        .eq('id', id);

      if (error) {
        logger.errorWithContext('QualityReportService - updateReport', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: true };
    } catch (error: any) {
      logger.errorWithContext('QualityReportService - updateReport exception', error);
      return { success: false, error: error.message || 'Failed to update quality report' };
    }
  }

  /**
   * Delete a quality report
   */
  async deleteReport(id: number): Promise<ServiceResponse<boolean>> {
    try {
      // Validate input
      if (!id) {
        return { success: false, error: 'Report ID is required' };
      }

      const { error } = await supabase
        .from('milk_quality_parameters')
        .delete()
        .eq('id', id);

      if (error) {
        logger.errorWithContext('QualityReportService - deleteReport', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: true };
    } catch (error: any) {
      logger.errorWithContext('QualityReportService - deleteReport exception', error);
      return { success: false, error: error.message || 'Failed to delete quality report' };
    }
  }
}

// Export singleton instance
export const qualityReportService = QualityReportService.getInstance();