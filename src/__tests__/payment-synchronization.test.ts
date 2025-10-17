import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PaymentService } from '../services/payment-service';

// Mock Supabase client
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

describe('Payment Synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should synchronize payment status between admin and farmer portals', async () => {
    // Mock data
    const collectionId = 'collection-1';
    const farmerId = 'farmer-1';
    const collection = {
      id: collectionId,
      farmer_id: farmerId,
      total_amount: 1000,
      rate_per_liter: 50,
      status: 'Collected'
    };

    // Mock the database operations for markCollectionAsPaid
    mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }); // Batch check
    mockSupabase.insert.mockResolvedValueOnce({ data: { batch_id: 'BATCH-TEST' }, error: null }); // Batch creation
    mockSupabase.insert.mockResolvedValueOnce({ data: [{ id: 'payment-1' }], error: null }); // Collection payment insert
    mockSupabase.update.mockResolvedValueOnce({ error: null }); // Collection update
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null }); // Farmer payments check
    mockSupabase.select.mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }); // Farmer user ID
    mockSupabase.insert.mockResolvedValueOnce({ error: null }); // Notification insert

    // Call the service method
    const result = await PaymentService.markCollectionAsPaid(collectionId, farmerId, collection);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify that the collection status was updated to 'Paid'
    expect(mockSupabase.from).toHaveBeenCalledWith('collections');
    expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'Paid' });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', collectionId);

    // Verify that related farmer_payments were checked for updates
    expect(mockSupabase.from).toHaveBeenCalledWith('farmer_payments');
    expect(mockSupabase.contains).toHaveBeenCalledWith('collection_ids', [collectionId]);
  });

  it('should update farmer_payments when collections are marked as paid', async () => {
    // Mock data
    const collectionId = 'collection-1';
    const farmerId = 'farmer-1';
    const collection = {
      id: collectionId,
      farmer_id: farmerId,
      total_amount: 1000,
      rate_per_liter: 50,
      status: 'Collected'
    };

    // Mock related farmer_payments that should be updated
    const relatedPayments = [
      {
        id: 'farmer-payment-1',
        collection_ids: [collectionId],
        approval_status: 'approved'
      }
    ];

    // Mock the database operations
    mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }); // Batch check
    mockSupabase.insert.mockResolvedValueOnce({ data: { batch_id: 'BATCH-TEST' }, error: null }); // Batch creation
    mockSupabase.insert.mockResolvedValueOnce({ data: [{ id: 'payment-1' }], error: null }); // Collection payment insert
    mockSupabase.update.mockResolvedValueOnce({ error: null }); // Collection update
    mockSupabase.select.mockResolvedValueOnce({ data: relatedPayments, error: null }); // Farmer payments check
    mockSupabase.update.mockResolvedValueOnce({ error: null }); // Farmer payment update
    mockSupabase.select.mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }); // Farmer user ID
    mockSupabase.insert.mockResolvedValueOnce({ error: null }); // Notification insert

    // Call the service method
    const result = await PaymentService.markCollectionAsPaid(collectionId, farmerId, collection);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify that related farmer_payments were updated to 'paid' status
    expect(mockSupabase.from).toHaveBeenCalledWith('farmer_payments');
    expect(mockSupabase.update).toHaveBeenCalledWith({ 
      approval_status: 'paid',
      paid_at: expect.any(String)
    });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'farmer-payment-1');
  });

  it('should mark all farmer payments as paid when using markAllFarmerPaymentsAsPaid', async () => {
    // Mock data
    const farmerId = 'farmer-1';
    const collections = [
      {
        id: 'collection-1',
        farmer_id: farmerId,
        total_amount: 1000,
        rate_per_liter: 50,
        status: 'Collected'
      },
      {
        id: 'collection-2',
        farmer_id: farmerId,
        total_amount: 1500,
        rate_per_liter: 50,
        status: 'Collected'
      }
    ];

    // Mock the database operations for each collection
    // For collection-1
    mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }); // Batch check
    mockSupabase.insert.mockResolvedValueOnce({ data: { batch_id: 'BATCH-TEST' }, error: null }); // Batch creation
    mockSupabase.insert.mockResolvedValueOnce({ data: [{ id: 'payment-1' }], error: null }); // Collection payment insert
    mockSupabase.update.mockResolvedValueOnce({ error: null }); // Collection update
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null }); // Farmer payments check
    mockSupabase.select.mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }); // Farmer user ID
    mockSupabase.insert.mockResolvedValueOnce({ error: null }); // Notification insert

    // For collection-2
    mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }); // Batch check
    mockSupabase.insert.mockResolvedValueOnce({ data: { batch_id: 'BATCH-TEST' }, error: null }); // Batch creation
    mockSupabase.insert.mockResolvedValueOnce({ data: [{ id: 'payment-2' }], error: null }); // Collection payment insert
    mockSupabase.update.mockResolvedValueOnce({ error: null }); // Collection update
    mockSupabase.select.mockResolvedValueOnce({ data: [], error: null }); // Farmer payments check
    mockSupabase.select.mockResolvedValueOnce({ data: { user_id: 'user-1' }, error: null }); // Farmer user ID
    mockSupabase.insert.mockResolvedValueOnce({ error: null }); // Notification insert

    // Call the service method
    const result = await PaymentService.markAllFarmerPaymentsAsPaid(farmerId, collections);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify that both collections were processed
    expect(mockSupabase.from).toHaveBeenCalledWith('collections');
    expect(mockSupabase.update).toHaveBeenCalledTimes(2); // Once for each collection
  });
});