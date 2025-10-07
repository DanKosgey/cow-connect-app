import { milkRateService } from '@/services/milk-rate-service';

// Mock the Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  }
}));

describe('Milk Rate Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Milk Rate Update Flow', () => {
    it('should update milk rate and notify all subscribers', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock the deactivate call
      mockSupabase.update.mockResolvedValueOnce({
        error: null
      });
      
      // Mock the insert call
      mockSupabase.insert.mockResolvedValueOnce({
        error: null
      });
      
      // Mock the select call for getting the new rate
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ rate_per_liter: 35.0 }],
        error: null
      });

      // Set up subscribers
      const adminCallback = jest.fn();
      const staffCallback = jest.fn();
      const farmerCallback = jest.fn();
      
      const unsubscribeAdmin = milkRateService.subscribe(adminCallback);
      const unsubscribeStaff = milkRateService.subscribe(staffCallback);
      const unsubscribeFarmer = milkRateService.subscribe(farmerCallback);

      // Update the milk rate
      const result = await milkRateService.updateRate(35.0, '2025-10-08');
      
      expect(result).toBe(true);
      
      // Verify the database calls
      expect(mockSupabase.from).toHaveBeenCalledWith('milk_rates');
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        rate_per_liter: 35.0,
        effective_from: '2025-10-08',
        is_active: true
      });

      // Verify subscribers were notified
      expect(adminCallback).toHaveBeenCalledWith(35.0);
      expect(staffCallback).toHaveBeenCalledWith(35.0);
      expect(farmerCallback).toHaveBeenCalledWith(35.0);

      // Clean up
      unsubscribeAdmin();
      unsubscribeStaff();
      unsubscribeFarmer();
    });

    it('should handle rate update failure gracefully', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock the deactivate call to fail
      mockSupabase.update.mockResolvedValueOnce({
        error: new Error('Database connection failed')
      });

      // Set up subscriber
      const callback = jest.fn();
      const unsubscribe = milkRateService.subscribe(callback);

      // Try to update the milk rate
      const result = await milkRateService.updateRate(35.0, '2025-10-08');
      
      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();

      // Clean up
      unsubscribe();
    });
  });

  describe('Cross-Portal Rate Consistency', () => {
    it('should provide consistent rate across all portals after update', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock successful update
      mockSupabase.update.mockResolvedValueOnce({ error: null });
      mockSupabase.insert.mockResolvedValueOnce({ error: null });
      
      // Mock rate retrieval
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ rate_per_liter: 40.0 }],
        error: null
      });

      // Update rate
      await milkRateService.updateRate(40.0, '2025-10-09');
      
      // Get rate from different "portals"
      const adminRate = await milkRateService.getCurrentRate();
      const staffRate = await milkRateService.getCurrentRate();
      const farmerRate = await milkRateService.getCurrentRate();
      
      expect(adminRate).toBe(40.0);
      expect(staffRate).toBe(40.0);
      expect(farmerRate).toBe(40.0);
    });
  });
});