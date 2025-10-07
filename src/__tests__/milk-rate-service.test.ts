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
    
    return mock;
  };
  
  return {
    supabase: createChainableMock()
  };
});

// Import the service after mocking
import { milkRateService } from '../services/milk-rate-service';

describe('MilkRateService', () => {
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
  });

  describe('getCurrentRate', () => {
    it('should return the current active milk rate', async () => {
      const mockData = [{ rate_per_liter: 25.5 }];
      
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null
      });

      const rate = await milkRateService.getCurrentRate();
      
      expect(rate).toBe(25.5);
      expect(mockSupabase.from).toHaveBeenCalledWith('milk_rates');
      expect(mockSupabase.select).toHaveBeenCalledWith('rate_per_liter');
    });

    it('should return 0 when no active rate is found', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const rate = await milkRateService.getCurrentRate();
      
      expect(rate).toBe(0);
    });

    it('should return 0 when there is an error', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error')
      });

      const rate = await milkRateService.getCurrentRate();
      
      expect(rate).toBe(0);
    });
  });

  describe('updateRate', () => {
    it('should successfully update the milk rate', async () => {
      // Mock the deactivate call
      mockSupabase.update.mockResolvedValueOnce({
        error: null
      });
      
      // Mock the insert call
      mockSupabase.insert.mockResolvedValueOnce({
        error: null
      });

      const result = await milkRateService.updateRate(30.0, '2025-10-08');
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('milk_rates');
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        rate_per_liter: 30.0,
        effective_from: '2025-10-08',
        is_active: true
      });
    });

    it('should return false when deactivating old rates fails', async () => {
      // Mock the deactivate call to fail
      mockSupabase.update.mockResolvedValueOnce({
        error: new Error('Failed to deactivate')
      });

      const result = await milkRateService.updateRate(30.0, '2025-10-08');
      
      expect(result).toBe(false);
    });

    it('should return false when inserting new rate fails', async () => {
      // Mock the deactivate call to succeed
      mockSupabase.update.mockResolvedValueOnce({
        error: null
      });
      
      // Mock the insert call to fail
      mockSupabase.insert.mockResolvedValueOnce({
        error: new Error('Failed to insert')
      });

      const result = await milkRateService.updateRate(30.0, '2025-10-08');
      
      expect(result).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners when rate changes', async () => {
      const callback = vi.fn();
      const unsubscribe = milkRateService.subscribe(callback);
      
      // Simulate a rate update
      const mockData = [{ rate_per_liter: 35.0 }];
      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null
      });
      
      await milkRateService.getCurrentRate();
      expect(callback).toHaveBeenCalledWith(35.0);
      unsubscribe();
    });
  });
});