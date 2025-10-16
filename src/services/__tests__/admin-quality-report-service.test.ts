import { adminQualityReportService, QualityReportInput } from '../admin-quality-report-service';
import { qualityReportService } from '../quality-report-service';

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

// Mock the qualityReportService
jest.mock('../quality-report-service', () => ({
  qualityReportService: {
    validateQualityReport: jest.fn(),
    addReport: jest.fn(),
    updateReport: jest.fn(),
    deleteReport: jest.fn()
  }
}));

describe('AdminQualityReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addReport', () => {
    it('should successfully add a new quality report', async () => {
      const newReport: QualityReportInput = {
        collection_id: 'collection-123',
        fat_content: 4.2,
        protein_content: 3.5,
        snf_content: 9.1,
        acidity_level: 6.8,
        temperature: 3.2,
        bacterial_count: 800,
        measured_by: 'staff-456'
      };

      // Mock validation to return valid
      (qualityReportService.validateQualityReport as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      // Mock addReport to return success
      (qualityReportService.addReport as jest.Mock).mockResolvedValue({
        success: true,
        data: true
      });

      // Mock supabase select to return the created record
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({
        data: {
          id: 1,
          collection_id: 'collection-123',
          fat_content: 4.2,
          protein_content: 3.5,
          snf_content: 9.1,
          acidity_level: 6.8,
          temperature: 3.2,
          bacterial_count: 800,
          measured_by: 'staff-456',
          created_at: '2023-06-15T10:00:00Z'
        },
        error: null
      });

      const result = await adminQualityReportService.addReport(newReport);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.collection_id).toBe('collection-123');
    });

    it('should return validation errors when data is invalid', async () => {
      const invalidReport: QualityReportInput = {
        collection_id: '', // Invalid - empty
        fat_content: 4.2,
        protein_content: 3.5,
        snf_content: 9.1,
        acidity_level: 6.8,
        temperature: 3.2,
        bacterial_count: 800,
        measured_by: 'staff-456'
      };

      // Mock validation to return invalid
      (qualityReportService.validateQualityReport as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Collection ID is required']
      });

      const result = await adminQualityReportService.addReport(invalidReport);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Collection ID is required');
    });
  });

  describe('updateReport', () => {
    it('should successfully update an existing quality report', async () => {
      const reportId = 1;
      const updateData: Partial<QualityReportInput> = {
        fat_content: 4.5,
        protein_content: 3.7
      };

      // Mock validation to return valid
      (qualityReportService.validateQualityReport as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      // Mock updateReport to return success
      (qualityReportService.updateReport as jest.Mock).mockResolvedValue({
        success: true,
        data: true
      });

      // Mock supabase select to return the updated record
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({
        data: {
          id: 1,
          collection_id: 'collection-123',
          fat_content: 4.5,
          protein_content: 3.7,
          snf_content: 9.1,
          acidity_level: 6.8,
          temperature: 3.2,
          bacterial_count: 800,
          measured_by: 'staff-456',
          created_at: '2023-06-15T10:00:00Z'
        },
        error: null
      });

      const result = await adminQualityReportService.updateReport(reportId, updateData);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.fat_content).toBe(4.5);
    });

    it('should return error when report ID is missing', async () => {
      const result = await adminQualityReportService.updateReport(0, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Report ID is required');
    });
  });

  describe('deleteReport', () => {
    it('should successfully delete a quality report', async () => {
      const reportId = 1;

      // Mock deleteReport to return success
      (qualityReportService.deleteReport as jest.Mock).mockResolvedValue({
        success: true,
        data: true
      });

      const result = await adminQualityReportService.deleteReport(reportId);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return error when report ID is missing', async () => {
      const result = await adminQualityReportService.deleteReport(0);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Report ID is required');
    });
  });

  describe('generateReportForCollection', () => {
    it('should successfully generate a new report for a collection', async () => {
      const collectionId = 'collection-123';
      const testData = {
        fat_content: 4.2,
        protein_content: 3.5,
        snf_content: 9.1,
        acidity_level: 6.8,
        temperature: 3.2,
        bacterial_count: 800
      };

      // Mock supabase select to return no existing report (new report)
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      // Mock addReport to return success
      const addReportSpy = jest.spyOn(adminQualityReportService, 'addReport');
      addReportSpy.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          collection_id: 'collection-123',
          fat_content: 4.2,
          protein_content: 3.5,
          snf_content: 9.1,
          acidity_level: 6.8,
          temperature: 3.2,
          bacterial_count: 800,
          measured_by: null,
          created_at: '2023-06-15T10:00:00Z'
        }
      });

      const result = await adminQualityReportService.generateReportForCollection(
        collectionId,
        testData,
        'staff-456'
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.collection_id).toBe(collectionId);
    });

    it('should return error when collection ID is missing', async () => {
      const result = await adminQualityReportService.generateReportForCollection('', {}, '');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Collection ID is required');
    });
  });

  describe('bulkGenerateReports', () => {
    it('should successfully bulk generate reports', async () => {
      const reports = [
        {
          collection_id: 'collection-123',
          test_data: {
            fat_content: 4.2,
            protein_content: 3.5
          },
          measured_by: 'staff-456'
        },
        {
          collection_id: 'collection-456',
          test_data: {
            fat_content: 4.0,
            protein_content: 3.3
          },
          measured_by: 'staff-789'
        }
      ];

      // Mock generateReportForCollection to return success
      const generateReportSpy = jest.spyOn(adminQualityReportService, 'generateReportForCollection');
      generateReportSpy.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          collection_id: 'collection-123',
          fat_content: 4.2,
          protein_content: 3.5,
          snf_content: null,
          acidity_level: null,
          temperature: null,
          bacterial_count: null,
          measured_by: 'staff-456',
          created_at: '2023-06-15T10:00:00Z'
        }
      });

      const result = await adminQualityReportService.bulkGenerateReports(reports);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('calculateQualityGrade', () => {
    it('should calculate quality grade as A+ for high scores', () => {
      const report = {
        id: 1,
        collection_id: 'collection-123',
        fat_content: 4.2, // Ideal range 3.5-4.5
        protein_content: 3.3, // Ideal range 3.0-3.5
        snf_content: 8.8, // Ideal range 8.5-9.0
        acidity_level: 6.6, // Ideal range 6.4-6.8
        temperature: 3.0, // Ideal range 2-4°C
        bacterial_count: 500, // Lower is better, ideal < 1000
        measured_by: 'staff-456',
        created_at: '2023-06-15T10:00:00Z'
      } as any;

      const grade = adminQualityReportService.calculateQualityGrade(report);
      expect(grade).toBe('A+');
    });

    it('should calculate quality grade as C for low scores', () => {
      const report = {
        id: 1,
        collection_id: 'collection-123',
        fat_content: 2.0, // Far from ideal range
        protein_content: 2.0, // Far from ideal range
        snf_content: 7.0, // Far from ideal range
        acidity_level: 8.0, // Far from ideal range
        temperature: 8.0, // Far from ideal range
        bacterial_count: 5000, // Far above ideal
        measured_by: 'staff-456',
        created_at: '2023-06-15T10:00:00Z'
      } as any;

      const grade = adminQualityReportService.calculateQualityGrade(report);
      expect(grade).toBe('C');
    });
  });

  describe('updateCollectionQualityGrade', () => {
    it('should successfully update collection quality grade', async () => {
      const collectionId = 'collection-123';

      // Mock supabase select to return quality report
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 1,
          collection_id: 'collection-123',
          fat_content: 4.2,
          protein_content: 3.5,
          snf_content: 9.1,
          acidity_level: 6.8,
          temperature: 3.2,
          bacterial_count: 800,
          measured_by: 'staff-456',
          created_at: '2023-06-15T10:00:00Z'
        },
        error: null
      });

      // Mock supabase update to return success
      supabaseMock.update.mockResolvedValueOnce({ error: null });

      const result = await adminQualityReportService.updateCollectionQualityGrade(collectionId);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return error when collection ID is missing', async () => {
      const result = await adminQualityReportService.updateCollectionQualityGrade('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Collection ID is required');
    });

    it('should return error when no quality report is found', async () => {
      const collectionId = 'collection-123';

      // Mock supabase select to return no data
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await adminQualityReportService.updateCollectionQualityGrade(collectionId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No quality report found for this collection');
    });
  });
});