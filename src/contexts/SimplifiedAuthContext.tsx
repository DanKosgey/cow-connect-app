import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth.types';
import AdminDebugLogger from '@/utils/adminDebugLogger';
import { authManager } from '@/utils/authManager';

// ============================================
// TYPES
// ============================================

interface LoginData {
  email: string;
  password: string;
  role?: UserRole;
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
  loading: boolean;
  login: (data: LoginData) => Promise<{ error: any; userRole?: UserRole | null }>;
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<{ success: boolean; error?: any }>;
  clearAuthCache: () => void;
}

// ============================================
// CONTEXT CREATION
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// HELPER FUNCTIONS
// ============================================

const ROLE_CACHE_KEY = 'auth_role_cache';
const ROLE_CACHE_TTL = 10 * 60 * 1000; // Increased to 10 minutes

// Get cached role
const getCachedRole = (userId: string): UserRole | null => {
  try {
    const cached = localStorage.getItem(`${ROLE_CACHE_KEY}_${userId}`);
    if (!cached) return null;

    const { role, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > ROLE_CACHE_TTL) {
      localStorage.removeItem(`${ROLE_CACHE_KEY}_${userId}`);
      return null;
    }

    return role;
  } catch {
    return null;
  }
};

// Set cached role
const setCachedRole = (userId: string, role: UserRole) => {
  try {
    localStorage.setItem(
      `${ROLE_CACHE_KEY}_${userId}`,
      JSON.stringify({ role, timestamp: Date.now() })
    );
    // Also set a global cached role for quick access
    localStorage.setItem('cached_role', role);
    localStorage.setItem('auth_cache_timestamp', Date.now().toString());
  } catch (error) {
    AdminDebugLogger.error('Failed to cache role:', error);
  }
};

// Clear auth cache
const clearAuthCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(ROLE_CACHE_KEY) || key.startsWith('sb-') || key.startsWith('supabase-') || 
          key === 'cached_role' || key === 'auth_cache_timestamp') {
        localStorage.removeItem(key);
      }
    });
    AdminDebugLogger.success('Auth cache cleared successfully');
  } catch (error) {
    AdminDebugLogger.error('Failed to clear auth cache:', error);
  }
};

