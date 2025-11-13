import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock the Supabase client using a factory function
vi.mock('../integrations/supabase/client', () => {
  // Create a proper chainable mock
  const createChainableMock = () => {
    const mock = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
      maybeSingle: vi.fn(),
    };
    
    // Make all methods return the mock object for chaining
    const returnMock = () => mock;
    mock.from.mockImplementation(returnMock);
    mock.select.mockImplementation(returnMock);
    mock.eq.mockImplementation(returnMock);
    mock.order.mockImplementation(returnMock);
    mock.limit.mockImplementation(returnMock);
    mock.update.mockImplementation(returnMock);
    mock.insert.mockImplementation(returnMock);
    mock.maybeSingle.mockImplementation(returnMock);
    
    return mock;
  };
  
  return {
    supabase: createChainableMock()
  };
});

// Import the service after mocking
import { MilkApprovalService } from '../services/milk-approval-service';

describe('MilkApprovalService', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mock instance
    const module = await import('../integrations/supabase/client');
    mockSupabase = module.supabase;
    
    // Reset all mock implementations
    mockSupabase.from.mockImplementation(() => mockSupabase);
    mockSupabase.select.mockImplementation(() => mockSupabase);
    mockSupabase.eq.mockImplementation(() => mockSupabase);
    mockSupabase.order.mockImplementation(() => mockSupabase);
    mockSupabase.limit.mockImplementation(() => mockSupabase);
    mockSupabase.update.mockImplementation(() => mockSupabase);
    mockSupabase.insert.mockImplementation(() => mockSupabase);
    mockSupabase.maybeSingle.mockImplementation(() => mockSupabase);
  });

  describe('calculateVariance', () => {
    it('should calculate positive variance correctly', () => {
      const result = MilkApprovalService.calculateVariance(100, 105);
      
      expect(result.collectedLiters).toBe(100);
      expect(result.receivedLiters).toBe(105);
      expect(result.varianceLiters).toBe(5);
      expect(result.variancePercentage).toBe(5);
      expect(result.varianceType).toBe('positive');
    });

    it('should calculate negative variance correctly', () => {
      const result = MilkApprovalService.calculateVariance(100, 95);
      
      expect(result.collectedLiters).toBe(100);
      expect(result.receivedLiters).toBe(95);
      expect(result.varianceLiters).toBe(-5);
      expect(result.variancePercentage).toBe(-5);
      expect(result.varianceType).toBe('negative');
    });

    it('should calculate zero variance correctly', () => {
      const result = MilkApprovalService.calculateVariance(100, 100);
      
      expect(result.collectedLiters).toBe(100);
      expect(result.receivedLiters).toBe(100);
      expect(result.varianceLiters).toBe(0);
      expect(result.variancePercentage).toBe(0);
      expect(result.varianceType).toBe('none');
    });

    it('should handle zero collected liters', () => {
      const result = MilkApprovalService.calculateVariance(0, 5);
      
      expect(result.collectedLiters).toBe(0);
      expect(result.receivedLiters).toBe(5);
      expect(result.varianceLiters).toBe(5);
      expect(result.variancePercentage).toBe(0); // Should be 0 to avoid division by zero
      expect(result.varianceType).toBe('positive');
    });
  });

  describe('calculatePenalty', () => {
    it('should calculate penalty based on variance and configuration', async () => {
      const mockConfig = [{ penalty_rate_per_liter: 2.0 }];
      
      mockSupabase.select.mockResolvedValueOnce({
        data: mockConfig,
        error: null
      });

      const varianceData = {
        collectedLiters: 100,
        receivedLiters: 105,
        varianceLiters: 5,
        variancePercentage: 5,
        varianceType: 'positive' as const
      };

      const penalty = await MilkApprovalService.calculatePenalty(varianceData);
      
      expect(penalty).toBe(10); // 5 liters * 2.0 rate
      expect(mockSupabase.from).toHaveBeenCalledWith('variance_penalty_config');
    });

    it('should return 0 when no penalty configuration is found', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const varianceData = {
        collectedLiters: 100,
        receivedLiters: 105,
        varianceLiters: 5,
        variancePercentage: 5,
        varianceType: 'positive' as const
      };

      const penalty = await MilkApprovalService.calculatePenalty(varianceData);
      
      expect(penalty).toBe(0);
    });

    it('should return 0 when there is an error fetching penalty config', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      const varianceData = {
        collectedLiters: 100,
        receivedLiters: 105,
        varianceLiters: 5,
        variancePercentage: 5,
        varianceType: 'positive' as const
      };

      const penalty = await MilkApprovalService.calculatePenalty(varianceData);
      
      expect(penalty).toBe(0);
    });
  });

  describe('approveMilkCollection', () => {
    it('should successfully approve a milk collection', async () => {
      const mockCollection = {
        id: 'collection-1',
        liters: 100,
        farmer_id: 'farmer-1',
        staff_id: 'staff-1'
      };
      
      const mockApproval = {
        id: 'approval-1',
        collection_id: 'collection-1',
        staff_id: 'staff-1',
        company_received_liters: 105,
        variance_liters: 5,
        variance_percentage: 5,
        variance_type: 'positive',
        penalty_amount: 10,
        approval_notes: 'Test approval'
      };

      // Mock collection fetch
      mockSupabase.select.mockResolvedValueOnce({
        data: mockCollection,
        error: null
      });
      
      // Mock penalty config fetch
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ penalty_rate_per_liter: 2.0 }],
        error: null
      });
      
      // Mock approval insert
      mockSupabase.insert.mockResolvedValueOnce({
        data: [mockApproval],
        error: null
      });
      
      // Mock collection update
      mockSupabase.update.mockResolvedValueOnce({
        error: null
      });
      
      // Mock performance update (no error)
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: null
      });
      
      // Mock notification insert (no error)
      mockSupabase.insert.mockResolvedValueOnce({
        error: null
      });
      
      // Mock audit log insert (no error)
      mockSupabase.insert.mockResolvedValueOnce({
        error: null
      });

      const approvalData = {
        collectionId: 'collection-1',
        staffId: 'staff-1',
        companyReceivedLiters: 105,
        approvalNotes: 'Test approval'
      };

      const result = await MilkApprovalService.approveMilkCollection(approvalData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApproval);
    });

    it('should return error when collection is not found', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const approvalData = {
        collectionId: 'collection-1',
        staffId: 'staff-1',
        companyReceivedLiters: 105,
        approvalNotes: 'Test approval'
      };

      const result = await MilkApprovalService.approveMilkCollection(approvalData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when there is a database error fetching collection', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      const approvalData = {
        collectionId: 'collection-1',
        staffId: 'staff-1',
        companyReceivedLiters: 105,
        approvalNotes: 'Test approval'
      };

      const result = await MilkApprovalService.approveMilkCollection(approvalData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getPendingCollections', () => {
    it('should return pending collections', async () => {
      const mockCollections = [
        {
          id: 'collection-1',
          collection_id: 'COL-001',
          liters: 100,
          collection_date: '2025-10-08T10:00:00Z',
          status: 'Collected',
          approved_for_company: false,
          farmers: {
            full_name: 'John Doe',
            id: 'farmer-1'
          },
          staff: {
            id: 'staff-1',
            user_id: 'user-1'
          }
        }
      ];
      
      mockSupabase.select.mockResolvedValueOnce({
        data: mockCollections,
        error: null
      });

      const result = await MilkApprovalService.getPendingCollections();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCollections);
    });

    it('should return error when there is a database error', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      const result = await MilkApprovalService.getPendingCollections();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getCollectionApprovalHistory', () => {
    it('should return approval history for a collection', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          company_received_liters: 105,
          variance_liters: 5,
          variance_percentage: 5,
          variance_type: 'positive',
          penalty_amount: 10,
          approval_notes: 'Test approval',
          approved_at: '2025-10-08T10:00:00Z',
          created_at: '2025-10-08T10:00:00Z',
          staff: {
            id: 'staff-1',
            user_id: 'user-1',
            profiles: {
              full_name: 'Staff Member'
            }
          }
        }
      ];
      
      mockSupabase.select.mockResolvedValueOnce({
        data: mockApprovals,
        error: null
      });

      const result = await MilkApprovalService.getCollectionApprovalHistory('collection-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApprovals);
    });

    it('should return error when there is a database error', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      const result = await MilkApprovalService.getCollectionApprovalHistory('collection-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});