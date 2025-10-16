import { qualityReportService, QualityReport, QualityReportWithCollection } from '../quality-report-service';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis()
  }
}));

// Mock the logger
jest.mock('@/utils/logger', () => ({
  logger: {
    errorWithContext: jest.fn()
  }
}));

describe('QualityReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateQualityReport', () => {
    it('should validate valid quality report data', () => {
      const validData = {
        collection_id: 'collection-123',
        fat_content: 4.2,
        protein_content: 3.5,
        snf_content: 9.1,
        acidity_level: 6.8,
        temperature: 3.2,
        bacterial_count: 800,
        measured_by: 'staff-456'
      };

      const result = qualityReportService.validateQualityReport(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing collection ID', () => {
      const invalidData = {
        fat_content: 4.2,
        protein_content: 3.5
      };

      const result = qualityReportService.validateQualityReport(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Collection ID is required');
    });

    it('should reject invalid fat content', () => {
      const invalidData = {
        collection_id: 'collection-123',
        fat_content: 150, // Too high
        protein_content: 3.5
      };

      const result = qualityReportService.validateQualityReport(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Fat content must be between 0 and 100');
    });

    it('should reject invalid protein content', () => {
      const invalidData = {
        collection_id: 'collection-123',
        fat_content: 4.2,
        protein_content: -5 // Negative value
      };

      const result = qualityReportService.validateQualityReport(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Protein content must be between 0 and 100');
    });

    it('should reject invalid temperature', () => {
      const invalidData = {
        collection_id: 'collection-123',
        fat_content: 4.2,
        protein_content: 3.5,
        temperature: 150 // Too high
      };

      const result = qualityReportService.validateQualityReport(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Temperature must be between -20 and 100 degrees Celsius');
    });

    it('should reject negative bacterial count', () => {
      const invalidData = {
        collection_id: 'collection-123',
        fat_content: 4.2,
        protein_content: 3.5,
        bacterial_count: -100 // Negative value
      };

      const result = qualityReportService.validateQualityReport(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bacterial count must be a positive number');
    });
  });

  describe('getReportsByFarmer', () => {
    it('should return quality reports for a farmer when fetch is successful', async () => {
      const farmerId = 'farmer-123';
      const mockReports: QualityReportWithCollection[] = [
        {
          id: 1,
          collection_id: 'collection-123',
          fat_content: 4.2,
          protein_content: 3.5,
          snf_content: 9.1,
          acidity_level: 6.8,
          temperature: 3.2,
          bacterial_count: 800,
          measured_by: 'staff-456',
          created_at: '2023-06-15T10:00:00Z',
          collection: {
            id: 'collection-123',
            collection_date: '2023-06-15',
            liters: 50,
            quality_grade: 'A',
            total_amount: 2500,
            farmer_id: farmerId
          }
        }
      ];

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({ data: mockReports, error: null });

      const result = await qualityReportService.getReportsByFarmer(farmerId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReports);
    });

    it('should return error when farmer ID is empty', async () => {
      const result = await qualityReportService.getReportsByFarmer('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Farmer ID is required');
    });
  });

  describe('getReportsByCollection', () => {
    it('should return quality reports for a collection when fetch is successful', async () => {
      const collectionId = 'collection-123';
      const mockReports: QualityReport[] = [
        {
          id: 1,
          collection_id: collectionId,
          fat_content: 4.2,
          protein_content: 3.5,
          snf_content: 9.1,
          acidity_level: 6.8,
          temperature: 3.2,
          bacterial_count: 800,
          measured_by: 'staff-456',
          created_at: '2023-06-15T10:00:00Z'
        }
      ];

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({ data: mockReports, error: null });

      const result = await qualityReportService.getReportsByCollection(collectionId);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReports);
    });

    it('should return error when collection ID is empty', async () => {
      const result = await qualityReportService.getReportsByCollection('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Collection ID is required');
    });
  });

  describe('getRecentReports', () => {
    it('should return recent quality reports when fetch is successful', async () => {
      const mockReports: QualityReportWithCollection[] = [
        {
          id: 1,
          collection_id: 'collection-123',
          fat_content: 4.2,
          protein_content: 3.5,
          snf_content: 9.1,
          acidity_level: 6.8,
          temperature: 3.2,
          bacterial_count: 800,
          measured_by: 'staff-456',
          created_at: '2023-06-15T10:00:00Z',
          collection: {
            id: 'collection-123',
            collection_date: '2023-06-15',
            liters: 50,
            quality_grade: 'A',
            total_amount: 2500,
            farmer_id: 'farmer-123'
          }
        }
      ];

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({ data: mockReports, error: null });

      const result = await qualityReportService.getRecentReports(5);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReports);
    });

    it('should return error when limit is invalid', async () => {
      const result = await qualityReportService.getRecentReports(-5);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Limit must be between 1 and 100');
    });
  });

  describe('addReport', () => {
    it('should successfully add a new quality report', async () => {
      const newReport = {
        collection_id: 'collection-123',
        fat_content: 4.2,
        protein_content: 3.5,
        snf_content: 9.1,
        acidity_level: 6.8,
        temperature: 3.2,
        bacterial_count: 800,
        measured_by: 'staff-456'
      };

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.insert.mockResolvedValueOnce({ error: null });

      const result = await qualityReportService.addReport(newReport);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return validation errors for invalid data', async () => {
      const invalidReport = {
        collection_id: '', // Missing required field
        fat_content: 150, // Invalid value
        protein_content: -5, // Invalid value
        snf_content: 0,
        acidity_level: 0,
        temperature: 0,
        bacterial_count: 0,
        measured_by: null
      };

      const result = await qualityReportService.addReport(invalidReport);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Collection ID is required');
      expect(result.error).toContain('Fat content must be between 0 and 100');
      expect(result.error).toContain('Protein content must be between 0 and 100');
    });
  });

  describe('updateReport', () => {
    it('should successfully update a quality report', async () => {
      const reportId = 1;
      const updateData = {
        fat_content: 4.5,
        protein_content: 3.7
      };

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.update.mockResolvedValueOnce({ error: null });

      const result = await qualityReportService.updateReport(reportId, updateData);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return error when report ID is missing', async () => {
      const result = await qualityReportService.updateReport(0, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Report ID is required');
    });
  });

  describe('deleteReport', () => {
    it('should successfully delete a quality report', async () => {
      const reportId = 1;

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.delete.mockResolvedValueOnce({ error: null });

      const result = await qualityReportService.deleteReport(reportId);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return error when report ID is missing', async () => {
      const result = await qualityReportService.deleteReport(0);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Report ID is required');
    });
  });
});