// ============================================
// AUTH PROVIDER
// ============================================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  
  const initializingRef = useRef(false);
  const mounted = useRef(true);
  const sessionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // GET USER ROLE
  // ============================================
  const getUserRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    try {
      AdminDebugLogger.log('Starting getUserRole for user:', userId);
      
      // Check cache first
      const cached = getCachedRole(userId);
      if (cached) {
        AdminDebugLogger.log('Using cached role:', cached);
        return cached;
      }

      // Use the auth manager to get user role
      const role = await authManager.getUserRole(userId);
      
      if (role) {
        // Cache the role
        setCachedRole(userId, role);
        return role;
      }
      
      return null;
    } catch (error: any) {
      AdminDebugLogger.error('Exception getting user role:', error);
      AdminDebugLogger.error('Exception stack:', error.stack);
      
      // For any errors, try fallback to cache
      const cached = getCachedRole(userId);
      if (cached) {
        AdminDebugLogger.log('Using cached role as fallback:', cached);
        return cached;
      }
      
      return null;
    }
  }, []);

  // ============================================
  // SIGN OUT
  // ============================================
  const signOut = useCallback(async () => {
    try {
      AdminDebugLogger.log('Signing out...');
      
      // Use auth manager to sign out
      await authManager.signOut();

      // Clear state
      setUser(null);
      setSession(null);
      setUserRole(null);

      AdminDebugLogger.success('Signed out successfully');
    } catch (error) {
      AdminDebugLogger.error('Sign out error:', error);
    }
  }, []);

  // ============================================
  // LOGIN
  // ============================================
  const login = useCallback(async ({ email, password, role }: LoginData) => {
    try {
      AdminDebugLogger.log('Attempting login...', { email, role });

      // Sign in with Supabase
      AdminDebugLogger.log('Calling Supabase auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        AdminDebugLogger.error('Supabase auth error:', error);
        throw error;
      }

      if (!data.user || !data.session) {
        AdminDebugLogger.error('Login failed - no user or session returned', { data });
        throw new Error('Login failed - no user or session returned');
      }

      AdminDebugLogger.success('Auth successful, user data:', { 
        userId: data.user.id, 
        userEmail: data.user.email,
        sessionExpiresAt: data.session.expires_at
      });

      // Small delay to ensure session is fully established
      AdminDebugLogger.log('Waiting 500ms for session to establish...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify user role with retries
      let userRole: UserRole | null = null;
      let attempts = 0;
      const maxAttempts = 5; // Increased attempts for debugging

      AdminDebugLogger.log(`Starting role verification with max ${maxAttempts} attempts`);
      
      while (attempts < maxAttempts && !userRole) {
        attempts++;
        AdminDebugLogger.log(`Role verification attempt ${attempts}/${maxAttempts}`);
        
        userRole = await getUserRole(data.user.id);
        AdminDebugLogger.log(`Role verification attempt ${attempts} result:`, userRole);
        
        if (!userRole && attempts < maxAttempts) {
          // Wait before retry
          AdminDebugLogger.log(`Waiting 1000ms before retry ${attempts + 1}/${maxAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!userRole) {
        AdminDebugLogger.error(`Failed to get user role after ${maxAttempts} attempts`);
        await supabase.auth.signOut();
        throw new Error('Unable to verify user role. Please contact support.');
      }

      AdminDebugLogger.success('User role verified:', userRole);

      // ✅ FIXED: Only check role match if role was provided
      if (role && userRole !== role) {
        AdminDebugLogger.error('Role mismatch:', { expected: role, actual: userRole });
        await supabase.auth.signOut();
        const roleNames: Record<UserRole, string> = {
          [UserRole.ADMIN]: 'Admin',
          [UserRole.STAFF]: 'Staff',
          [UserRole.FARMER]: 'Farmer',
          [UserRole.COLLECTOR]: 'Collector',
          [UserRole.CREDITOR]: 'Creditor'
        };
        throw new Error(
          `Invalid credentials. This account is registered as ${roleNames[userRole as UserRole] || userRole}, not ${roleNames[role] || role}.`
        );
      }

      // Update state
      AdminDebugLogger.log('Updating auth context state...');
      setUser(data.user);
      setSession(data.session);
      setUserRole(userRole);

      AdminDebugLogger.success('Login successful! Final state:', { 
        userId: data.user.id, 
        userEmail: data.user.email,
        userRole: userRole,
        sessionToken: data.session.access_token ? 'present' : 'missing'
      });
      
      // ✅ RETURN THE FETCHED ROLE so the login page can check it
      return { error: null, userRole };
      
    } catch (error: any) {
      AdminDebugLogger.error('Login failed:', error);
      AdminDebugLogger.error('Login failed - stack:', error.stack);
      
      // Ensure we're signed out on error
      try {
        AdminDebugLogger.log('Signing out due to error...');
        await supabase.auth.signOut();
        AdminDebugLogger.success('Signed out successfully');
      } catch (signOutError) {
        AdminDebugLogger.error('Error signing out after login failure:', signOutError);
      }
      
      return { error, userRole: null };
    }
  }, [getUserRole]);

  // ============================================
  // SIGN UP
  // ============================================
  const signUp = useCallback(async ({ email, password, fullName, phone, role }: SignUpData) => {
    try {
      AdminDebugLogger.log('Signing up...', { email, role });

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed');

      const userId = data.user.id;

      // Wait for profile to be created (by trigger)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: role }]);

      if (roleError && roleError.code !== '23505') {
        throw roleError;
      }

      // Create role-specific record
      if (role === 'farmer') {
        const { error: farmerError } = await supabase
          .from('farmers')
          .insert([{
            user_id: userId,
            registration_number: `F-${Date.now()}`,
            full_name: fullName,
            phone_number: phone,
            kyc_status: 'pending',
            registration_completed: false
          }]);

        if (farmerError && farmerError.code !== '23505') {
          throw farmerError;
        }
      } else if (role === 'staff') {
        const { error: staffError } = await supabase
          .from('staff')
          .insert([{
            user_id: userId,
            employee_id: `STAFF-${Date.now()}`
          }]);

        if (staffError && staffError.code !== '23505') {
          throw staffError;
        }
      }

      AdminDebugLogger.success('Sign up successful');
      return { error: null };
    } catch (error: any) {
      AdminDebugLogger.error('Sign up error:', error);
      return { error };
    }
  }, []);

  // ============================================
  // REFRESH SESSION
  // ============================================
  const refreshSession = useCallback(async () => {
    try {
      AdminDebugLogger.log('Refreshing session...');

      // Use auth manager to refresh session
      const success = await authManager.refreshSession();
      
      if (!success) {
        AdminDebugLogger.error('Session refresh failed');
        return { success: false, error: new Error('Session refresh failed') };
      }

      // Get updated session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        AdminDebugLogger.warn('No session returned from refresh');
        return { success: false, error: new Error('No session returned') };
      }

      setUser(session.user);
      setSession(session);

      // Update role
      const role = await getUserRole(session.user.id);
      setUserRole(role);

      AdminDebugLogger.success('Session refreshed');
      return { success: true };
    } catch (error: any) {
      AdminDebugLogger.error('Refresh session error:', error);
      
      // If it's an auth error, sign out
      const authErrorIndicators = [
        'Invalid authentication credentials',
        'JWT expired',
        'Not authenticated',
        'invalid token',
        'token expired'
      ];
      
      const isAuthError = authErrorIndicators.some(indicator => 
        error.message?.includes(indicator)
      );
      
      if (isAuthError) {
        AdminDebugLogger.log('Session invalid during refresh, signing out...');
        await signOut();
      }
      
      // Try fallback approach
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          setSession(session);
          const role = await getUserRole(session.user.id);
          setUserRole(role);
          AdminDebugLogger.success('Fallback session retrieval successful');
          return { success: true };
        }
      } catch (fallbackError) {
        AdminDebugLogger.error('Fallback session retrieval error:', fallbackError);
      }
      
      return { success: false, error };
    }
  }, [getUserRole, signOut]);

  // ============================================
  // SESSION VALIDITY CHECK
  // ============================================
  const checkSessionValidity = useCallback(async () => {
    try {
      AdminDebugLogger.log('Checking session validity...');
      
      // Use auth manager to validate session
      const isValid = await authManager.validateAndRefreshSession();
      
      if (!isValid) {
        AdminDebugLogger.log('Session is not valid');
        setUser(null);
        setSession(null);
        setUserRole(null);
        return false;
      }
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        AdminDebugLogger.log('No active session found');
        setUser(null);
        setSession(null);
        setUserRole(null);
        return false;
      }
      
      AdminDebugLogger.log('Session is valid');
      return true;
    } catch (error) {
      AdminDebugLogger.error('Session validity check error:', error);
      
      // Try fallback validation
      try {
        const isFallbackValid = await authManager.isSessionValid();
        if (isFallbackValid) {
          AdminDebugLogger.log('Fallback validation successful');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setSession(session);
            const role = await getUserRole(session.user.id);
            setUserRole(role);
            return true;
          }
        }
      } catch (fallbackError) {
        AdminDebugLogger.error('Fallback validation error:', fallbackError);
      }
      
      return false;
    }
  }, []);

  // ============================================
  // INITIALIZE AUTH
  // ============================================
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    AdminDebugLogger.log('Initializing auth...');

    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          AdminDebugLogger.log('Found existing session');
          
          setUser(session.user);
          setSession(session);

          // Get user role
          const role = await getUserRole(session.user.id);
          setUserRole(role);
        } else {
          AdminDebugLogger.log('No existing session');
        }
      } catch (error) {
        AdminDebugLogger.error('Auth initialization error:', error);
      } finally {
        if (mounted.current) {
          setLoading(false);
          AdminDebugLogger.success('Auth initialized');
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return;

        AdminDebugLogger.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setSession(session);
          
          const role = await getUserRole(session.user.id);
          setUserRole(role);
        } 
        else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setUserRole(null);
          clearAuthCache();
        }
        else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
          setUser(session.user);
        }
      }
    );

    initAuth();

    // Cleanup
    return () => {
      mounted.current = false;
      if (sessionCheckTimeoutRef.current) {
        clearTimeout(sessionCheckTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [getUserRole]);

  // ============================================
  // CONTEXT VALUE
  // ============================================
  const contextValue = useMemo(
    () => ({
      user,
      session,
      userRole,
      loading,
      login,
      signUp,
      signOut,
      refreshSession,
      clearAuthCache
    }),
    [user, session, userRole, loading, login, signUp, signOut, refreshSession, clearAuthCache]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// USE AUTH HOOK
// // ============================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};