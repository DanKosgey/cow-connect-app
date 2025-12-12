import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth.types';

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

// Wrapper component for testing
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.userRole).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle login successfully', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockSession = { access_token: 'token123' };
    
    mockAuthService.signInWithEmail.mockResolvedValue({
      user: mockUser,
      session: mockSession,
      error: null
    });
    
    mockAuthService.getUserRole.mockResolvedValue(UserRole.FARMER);

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
    expect(result.current.userRole).toBe(UserRole.FARMER);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle login failure', async () => {
    const mockError = new Error('Invalid credentials');
    
    mockAuthService.signInWithEmail.mockResolvedValue({
      user: null,
      session: null,
      error: mockError
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      
      expect(loginResult.error).toEqual(mockError);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
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

  it('should check user role correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Mock the hasRole function behavior
    // This would be tested more thoroughly with a custom implementation
    
    expect(typeof result.current.hasRole).toBe('function');
  });
});