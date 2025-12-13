import React, { createContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '@/lib/supabase/auth-service';
import { UserRole } from '@/types/auth.types';
import { supabase } from '@/integrations/supabase/client';
import { authEventManager } from '@/utils/authLogger';

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
  isSessionRefreshing: boolean;
  login: (data: LoginData) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshSession: (maxRetries?: number) => Promise<{ success: boolean; error: Error | null }>;
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
  const [isSessionRefreshing, setIsSessionRefreshing] = useState<boolean>(false);
  const [isFetchingRole, setIsFetchingRole] = useState<boolean>(false);
  
  // Refs to prevent infinite loops
  const isHandlingAuthEvent = useRef(false);
  const lastRefreshTime = useRef(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refreshes
  const isProcessingRefresh = useRef(false); // New ref to prevent concurrent refresh processing

  // Fetch current user and session with validation
  const fetchUserAndSession = useCallback(async (validate: boolean = true) => {
    try {
      setIsLoading(true);
      
      // Get current session
      const currentSession = await authService.getCurrentSession(validate);
      setSession(currentSession);
      
      if (currentSession?.user) {
        setUser(currentSession.user);
        
        // Get user role with caching
        const role = await authService.getUserRole(currentSession.user.id);
        setUserRole(role);
        
        // Cache the role in the service
        (authService as any).userRole = role;
      } else {
        setUser(null);
        setUserRole(null);
        (authService as any).userRole = null;
      }
    } catch (error) {
      console.error('Error fetching user and session:', error);
      setUser(null);
      setSession(null);
      setUserRole(null);
      (authService as any).userRole = null;
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
        
        // Get user role with caching
        const role = await authService.getUserRole(user.id);
        setUserRole(role);
        (authService as any).userRole = role;
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
      (authService as any).userRole = null;
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh session with cooldown protection
  const refreshSession = useCallback(async (maxRetries: number = 3) => {
    // Prevent concurrent refresh processing
    if (isProcessingRefresh.current) {
      console.log('🔑 [AuthContext] Refresh already processing, skipping');
      return { success: true, error: null };
    }
    
    // Cooldown check - prevent refreshes within 5 seconds of each other
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;
    
    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      console.log(`🔑 [AuthContext] Refresh cooldown active (${MIN_REFRESH_INTERVAL - timeSinceLastRefresh}ms remaining)`);
      return { success: true, error: null };
    }
    
    // Prevent concurrent refreshes
    if (isSessionRefreshing) {
      console.log('🔑 [AuthContext] Refresh already in progress, skipping');
      return { success: false, error: new Error('Refresh already in progress') };
    }
    
    // Clear any pending refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Add safety timeout to ensure loading states are always reset
    const safetyTimeout = setTimeout(() => {
      console.warn('[AuthContext] Safety timeout: Forcing loading states to false');
      setIsSessionRefreshing(false);
      setIsLoading(false);
      isProcessingRefresh.current = false;
    }, 30000); // 30 seconds safety timeout
    
    try {
      isProcessingRefresh.current = true;
      lastRefreshTime.current = now;
      setIsSessionRefreshing(true);
      setIsLoading(true);
      
      console.log('🔑 [AuthContext] Starting session refresh');
      
      // Use debounced refresh to prevent infinite loops
      const result = await authService.debouncedRefreshSession();
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.session) {
        setSession(result.session);
        setUser(result.session.user);
        
        // Refresh user role only if not already fetching
        if (!isFetchingRole) {
          setIsFetchingRole(true);
          try {
            const role = await authService.getUserRole(result.session.user.id);
            setUserRole(role);
            (authService as any).userRole = role;
          } finally {
            setIsFetchingRole(false);
          }
        }
      }
      
      console.log('🔑 [AuthContext] Session refresh completed successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('🔑 [AuthContext] Session refresh error:', error);
      return { success: false, error: error as Error };
    } finally {
      // Ensure loading states are always reset even if there's an unhandled error
      clearTimeout(safetyTimeout); // Clear the safety timeout
      setTimeout(() => {
        setIsSessionRefreshing(false);
        setIsLoading(false);
        isProcessingRefresh.current = false;
        console.log('🔑 [AuthContext] Session refresh states cleared');
      }, 100);
    }
  }, [isFetchingRole, isSessionRefreshing]);

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

  // Set up auth state change listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Prevent recursive event handling
      if (isHandlingAuthEvent.current) {
        console.log('🔑 [AuthContext] Skipping recursive event:', event);
        return;
      }
      
      isHandlingAuthEvent.current = true;
      
      console.log('🔑 [AuthContext] Auth state change detected:', event, {
        userId: session?.user?.id,
        hasSession: !!session,
        timestamp: new Date().toISOString()
      });
      
      // Use setTimeout to reset the flag after current execution
      const resetFlag = () => {
        setTimeout(() => {
          isHandlingAuthEvent.current = false;
        }, 100);
      };
      
      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            console.log('🔑 [AuthContext] SIGNED_IN: Setting user and session');
            setUser(session.user);
            setSession(session);
            
            // Get user role if not already fetching
            if (!isFetchingRole) {
              console.log('🔑 [AuthContext] SIGNED_IN: Fetching user role for:', session.user.id);
              setIsFetchingRole(true);
              authService.getUserRole(session.user.id).then(role => {
                console.log('🔑 [AuthContext] SIGNED_IN: User role fetched:', role);
                setUserRole(role);
              }).catch(error => {
                console.error('🔑 [AuthContext] SIGNED_IN: Error fetching user role:', error);
              }).finally(() => {
                setIsFetchingRole(false);
              });
            }
          }
          resetFlag();
          break;
          
        case 'SIGNED_OUT':
          console.log('🔑 [AuthContext] SIGNED_OUT: Clearing user data');
          setUser(null);
          setSession(null);
          setUserRole(null);
          resetFlag();
          break;
          
        case 'TOKEN_REFRESHED':
          // CRITICAL: Just update the session, DON'T trigger any additional operations
          if (session?.user) {
            console.log('🔑 [AuthContext] TOKEN_REFRESHED: Updating session (no role refetch)');
            setSession(session);
            setUser(session.user);
            // DON'T refetch role on TOKEN_REFRESHED - it causes loops
          }
          resetFlag();
          break;
          
        case 'USER_UPDATED':
          if (session?.user) {
            console.log('🔑 [AuthContext] USER_UPDATED: Updating user');
            setUser(session.user);
          }
          resetFlag();
          break;
          
        case 'INITIAL_SESSION':
          if (session?.user) {
            console.log('🔑 [AuthContext] INITIAL_SESSION: Setting initial user and session');
            setUser(session.user);
            setSession(session);
            
            // Get user role if not already fetching
            if (!isFetchingRole) {
              console.log('🔑 [AuthContext] INITIAL_SESSION: Fetching user role for:', session.user.id);
              setIsFetchingRole(true);
              authService.getUserRole(session.user.id).then(role => {
                console.log('🔑 [AuthContext] INITIAL_SESSION: User role fetched:', role);
                setUserRole(role);
              }).catch(error => {
                console.error('🔑 [AuthContext] INITIAL_SESSION: Error fetching user role:', error);
              }).finally(() => {
                setIsFetchingRole(false);
              });
            }
          }
          resetFlag();
          break;
          
        default:
          resetFlag();
          break;
      }
    });

    // Cleanup listener
    return () => {
      authListener.subscription.unsubscribe();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isFetchingRole]); // Only depend on isFetchingRole

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      user,
      session,
      userRole,
      isAuthenticated: !!user,
      isLoading,
      isSessionRefreshing,
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
      isSessionRefreshing,
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