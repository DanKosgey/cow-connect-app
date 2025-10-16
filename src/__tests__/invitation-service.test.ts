import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { invitationService } from '@/services/invitation-service';

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
};

// Mock the supabase client import
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock the email service
vi.mock('@/services/email-service', () => ({
  emailService: {
    sendInvitationEmail: vi.fn().mockResolvedValue(true),
  },
}));

describe('InvitationService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset any mocked implementations
    vi.resetAllMocks();
  });

  describe('createInvitation', () => {
    it('should create a new invitation successfully', async () => {
      const mockInvitationData = {
        email: 'test@example.com',
        role: 'admin' as const,
        invitedBy: 'user-id-123',
        message: 'Welcome to the team!',
      };

      const mockResponse = {
        data: {
          id: 'invitation-id-123',
          email: 'test@example.com',
          role: 'admin',
          message: 'Welcome to the team!',
          invited_by: 'user-id-123',
          token: 'abc123',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          accepted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };

      mockSupabase.select = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn().mockResolvedValue(mockResponse);

      const result = await invitationService.createInvitation(mockInvitationData);

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
      expect(result?.role).toBe('admin');
      expect(result?.token).toBeDefined();
    });

    it('should return null when invitation creation fails', async () => {
      const mockInvitationData = {
        email: 'test@example.com',
        role: 'admin' as const,
        invitedBy: 'user-id-123',
      };

      const mockResponse = {
        data: null,
        error: new Error('Database error'),
      };

      mockSupabase.select = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn().mockResolvedValue(mockResponse);

      const result = await invitationService.createInvitation(mockInvitationData);

      expect(result).toBeNull();
    });
  });

  describe('validateInvitationToken', () => {
    it('should return true for a valid invitation token', async () => {
      const mockResponse = {
        data: {
          id: 'invitation-id-123',
          email: 'test@example.com',
          role: 'admin',
          token: 'valid-token-123',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
          accepted: false,
        },
        error: null,
      };

      mockSupabase.select = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn().mockResolvedValue(mockResponse);

      const result = await invitationService.validateInvitationToken('valid-token-123');

      expect(result).toBe(true);
    });

    it('should return false for an expired invitation token', async () => {
      const mockResponse = {
        data: {
          id: 'invitation-id-123',
          email: 'test@example.com',
          role: 'admin',
          token: 'expired-token-123',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          accepted: false,
        },
        error: null,
      };

      mockSupabase.select = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn().mockResolvedValue(mockResponse);

      const result = await invitationService.validateInvitationToken('expired-token-123');

      expect(result).toBe(false);
    });

    it('should return false for an already accepted invitation token', async () => {
      const mockResponse = {
        data: {
          id: 'invitation-id-123',
          email: 'test@example.com',
          role: 'admin',
          token: 'accepted-token-123',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
          accepted: true,
        },
        error: null,
      };

      mockSupabase.select = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn().mockResolvedValue(mockResponse);

      const result = await invitationService.validateInvitationToken('accepted-token-123');

      expect(result).toBe(false);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept a valid invitation successfully', async () => {
      const mockInvitationData = {
        id: 'invitation-id-123',
        email: 'test@example.com',
        role: 'admin',
        token: 'valid-token-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        accepted: false,
      };

      // Mock the invitation fetch
      mockSupabase.select = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockInvitationData, error: null }) // First call for fetching invitation
        .mockResolvedValueOnce({ data: null, error: null }); // Second call for role insertion

      // Mock the update operation
      mockSupabase.update = vi.fn().mockReturnThis();
      mockSupabase.eq = vi.fn().mockReturnThis();

      const result = await invitationService.acceptInvitation('valid-token-123', 'user-id-123');

      expect(result).toBe(true);
    });

    it('should return false for an invalid invitation token', async () => {
      mockSupabase.select = vi.fn().mockReturnThis();
      mockSupabase.single = vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') });

      const result = await invitationService.acceptInvitation('invalid-token-123', 'user-id-123');

      expect(result).toBe(false);
    });
  });
});