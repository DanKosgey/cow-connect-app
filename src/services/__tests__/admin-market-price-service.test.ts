import { adminMarketPriceService, MarketPriceInput } from '../admin-market-price-service';
import { marketPriceService } from '../market-price-service';

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

// Mock the marketPriceService
jest.mock('../market-price-service', () => ({
  marketPriceService: {
    validateMarketPrice: jest.fn(),
    upsertPrice: jest.fn(),
    deletePrice: jest.fn()
  }
}));

describe('AdminMarketPriceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addPrice', () => {
    it('should successfully add a new market price', async () => {
      const newPrice: MarketPriceInput = {
        product: 'Fresh Milk',
        region: 'Nairobi',
        price: 50.0,
        previous_price: 48.0,
        change: 2.0,
        change_percent: 4.17
      };

      // Mock validation to return valid
      (marketPriceService.validateMarketPrice as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      // Mock upsert to return success
      (marketPriceService.upsertPrice as jest.Mock).mockResolvedValue({
        success: true,
        data: true
      });

      // Mock supabase select to return the created record
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({
        data: {
          id: '1',
          product: 'Fresh Milk',
          region: 'Nairobi',
          price: 50.0,
          previous_price: 48.0,
          change: 2.0,
          change_percent: 4.17,
          updated_at: '2023-06-15T10:00:00Z',
          created_at: '2023-06-15T10:00:00Z'
        },
        error: null
      });

      const result = await adminMarketPriceService.addPrice(newPrice);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.product).toBe('Fresh Milk');
    });

    it('should return validation errors when data is invalid', async () => {
      const invalidPrice: MarketPriceInput = {
        product: '', // Invalid - empty
        region: 'Nairobi',
        price: 50.0,
        previous_price: 48.0,
        change: 2.0,
        change_percent: 4.17
      };

      // Mock validation to return invalid
      (marketPriceService.validateMarketPrice as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Product name is required']
      });

      const result = await adminMarketPriceService.addPrice(invalidPrice);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product name is required');
    });
  });

  describe('updatePrice', () => {
    it('should successfully update an existing market price', async () => {
      const priceId = '123';
      const updateData: Partial<MarketPriceInput> = {
        price: 52.0,
        previous_price: 50.0
      };

      // Mock validation to return valid
      (marketPriceService.validateMarketPrice as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      // Mock upsert to return success
      (marketPriceService.upsertPrice as jest.Mock).mockResolvedValue({
        success: true,
        data: true
      });

      // Mock supabase select to return the updated record
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({
        data: {
          id: '123',
          product: 'Fresh Milk',
          region: 'Nairobi',
          price: 52.0,
          previous_price: 50.0,
          change: 2.0,
          change_percent: 4.0,
          updated_at: '2023-06-15T11:00:00Z',
          created_at: '2023-06-15T10:00:00Z'
        },
        error: null
      });

      const result = await adminMarketPriceService.updatePrice(priceId, updateData);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.price).toBe(52.0);
    });

    it('should return error when price ID is missing', async () => {
      const result = await adminMarketPriceService.updatePrice('', {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Price ID is required');
    });
  });

  describe('deletePrice', () => {
    it('should successfully delete a market price', async () => {
      const priceId = '123';

      // Mock deletePrice to return success
      (marketPriceService.deletePrice as jest.Mock).mockResolvedValue({
        success: true,
        data: true
      });

      const result = await adminMarketPriceService.deletePrice(priceId);
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return error when price ID is missing', async () => {
      const result = await adminMarketPriceService.deletePrice('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Price ID is required');
    });
  });

  describe('bulkUpdatePrices', () => {
    it('should successfully bulk update prices', async () => {
      const prices: MarketPriceInput[] = [
        {
          product: 'Fresh Milk',
          region: 'Nairobi',
          price: 50.0,
          previous_price: 48.0,
          change: 2.0,
          change_percent: 4.17
        },
        {
          product: 'Pasteurized Milk',
          region: 'Kisumu',
          price: 55.0,
          previous_price: 53.0,
          change: 2.0,
          change_percent: 3.77
        }
      ];

      // Mock supabase select to return no existing data (new records)
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      supabaseMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      // Mock addPrice to return success
      const addPriceSpy = jest.spyOn(adminMarketPriceService, 'addPrice');
      addPriceSpy.mockResolvedValue({
        success: true,
        data: {
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
      });

      const result = await adminMarketPriceService.bulkUpdatePrices(prices);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('importFromCSV', () => {
    it('should successfully import prices from CSV', async () => {
      const csvData = `product,region,price,previous_price
Fresh Milk,Nairobi,50.0,48.0
Pasteurized Milk,Kisumu,55.0,53.0`;

      // Mock supabase select to return no existing data (new records)
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.maybeSingle.mockResolvedValue({ data: null, error: null });

      // Mock addPrice to return success
      const addPriceSpy = jest.spyOn(adminMarketPriceService, 'addPrice');
      addPriceSpy.mockResolvedValue({
        success: true,
        data: {
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
      });

      const result = await adminMarketPriceService.importFromCSV(csvData);
      expect(result.success).toBe(true);
      expect(result.processed).toBeGreaterThan(0);
    });

    it('should return error when required headers are missing', async () => {
      const csvData = `product,region
Fresh Milk,Nairobi`;

      const result = await adminMarketPriceService.importFromCSV(csvData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required headers');
    });
  });
});