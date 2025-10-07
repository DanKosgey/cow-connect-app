import { describe, it, expect, beforeEach } from 'vitest';
import { paymentService } from './payment-service';

// Create a mock for the Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
};

// Mock the supabase client import
jest.mock('../integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUnapprovedCollections', () => {
    it('should fetch unapproved collections', async () => {
      const mockCollections = [
        {
          id: '1',
          collection_id: 'COL001',
          farmer_id: 'farmer1',
          liters: 10,
          rate_per_liter: 50,
          total_amount: 500,
          collection_date: '2023-01-01',
          status: 'Verified',
          approved_for_payment: false,
          approved_at: null,
        }
      ];

      mockSupabase.select.mockResolvedValue({ data: mockCollections, error: null });

      const result = await paymentService.getUnapprovedCollections();

      expect(result).toEqual(mockCollections);
      expect(mockSupabase.from).toHaveBeenCalledWith('collections');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'Verified');
      expect(mockSupabase.eq).toHaveBeenCalledWith('approved_for_payment', false);
    });
  });

  describe('approveCollectionsForPayment', () => {
    it('should approve collections and create payment record', async () => {
      const collectionIds = ['1', '2'];
      const mockCollections = [
        { farmer_id: 'farmer1', total_amount: 500 },
        { farmer_id: 'farmer1', total_amount: 300 }
      ];
      const mockPayment = {
        id: 'payment1',
        farmer_id: 'farmer1',
        collection_ids: collectionIds,
        total_amount: 800,
        approval_status: 'approved',
        approved_at: '2023-01-01T00:00:00Z',
        paid_at: null,
        notes: null,
        created_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.select.mockResolvedValueOnce({ data: mockCollections, error: null });
      mockSupabase.update.mockResolvedValueOnce({ error: null });
      mockSupabase.insert.mockResolvedValueOnce({ data: mockPayment, error: null });
      mockSupabase.select.mockResolvedValueOnce({ data: mockPayment, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockPayment, error: null });

      const result = await paymentService.approveCollectionsForPayment(collectionIds, 'Test notes');

      expect(result).toEqual(mockPayment);
      expect(mockSupabase.update).toHaveBeenCalledWith({ 
        approved_for_payment: true,
        approved_at: expect.any(String)
      });
    });

    it('should throw error when no collections found', async () => {
      const collectionIds = ['1', '2'];
      
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

      await expect(paymentService.approveCollectionsForPayment(collectionIds))
        .rejects
        .toThrow('No collections found for approval');
    });
  });

  describe('markPaymentAsPaid', () => {
    it('should mark payment as paid', async () => {
      const paymentId = 'payment1';
      const mockPayment = {
        id: paymentId,
        approval_status: 'paid',
        paid_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.update.mockResolvedValueOnce({ error: null });
      mockSupabase.eq.mockResolvedValueOnce({ error: null });
      mockSupabase.select.mockResolvedValueOnce({ data: mockPayment, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockPayment, error: null });

      const result = await paymentService.markPaymentAsPaid(paymentId);

      expect(result).toEqual(mockPayment);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        approval_status: 'paid',
        paid_at: expect.any(String)
      });
    });
  });
});