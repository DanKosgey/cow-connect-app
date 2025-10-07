import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthCallback from '../pages/AuthCallback';
import { AuthProvider } from '../contexts/SimplifiedAuthContext';
import * as router from 'react-router';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.spyOn(router, 'useNavigate').mockImplementation(() => mockNavigate);

// Mock the useAuth hook
const mockUseAuth = jest.fn();
jest.mock('../contexts/SimplifiedAuthContext', () => ({
  ...jest.requireActual('../contexts/SimplifiedAuthContext'),
  useAuth: () => mockUseAuth(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('redirects to complete registration when user is authenticated and has pending registration', async () => {
    // Mock authenticated user
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
    });

    // Set pending registration data
    localStorage.setItem('pending_farmer_registration', JSON.stringify({
      formData: { fullName: 'Test User' },
      documents: []
    }));

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthCallback />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for the redirect
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/complete-registration');
    });
  });

  it('redirects to email confirmation when user is not authenticated but has pending registration', async () => {
    // Mock unauthenticated user
    mockUseAuth.mockReturnValue({
      user: null,
    });

    // Set pending registration data
    localStorage.setItem('pending_farmer_registration', JSON.stringify({
      formData: { fullName: 'Test User' },
      documents: []
    }));

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthCallback />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for the redirect
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/email-confirmation');
    });
  });

  it('redirects to farmer dashboard when user is authenticated and has no pending registration', async () => {
    // Mock authenticated user
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
    });

    // No pending registration data
    localStorage.removeItem('pending_farmer_registration');

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthCallback />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for the redirect
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/farmer/dashboard');
    });
  });

  it('redirects to login when user is not authenticated and has no pending registration', async () => {
    // Mock unauthenticated user
    mockUseAuth.mockReturnValue({
      user: null,
    });

    // No pending registration data
    localStorage.removeItem('pending_farmer_registration');

    render(
      <BrowserRouter>
        <AuthProvider>
          <AuthCallback />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for the redirect
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});