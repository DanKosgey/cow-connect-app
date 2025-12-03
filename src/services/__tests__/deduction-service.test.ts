import { deductionService, DeductionType, FarmerDeduction, DeductionRecord } from '../deduction-service';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
};

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    errorWithContext: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    withContext: jest.fn().mockReturnThis(),
  },
}));

describe('DeductionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDeductionType', () => {
    it('should validate valid deduction type data', () => {
      const result = (deductionService as any).validateDeductionType('Test Type', 'Test Description');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const result = (deductionService as any).validateDeductionType('', 'Test Description');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deduction type name is required');
    });

    it('should reject name longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      const result = (deductionService as any).validateDeductionType(longName, 'Test Description');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deduction type name must be less than 100 characters');
    });

    it('should reject description longer than 500 characters', () => {
      const longDescription = 'a'.repeat(501);
      const result = (deductionService as any).validateDeductionType('Test Type', longDescription);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description must be less than 500 characters');
    });
  });

  describe('validateFarmerDeduction', () => {
    it('should validate valid farmer deduction data', () => {
      const result = (deductionService as any).validateFarmerDeduction('farmer1', 'type1', 100);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing farmer ID', () => {
      const result = (deductionService as any).validateFarmerDeduction('', 'type1', 100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Farmer ID is required');
    });

    it('should reject missing deduction type ID', () => {
      const result = (deductionService as any).validateFarmerDeduction('farmer1', '', 100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deduction type ID is required');
    });

    it('should reject amount less than or equal to zero', () => {
      const result = (deductionService as any).validateFarmerDeduction('farmer1', 'type1', 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than zero');
    });

    it('should reject amount greater than 1,000,000', () => {
      const result = (deductionService as any).validateFarmerDeduction('farmer1', 'type1', 1000001);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount cannot exceed 1,000,000');
    });
  });

  describe('validateImmediateDeduction', () => {
    it('should validate valid immediate deduction data', () => {
      const result = (deductionService as any).validateImmediateDeduction('type1', 100, 'Test reason');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing deduction type ID', () => {
      const result = (deductionService as any).validateImmediateDeduction('', 100, 'Test reason');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deduction type ID is required');
    });

    it('should reject amount less than or equal to zero', () => {
      const result = (deductionService as any).validateImmediateDeduction('type1', 0, 'Test reason');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than zero');
    });

    it('should reject amount greater than 1,000,000', () => {
      const result = (deductionService as any).validateImmediateDeduction('type1', 1000001, 'Test reason');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount cannot exceed 1,000,000');
    });

    it('should reject empty reason', () => {
      const result = (deductionService as any).validateImmediateDeduction('type1', 100, '');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Reason is required');
    });

    it('should reject reason longer than 500 characters', () => {
      const longReason = 'a'.repeat(501);
      const result = (deductionService as any).validateImmediateDeduction('type1', 100, longReason);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Reason must be less than 500 characters');
    });
  });

  describe('getDeductionTypes', () => {
    it('should return deduction types when successful', async () => {
      const mockData: DeductionType[] = [
        {
          id: '1',
          name: 'Test Type',
          description: 'Test Description',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await deductionService.getDeductionTypes();
      expect(result).toEqual(mockData);
    });

    it('should return empty array when error occurs', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: new Error('Database error') });

      const result = await deductionService.getDeductionTypes();
      expect(result).toEqual([]);
    });
  });

  describe('createDeductionType', () => {
    it('should create deduction type when valid data provided', async () => {
      const mockData: DeductionType = {
        id: '1',
        name: 'Test Type',
        description: 'Test Description',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockSupabase.insert.mockResolvedValueOnce({ data: [mockData], error: null });
      mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await deductionService.createDeductionType('Test Type', 'Test Description', 'user1');
      expect(result).toEqual(mockData);
    });

    it('should throw error when validation fails', async () => {
      await expect(deductionService.createDeductionType('', 'Test Description', 'user1'))
        .rejects
        .toThrow('Validation failed: Deduction type name is required');
    });
  });

  describe('updateDeductionType', () => {
    it('should update deduction type when valid data provided', async () => {
      const mockOldData: DeductionType = {
        id: '1',
        name: 'Old Type',
        description: 'Old Description',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const mockNewData: DeductionType = {
        id: '1',
        name: 'New Type',
        description: 'New Description',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      };

      mockSupabase.select.mockResolvedValueOnce({ data: mockOldData, error: null });
      mockSupabase.update.mockResolvedValueOnce({ data: [mockNewData], error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockNewData, error: null });

      const result = await deductionService.updateDeductionType('1', 'New Type', 'New Description', 'user1');
      expect(result).toEqual(mockNewData);
    });

    it('should throw error when validation fails', async () => {
      await expect(deductionService.updateDeductionType('1', '', 'New Description', 'user1'))
        .rejects
        .toThrow('Validation failed: Deduction type name is required');
    });

    it('should throw error when ID is missing', async () => {
      await expect(deductionService.updateDeductionType('', 'New Type', 'New Description', 'user1'))
        .rejects
        .toThrow('Deduction type ID is required');
    });
  });

  describe('deleteDeductionType', () => {
    it('should delete deduction type when no farmer deductions exist', async () => {
      // Mock check for farmer deductions (should return empty array)
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });
      
      // Mock get old data
      mockSupabase.select.mockResolvedValueOnce({ data: { id: '1', name: 'Test Type' }, error: null });
      
      // Mock delete operation
      mockSupabase.delete.mockResolvedValueOnce({ error: null });

      const result = await deductionService.deleteDeductionType('1', 'user1');
      expect(result).toBe(true);
    });

    it('should throw error when farmer deductions exist', async () => {
      // Mock check for farmer deductions (should return data)
      mockSupabase.select.mockResolvedValueOnce({ data: [{ id: 'fd1' }], error: null });
      mockSupabase.limit.mockResolvedValueOnce({ data: [{ id: 'fd1' }], error: null });

      await expect(deductionService.deleteDeductionType('1', 'user1'))
        .rejects
        .toThrow('Cannot delete deduction type that is in use by farmers');
    });

    it('should throw error when ID is missing', async () => {
      await expect(deductionService.deleteDeductionType('', 'user1'))
        .rejects
        .toThrow('Deduction type ID is required');
    });
  });

  describe('saveFarmerDeduction', () => {
    it('should save farmer deduction when valid data provided', async () => {
      // Mock farmer check
      mockSupabase.select.mockResolvedValueOnce({ data: { id: 'farmer1' }, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'farmer1' }, error: null });
      
      // Mock deduction type check
      mockSupabase.select.mockResolvedValueOnce({ data: { id: 'type1' }, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'type1' }, error: null });
      
      // Mock existing data check
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
      
      // Mock upsert operation
      mockSupabase.upsert.mockResolvedValueOnce({ error: null });

      const result = await deductionService.saveFarmerDeduction('farmer1', 'type1', 100, 'user1');
      expect(result).toBe(true);
    });

    it('should throw error when validation fails', async () => {
      await expect(deductionService.saveFarmerDeduction('', 'type1', 100, 'user1'))
        .rejects
        .toThrow('Validation failed: Farmer ID is required');
    });

    it('should throw error when farmer not found', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: new Error('Not found') });
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('Not found') });

      await expect(deductionService.saveFarmerDeduction('farmer1', 'type1', 100, 'user1'))
        .rejects
        .toThrow('Farmer not found');
    });

    it('should throw error when deduction type not found', async () => {
      // Mock farmer check
      mockSupabase.select.mockResolvedValueOnce({ data: { id: 'farmer1' }, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'farmer1' }, error: null });
      
      // Mock deduction type check
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: new Error('Not found') });
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('Not found') });

      await expect(deductionService.saveFarmerDeduction('farmer1', 'type1', 100, 'user1'))
        .rejects
        .toThrow('Deduction type not found');
    });
  });

  describe('applyImmediateDeduction', () => {
    it('should apply immediate deduction when valid data provided', async () => {
      // Mock deduction type check
      mockSupabase.select.mockResolvedValueOnce({ data: { id: 'type1' }, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'type1' }, error: null });
      
      // Mock insert operation
      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      const result = await deductionService.applyImmediateDeduction('type1', 100, 'Test reason', 'user1');
      expect(result).toBe(true);
    });

    it('should throw error when validation fails', async () => {
      await expect(deductionService.applyImmediateDeduction('', 100, 'Test reason', 'user1'))
        .rejects
        .toThrow('Validation failed: Deduction type ID is required');
    });

    it('should throw error when deduction type not found', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: new Error('Not found') });
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('Not found') });

      await expect(deductionService.applyImmediateDeduction('type1', 100, 'Test reason', 'user1'))
        .rejects
        .toThrow('Deduction type not found');
    });
  });

  describe('getActiveDeductionsForFarmer', () => {
    it('should return active deductions for farmer', async () => {
      const mockData: FarmerDeduction[] = [
        {
          id: 'fd1',
          farmer_id: 'farmer1',
          deduction_type_id: 'type1',
          amount: 100,
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await deductionService.getActiveDeductionsForFarmer('farmer1');
      expect(result).toEqual(mockData);
    });

    it('should throw error when farmer ID is missing', async () => {
      await expect(deductionService.getActiveDeductionsForFarmer(''))
        .rejects
        .toThrow('Farmer ID is required');
    });
  });

  describe('calculateTotalDeductionsForFarmer', () => {
    it('should calculate total deductions for farmer', async () => {
      const mockData: FarmerDeduction[] = [
        {
          id: 'fd1',
          farmer_id: 'farmer1',
          deduction_type_id: 'type1',
          amount: 100,
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'fd2',
          farmer_id: 'farmer1',
          deduction_type_id: 'type2',
          amount: 50,
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await deductionService.calculateTotalDeductionsForFarmer('farmer1');
      expect(result).toBe(150);
    });

    it('should throw error when farmer ID is missing', async () => {
      await expect(deductionService.calculateTotalDeductionsForFarmer(''))
        .rejects
        .toThrow('Farmer ID is required');
    });
  });
});