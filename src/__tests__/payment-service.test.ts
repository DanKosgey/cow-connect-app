import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentService } from '../services/payment-service';

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
  contains: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
};

// Mock the supabase client import
jest.mock('../integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markCollectionAsPaid', () => {
    it('should mark collection as paid and update related farmer payments', async () => {
      const collectionId = '1';
      const farmerId = 'farmer1';
      const collection = {
        id: '1',
        farmer_id: 'farmer1',
        total_amount: 500,
        rate_per_liter: 50,
        status: 'Collected'
      };

      // Mock all the database operations
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }); // For batch check
      mockSupabase.insert.mockResolvedValueOnce({ data: { batch_id: 'BATCH-TEST' }, error: null }); // For batch creation
      mockSupabase.insert.mockResolvedValueOnce({ data: [{ id: 'payment1' }], error: null }); // For collection_payments insert
      mockSupabase.update.mockResolvedValueOnce({ error: null }); // For collections update
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null }); // For farmer_payments check
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }); // For farmer user_id
      mockSupabase.insert.mockResolvedValueOnce({ error: null }); // For notifications

      const result = await PaymentService.markCollectionAsPaid(collectionId, farmerId, collection);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('collections');
    });
  });

  describe('createPaymentForApproval', () => {
    it('should create payment for approval and update collections', async () => {
      const farmerId = 'farmer1';
      const collectionIds = ['1', '2'];
      const totalAmount = 800;
      
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

      mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }); // For staff check
      mockSupabase.insert.mockResolvedValueOnce({ data: mockPayment, error: null });
      mockSupabase.update.mockResolvedValueOnce({ error: null });
      mockSupabase.select.mockResolvedValueOnce({ data: mockPayment, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockPayment, error: null });

      const result = await PaymentService.createPaymentForApproval(farmerId, collectionIds, totalAmount, 'Test notes');

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({ 
        approved_for_payment: true,
        approved_at: expect.any(String),
        approved_by: null
      });
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

      mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }); // For staff check
      mockSupabase.update.mockResolvedValueOnce({ error: null });
      mockSupabase.eq.mockResolvedValueOnce({ error: null });
      mockSupabase.select.mockResolvedValueOnce({ data: mockPayment, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockPayment, error: null });

      const result = await PaymentService.markPaymentAsPaid(paymentId);

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        approval_status: 'paid',
        paid_at: expect.any(String),
        paid_by: null
      });
    });
  });

  describe('markAllFarmerPaymentsAsPaid', () => {
    it('should mark all farmer payments as paid', async () => {
      const farmerId = 'farmer1';
      const collections = [
        { id: '1', farmer_id: 'farmer1', total_amount: 500, rate_per_liter: 50, status: 'Collected' },
        { id: '2', farmer_id: 'farmer1', total_amount: 300, rate_per_liter: 50, status: 'Collected' }
      ];
      
      // Mock the markCollectionAsPaid calls
      mockSupabase.select.mockResolvedValue({ data: null, error: null }); // For all batch checks
      mockSupabase.insert.mockResolvedValue({ data: { batch_id: 'BATCH-TEST' }, error: null }); // For all batch creations
      mockSupabase.insert.mockResolvedValue({ data: [{ id: 'payment1' }], error: null }); // For all collection_payments inserts
      mockSupabase.update.mockResolvedValue({ error: null }); // For all collections updates
      mockSupabase.select.mockResolvedValue({ data: [], error: null }); // For all farmer_payments checks
      mockSupabase.select.mockResolvedValue({ data: null, error: null }); // For all farmer user_id checks
      mockSupabase.insert.mockResolvedValue({ error: null }); // For all notifications

      const result = await PaymentService.markAllFarmerPaymentsAsPaid(farmerId, collections);

      expect(result.success).toBe(true);
    });

    it('should handle errors when marking all farmer payments as paid', async () => {
      const farmerId = 'farmer1';
      const collections = [
        { id: '1', farmer_id: 'farmer1', total_amount: 500, rate_per_liter: 50, status: 'Collected' }
      ];

      // Mock an error in markCollectionAsPaid
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: new Error('Database error') });

      const result = await PaymentService.markAllFarmerPaymentsAsPaid(farmerId, collections);

      expect(result.success).toBe(false);
    });
  });

  describe('getFarmerPaymentHistory', () => {
    it('should fetch farmer payment history', async () => {
      const farmerId = 'farmer1';
      const mockPayments = [
        {
          id: 'payment1',
          farmer_id: 'farmer1',
          collection_ids: ['1', '2'],
          total_amount: 800,
          approval_status: 'paid',
          approved_at: '2023-01-01T00:00:00Z',
          paid_at: '2023-01-02T00:00:00Z',
          notes: null,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({ data: mockPayments, error: null });

      const result = await PaymentService.getFarmerPaymentHistory(farmerId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPayments);
    });
  });

  describe('getAllPayments', () => {
    it('should fetch all payments', async () => {
      const mockPayments = [
        {
          id: 'payment1',
          farmer_id: 'farmer1',
          collection_ids: ['1', '2'],
          total_amount: 800,
          approval_status: 'paid',
          approved_at: '2023-01-01T00:00:00Z',
          paid_at: '2023-01-02T00:00:00Z',
          notes: null,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({ data: mockPayments, error: null });

      const result = await PaymentService.getAllPayments();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPayments);
    });

    it('should fetch payments with status filter', async () => {
      const mockPayments = [
        {
          id: 'payment1',
          farmer_id: 'farmer1',
          collection_ids: ['1', '2'],
          total_amount: 800,
          approval_status: 'paid',
          approved_at: '2023-01-01T00:00:00Z',
          paid_at: '2023-01-02T00:00:00Z',
          notes: null,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({ data: mockPayments, error: null });
      mockSupabase.eq.mockReturnThis();

      const result = await PaymentService.getAllPayments('paid');

      expect(result.success).toBe(true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('approval_status', 'paid');
    });
  });
});