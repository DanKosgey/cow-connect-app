import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { collectorEarningsService } from '@/services/collector-earnings-service';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
    }
  }
}));

describe('Mark as Paid Penalty Status Update', () => {
  const mockCollectorId = 'test-collector-id';
  const mockCollectionIds = ['collection-1', 'collection-2'];
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  it('should update penalty_status to paid for milk approvals when marking collections as paid', async () => {
    // Mock the collections query to return some collection IDs
    (supabase.from('').select('').eq as jest.Mock).mockImplementation(function() {
      if (this.table === 'collections') {
        return {
          select: () => this,
          eq: () => this,
          data: [{ id: 'collection-1' }, { id: 'collection-2' }],
          error: null
        };
      }
      return this;
    });

    // Mock the collections update to succeed
    (supabase.from('').update as jest.Mock).mockImplementation(function() {
      if (this.table === 'collections') {
        return {
          eq: () => this,
          error: null
        };
      }
      return this;
    });

    // Mock the milk approvals query to return some approvals
    (supabase.from('').select('').in as jest.Mock).mockImplementation(function() {
      if (this.table === 'milk_approvals') {
        return {
          select: () => this,
          in: () => this,
          eq: () => this,
          data: [
            { id: 'approval-1', collection_id: 'collection-1', penalty_status: 'pending' },
            { id: 'approval-2', collection_id: 'collection-2', penalty_status: 'pending' }
          ],
          error: null
        };
      }
      return this;
    });

    // Mock the milk approvals update to succeed
    (supabase.from('').update as jest.Mock).mockImplementation(function() {
      if (this.table === 'milk_approvals') {
        return {
          in: () => this,
          eq: () => this,
          select: () => ({ error: null, count: 2 }),
          error: null,
          count: 2
        };
      }
      return this;
    });

    // Mock staff query
    (supabase.from('').select('').eq as jest.Mock).mockImplementation(function() {
      if (this.table === 'staff') {
        return {
          select: () => this,
          eq: () => this,
          data: [{ id: 'staff-1' }],
          error: null
        };
      }
      return this;
    });

    // Call the function
    const result = await collectorEarningsService.markCollectionsAsPaid(mockCollectorId);

    // Verify the result
    expect(result).toBe(true);

    // Verify that the milk approvals were updated
    expect(supabase.from).toHaveBeenCalledWith('milk_approvals');
    expect(supabase.from('').update).toHaveBeenCalledWith({ penalty_status: 'paid' });
  });

  it('should handle RLS errors gracefully when updating milk approvals', async () => {
    // Mock the collections query to return some collection IDs
    (supabase.from('').select('').eq as jest.Mock).mockImplementation(function() {
      if (this.table === 'collections') {
        return {
          select: () => this,
          eq: () => this,
          data: [{ id: 'collection-1' }],
          error: null
        };
      }
      return this;
    });

    // Mock the collections update to succeed
    (supabase.from('').update as jest.Mock).mockImplementation(function() {
      if (this.table === 'collections') {
        return {
          eq: () => this,
          error: null
        };
      }
      return this;
    });

    // Mock the milk approvals query to return some approvals
    (supabase.from('').select('').in as jest.Mock).mockImplementation(function() {
      if (this.table === 'milk_approvals') {
        return {
          select: () => this,
          in: () => this,
          eq: () => this,
          data: [{ id: 'approval-1', collection_id: 'collection-1', penalty_status: 'pending' }],
          error: null
        };
      }
      return this;
    });

    // Mock the milk approvals update to fail with RLS error
    (supabase.from('').update as jest.Mock).mockImplementation(function() {
      if (this.table === 'milk_approvals') {
        return {
          in: () => this,
          eq: () => this,
          select: () => ({ 
            error: new Error('row-level security policy violation'), 
            count: 0 
          }),
          error: new Error('row-level security policy violation'),
          count: 0
        };
      }
      return this;
    });

    // Mock individual update to succeed
    let individualUpdateCalled = false;
    (supabase.from('').update as jest.Mock).mockImplementation(function() {
      if (this.table === 'milk_approvals' && individualUpdateCalled === false) {
        individualUpdateCalled = true;
        return {
          eq: () => this,
          select: () => ({ error: null, count: 1 }),
          error: null,
          count: 1
        };
      }
      return this;
    });

    // Mock staff query
    (supabase.from('').select('').eq as jest.Mock).mockImplementation(function() {
      if (this.table === 'staff') {
        return {
          select: () => this,
          eq: () => this,
          data: [{ id: 'staff-1' }],
          error: null
        };
      }
      return this;
    });

    // Call the function
    const result = await collectorEarningsService.markCollectionsAsPaid(mockCollectorId);

    // Verify the result is still true (operation continues despite RLS error)
    expect(result).toBe(true);
  });
});