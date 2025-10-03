import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';

interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  farm_details?: any;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    setLoading(true);
    try {
      if (supabaseFastApiAuth.isAuthenticated()) {
        const data = await supabaseFastApiAuth.getCurrentUser();
        setUser((data as any)?.user || null);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const resp = await supabaseFastApiAuth.login({ email: username, password });
      setUser((resp as any)?.user || null);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabaseFastApiAuth.logout();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const data = await supabaseFastApiAuth.getCurrentUser();
      setUser((data as any)?.user || null);
    } catch (error) {
      console.error('User refresh failed:', error);
      setUser(null);
    }
  }, []);

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};