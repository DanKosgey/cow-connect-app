import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock the Supabase client using a factory function
vi.mock('../integrations/supabase/client', () => {
  // Create a proper chainable mock
  const createChainableMock = () => {
    const mock = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
      rpc: vi.fn(),
      neq: vi.fn(),
      in: vi.fn(),
      single: vi.fn(),
    };
    
    // Make all methods return the mock object for chaining
    const returnMock = () => mock;
    mock.from.mockImplementation(returnMock);
    mock.select.mockImplementation(returnMock);
    mock.eq.mockImplementation(returnMock);
    mock.gte.mockImplementation(returnMock);
    mock.lte.mockImplementation(returnMock);
    mock.order.mockImplementation(returnMock);
    mock.limit.mockImplementation(returnMock);
    mock.update.mockImplementation(returnMock);
    mock.insert.mockImplementation(returnMock);
    mock.rpc.mockImplementation(returnMock);
    mock.neq.mockImplementation(returnMock);
    mock.in.mockImplementation(returnMock);
    mock.single.mockImplementation(returnMock);
    
    return mock;
  };
  
  return {
    supabase: createChainableMock()
  };
});

// Mock the collector rate service
vi.mock('../services/collector-rate-service', () => {
  return {
    collectorRateService: {
      getCurrentRate: vi.fn().mockResolvedValue(25.0)
    }
  };
});

// Mock the collector penalty service
vi.mock('../services/collector-penalty-service', () => {
  return {
    collectorPenaltyService: {
      getCollectorPaymentsWithPenalties: vi.fn().mockResolvedValue([])
    }
  };
});

// Mock the logger
vi.mock('../utils/logger', () => {
  return {
    logger: {
      withContext: vi.fn().mockReturnThis(),
      info: vi.fn(),
      errorWithContext: vi.fn(),
      warn: vi.fn()
    }
  };
});

// Import the service and error classes after mocking
import { collectorEarningsService } from '../services/collector-earnings-service';
import { ValidationError, DatabaseError } from '../errors/CollectorEarningsError';

