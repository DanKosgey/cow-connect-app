import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToastContext } from '@/components/ToastWrapper';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';
import type { User } from '@supabase/supabase-js';

interface UserMetadata {
  full_name?: string;
  role?: 'admin' | 'staff' | 'farmer';
  farm_details?: any;
  is_active?: boolean;
}

// Extend User type from Supabase to include our custom metadata
interface ExtendedUser extends User {
  user_metadata: UserMetadata;
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: string | string[]) => boolean;
  refreshUser: () => Promise<void>;
  userRole: string | null;
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
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToastContext();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we're authenticated with the new FastAPI auth system
        if (supabaseFastApiAuth.isAuthenticated()) {
          // Get user info from FastAPI backend
          const userData = await supabaseFastApiAuth.getCurrentUser();
          setUser(userData.user as ExtendedUser);
          setUserRole(userData.profile?.role || null);
        } else {
          // Not authenticated
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear auth state on error
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Check auth status when tab becomes visible, but with rate limiting
  useEffect(() => {
    let lastAuthCheck = Date.now();
    
    const checkAuthStatus = async () => {
      try {
        // Check if we're authenticated with the new FastAPI auth system
        if (supabaseFastApiAuth.isAuthenticated()) {
          const userData = await supabaseFastApiAuth.getCurrentUser();
          setUser(userData.user as ExtendedUser);
          setUserRole(userData.profile?.role || null);
        } else {
          // Not authenticated
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear auth state on error
        setUser(null);
        setUserRole(null);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Only check if we haven't checked recently (30 seconds)
        if (Date.now() - lastAuthCheck > 30000) {
          checkAuthStatus();
          lastAuthCheck = Date.now();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Try FastAPI auth
      const response = await supabaseFastApiAuth.login({ email, password });
      
      if (response.user) {
        // Set user and role
        setUser(response.user as ExtendedUser);
        setUserRole(response.role || null);
        
        // Show success message
        toast?.showSuccess('Login Successful', response.message || 'Welcome back!');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      toast?.showError('Login Failed', error.message || 'An unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Logout from FastAPI auth system
      await supabaseFastApiAuth.logout();
      
      // Clear local state
      setUser(null);
      setUserRole(null);
      navigate('/');
      toast?.showSuccess('Logout Successful', 'You have been logged out');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast?.showError('Logout Failed', 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      // Refresh user info from FastAPI auth system
      if (supabaseFastApiAuth.isAuthenticated()) {
        const userData = await supabaseFastApiAuth.getCurrentUser();
        setUser(userData.user as ExtendedUser);
        setUserRole(userData.profile?.role || null);
      } else {
        // Not authenticated
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('User refresh failed:', error);
      // Clear auth state on error
      setUser(null);
      setUserRole(null);
    }
  }, []);

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const currentUserRole = userRole || user?.user_metadata?.role;
    return roleArray.includes(currentUserRole);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user && supabaseFastApiAuth.isAuthenticated(),
    hasRole,
    refreshUser,
    userRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};