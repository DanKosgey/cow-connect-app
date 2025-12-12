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
  refreshUserRole: (userId: string) => Promise<UserRole | null>; // Add this new method
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

      // Get user role with retry mechanism
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: any = null;
      
      while (attempts < maxAttempts) {
        try {
          const role = await authManager.getUserRole(userId);
          
          if (role) {
            // Cache the role
            setCachedRole(userId, role);
            return role;
          } else {
            attempts++;
            if (attempts < maxAttempts) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
              continue;
            }
            return null;
          }
        } catch (error: any) {
          AdminDebugLogger.error(`Attempt ${attempts + 1}: Exception getting user role`, error);
          lastError = error;
          attempts++;
          if (attempts < maxAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            continue;
          }
        }
      }
      
      // For any errors, try fallback to cache
      const cachedFallback = getCachedRole(userId);
      if (cachedFallback) {
        AdminDebugLogger.log('Using cached role as fallback:', cachedFallback);
        return cachedFallback;
      }
      
      return null;
    } catch (error: any) {
      AdminDebugLogger.error('Exception getting user role:', error);
      
      // For any errors, try fallback to cache
      const cached = getCachedRole(userId);
      if (cached) {
        AdminDebugLogger.log('Using cached role as final fallback:', cached);
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
        return { error };
      }

      if (!data.user || !data.session) {
        AdminDebugLogger.error('Login failed - no user or session returned', { data });
        return { error: new Error('Login failed - no user or session returned') };
      }

      AdminDebugLogger.success('Auth successful, user data:', { 
        userId: data.user.id, 
        userEmail: data.user.email,
        sessionExpiresAt: data.session.expires_at
      });

      // Small delay to ensure session is fully established
      AdminDebugLogger.log('Waiting 1000ms for session to establish...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased from 500ms to 1000ms

      // Get user role with retry mechanism
      let userRole: UserRole | null = null;
      let attempts = 0;
      const maxAttempts = 5; // Increased attempts
      const retryDelay = 2000; // 2 seconds between retries
      
      while (attempts < maxAttempts && !userRole) {
        attempts++;
        AdminDebugLogger.log(`Role verification attempt ${attempts}/${maxAttempts}`);
        
        try {
          userRole = await getUserRole(data.user.id);
        } catch (roleError) {
          AdminDebugLogger.error(`Role verification attempt ${attempts} failed:`, roleError);
        }
        
        if (!userRole && attempts < maxAttempts) {
          AdminDebugLogger.log(`Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      if (!userRole) {
        AdminDebugLogger.error(`Failed to get user role after ${maxAttempts} attempts`);
        await supabase.auth.signOut();
        return { error: new Error('Unable to verify user role. Please contact support.') };
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
        return { 
          error: new Error(
            `Invalid credentials. This account is registered as ${roleNames[userRole as UserRole] || userRole}, not ${roleNames[role] || role}.`
          ) 
        };
      }

      // Update state
      AdminDebugLogger.log('Updating auth context state...');
      setUser(data.user);
      setSession(data.session);
      setUserRole(userRole);
      
      // Cache the role
      setCachedRole(data.user.id, userRole);

      AdminDebugLogger.success('Login completed successfully');
      return { error: null, userRole };
    } catch (error: any) {
      AdminDebugLogger.error('Login process error:', error);
      
      // Ensure we're logged out on any login failure
      try {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setUserRole(null);
      } catch (signOutError) {
        AdminDebugLogger.error('Error during sign out after login failure:', signOutError);
      }
      
      return { error };
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
  // REFRESH USER ROLE
  // ============================================
  const refreshUserRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    try {
      AdminDebugLogger.log('Manually refreshing user role for user:', userId);
      
      // Clear cache first
      try {
        localStorage.removeItem(`${ROLE_CACHE_KEY}_${userId}`);
      } catch (error) {
        AdminDebugLogger.error('Failed to clear role cache:', error);
      }
      
      // Get fresh role
      const role = await getUserRole(userId);
      
      if (role) {
        setUserRole(role);
        // Also cache it
        setCachedRole(userId, role);
        AdminDebugLogger.success('User role refreshed successfully:', role);
      } else {
        AdminDebugLogger.warn('No role found for user:', userId);
      }
      
      return role;
    } catch (error) {
      AdminDebugLogger.error('Error refreshing user role:', error);
      return null;
    }
  }, [getUserRole]);

  // ============================================
  // SESSION VALIDITY CHECK
  // ============================================
  const checkSessionValidity = useCallback(async () => {
    try {
      AdminDebugLogger.log('Checking session validity...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session validity check timeout')), 5000)
      );
      
      const validationPromise = authManager.validateAndRefreshSession();
      const isValid = await Promise.race([validationPromise, timeoutPromise]) as boolean;
      
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
      
      // If all validation fails, clear state
      setUser(null);
      setSession(null);
      setUserRole(null);
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
        // Add timeout to prevent hanging during initialization
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 30000) // Increased from 10s to 30s
        );
        
        const initPromise = (async () => {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            AdminDebugLogger.log('Found existing session');
            
            setUser(session.user);
            setSession(session);

            // Get user role with increased timeout and better error handling
            try {
              const roleTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Role fetch timeout')), 30000) // Keep at 30s
              );
              
              const rolePromise = getUserRole(session.user.id);
              const role = await Promise.race([rolePromise, roleTimeoutPromise]) as UserRole | null;
              setUserRole(role);
              
              // If role fetch failed, try again with more patience
              if (!role) {
                AdminDebugLogger.warn('First role fetch failed, trying again with longer timeout...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                const retryRole = await getUserRole(session.user.id);
                setUserRole(retryRole);
                if (retryRole) {
                  AdminDebugLogger.success('Role fetch succeeded on retry');
                }
              }
            } catch (roleError) {
              AdminDebugLogger.error('Error fetching user role during initialization:', roleError);
              // Try without timeout as fallback
              try {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                const role = await getUserRole(session.user.id);
                setUserRole(role);
                if (role) {
                  AdminDebugLogger.success('Role fetch succeeded on fallback');
                }
              } catch (fallbackError) {
                AdminDebugLogger.error('Fallback role fetch also failed:', fallbackError);
                setUserRole(null);
              }
            }
          } else {
            AdminDebugLogger.log('No existing session');
          }
        })();
        
        await Promise.race([initPromise, timeoutPromise]);
      } catch (error) {
        AdminDebugLogger.error('Auth initialization error:', error);
        // Clear any partial state on error
        setUser(null);
        setSession(null);
        setUserRole(null);
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
          
          // Add increased timeout for role fetching and better error handling
          try {
            const roleTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Role fetch timeout')), 30000)
            );
            
            const rolePromise = getUserRole(session.user.id);
            const role = await Promise.race([rolePromise, roleTimeoutPromise]) as UserRole | null;
            setUserRole(role);
            
            // If role fetch failed, try again
            if (!role) {
              AdminDebugLogger.warn('First role fetch failed on auth state change, trying again...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              const retryRole = await getUserRole(session.user.id);
              setUserRole(retryRole);
            }
          } catch (roleError) {
            AdminDebugLogger.error('Error fetching user role:', roleError);
            // Try without timeout as fallback
            try {
              await new Promise(resolve => setTimeout(resolve, 3000));
              const role = await getUserRole(session.user.id);
              setUserRole(role);
            } catch (fallbackError) {
              AdminDebugLogger.error('Fallback role fetch also failed:', fallbackError);
              setUserRole(null);
            }
          }
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
      clearAuthCache,
      refreshUserRole // Add the new method
    }),
    [user, session, userRole, loading, login, signUp, signOut, refreshSession, clearAuthCache, refreshUserRole]
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