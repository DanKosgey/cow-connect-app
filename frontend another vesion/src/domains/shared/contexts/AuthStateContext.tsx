import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthStateContext = createContext<AuthState | undefined>(undefined);

export const useAuthState = (): AuthState => {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within an AuthStateProvider');
  }
  return context;
};

export const AuthStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    setLoading(true);
    try {
      setIsAuthenticated(supabaseFastApiAuth.isAuthenticated());
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      await supabaseFastApiAuth.login({ email: username, password });
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsAuthenticated(false);
    await supabaseFastApiAuth.logout();
  };

  const value: AuthState = {
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return (
    <AuthStateContext.Provider value={value}>
      {children}
    </AuthStateContext.Provider>
  );
};