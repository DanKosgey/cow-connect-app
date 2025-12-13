import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth.types';
import { useAuth } from '@/hooks/useAuth';
import { useSessionManager } from '@/hooks/useSessionManager';
import { authEventManager, AuthEventType } from '@/utils/authLogger';
import { parseAuthError, AuthErrorCode } from '@/utils/authErrorHandler';

// Mock window.location
const mockLocation = {
  href: '',
  assign: vi.fn(),
  replace: vi.fn()
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock document visibility
const mockVisibilityState = 'visible';
Object.defineProperty(document, 'visibilityState', {
  value: mockVisibilityState,
  writable: true
});

// Mock authService
const mockAuthService = {
  getCurrentUser: vi.fn(),
  getCurrentSession: vi.fn(),
  signInWithEmail: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  refreshSession: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  getUserRole: vi.fn()
};

// Mock the authService module
vi.mock('@/lib/supabase/auth-service', () => ({
  authService: mockAuthService
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Wrapper component for testing
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('Full Authentication Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    authEventManager.clearEvents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthService Integration', () => {
    it('should log login attempts and successes', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      
      mockAuthService.signInWithEmail.mockResolvedValue({
        user: mockUser,
        session: mockSession,
        error: null
      });

      const eventsBefore = authEventManager.getRecentEvents();
      expect(eventsBefore.length).toBe(0);

      // Perform login
      const result = await mockAuthService.signInWithEmail('test@example.com', 'password123');
      
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();

      // Check that events were logged
      const eventsAfter = authEventManager.getRecentEvents();
      expect(eventsAfter.length).toBe(2);
      
      const loginAttempt = eventsAfter.find(e => e.type === AuthEventType.LOGIN_ATTEMPT);
      const loginSuccess = eventsAfter.find(e => e.type === AuthEventType.LOGIN_SUCCESS);
      
      expect(loginAttempt).toBeDefined();
      expect(loginAttempt?.userEmail).toBe('test@example.com');
      
      expect(loginSuccess).toBeDefined();
      expect(loginSuccess?.userId).toBe('user123');
      expect(loginSuccess?.userEmail).toBe('test@example.com');
    });

    it('should log login failures', async () => {
      const mockError = new Error('Invalid credentials');
      
      mockAuthService.signInWithEmail.mockResolvedValue({
        user: null,
        session: null,
        error: mockError
      });

      const eventsBefore = authEventManager.getRecentEvents();
      expect(eventsBefore.length).toBe(0);

      // Perform login
      const result = await mockAuthService.signInWithEmail('test@example.com', 'wrongpassword');
      
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);

      // Check that events were logged
      const eventsAfter = authEventManager.getRecentEvents();
      expect(eventsAfter.length).toBe(2);
      
      const loginAttempt = eventsAfter.find(e => e.type === AuthEventType.LOGIN_ATTEMPT);
      const loginFailure = eventsAfter.find(e => e.type === AuthEventType.LOGIN_FAILURE);
      
      expect(loginAttempt).toBeDefined();
      expect(loginAttempt?.userEmail).toBe('test@example.com');
      
      expect(loginFailure).toBeDefined();
      expect(loginFailure?.userEmail).toBe('test@example.com');
      expect(loginFailure?.error).toBe('Invalid credentials');
    });

    it('should log session refresh events', async () => {
      const mockSession = { access_token: 'token123' };
      
      mockAuthService.refreshSession.mockResolvedValue({
        session: mockSession,
        error: null
      });

      const eventsBefore = authEventManager.getRecentEvents();
      expect(eventsBefore.length).toBe(0);

      // Perform session refresh
      const result = await mockAuthService.refreshSession();
      
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();

      // Check that events were logged
      const eventsAfter = authEventManager.getRecentEvents();
      expect(eventsAfter.length).toBe(1);
      
      const sessionRefresh = eventsAfter.find(e => e.type === AuthEventType.SESSION_REFRESH);
      expect(sessionRefresh).toBeDefined();
      expect(sessionRefresh?.error).toBeUndefined();
    });

    it('should log session refresh failures', async () => {
      const mockError = new Error('Session expired');
      
      mockAuthService.refreshSession.mockResolvedValue({
        session: null,
        error: mockError
      });

      const eventsBefore = authEventManager.getRecentEvents();
      expect(eventsBefore.length).toBe(0);

      // Perform session refresh
      const result = await mockAuthService.refreshSession();
      
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);

      // Check that events were logged
      const eventsAfter = authEventManager.getRecentEvents();
      expect(eventsAfter.length).toBe(1);
      
      const sessionExpired = eventsAfter.find(e => e.type === AuthEventType.SESSION_EXPIRED);
      expect(sessionExpired).toBeDefined();
      expect(sessionExpired?.error).toBe('Session expired');
    });
  });

  describe('AuthContext Integration', () => {
    it('should handle login successfully', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      
      mockAuthService.signInWithEmail.mockResolvedValue({
        user: mockUser,
        session: mockSession,
        error: null
      });
      
      mockAuthService.getUserRole.mockResolvedValue(UserRole.ADMIN);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
        
        expect(loginResult.error).toBeNull();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.userRole).toBe(UserRole.ADMIN);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle logout', async () => {
      mockAuthService.signOut.mockResolvedValue({
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.userRole).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle session refresh', async () => {
      const mockSession = { access_token: 'token123', user: { id: 'user123' } };
      
      mockAuthService.refreshSession.mockResolvedValue({
        session: mockSession,
        error: null
      });
      
      mockAuthService.getUserRole.mockResolvedValue(UserRole.ADMIN);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const refreshResult = await result.current.refreshSession();
        expect(refreshResult.success).toBe(true);
        expect(refreshResult.error).toBeNull();
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.userRole).toBe(UserRole.ADMIN);
    });
  });

  describe('Session Manager', () => {
    it('should validate session successfully', async () => {
      mockAuthService.refreshSession.mockResolvedValue({
        success: true,
        error: null
      });

      const { result } = renderHook(() => useSessionManager(), { wrapper });

      await act(async () => {
        const isValid = await result.current.validateSession();
        expect(isValid).toBe(true);
      });

      expect(mockAuthService.refreshSession).toHaveBeenCalled();
    });

    it('should handle validation with custom retry count', async () => {
      mockAuthService.refreshSession.mockResolvedValue({
        success: true,
        error: null
      });

      const { result } = renderHook(() => useSessionManager({ 
        refreshInterval: 1000,
        enableAutoRefresh: false
      }), { wrapper });

      await act(async () => {
        const isValid = await result.current.validateSession();
        expect(isValid).toBe(true);
      });

      expect(mockAuthService.refreshSession).toHaveBeenCalledWith();
    });
  });

  describe('Auth Error Handler', () => {
    it('should parse invalid credentials error', () => {
      const error = new Error('Invalid login credentials');
      const parsed = parseAuthError(error);
      
      expect(parsed.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      expect(parsed.message).toBe('Invalid email or password');
    });

    it('should parse session expired error', () => {
      const error = new Error('JWT expired');
      const parsed = parseAuthError(error);
      
      expect(parsed.code).toBe(AuthErrorCode.SESSION_EXPIRED);
      expect(parsed.message).toBe('Your session has expired. Please sign in again.');
    });

    it('should parse network error', () => {
      const error = new Error('Failed to fetch');
      const parsed = parseAuthError(error);
      
      expect(parsed.code).toBe(AuthErrorCode.NETWORK_ERROR);
      expect(parsed.message).toBe('Network connection failed. Please check your internet connection and try again.');
    });

    it('should detect session expired errors', async () => {
      const { isSessionExpiredError } = await import('@/utils/authErrorHandler');
      
      const sessionExpiredError = new Error('JWT expired');
      expect(isSessionExpiredError(sessionExpiredError)).toBe(true);
      
      const otherError = new Error('Other error');
      expect(isSessionExpiredError(otherError)).toBe(false);
    });

    it('should detect recoverable errors', async () => {
      const { isRecoverableError } = await import('@/utils/authErrorHandler');
      
      const networkError = new Error('Failed to fetch');
      expect(isRecoverableError(networkError)).toBe(true);
      
      const sessionExpiredError = new Error('JWT expired');
      expect(isRecoverableError(sessionExpiredError)).toBe(true);
      
      const fatalError = new Error('Fatal error');
      expect(isRecoverableError(fatalError)).toBe(true); // Default assumption
    });
  });

  describe('Auth Event Manager', () => {
    it('should track events correctly', () => {
      // Log a few events
      authEventManager.logLoginAttempt('test@example.com');
      authEventManager.logLoginSuccess({ id: 'user123', email: 'test@example.com' } as any);
      authEventManager.logSessionRefresh('user123', true);
      
      const events = authEventManager.getRecentEvents();
      expect(events.length).toBe(3);
      
      // Check event types
      expect(events[0].type).toBe(AuthEventType.SESSION_REFRESH);
      expect(events[1].type).toBe(AuthEventType.LOGIN_SUCCESS);
      expect(events[2].type).toBe(AuthEventType.LOGIN_ATTEMPT);
    });

    it('should limit events to prevent memory issues', () => {
      // Add more events than the limit
      for (let i = 0; i < 150; i++) {
        authEventManager.logEvent({
          type: AuthEventType.LOGIN_ATTEMPT,
          userId: `user${i}`
        });
      }
      
      const events = authEventManager.getRecentEvents();
      expect(events.length).toBe(100); // Should be limited to 100
    });

    it('should export events as JSON', () => {
      authEventManager.logLoginAttempt('test@example.com');
      const exported = authEventManager.exportEvents();
      
      expect(typeof exported).toBe('string');
      expect(exported).toContain('LOGIN_ATTEMPT');
      expect(exported).toContain('test@example.com');
      
      // Should be valid JSON
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should clear events', () => {
      authEventManager.logLoginAttempt('test@example.com');
      expect(authEventManager.getRecentEvents().length).toBe(1);
      
      authEventManager.clearEvents();
      expect(authEventManager.getRecentEvents().length).toBe(0);
    });
  });
});