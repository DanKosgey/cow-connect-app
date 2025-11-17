import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgrovetInventoryService } from '@/services/agrovet-inventory-service';

// Mock the entire supabase client module
vi.mock('@/integrations/supabase/client', () => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn()
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('Agrovet Product Management', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Get the mocked supabase client
    const { supabase } = require('@/integrations/supabase/client');
    
    // Setup default mock responses
    supabase.from.mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
        single: vi.fn().mockResolvedValue({ error: null, data: null }),
        insert: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: null })
        })),
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: null })
        })),
        delete: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockReturnThis()
        })),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      };
    });
  });

  describe('getInventory', () => {
    it('should retrieve all agrovet inventory items ordered by name', async () => {
      // Mock inventory items
      const mockInventory = [
        {
          id: 'item-1',
          name: 'Fertilizer A',
          description: 'High-quality nitrogen fertilizer',
          category: 'Fertilizers',
          unit: 'kg',
          current_stock: 100,
          reorder_level: 20,
          supplier: 'AgroSuppliers Ltd',
          cost_price: 200.00,
          selling_price: 250.00,
          is_credit_eligible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'item-2',
          name: 'Pesticide B',
          description: 'Broad-spectrum pesticide',
          category: 'Pesticides',
          unit: 'liter',
          current_stock: 50,
          reorder_level: 10,
          supplier: 'ChemAgro Inc',
          cost_price: 400.00,
          selling_price: 500.00,
          is_credit_eligible: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockInventory, error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          order: vi.fn().mockReturnThis()
        };
      });

      const result = await AgrovetInventoryService.getInventory();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Fertilizer A');
      expect(result[1].name).toBe('Pesticide B');
      expect(result[0].is_credit_eligible).toBe(true);
      expect(result[1].is_credit_eligible).toBe(false);
    });
  });

  describe('createInventoryItem', () => {
    it('should successfully create a new inventory item', async () => {
      // Mock new inventory item
      const newItem = {
        id: 'new-item-1',
        name: 'Herbicide C',
        description: 'Selective herbicide for weeds',
        category: 'Herbicides',
        unit: 'liter',
        current_stock: 75,
        reorder_level: 15,
        supplier: 'WeedControl Co',
        cost_price: 300.00,
        selling_price: 400.00,
        is_credit_eligible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const itemData = {
        name: 'Herbicide C',
        description: 'Selective herbicide for weeds',
        category: 'Herbicides',
        unit: 'liter',
        current_stock: 75,
        reorder_level: 15,
        supplier: 'WeedControl Co',
        cost_price: 300.00,
        selling_price: 400.00,
        is_credit_eligible: true
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let insertCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            insert: vi.fn().mockImplementation((data) => {
              insertCalled = true;
              // Verify the data being inserted
              expect(data).toEqual(itemData);
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: newItem })
              };
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          insert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      });

      const result = await AgrovetInventoryService.createInventoryItem(itemData);

      expect(insertCalled).toBe(true);
      expect(result).toEqual(newItem);
      expect(result.name).toBe('Herbicide C');
      expect(result.is_credit_eligible).toBe(true);
    });
  });

  describe('updateInventoryItem', () => {
    it('should successfully update an existing inventory item', async () => {
      // Mock updated inventory item
      const updatedItem = {
        id: 'item-1',
        name: 'Fertilizer A Premium',
        description: 'High-quality premium nitrogen fertilizer',
        category: 'Fertilizers',
        unit: 'kg',
        current_stock: 120,
        reorder_level: 25,
        supplier: 'AgroSuppliers Ltd',
        cost_price: 210.00,
        selling_price: 275.00,
        is_credit_eligible: false,
        created_at: new Date('2023-01-01').toISOString(),
        updated_at: new Date().toISOString()
      };

      const updateData = {
        name: 'Fertilizer A Premium',
        description: 'High-quality premium nitrogen fertilizer',
        current_stock: 120,
        selling_price: 275.00,
        is_credit_eligible: false
      };

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let updateCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            update: vi.fn().mockImplementation((data) => {
              updateCalled = true;
              // Verify the data being updated
              expect(data.name).toBe(updateData.name);
              expect(data.description).toBe(updateData.description);
              expect(data.current_stock).toBe(updateData.current_stock);
              expect(data.selling_price).toBe(updateData.selling_price);
              expect(data.is_credit_eligible).toBe(updateData.is_credit_eligible);
              expect(data.updated_at).toBeDefined();
              return {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ error: null, data: updatedItem })
              };
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null, data: null })
          }))
        };
      });

      const result = await AgrovetInventoryService.updateInventoryItem('item-1', updateData);

      expect(updateCalled).toBe(true);
      expect(result).toEqual(updatedItem);
      expect(result.name).toBe('Fertilizer A Premium');
      expect(result.is_credit_eligible).toBe(false);
    });
  });

  describe('deleteInventoryItem', () => {
    it('should successfully delete an inventory item', async () => {
      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      let deleteCalled = false;
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            delete: vi.fn().mockImplementation(() => {
              return {
                eq: vi.fn().mockImplementation((field, value) => {
                  deleteCalled = true;
                  // Verify the correct item is being deleted
                  expect(field).toBe('id');
                  expect(value).toBe('item-1');
                  return { error: null };
                })
              };
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          delete: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnThis()
          }))
        };
      });

      await expect(AgrovetInventoryService.deleteInventoryItem('item-1')).resolves.not.toThrow();

      expect(deleteCalled).toBe(true);
    });
  });

  describe('getCreditEligibleProducts', () => {
    it('should retrieve only credit-eligible products', async () => {
      // Mock credit-eligible products
      const mockCreditEligibleProducts = [
        {
          id: 'item-1',
          name: 'Fertilizer A',
          description: 'High-quality nitrogen fertilizer',
          category: 'Fertilizers',
          unit: 'kg',
          current_stock: 100,
          reorder_level: 20,
          supplier: 'AgroSuppliers Ltd',
          cost_price: 200.00,
          selling_price: 250.00,
          is_credit_eligible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'item-3',
          name: 'Seed D',
          description: 'High-yield hybrid seeds',
          category: 'Seeds',
          unit: 'packet',
          current_stock: 200,
          reorder_level: 30,
          supplier: 'SeedCorp',
          cost_price: 150.00,
          selling_price: 200.00,
          is_credit_eligible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Get the mocked supabase client
      const { supabase } = require('@/integrations/supabase/client');
      
      // Setup mock responses
      supabase.from.mockImplementation((table: string) => {
        if (table === 'agrovet_inventory') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockCreditEligibleProducts, error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
          order: vi.fn().mockReturnThis()
        };
      });

      const result = await AgrovetInventoryService.getCreditEligibleProducts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Fertilizer A');
      expect(result[1].name).toBe('Seed D');
      expect(result[0].is_credit_eligible).toBe(true);
      expect(result[1].is_credit_eligible).toBe(true);
    });
  });

  describe('Product Pricing Methods', () => {
    describe('getProductPricing', () => {
      it('should retrieve product pricing tiers ordered by minimum quantity', async () => {
        // Mock product pricing tiers
        const mockPricing = [
          {
            id: 'pricing-1',
            product_id: 'product-1',
            min_quantity: 1,
            max_quantity: 10,
            price_per_unit: 250.00,
            is_credit_eligible: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'pricing-2',
            product_id: 'product-1',
            min_quantity: 11,
            max_quantity: null,
            price_per_unit: 220.00,
            is_credit_eligible: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        // Get the mocked supabase client
        const { supabase } = require('@/integrations/supabase/client');
        
        // Setup mock responses
        supabase.from.mockImplementation((table: string) => {
          if (table === 'product_pricing') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockPricing, error: null })
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
            order: vi.fn().mockReturnThis()
          };
        });

        const result = await AgrovetInventoryService.getProductPricing('product-1');

        expect(result).toHaveLength(2);
        expect(result[0].min_quantity).toBe(1);
        expect(result[1].min_quantity).toBe(11);
        expect(result[0].price_per_unit).toBe(250.00);
        expect(result[1].price_per_unit).toBe(220.00);
      });
    });

    describe('createProductPricing', () => {
      it('should successfully create a new product pricing tier', async () => {
        // Mock new pricing tier
        const newPricing = {
          id: 'new-pricing-1',
          product_id: 'product-1',
          min_quantity: 50,
          max_quantity: 100,
          price_per_unit: 200.00,
          is_credit_eligible: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const pricingData = {
          product_id: 'product-1',
          min_quantity: 50,
          max_quantity: 100,
          price_per_unit: 200.00,
          is_credit_eligible: false
        };

        // Get the mocked supabase client
        const { supabase } = require('@/integrations/supabase/client');
        
        // Setup mock responses
        let insertCalled = false;
        supabase.from.mockImplementation((table: string) => {
          if (table === 'product_pricing') {
            return {
              insert: vi.fn().mockImplementation((data) => {
                insertCalled = true;
                // Verify the data being inserted
                expect(data).toEqual(pricingData);
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({ error: null, data: newPricing })
                };
              })
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ error: null, data: null }),
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ error: null, data: null })
            }))
          };
        });

        const result = await AgrovetInventoryService.createProductPricing(pricingData);

        expect(insertCalled).toBe(true);
        expect(result).toEqual(newPricing);
        expect(result.min_quantity).toBe(50);
        expect(result.is_credit_eligible).toBe(false);
      });
    });
  });
});