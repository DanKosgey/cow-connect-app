import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { authService } from '@/lib/supabase/auth-service';
import { UserRole } from '@/types/auth.types';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    insert: vi.fn()
  }))
};

// Mock the Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('AuthService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const user = await authService.getCurrentUser();
      
      expect(user).toEqual(mockUser);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const user = await authService.getCurrentUser();
      
      expect(user).toBeNull();
    });
  });

  describe('signInWithEmail', () => {
    it('should sign in user with valid credentials', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const result = await authService.signInWithEmail('test@example.com', 'password123');
      
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('should return error with invalid credentials', async () => {
      const mockError = new Error('Invalid credentials');
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      });

      const result = await authService.signInWithEmail('test@example.com', 'wrongpassword');
      
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('signUp', () => {
    it('should create user account successfully', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      const mockSession = { access_token: 'token123' };
      const signUpData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        phone: '1234567890',
        role: UserRole.FARMER
      };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const result = await authService.signUp(signUpData);
      
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null
      });

      const result = await authService.signOut();
      
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('getUserRole', () => {
    it('should return user role when exists', async () => {
      const mockRoleData = { role: UserRole.FARMER };
      
      // Mock the 'from' chain
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockRoleData,
            error: null
          })
        }))
      }));
      
      mockSupabase.from.mockReturnValue({
        select: mockSelect
      });

      const role = await authService.getUserRole('user123');
      
      expect(role).toBe(UserRole.FARMER);
    });
  });
});