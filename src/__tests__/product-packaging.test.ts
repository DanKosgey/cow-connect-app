import { AgrovetInventoryService, ProductPackaging } from '../services/agrovet-inventory-service';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
  }
}));

describe('Product Packaging System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductPackaging', () => {
    it('should fetch packaging options for a product', async () => {
      const mockPackaging: ProductPackaging[] = [
        {
          id: '1',
          product_id: 'product-1',
          name: '20kg Bag',
          weight: 20,
          unit: 'kg',
          price: 2200,
          is_credit_eligible: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      ];

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.select.mockResolvedValueOnce({ data: mockPackaging, error: null });

      const result = await AgrovetInventoryService.getProductPackaging('product-1');

      expect(result).toEqual(mockPackaging);
      expect(supabaseMock.from).toHaveBeenCalledWith('product_packaging');
      expect(supabaseMock.select).toHaveBeenCalled();
      expect(supabaseMock.eq).toHaveBeenCalledWith('product_id', 'product-1');
    });
  });

  describe('createProductPackaging', () => {
    it('should create a new packaging option', async () => {
      const newPackaging: Omit<ProductPackaging, 'id' | 'created_at' | 'updated_at'> = {
        product_id: 'product-1',
        name: '50kg Bag',
        weight: 50,
        unit: 'kg',
        price: 5200,
        is_credit_eligible: true
      };

      const createdPackaging: ProductPackaging = {
        id: 'new-id',
        ...newPackaging,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.insert.mockResolvedValueOnce({ data: createdPackaging, error: null });

      const result = await AgrovetInventoryService.createProductPackaging(newPackaging);

      expect(result).toEqual(createdPackaging);
      expect(supabaseMock.from).toHaveBeenCalledWith('product_packaging');
      expect(supabaseMock.insert).toHaveBeenCalledWith({
        product_id: 'product-1',
        name: '50kg Bag',
        weight: 50,
        unit: 'kg',
        price: 5200,
        is_credit_eligible: true
      });
    });
  });

  describe('updateProductPackaging', () => {
    it('should update an existing packaging option', async () => {
      const updatedPackaging: ProductPackaging = {
        id: '1',
        product_id: 'product-1',
        name: '25kg Bag',
        weight: 25,
        unit: 'kg',
        price: 2600,
        is_credit_eligible: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.update.mockResolvedValueOnce({ data: updatedPackaging, error: null });

      const result = await AgrovetInventoryService.updateProductPackaging('1', {
        name: '25kg Bag',
        weight: 25,
        price: 2600
      });

      expect(result).toEqual(updatedPackaging);
      expect(supabaseMock.from).toHaveBeenCalledWith('product_packaging');
      expect(supabaseMock.update).toHaveBeenCalledWith({
        name: '25kg Bag',
        weight: 25,
        price: 2600,
        updated_at: expect.any(String)
      });
      expect(supabaseMock.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('deleteProductPackaging', () => {
    it('should delete a packaging option', async () => {
      const supabaseMock = require('@/integrations/supabase/client').supabase;
      supabaseMock.delete.mockResolvedValueOnce({ error: null });

      await AgrovetInventoryService.deleteProductPackaging('1');

      expect(supabaseMock.from).toHaveBeenCalledWith('product_packaging');
      expect(supabaseMock.delete).toHaveBeenCalled();
      expect(supabaseMock.eq).toHaveBeenCalledWith('id', '1');
    });
  });
});