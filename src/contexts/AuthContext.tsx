import React, { createContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '@/lib/supabase/auth-service';
import { UserRole } from '@/types/auth.types';

// Types
interface LoginData {
  email: string;
  password: string;
}

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  hasRole: (role: UserRole) => boolean;
}

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current user and session
  const fetchUserAndSession = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get current session
      const currentSession = await authService.getCurrentSession();
      setSession(currentSession);
      
      if (currentSession?.user) {
        setUser(currentSession.user);
        
        // Get user role
        const role = await authService.getUserRole(currentSession.user.id);
        setUserRole(role);
      } else {
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching user and session:', error);
      setUser(null);
      setSession(null);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (data: LoginData) => {
    try {
      setIsLoading(true);
      
      const { user, session, error } = await authService.signInWithEmail(
        data.email,
        data.password
      );
      
      if (error) {
        return { error };
      }
      
      if (user && session) {
        setUser(user);
        setSession(session);
        
        // Get user role
        const role = await authService.getUserRole(user.id);
        setUserRole(role);
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign up function
  const signUp = useCallback(async (data: SignUpData) => {
    try {
      setIsLoading(true);
      
      const { user, session, error } = await authService.signUp(data);
      
      if (error) {
        return { error };
      }
      
      if (user && session) {
        setUser(user);
        setSession(session);
        setUserRole(data.role);
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      await authService.signOut();
      
      setUser(null);
      setSession(null);
      setUserRole(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { session, error } = await authService.refreshSession();
      
      if (error) {
        throw error;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
        
        // Refresh user role
        const role = await authService.getUserRole(session.user.id);
        setUserRole(role);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await authService.resetPassword(email);
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  // Update password
  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await authService.updatePassword(newPassword);
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: UserRole): boolean => {
    return userRole === role;
  }, [userRole]);

  // Initialize auth state
  useEffect(() => {
    fetchUserAndSession();
  }, [fetchUserAndSession]);

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      user,
      session,
      userRole,
      isAuthenticated: !!user,
      isLoading,
      login,
      signUp,
      logout,
      refreshSession,
      resetPassword,
      updatePassword,
      hasRole
    }),
    [
      user,
      session,
      userRole,
      isLoading,
      login,
      signUp,
      logout,
      refreshSession,
      resetPassword,
      updatePassword,
      hasRole
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};