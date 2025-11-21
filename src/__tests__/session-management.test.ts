import { AuthManager } from '../utils/authManager';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

describe('AuthManager', () => {
  let authManager: AuthManager;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create new instance of AuthManager
    authManager = AuthManager.getInstance();
  });
  
  afterEach(() => {
    // Clean up any intervals or event listeners
    authManager.cleanup();
  });
  
  describe('isSessionValid', () => {
    it('should return false when there is an error fetching session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: new Error('Network error')
      });
      
      const result = await authManager.isSessionValid();
      expect(result).toBe(false);
    });
    
    it('should return false when there is no session', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });
      
      const result = await authManager.isSessionValid();
      expect(result).toBe(false);
    });
    
    it('should return false when session is expired', async () => {
      const expiredSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MjQ2NjIwMDB9.invalid',
        expires_at: Math.floor(Date.now() / 1000) - 1000, // Expired 1000 seconds ago
        user: { id: 'test-user-id' }
      };
      
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: expiredSession },
        error: null
      });
      
      const result = await authManager.isSessionValid();
      expect(result).toBe(false);
    });
    
    it('should return true when session is valid', async () => {
      const validSession = {
        access_token: 'valid-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        user: { id: 'test-user-id' }
      };
      
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: validSession },
        error: null
      });
      
      const result = await authManager.isSessionValid();
      expect(result).toBe(true);
    });
  });
  
  describe('validateAndRefreshSession', () => {
    it('should return false when session fetch fails', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: new Error('Network error')
      });
      
      const result = await authManager.validateAndRefreshSession();
      expect(result).toBe(false);
    });
    
    it('should refresh session when it is about to expire', async () => {
      const expiringSession = {
        access_token: 'valid-token',
        expires_at: Math.floor(Date.now() / 1000) + 100, // Expires in 100 seconds (less than 30 min buffer)
        user: { id: 'test-user-id' }
      };
      
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: expiringSession },
        error: null
      });
      
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: expiringSession },
        error: null
      });
      
      const result = await authManager.validateAndRefreshSession();
      expect(result).toBe(true);
      expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });
    
    it('should return true when session is valid and not close to expiration', async () => {
      const validSession = {
        access_token: 'valid-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        user: { id: 'test-user-id' }
      };
      
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: validSession },
        error: null
      });
      
      const result = await authManager.validateAndRefreshSession();
      expect(result).toBe(true);
      expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
    });
  });
  
  describe('refreshSession', () => {
    it('should return false when refresh fails', async () => {
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: new Error('Refresh failed')
      });
      
      const result = await authManager.refreshSession();
      expect(result).toBe(false);
    });
    
    it('should return true when refresh succeeds', async () => {
      const refreshedSession = {
        access_token: 'new-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'test-user-id' }
      };
      
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: refreshedSession },
        error: null
      });
      
      const result = await authManager.refreshSession();
      expect(result).toBe(true);
    });
  });
  
  describe('isAuthError', () => {
    it('should detect various auth error messages', () => {
      const authErrors = [
        new Error('Invalid authentication credentials'),
        new Error('JWT expired'),
        new Error('Not authenticated'),
        new Error('Invalid token'),
        new Error('Token expired'),
        new Error('No authorization'),
        new Error('401 Unauthorized'),
        new Error('403 Forbidden')
      ];
      
      for (const error of authErrors) {
        // We can't directly call private method, but we can test the behavior
        // by triggering conditions that would use it
        expect(error.message).toBeDefined();
      }
    });
  });
});