describe('CollectorEarningsService', () => {
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
    mockSupabase.gte.mockImplementation(() => mockSupabase);
    mockSupabase.lte.mockImplementation(() => mockSupabase);
    mockSupabase.order.mockImplementation(() => mockSupabase);
    mockSupabase.limit.mockImplementation(() => mockSupabase);
    mockSupabase.update.mockImplementation(() => mockSupabase);
    mockSupabase.insert.mockImplementation(() => mockSupabase);
    mockSupabase.rpc.mockImplementation(() => mockSupabase);
    mockSupabase.neq.mockImplementation(() => mockSupabase);
    mockSupabase.in.mockImplementation(() => mockSupabase);
    mockSupabase.single.mockImplementation(() => mockSupabase);
  });

  describe('calculateEarnings', () => {
    it('should calculate earnings correctly for a collector with collections', async () => {
      const mockCollections = [
        { id: '1', liters: 10 },
        { id: '2', liters: 20 },
        { id: '3', liters: 30 }
      ];
      
      mockSupabase.select.mockResolvedValueOnce({
        data: mockCollections,
        error: null
      });

      const result = await collectorEarningsService.calculateEarnings('collector-1', '2023-01-01', '2023-01-31');
      
      expect(result.totalCollections).toBe(3);
      expect(result.totalLiters).toBe(60);
      expect(result.ratePerLiter).toBe(25.0);
      expect(result.totalEarnings).toBe(1500); // 60 * 25
      expect(result.periodStart).toBe('2023-01-01');
      expect(result.periodEnd).toBe('2023-01-31');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('collections');
      expect(mockSupabase.select).toHaveBeenCalledWith('id, liters');
    });

    it('should return zero earnings when no collections are found', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await collectorEarningsService.calculateEarnings('collector-1', '2023-01-01', '2023-01-31');
      
      expect(result.totalCollections).toBe(0);
      expect(result.totalLiters).toBe(0);
      expect(result.ratePerLiter).toBe(25.0);
      expect(result.totalEarnings).toBe(0);
    });

    it('should throw ValidationError when collector ID is missing', async () => {
      await expect(collectorEarningsService.calculateEarnings('', '2023-01-01', '2023-01-31'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when dates are missing', async () => {
      await expect(collectorEarningsService.calculateEarnings('collector-1', '', '2023-01-31'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when start date is after end date', async () => {
      await expect(collectorEarningsService.calculateEarnings('collector-1', '2023-01-31', '2023-01-01'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw DatabaseError when database query fails', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      await expect(collectorEarningsService.calculateEarnings('collector-1', '2023-01-01', '2023-01-31'))
        .rejects.toThrow(DatabaseError);
    });
  });

  describe('getEarningsSummary', () => {
    it('should get earnings summary for current month', async () => {
      const mockCollections = [
        { id: '1', liters: 15 },
        { id: '2', liters: 25 }
      ];
      
      mockSupabase.select.mockResolvedValueOnce({
        data: mockCollections,
        error: null
      });

      const result = await collectorEarningsService.getEarningsSummary('collector-1');
      
      expect(result.totalCollections).toBe(2);
      expect(result.totalLiters).toBe(40);
      expect(result.ratePerLiter).toBe(25.0);
      expect(result.totalEarnings).toBe(1000); // 40 * 25
      
      expect(mockSupabase.from).toHaveBeenCalledWith('collections');
      expect(mockSupabase.select).toHaveBeenCalledWith('id, liters');
    });

    it('should throw ValidationError when collector ID is missing', async () => {
      await expect(collectorEarningsService.getEarningsSummary(''))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getAllTimeEarnings', () => {
    it('should get all-time earnings for a collector with collections', async () => {
      const mockCollections = [
        { id: '1', liters: 100, collection_date: '2023-01-15' },
        { id: '2', liters: 200, collection_date: '2023-02-20' }
      ];
      
      mockSupabase.select.mockResolvedValueOnce({
        data: mockCollections,
        error: null
      });

      const result = await collectorEarningsService.getAllTimeEarnings('collector-1');
      
      expect(result.totalCollections).toBe(2);
      expect(result.totalLiters).toBe(300);
      expect(result.ratePerLiter).toBe(25.0);
      expect(result.totalEarnings).toBe(7500); // 300 * 25
      expect(result.periodStart).toBe('2023-01-15');
      expect(result.periodEnd).toBe('2023-02-20');
    });

    it('should return zero earnings when no collections are found', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await collectorEarningsService.getAllTimeEarnings('collector-1');
      
      expect(result.totalCollections).toBe(0);
      expect(result.totalLiters).toBe(0);
      expect(result.ratePerLiter).toBe(0);
      expect(result.totalEarnings).toBe(0);
      expect(result.periodStart).toBe('');
      expect(result.periodEnd).toBe('');
    });

    it('should throw ValidationError when collector ID is missing', async () => {
      await expect(collectorEarningsService.getAllTimeEarnings(''))
        .rejects.toThrow(ValidationError);
    });

    it('should throw DatabaseError when database query fails', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      await expect(collectorEarningsService.getAllTimeEarnings('collector-1'))
        .rejects.toThrow(DatabaseError);
    });
  });

  describe('recordPayment', () => {
    it('should record a payment successfully', async () => {
      const paymentData = {
        collector_id: 'collector-1',
        period_start: '2023-01-01',
        period_end: '2023-01-31',
        total_collections: 5,
        total_liters: 100,
        rate_per_liter: 25.0,
        total_earnings: 2500,
        status: 'pending' as const
      };
      
      const mockPayment = {
        id: 'payment-1',
        ...paymentData,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      mockSupabase.insert.mockResolvedValueOnce({
        data: mockPayment,
        error: null
      });

      const result = await collectorEarningsService.recordPayment(paymentData);
      
      expect(result).toEqual(mockPayment);
      expect(mockSupabase.from).toHaveBeenCalledWith('collector_payments');
      expect(mockSupabase.insert).toHaveBeenCalledWith([paymentData]);
    });

    it('should return null when payment recording fails', async () => {
      const paymentData = {
        collector_id: 'collector-1',
        period_start: '2023-01-01',
        period_end: '2023-01-31',
        total_collections: 5,
        total_liters: 100,
        rate_per_liter: 25.0,
        total_earnings: 2500,
        status: 'pending' as const
      };
      
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: new Error('Insert failed')
      });

      const result = await collectorEarningsService.recordPayment(paymentData);
      
      expect(result).toBeNull();
    });

    it('should throw ValidationError when collector ID is missing', async () => {
      const paymentData = {
        collector_id: '',
        period_start: '2023-01-01',
        period_end: '2023-01-31',
        total_collections: 5,
        total_liters: 100,
        rate_per_liter: 25.0,
        total_earnings: 2500,
        status: 'pending' as const
      };
      
      await expect(collectorEarningsService.recordPayment(paymentData))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when negative values are provided', async () => {
      const paymentData = {
        collector_id: 'collector-1',
        period_start: '2023-01-01',
        period_end: '2023-01-31',
        total_collections: -5, // Negative value
        total_liters: 100,
        rate_per_liter: 25.0,
        total_earnings: 2500,
        status: 'pending' as const
      };
      
      await expect(collectorEarningsService.recordPayment(paymentData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getPaymentHistory', () => {
    it('should get payment history for a collector', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          collector_id: 'collector-1',
          period_start: '2023-01-01',
          period_end: '2023-01-31',
          total_collections: 5,
          total_liters: 100,
          rate_per_liter: 25.0,
          total_earnings: 2500,
          status: 'paid',
          payment_date: '2023-02-01T00:00:00Z',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-02-01T00:00:00Z'
        },
        {
          id: 'payment-2',
          collector_id: 'collector-1',
          period_start: '2023-02-01',
          period_end: '2023-02-28',
          total_collections: 3,
          total_liters: 75,
          rate_per_liter: 25.0,
          total_earnings: 1875,
          status: 'pending',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-02-01T00:00:00Z'
        }
      ];
      
      mockSupabase.select.mockResolvedValueOnce({
        data: mockPayments,
        error: null
      });

      const result = await collectorEarningsService.getPaymentHistory('collector-1');
      
      expect(result).toEqual(mockPayments);
      expect(result.length).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('collector_payments');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
    });

    it('should return empty array when no payments are found', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await collectorEarningsService.getPaymentHistory('collector-1');
      
      expect(result).toEqual([]);
    });

    it('should throw ValidationError when collector ID is missing', async () => {
      await expect(collectorEarningsService.getPaymentHistory(''))
        .rejects.toThrow(ValidationError);
    });

    it('should throw DatabaseError when database query fails', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      await expect(collectorEarningsService.getPaymentHistory('collector-1'))
        .rejects.toThrow(DatabaseError);
    });
  });

  describe('markPaymentAsPaid', () => {
    it('should mark a payment as paid successfully', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        error: null
      });

      const result = await collectorEarningsService.markPaymentAsPaid('payment-1');
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('collector_payments');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'paid',
        payment_date: expect.any(String)
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'payment-1');
    });

    it('should return false when marking payment as paid fails', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        error: new Error('Update failed')
      });

      const result = await collectorEarningsService.markPaymentAsPaid('payment-1');
      
      expect(result).toBe(false);
    });

    it('should throw ValidationError when payment ID is missing', async () => {
      await expect(collectorEarningsService.markPaymentAsPaid(''))
        .rejects.toThrow(ValidationError);
    });

    it('should throw DatabaseError when database update fails', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        error: new Error('Database error')
      });

      await expect(collectorEarningsService.markPaymentAsPaid('payment-1'))
        .rejects.toThrow(DatabaseError);
    });
  });

  describe('getCollectorsWithEarnings', () => {
    it('should get collectors with earnings data', async () => {
      // Mock user roles data
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
        error: null
      });
      
      // Mock staff data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { id: 'collector-1', user_id: 'user-1', profiles: { full_name: 'Collector One' } },
          { id: 'collector-2', user_id: 'user-2', profiles: { full_name: 'Collector Two' } }
        ],
        error: null
      });
      
      // Mock RPC performance data
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            collector_id: 'collector-1',
            total_collections: 10,
            total_liters_collected: 200,
            total_variance: 10,
            total_penalty_amount: 50,
            positive_variances: 2,
            negative_variances: 1,
            average_variance_percentage: 2.5,
            performance_score: 95,
            last_collection_date: '2023-01-15'
          }
        ],
        error: null
      });
      
      // Mock collections for getAllTimeEarnings
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: '1', liters: 100, collection_date: '2023-01-15' }],
        error: null
      });
      
      // Mock collections for getAllTimeEarnings (second collector)
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: '2', liters: 100, collection_date: '2023-01-20' }],
        error: null
      });

      const result = await collectorEarningsService.getCollectorsWithEarnings();
      
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Collector One');
      expect(result[1].name).toBe('Collector Two');
    });

    it('should handle case when no collectors are found', async () => {
      // Mock user roles data - empty
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await collectorEarningsService.getCollectorsWithEarnings();
      
      expect(result).toEqual([]);
    });

    it('should throw DatabaseError when fetching user roles fails', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      await expect(collectorEarningsService.getCollectorsWithEarnings())
        .rejects.toThrow(DatabaseError);
    });
  });

  describe('triggerAutoPaymentGeneration', () => {
    it('should trigger auto payment generation successfully', async () => {
      // Mock collections data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { id: '1', collection_date: '2023-01-15', liters: 100, staff_id: 'collector-1' }
        ],
        error: null
      });
      
      // Mock existing payments check
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });
      
      // Mock insert
      mockSupabase.insert.mockResolvedValueOnce({
        error: null
      });

      const result = await collectorEarningsService.triggerAutoPaymentGeneration('collector-1');
      
      expect(result).toBe(true);
    });

    it('should throw ValidationError when collector ID is missing', async () => {
      await expect(collectorEarningsService.triggerAutoPaymentGeneration(''))
        .rejects.toThrow(ValidationError);
    });

    it('should throw DatabaseError when fetching collections fails', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      await expect(collectorEarningsService.triggerAutoPaymentGeneration('collector-1'))
        .rejects.toThrow(DatabaseError);
    });
  });
});