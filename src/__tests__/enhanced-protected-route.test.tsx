import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EnhancedProtectedRoute } from '@/components/auth/EnhancedProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth.types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock the useSessionManager hook
const mockUseSessionManager = vi.fn();
vi.mock('@/hooks/useSessionManager', () => ({
  useSessionManager: () => mockUseSessionManager()
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

// Test components
const ProtectedComponent = () => <div>Protected Content</div>;
const LoginComponent = () => <div>Login Page</div>;

describe('EnhancedProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when user is authenticated and has required role', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isSessionRefreshing: false,
      userRole: UserRole.ADMIN,
      hasRole: (role: UserRole) => role === UserRole.ADMIN
    });

    mockUseSessionManager.mockReturnValue({
      validateSession: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route 
              path="/admin" 
              element={
                <EnhancedProtectedRoute requiredRole={UserRole.ADMIN}>
                  <ProtectedComponent />
                </EnhancedProtectedRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isSessionRefreshing: false,
      userRole: null,
      hasRole: () => false
    });

    mockUseSessionManager.mockReturnValue({
      validateSession: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route 
              path="/admin" 
              element={
                <EnhancedProtectedRoute requiredRole={UserRole.ADMIN}>
                  <ProtectedComponent />
                </EnhancedProtectedRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should redirect to user dashboard when role requirement is not met', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isSessionRefreshing: false,
      userRole: UserRole.FARMER,
      hasRole: (role: UserRole) => role === UserRole.FARMER
    });

    mockUseSessionManager.mockReturnValue({
      validateSession: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/farmer/dashboard" element={<div>Farmer Dashboard</div>} />
            <Route path="/login" element={<LoginComponent />} />
            <Route 
              path="/admin" 
              element={
                <EnhancedProtectedRoute requiredRole={UserRole.ADMIN}>
                  <ProtectedComponent />
                </EnhancedProtectedRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Farmer Dashboard')).toBeInTheDocument();
  });

  it('should show loading state during authentication check', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      isSessionRefreshing: false,
      userRole: null,
      hasRole: () => false
    });

    mockUseSessionManager.mockReturnValue({
      validateSession: vi.fn()
    });

    // We can't easily test the PageLoader component rendering,
    // but we can verify the route doesn't render protected content
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route 
              path="/admin" 
              element={
                <EnhancedProtectedRoute requiredRole={UserRole.ADMIN}>
                  <ProtectedComponent />
                </EnhancedProtectedRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should not show protected content while loading
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show loading state during session refresh', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isSessionRefreshing: true,
      userRole: UserRole.ADMIN,
      hasRole: (role: UserRole) => role === UserRole.ADMIN
    });

    mockUseSessionManager.mockReturnValue({
      validateSession: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route 
              path="/admin" 
              element={
                <EnhancedProtectedRoute requiredRole={UserRole.ADMIN}>
                  <ProtectedComponent />
                </EnhancedProtectedRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should not show protected content while refreshing
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should use fallback redirect when provided', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isSessionRefreshing: false,
      userRole: UserRole.FARMER,
      hasRole: (role: UserRole) => role === UserRole.FARMER
    });

    mockUseSessionManager.mockReturnValue({
      validateSession: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/custom-fallback" element={<div>Custom Fallback</div>} />
            <Route path="/login" element={<LoginComponent />} />
            <Route 
              path="/admin" 
              element={
                <EnhancedProtectedRoute 
                  requiredRole={UserRole.ADMIN}
                  fallbackRedirect="/custom-fallback"
                >
                  <ProtectedComponent />
                </EnhancedProtectedRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
  });
});