import { marketPriceService, MarketPrice } from '../market-price-service';

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
    single: jest.fn().mockReturnThis()
  }
}));

// Mock the logger
jest.mock('@/utils/logger', () => ({
  logger: {
    errorWithContext: jest.fn()
  }
}));

describe('MarketPriceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateMarketPrice', () => {
    it('should validate valid market price data', () => {
      const validData = {
        product: 'Fresh Milk',
        region: 'Nairobi',
        price: 50.0
      };

      const result = marketPriceService.validateMarketPrice(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing product name', () => {
      const invalidData = {
        region: 'Nairobi',
        price: 50.0
      };

      const result = marketPriceService.validateMarketPrice(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product name is required');
    });

    it('should reject missing region', () => {
      const invalidData = {
        product: 'Fresh Milk',
        price: 50.0
      };

      const result = marketPriceService.validateMarketPrice(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Region is required');
    });

    it('should reject negative price', () => {
      const invalidData = {
        product: 'Fresh Milk',
        region: 'Nairobi',
        price: -50.0
      };

      const result = marketPriceService.validateMarketPrice(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price must be a positive number');
    });

    it('should reject product name that is too long', () => {
      const invalidData = {
        product: 'A'.repeat(150),
        region: 'Nairobi',
        price: 50.0
      };

      const result = marketPriceService.validateMarketPrice(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product name must be less than 100 characters');
    });
  });

  describe('getAllPrices', () => {
    it('should return market prices when fetch is successful', async () => {
      const mockPrices: MarketPrice[] = [
        {
          id: '1',
          product: 'Fresh Milk',
          region: 'Nairobi',
          price: 50.0,
          previous_price: 48.0,
          change: 2.0,
          change_percent: 4.17,
          updated_at: '2023-06-15T10:00:00Z',
          created_at: '2023-06-15T10:00:00Z'
        }
      ];

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({ data: mockPrices, error: null });

      const result = await marketPriceService.getAllPrices();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPrices);
    });

    it('should return error when fetch fails', async () => {
      const errorMessage = 'Database error';
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({ data: null, error: { message: errorMessage } });

      const result = await marketPriceService.getAllPrices();
      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('getPricesByProduct', () => {
    it('should return market prices for a product when fetch is successful', async () => {
      const productName = 'Fresh Milk';
      const mockPrices: MarketPrice[] = [
        {
          id: '1',
          product: productName,
          region: 'Nairobi',
          price: 50.0,
          previous_price: 48.0,
          change: 2.0,
          change_percent: 4.17,
          updated_at: '2023-06-15T10:00:00Z',
          created_at: '2023-06-15T10:00:00Z'
        }
      ];

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({ data: mockPrices, error: null });

      const result = await marketPriceService.getPricesByProduct(productName);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPrices);
    });

    it('should return error when product name is empty', async () => {
      const result = await marketPriceService.getPricesByProduct('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product name is required');
    });
  });

  describe('getPricesByRegion', () => {
    it('should return market prices for a region when fetch is successful', async () => {
      const regionName = 'Nairobi';
      const mockPrices: MarketPrice[] = [
        {
          id: '1',
          product: 'Fresh Milk',
          region: regionName,
          price: 50.0,
          previous_price: 48.0,
          change: 2.0,
          change_percent: 4.17,
          updated_at: '2023-06-15T10:00:00Z',
          created_at: '2023-06-15T10:00:00Z'
        }
      ];

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({ data: mockPrices, error: null });

      const result = await marketPriceService.getPricesByRegion(regionName);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPrices);
    });

    it('should return error when region name is empty', async () => {
      const result = await marketPriceService.getPricesByRegion('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Region is required');
    });
  });

  describe('upsertPrice', () => {
    it('should successfully insert a new market price', async () => {
      const newPrice = {
        product: 'Fresh Milk',
        region: 'Nairobi',
        price: 50.0,
        previous_price: 48.0,
        change: 2.0,
        change_percent: 4.17
      };

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.insert.mockResolvedValueOnce({ error: null });

      const result = await marketPriceService.upsertPrice(newPrice);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return validation errors for invalid data', async () => {
      const invalidPrice = {
        product: '',
        region: 'Nairobi',
        price: -50.0,
        previous_price: 0,
        change: 0,
        change_percent: 0
      };

      const result = await marketPriceService.upsertPrice(invalidPrice);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product name is required');
      expect(result.error).toContain('Price must be a positive number');
    });
  });

  describe('deletePrice', () => {
    it('should successfully delete a market price', async () => {
      const priceId = '123';

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.delete.mockResolvedValueOnce({ error: null });

      const result = await marketPriceService.deletePrice(priceId);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return error when price ID is missing', async () => {
      const result = await marketPriceService.deletePrice('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Price ID is required');
    });
  });
});