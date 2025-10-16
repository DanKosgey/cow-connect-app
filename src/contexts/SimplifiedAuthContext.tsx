import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth.types';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { logger } from '@/utils/logger';
import { executeWithTimeout, executeWithRetry } from '@/utils/supabaseUtils';

interface LoginData {
  email: string;
  password: string;
  role: UserRole;
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
  login: (data: LoginData) => Promise<{ error: any }>;
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  processPendingProfile: (userId: string) => Promise<void>;
  clearAllAuthData: () => Promise<void>;
  refreshSession: () => Promise<{ success: boolean; session?: Session; error?: any }>;
  resetAuthState: () => Promise<void>; // Add the new function to the interface
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Add a global flag to prevent multiple AuthProvider instances from initializing simultaneously
let globalAuthInitializing = false;
let globalUser: User | null = null;
let globalUserRole: UserRole | null = null;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(globalUser);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(globalUserRole);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [initializing, setInitializing] = useState(true);
  const [initTimeout, setInitTimeout] = useState(false);
  const initAttempted = useRef(false);

  // Global flag to track if auth initialization is in progress
  const isAuthInitializing = useRef(false);

  // Define signOut function early to avoid circular dependency issues
  const [signOutInProgress, setSignOutInProgress] = useState(false);
  
  const signOut = useCallback(async () => {
    // Prevent multiple simultaneous signOut calls
    if (signOutInProgress) {
      logger.debug('Sign out already in progress, skipping');
      return;
    }
    
    setSignOutInProgress(true);
    const id = performanceMonitor.startTiming('signOut');
    try {
      logger.info('Signing out user');
      
      // Sign out from Supabase with timeout
      const { error } = await executeWithTimeout(supabase.auth.signOut(), 30000);
      
      if (error) {
        logger.errorWithContext('Supabase signOut', error);
      }
      
      // Clear local storage items related to auth
      try {
        // Clear specific auth-related items instead of all localStorage
        const itemsToRemove = [
          'cached_user', 
          'cached_role', 
          'auth_cache_timestamp',
          'pending_profile',
          'last_auth_clear_time'
        ];
        
        itemsToRemove.forEach(item => {
          localStorage.removeItem(item);
        });
        
        // Clear specific Supabase items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase-')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear sessionStorage
        window.sessionStorage.clear();
      } catch (e) {
        logger.warn('Could not clear storage', e);
      }
    } catch (error) {
      logger.errorWithContext('Sign out process', error);
    } finally {
      // Always reset state regardless of errors
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      // Reset signOutInProgress flag
      setSignOutInProgress(false);
      
      // Force a small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      performanceMonitor.endTiming(id, 'signOut');
    }
  }, [signOutInProgress]);

  // Handle app close event
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      logger.debug('App is being closed, attempting to clean up session');
      try {
        // Note: Browsers limit what can be done in beforeunload handlers
      } catch (error) {
        logger.errorWithContext('beforeunload cleanup', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Update last activity on user interaction
  useEffect(() => {
    const updateLastActivity = () => {
      const now = Date.now();
      // Only update if it's been more than 1 second since last update to prevent excessive state updates
      if (now - lastActivity > 1000) {
        setLastActivity(now);
      }
    };

    window.addEventListener('mousedown', updateLastActivity);
    window.addEventListener('keydown', updateLastActivity);
    window.addEventListener('scroll', updateLastActivity);
    window.addEventListener('touchstart', updateLastActivity);

    return () => {
      window.removeEventListener('mousedown', updateLastActivity);
      window.removeEventListener('keydown', updateLastActivity);
      window.removeEventListener('scroll', updateLastActivity);
      window.removeEventListener('touchstart', updateLastActivity);
    };
  }, [lastActivity]); // Add lastActivity to dependencies

  // Check for session timeout - increased timeout and improved handling
  useEffect(() => {
    // Increase session timeout to 2 hours instead of 30 minutes
    const sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours
    const checkTimeout = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity > sessionTimeout && user) {
        logger.info('Session timeout reached, signing out');
        signOut();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes instead of every minute

    return () => clearInterval(checkTimeout);
  }, [lastActivity, user, signOut]);

  const getUserRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    const id = performanceMonitor.startTiming('getUserRole');
    try {
      logger.debug('Getting user role for user', { userId });
      
      // First check if we have a cached role that's still valid
      const cachedRole = localStorage.getItem('cached_role');
      const cacheTimestamp = localStorage.getItem('auth_cache_timestamp');
      
      if (cachedRole && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        // Use cached role if it's less than 30 minutes old (increased from 15)
        if (cacheAge < 30 * 60 * 1000) {
          logger.debug('Using cached user role', { cachedRole, cacheAge });
          return cachedRole as UserRole;
        }
      }
      
      // Use retry logic with timeout for better reliability
      logger.debug('Fetching user role from database');
      const roleData = await executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (error) throw error;
        logger.debug('Got role data from database', { data });
        return data;
      }, 2, 15000, 1000); // 2 retries, 15s timeout, 1s initial delay

      if (!roleData) {
        // Try a simpler query as fallback
        try {
          logger.debug('Trying fallback query for user role');
          const fallbackData = await executeWithRetry(async () => {
            const { data, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId);
              
            if (error) throw error;
            logger.debug('Got fallback role data from database', { length: data?.length });
            return data;
          }, 1, 10000, 500);
          
          if (fallbackData && fallbackData.length > 0) {
            const role = fallbackData[0].role as UserRole;
            // Cache the role
            localStorage.setItem('cached_role', role);
            localStorage.setItem('auth_cache_timestamp', Date.now().toString());
            return role;
          }
        } catch (fallbackError) {
          logger.errorWithContext('getUserRole fallback', fallbackError);
        }
        
        // Return cached role if available even if fetch fails
        if (cachedRole) {
          return cachedRole as UserRole;
        }
        return null;
      }

      const role = roleData.role as UserRole;
      // Cache the role
      localStorage.setItem('cached_role', role);
      localStorage.setItem('auth_cache_timestamp', Date.now().toString());
      logger.debug('Successfully fetched and cached user role', { role });
      return role;
    } catch (error) {
      logger.errorWithContext('getUserRole exception', error);
      
      // Return cached role if available even if fetch fails
      const cachedRole = localStorage.getItem('cached_role');
      if (cachedRole) {
        logger.info('Using cached role due to exception', { cachedRole });
        return cachedRole as UserRole;
      }
      
      // Try one more time with a simpler approach
      try {
        logger.debug('Trying retry query for user role');
        const retryData = await executeWithRetry(async () => {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);
            
          if (error) throw error;
          logger.debug('Got retry role data from database', { length: data?.length });
          return data;
        }, 1, 15000, 1000);
        
        if (retryData && retryData.length > 0) {
          const role = retryData[0].role as UserRole;
          // Cache the role
          localStorage.setItem('cached_role', role);
          localStorage.setItem('auth_cache_timestamp', Date.now().toString());
          return role;
        }
      } catch (retryError) {
        logger.errorWithContext('getUserRole retry', retryError);
      }
      
      return null;
    } finally {
      performanceMonitor.endTiming(id, 'getUserRole');
    }
  }, []);

  // Enhanced session validation function with better error handling
  const validateSession = useCallback(async (): Promise<boolean> => {
    const id = performanceMonitor.startTiming('validateSession');
    try {
      logger.debug('Starting session validation');
      
      // Get the current session
      logger.debug('Getting session from Supabase');
      const { data: { session }, error } = await supabase.auth.getSession();
      logger.debug('Got session response', { session: !!session, error: !!error });
      
      if (error) {
        logger.errorWithContext('validateSession - getSession', error);
        // Even if there's an error getting the session, check if we have a cached session
        const cachedUser = localStorage.getItem('cached_user');
        if (cachedUser) {
          logger.info('Using cached session due to getSession error');
          return true;
        }
        return false;
      }

      // If no session exists, it's not valid
      if (!session) {
        logger.debug('No session found during validation');
        return false;
      }

      // Check if session has expired
      if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
        logger.debug('Session has expired');
        return false;
      }

      // Validate the user still exists and is active
      logger.debug('Getting user data from Supabase');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      logger.debug('Got user data response', { userData: !!userData, userError: !!userError });
      
      if (userError || !userData?.user) {
        // Even if there's an error getting the user, check if we have a cached user
        const cachedUser = localStorage.getItem('cached_user');
        if (cachedUser) {
          logger.info('Using cached user due to getUser error');
          return true;
        }
        logger.debug('No user data found during validation');
        return false;
      }

      // Check if user role still exists with timeout and better error handling
      try {
        logger.debug('Validating user role');
        const roleTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Role validation timeout')), 10000) // Reduced timeout to 10s
        );
        
        const rolePromise = getUserRole(userData.user.id);
        
        const roleResult = await Promise.race([
          rolePromise,
          roleTimeout
        ]).catch(error => {
          logger.errorWithContext('Role validation timeout', error);
          // Even if role validation fails, we might still have a valid session
          // Let's check if we have cached role data
          const cachedRole = localStorage.getItem('cached_role');
          if (cachedRole) {
            logger.info('Using cached role due to timeout', { cachedRole });
            return cachedRole as UserRole;
          }
          // Even without a cached role, we might still have a valid session
          // Return a placeholder to indicate the session is valid but role is unknown
          return 'session_valid_no_role';
        });
        
        // If we got a special placeholder, it means session is valid but role is unknown
        if (roleResult === 'session_valid_no_role') {
          logger.warn('Session valid but role unknown, allowing access');
          return true;
        }
        
        // If we don't have a role but have a valid session, we'll still allow it
        if (!roleResult) {
          logger.warn('No role found for user, but session may be valid');
          // Still allow access - the ProtectedRoute will handle role checking
          return true;
        }

        logger.debug('Session validation successful', { role: roleResult });
        return true;
      } catch (roleError) {
        logger.errorWithContext('validateSession - role validation', roleError);
        // Even if role validation fails, if we have a cached session, we might still be valid
        const cachedUser = localStorage.getItem('cached_user');
        if (cachedUser) {
          logger.info('Using cached session due to role validation error');
          return true;
        }
        return false;
      }
    } catch (error) {
      logger.errorWithContext('validateSession exception', error);
      // Even if validation fails, if we have a cached session, we might still be valid
      const cachedUser = localStorage.getItem('cached_user');
      if (cachedUser) {
        logger.info('Using cached session due to validation exception');
        return true;
      }
      return false;
    } finally {
      performanceMonitor.endTiming(id, 'validateSession');
    }
  }, [getUserRole]);

  useEffect(() => {
    // Prevent multiple initialization attempts across different AuthProvider instances
    if (globalAuthInitializing) {
      logger.debug('Global auth initialization already in progress, waiting');
      // Wait a bit and then check if initialization completed
      const checkInterval = setInterval(() => {
        if (!globalAuthInitializing) {
          clearInterval(checkInterval);
          // Use the global state if it's now available
          if (globalUser && globalUserRole) {
            setUser(globalUser);
            setUserRole(globalUserRole);
            setSession({ user: globalUser } as Session);
            setLoading(false);
            setInitializing(false);
          }
        }
      }, 100);
      
      // Clean up the interval after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 5000);
      
      return;
    }
    
    // Prevent multiple initialization attempts within this instance
    if (initAttempted.current) {
      logger.debug('Auth initialization already attempted in this instance, skipping');
      if (user && userRole) {
        // If we already have user data, we're ready
        setLoading(false);
        setInitializing(false);
      }
      return;
    }
    
    initAttempted.current = true;
    globalAuthInitializing = true;
    
    // Check if we already have a valid session from localStorage cache
    const cachedUser = localStorage.getItem('cached_user');
    const cachedRole = localStorage.getItem('cached_role');
    const cacheTimestamp = localStorage.getItem('auth_cache_timestamp');
    
    // If we have recent cached data, use it immediately
    if (cachedUser && cachedRole && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      // If cache is less than 2 hours old, use it immediately
      if (cacheAge < 2 * 60 * 60 * 1000) {
        try {
          const user = JSON.parse(cachedUser);
          logger.debug('Using cached auth data immediately', { cacheAge: Math.round(cacheAge/1000) + 's' });
          setUser(user);
          setSession({ user } as Session); // Create a minimal session object
          setUserRole(cachedRole as UserRole);
          globalUser = user;
          globalUserRole = cachedRole as UserRole;
          setLoading(false);
          setInitializing(false);
          globalAuthInitializing = false;
          // Return early since we have valid cached data
          return;
        } catch (parseError) {
          logger.errorWithContext('Error parsing cached user', parseError);
        }
      }
    }
    
    // Add a counter to track how many times this useEffect runs
    const initCount = parseInt(localStorage.getItem('auth_init_count') || '0') + 1;
    localStorage.setItem('auth_init_count', initCount.toString());
    logger.debug('Auth context useEffect running', { initCount });
    
    logger.debug('Setting up auth state listener...');
    
    let isMounted = true;
    
    // Set timeout to prevent infinite loading (increased from 25s to 60s)
    const initTimeoutId = setTimeout(() => {
      if (isMounted && initializing) {
        // Check if we already have a user before showing timeout warning
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession?.user) {
            logger.debug('User already authenticated, clearing initialization timeout early');
            setLoading(false);
            setInitializing(false);
            globalAuthInitializing = false;
            return;
          }
          
          logger.warn('Auth initialization timeout reached');
          logger.debug('Auth state at timeout', { 
            user: user?.id, 
            userRole, 
            loading, 
            initializing 
          });
          setInitTimeout(true);
          setLoading(false);
          setInitializing(false);
          globalAuthInitializing = false;
        }).catch(error => {
          logger.errorWithContext('Error checking session during timeout', error);
          logger.warn('Auth initialization timeout reached');
          logger.debug('Auth state at timeout', { 
            user: user?.id, 
            userRole, 
            loading, 
            initializing 
          });
          setInitTimeout(true);
          setLoading(false);
          setInitializing(false);
          globalAuthInitializing = false;
        });
      }
    }, 60000); // 60 second timeout (increased from 45s)
    logger.debug('Auth initialization timeout set', { timeoutId: initTimeoutId });
    
    // Clear any potentially corrupted auth data on app start
    const clearCorruptedAuthData = () => {
      try {
        // Clear stale auth cache on app start
        const lastClearTime = localStorage.getItem('last_auth_clear_time');
        const now = Date.now();
        
        // Always clear stale Supabase items on startup
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase-')) {
            localStorage.removeItem(key);
          }
        });
        
        if (lastClearTime) {
          const timeSinceLastClear = now - parseInt(lastClearTime);
          // If it's been more than 1 hour since last clear, do a full clear
          if (timeSinceLastClear > 60 * 60 * 1000) {
            localStorage.removeItem('last_auth_clear_time');
            logger.debug('Cleared old auth clear timestamp');
          }
        }
        
        // Set current time as last clear time
        localStorage.setItem('last_auth_clear_time', now.toString());
      } catch (error) {
        logger.errorWithContext('Error clearing corrupted auth data', error);
      }
    };
    
    // Run the cleanup only if it's been more than 5 minutes since last clear
    const lastClearTime = localStorage.getItem('last_auth_clear_time');
    const now = Date.now();
    if (!lastClearTime || (now - parseInt(lastClearTime)) > 5 * 60 * 1000) {
      clearCorruptedAuthData();
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        logger.debug('Auth state change', { event, session: session?.user?.id });
        
        // Handle token refresh without re-initializing
        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            
            // Update user role if it changed, but don't fail if it times out
            try {
              // Add timeout to role fetching
              const roleTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Role fetch timeout during token refresh')), 10000)
              );
              
              const rolePromise = getUserRole(session.user.id);
              
              const role = await Promise.race([
                rolePromise,
                roleTimeout
              ]).catch(error => {
                logger.errorWithContext('Role fetch timeout during token refresh', error);
                // Return cached role if available
                const cachedRole = localStorage.getItem('cached_role');
                if (cachedRole) {
                  logger.info('Using cached role during token refresh timeout', { cachedRole });
                  return cachedRole as UserRole;
                }
                return null;
              });
              
              if (role && typeof role === 'string') {
                setUserRole(role as UserRole);
              } else {
                // If role fetching fails, keep the existing role
                logger.warn('Failed to fetch user role after token refresh, keeping existing role');
                // Keep existing role from state instead of clearing it
              }
            } catch (error) {
              logger.errorWithContext('getUserRole after token refresh', error);
              // Don't clear the user role on error, keep the existing one
              // This prevents automatic logout during token refresh timeouts
            }
          }
          return;
        }
        
        if (event === 'SIGNED_IN') {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            
            try {
              const role = await getUserRole(session.user.id);
              setUserRole(role);
              
              // Check for pending profile data and process it
              await processPendingProfile();
            } catch (error) {
              logger.errorWithContext('getUserRole after sign in', error);
              // Don't clear session on role fetch error, keep user logged in
            }
          }
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserRole(null);
          // Clear cache on sign out
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_role');
          localStorage.removeItem('auth_cache_timestamp');
          return;
        }

        if (session?.user) {
          setSession(session);
          setUser(session.user);

          try {
            const role = await getUserRole(session.user.id);
            if (role) {
              setUserRole(role);
            }
          } catch (error) {
            logger.errorWithContext('getUserRole', error);
            // Don't clear session on role fetch error
          }
        }
      }
    );

    // Initial session check with improved caching and error handling
    const initializeAuth = async () => {
      // If we already have user data, skip full initialization
      if (user && userRole) {
        logger.debug('Already have user and role data, skipping full initialization');
        setLoading(false);
        setInitializing(false);
        globalAuthInitializing = false;
        return;
      }
      
      // Check if we're already signed in by checking the current session
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user && !user) {
          logger.debug('User already signed in, setting session data immediately');
          setSession(currentSession);
          setUser(currentSession.user);
          globalUser = currentSession.user;
          
          // Try to get user role quickly
          try {
            const role = await getUserRole(currentSession.user.id);
            if (role) {
              setUserRole(role);
              globalUserRole = role;
              // Cache the auth data
              localStorage.setItem('cached_user', JSON.stringify(currentSession.user));
              localStorage.setItem('cached_role', role);
              localStorage.setItem('auth_cache_timestamp', Date.now().toString());
            }
          } catch (error) {
            logger.errorWithContext('getUserRole during immediate session setup', error);
            // Use cached role if available
            const cachedRole = localStorage.getItem('cached_role');
            if (cachedRole) {
              setUserRole(cachedRole as UserRole);
              globalUserRole = cachedRole as UserRole;
            }
          }
          
          // If we have user data now, we can skip full initialization
          if (currentSession.user) {
            setLoading(false);
            setInitializing(false);
            globalAuthInitializing = false;
            return;
          }
        }
      } catch (error) {
        logger.errorWithContext('Error checking current session', error);
      }
      
      const initCallCount = parseInt(localStorage.getItem('auth_init_call_count') || '0') + 1;
      localStorage.setItem('auth_init_call_count', initCallCount.toString());
      logger.debug('initializeAuth called', { initCallCount });
      
      const id = performanceMonitor.startTiming('initializeAuth');
      try {
        // Log initial state for debugging
        logger.debug('Starting auth initialization');
        
        // First validate that any existing session is still valid
        // But don't fail completely if role validation times out
        logger.debug('Calling validateSession');
        const isSessionValid = await validateSession();
        logger.debug('validateSession returned', { isSessionValid });
        
        if (!isSessionValid) {
          if (!isMounted) return;
          setUser(null);
          setSession(null);
          setUserRole(null);
          globalUser = null;
          globalUserRole = null;
          // Clear cache
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_role');
          localStorage.removeItem('auth_cache_timestamp');
          setLoading(false);
          setInitializing(false);
          logger.debug('No valid session found, cleared auth state');
          globalAuthInitializing = false;
          return;
        }
        
        logger.debug('Getting session from Supabase in initializeAuth');
        const { data: { session }, error } = await supabase.auth.getSession();
        logger.debug('Got session in initializeAuth', { session: !!session, error: !!error });
        
        if (error) {
          logger.errorWithContext('initializeAuth - getSession', error);
        }

        if (session?.user) {
          if (!isMounted) return;
          setSession(session);
          setUser(session.user);
          globalUser = session.user;
          logger.debug('Found existing session for user', { userId: session.user.id });
          
          // Try to get user role, but don't fail completely if it times out
          try {
            // Add timeout to role fetching
            const roleTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Role fetch timeout during initialization')), 15000) // Reduced timeout to 15s for faster failover
            );
            
            logger.debug('Getting user role in initializeAuth');
            const rolePromise = getUserRole(session.user.id);
            
            const roleResult = await Promise.race([
              rolePromise,
              roleTimeout
            ]).catch(error => {
              logger.errorWithContext('Role fetch timeout during initialization', error);
              // Return cached role if available
              const cachedRole = localStorage.getItem('cached_role');
              if (cachedRole) {
                logger.info('Using cached role due to initialization timeout', { cachedRole });
                return cachedRole as UserRole;
              }
              return null;
            });
            logger.debug('Got user role in initializeAuth', { roleResult });
            
            if (roleResult && typeof roleResult === 'string') {
              setUserRole(roleResult as UserRole);
              globalUserRole = roleResult as UserRole;
              // Cache the auth data
              localStorage.setItem('cached_user', JSON.stringify(session.user));
              localStorage.setItem('cached_role', roleResult);
              localStorage.setItem('auth_cache_timestamp', Date.now().toString());
              logger.debug('Set user role from database', { role: roleResult });
            } else {
              // If we can't get the role, check if we have cached data
              const cachedRole = localStorage.getItem('cached_role');
              if (cachedRole) {
                setUserRole(cachedRole as UserRole);
                globalUserRole = cachedRole as UserRole;
                logger.debug('Using cached role', { cachedRole });
              } else {
                // Clear cache
                localStorage.removeItem('cached_user');
                localStorage.removeItem('cached_role');
                localStorage.removeItem('auth_cache_timestamp');
                // But still set the user and session so they can login
                setUser(session.user);
                setSession(session);
                globalUser = session.user;
                logger.debug('No role found, cleared cache but keeping session');
              }
            }
          } catch (error) {
            logger.errorWithContext('getUserRole during initialization', error);
            // Use cached role if available
            const cachedRole = localStorage.getItem('cached_role');
            if (cachedRole) {
              setUserRole(cachedRole as UserRole);
              globalUserRole = cachedRole as UserRole;
              logger.debug('Using cached role due to error', { cachedRole });
            } else {
              // Clear cache on error
              localStorage.removeItem('cached_user');
              localStorage.removeItem('cached_role');
              localStorage.removeItem('auth_cache_timestamp');
              // But still set the user and session so they can login
              setUser(session.user);
              setSession(session);
              globalUser = session.user;
              logger.debug('Error getting role, cleared cache but keeping session');
            }
          }
        } else {
          // No session, clear cache
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_role');
          localStorage.removeItem('auth_cache_timestamp');
          globalUser = null;
          globalUserRole = null;
          logger.debug('No session found, cleared cache');
        }
      } catch (error) {
        logger.errorWithContext('Auth initialization', error);
        // Even if initialization fails, try to use cached data
        const cachedUser = localStorage.getItem('cached_user');
        const cachedRole = localStorage.getItem('cached_role');
        
        if (cachedUser) {
          try {
            const user = JSON.parse(cachedUser);
            setUser(user);
            setSession({ user } as Session); // Create a minimal session object
            globalUser = user;
            if (cachedRole) {
              setUserRole(cachedRole as UserRole);
              globalUserRole = cachedRole as UserRole;
            }
            logger.info('Using cached auth data due to initialization error');
          } catch (parseError) {
            logger.errorWithContext('Error parsing cached user', parseError);
            // Clear cache on parse error
            localStorage.removeItem('cached_user');
            localStorage.removeItem('cached_role');
            localStorage.removeItem('auth_cache_timestamp');
            globalUser = null;
            globalUserRole = null;
          }
        } else {
          // Clear cache on error
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_role');
          localStorage.removeItem('auth_cache_timestamp');
          globalUser = null;
          globalUserRole = null;
          logger.debug('Auth initialization error, cleared cache');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitializing(false);
          logger.debug('Auth initialization complete');
        }
        globalAuthInitializing = false;
        performanceMonitor.endTiming(id, 'initializeAuth');
      }
    };

    initializeAuth();

    return () => {
      logger.debug('Auth context cleanup running');
      isMounted = false;
      clearTimeout(initTimeoutId);
      logger.debug('Auth initialization timeout cleared', { timeoutId: initTimeoutId });
      // Don't unsubscribe from auth state changes as this can cause issues
      // subscription.unsubscribe();
      logger.debug('Auth context component unmounted');
    };
  }, []); // Empty dependency array to prevent infinite loop - we only want this to run once

  const login = useCallback(async ({ email, password, role }: LoginData) => {
    const id = performanceMonitor.startTiming('login');
    try {
      logger.info('Attempting login', { email, role });
      
      // First, check if there's an existing valid session for the same user and role
      const { data: { session: existingSession }, error: sessionError } = await executeWithTimeout(
        supabase.auth.getSession(),
        30000
      );
      
      
      if (existingSession?.user) {
        // Check if existing session is for the same user and role
        const existingRole = await getUserRole(existingSession.user.id);
        
        if (existingRole === role) {
          logger.info('Already logged in with correct role, skipping authentication');
          // Update state with existing session
          setUser(existingSession.user);
          setSession(existingSession);
          setUserRole(existingRole as UserRole);
          return { error: null };
        } else {
          // Different role, sign out first
          logger.info('Different role, signing out existing session');
          await executeWithTimeout(supabase.auth.signOut(), 30000);
          
          // Small delay to ensure clean state
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Attempt authentication with Supabase using retry logic
      const authResult = await executeWithRetry(async () => {
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (result.error) throw result.error;
        return result;
      }, 3, 30000, 2000); // 3 retries, 30s timeout, 2s initial delay
      
      const { data, error } = authResult;
      
      if (error) {
        logger.errorWithContext('Supabase auth', error);
        return { error };
      }

      if (!data.user || !data.session) {
        const errorMsg = 'Authentication failed';
        logger.error(errorMsg);
        return { error: new Error(errorMsg) };
      }

      // Check user role in user_roles table with retry logic
      const userRole = await executeWithRetry(async () => {
        return await getUserRole(data.user.id);
      }, 3, 30000, 2000);

      if (!userRole || userRole !== role) {
        logger.warn('Invalid role, signing out', { expected: role, actual: userRole });
        await executeWithTimeout(supabase.auth.signOut(), 30000);
        return { error: new Error(`Invalid ${role} credentials. User does not have ${role} role.`) };
      }

      // Set the state
      setUser(data.user);
      setSession(data.session);
      setUserRole(userRole as UserRole);
      
      // Log the successful login with timeout
      try {
        if (data.user?.id) {
          try {
            // Use retry logic for RPC call
            await executeWithRetry(async () => {
              const result = await supabase.rpc('log_auth_event', {
                p_user_id: data.user.id,
                p_event_type: 'LOGIN',
                p_metadata: {
                  role: role,
                  method: 'email'
                }
              });
              
              if (result.error) {
                logger.warn('Failed to log login event', {
                  error: result.error,
                  userId: data.user.id,
                  eventType: 'LOGIN'
                });
              }
              
              return result;
            }, 2, 15000, 1000); // 2 retries, 15s timeout, 1s initial delay
          } catch (rpcError) {
            logger.error('Exception while logging login event', {
              error: rpcError,
              userId: data.user.id,
              eventType: 'LOGIN'
            });
          }
        }
      } catch (logError) {
        logger.warn('Failed to log login event', logError);
      }

      logger.info('Login successful', { userId: data.user.id, role });
      return { error: null };
    } catch (error: any) {
      logger.errorWithContext('Login process', error);
      // Ensure clean state on error
      try {
        await executeWithTimeout(supabase.auth.signOut(), 30000);
      } catch (signOutError) {
        logger.errorWithContext('Sign out during login error', signOutError);
      }
      return { error: error instanceof Error ? error : new Error(String(error)) };
    } finally {
      performanceMonitor.endTiming(id, 'login');
    }
  }, [getUserRole]);

  const signUp = useCallback(async ({ email, password, fullName, phone, role }: SignUpData) => {
    const id = performanceMonitor.startTiming('signUp');
    try {
      logger.info('Attempting signup', { email, role });
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      // First, sign up the user with retry logic
      const signUpResult = await executeWithRetry(async () => {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
              phone: phone
            }
          }
        });
        
        if (result.error) throw result.error;
        return result;
      }, 3, 30000, 2000); // 3 retries, 30s timeout, 2s initial delay

      if (signUpResult.error) {
        logger.errorWithContext('Supabase signup', signUpResult.error);
        return { error: signUpResult.error };
      }

      // Store pending profile data in localStorage
      const pendingProfile = {
        userId: signUpResult.data.user?.id,
        email,
        fullName,
        phone,
        role,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('pending_profile', JSON.stringify(pendingProfile));
      
      logger.info('Signup successful', { userId: signUpResult.data.user?.id, role });
      return { error: null };
    } catch (error) {
      logger.errorWithContext('Signup process', error);
      return { error };
    } finally {
      performanceMonitor.endTiming(id, 'signUp');
    }
  }, []);

  // Add a function to completely clear all authentication state and cache
  // Use a flag to prevent repeated calls
  const clearAllAuthData = useCallback(async () => {
    // Prevent repeated calls within a short time period
    const lastClearTime = localStorage.getItem('last_auth_clear_time');
    const now = Date.now();
    
    if (lastClearTime) {
      const timeDiff = now - parseInt(lastClearTime);
      // If less than 1 second has passed, skip clearing
      if (timeDiff < 1000) {
        logger.debug('Skipping auth clear, too soon since last clear');
        return;
      }
    }
    
    try {
      logger.info('Clearing all authentication data');
      
      // Record the time of this clear operation
      localStorage.setItem('last_auth_clear_time', now.toString());
      
      // Sign out from Supabase with timeout
      const { error } = await executeWithTimeout(supabase.auth.signOut(), 30000);
      
      if (error) {
        logger.errorWithContext('Supabase signOut', error);
      }
      
      // Clear all local storage items related to auth
      const itemsToRemove = [
        'cached_user', 
        'cached_role', 
        'auth_cache_timestamp',
        'pending_profile',
        'last_auth_clear_time' // Also clear the timestamp
      ];
      
      itemsToRemove.forEach(item => {
        localStorage.removeItem(item);
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear specific Supabase items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Reset state
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      logger.info('All authentication data cleared successfully');
    } catch (error) {
      logger.errorWithContext('Clear all auth data', error);
    }
  }, []);

  // Add a function to completely reset the authentication state
  const resetAuthState = useCallback(async () => {
    try {
      logger.info('Resetting authentication state');
      
      // Sign out from Supabase
      await executeWithTimeout(supabase.auth.signOut(), 30000);
      
      // Clear all auth-related localStorage items
      const itemsToRemove = [
        'cached_user', 
        'cached_role', 
        'auth_cache_timestamp',
        'pending_profile',
        'last_auth_clear_time'
      ];
      
      itemsToRemove.forEach(item => {
        localStorage.removeItem(item);
      });
      
      // Clear specific Supabase items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage
      window.sessionStorage.clear();
      
      // Reset state
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      logger.info('Authentication state reset successfully');
    } catch (error) {
      logger.errorWithContext('Error resetting authentication state', error);
    }
  }, []);

  // Function to process pending profile data after email confirmation
  const processPendingProfile = useCallback(async () => {
    const id = performanceMonitor.startTiming('processPendingProfile');
    try {
      const pendingProfileStr = localStorage.getItem('pending_profile');
      if (!pendingProfileStr || !user?.id) {
        return;
      }

      const pendingProfile = JSON.parse(pendingProfileStr);
      
      // Check if the pending profile is for the current user
      if (pendingProfile.userId !== user.id) {
        return;
      }

      // Check if the pending profile is expired (older than 24 hours)
      const createdAt = new Date(pendingProfile.createdAt);
      const now = new Date();
      const expired = now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000;
      
      if (expired) {
        localStorage.removeItem('pending_profile');
        return;
      }

      // Create profile if it doesn't exist
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        const profileResult = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            full_name: pendingProfile.fullName,
            email: pendingProfile.email,
            phone: pendingProfile.phone
          }]);

        if (profileResult.error) {
          logger.errorWithContext('Creating profile from pending data', profileResult.error);
          return;
        }
      }

      // Insert user role if it doesn't exist
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingRole) {
        const roleInsert = await supabase
          .from('user_roles')
          .insert([{
            user_id: user.id,
            role: pendingProfile.role
          }]);

        if (roleInsert.error) {
          logger.errorWithContext('Creating user role from pending data', roleInsert.error);
          return;
        }
      }

      // Create role-specific record if it doesn't exist
      if (pendingProfile.role === 'farmer') {
        const { data: existingFarmer } = await supabase
          .from('farmers')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingFarmer) {
          const farmerInsert = await supabase
            .from('farmers')
            .insert([{
              user_id: user.id,
              registration_number: `F-${Date.now()}`,
              full_name: pendingProfile.fullName,
              phone_number: pendingProfile.phone,
              kyc_status: 'pending', // Set to pending for KYC approval
              registration_completed: false // Set to false until KYC is completed
            }])
            .select();
            // Removed .single() to avoid PGRST116 error when no records found

          if (farmerInsert.error) {
            logger.errorWithContext('Creating farmer record from pending data', farmerInsert.error);
            return;
          }
          
          // Check if we have data and handle accordingly
          const farmerRecord = farmerInsert.data && farmerInsert.data.length > 0 ? farmerInsert.data[0] : null;
          
          if (!farmerRecord) {
            logger.errorWithContext('No farmer record created from pending data', farmerInsert.error);
            return;
          }
          
          // If farmer record was created successfully, complete the rest of the farmer registration
          if (pendingProfile.farmerData) {
            const farmerId = farmerRecord.id;
            if (farmerId) {
              // Update with additional farmer details
              const { error: updateError } = await supabase
                .from('farmers')
                .update({
                  national_id: pendingProfile.farmerData.nationalId,
                  address: pendingProfile.farmerData.address,
                  farm_location: pendingProfile.farmerData.farmLocation,
                  // Additional farm details
                  farm_name: pendingProfile.farmerData.farmName,
                  farm_size: pendingProfile.farmerData.farmSize,
                  years_experience: pendingProfile.farmerData.experience,
                  total_cows: pendingProfile.farmerData.numCows,
                  dairy_cows: pendingProfile.farmerData.numDairyCows,
                  primary_breed: pendingProfile.farmerData.primaryBreed,
                  avg_daily_production: pendingProfile.farmerData.avgProduction,
                  farming_type: pendingProfile.farmerData.farmingType,
                  additional_info: pendingProfile.farmerData.additionalInfo,
                  // Personal details
                  date_of_birth: pendingProfile.farmerData.dob,
                  gender: pendingProfile.farmerData.gender
                })
                .eq('id', farmerId);
              
              if (updateError) {
                logger.warn('Failed to update additional farmer details', { error: updateError });
              }
            }
          }

        }
      } else if (pendingProfile.role === 'staff') {
        const { data: existingStaff } = await supabase
          .from('staff')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingStaff) {
          const staffInsert = await supabase
            .from('staff')
            .insert([{
              user_id: user.id,
              employee_id: `STAFF-${Date.now()}`
            }]);

          if (staffInsert.error) {
            logger.errorWithContext('Creating staff record from pending data', staffInsert.error);
            return;
          }
        }
      }

      // Log successful completion
      if (user?.id) {
        try {
          const result = await executeWithRetry(async () => {
            const rpcResult = await supabase.rpc('log_auth_event', {
              p_user_id: user.id,
              p_event_type: 'PROFILE_COMPLETED',
              p_metadata: {
                role: pendingProfile.role,
                method: 'email_confirmation'
              }
            });
            
            if (rpcResult.error) {
              logger.warn('Failed to log profile completion event', {
                error: rpcResult.error,
                userId: user.id,
                eventType: 'PROFILE_COMPLETED'
              });
            }
            
            return rpcResult;
          }, 2, 15000, 1000); // 2 retries, 15s timeout, 1s initial delay
        } catch (rpcError) {
          logger.error('Exception while logging profile completion event', {
            error: rpcError,
            userId: user.id,
            eventType: 'PROFILE_COMPLETED'
          });
        }
      }

      // Clean up pending profile data
      localStorage.removeItem('pending_profile');
      
      logger.info('Pending profile processed successfully', { userId: user.id });

    } catch (error) {
      logger.errorWithContext('Processing pending profile', error);
    } finally {
      performanceMonitor.endTiming(id, 'processPendingProfile');
    }
  }, [user?.id]);

  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  
  // Enhanced refresh session function with better error handling
  const refreshSession = useCallback(async () => {
    // Prevent multiple simultaneous refresh calls
    if (isRefreshingToken) {
      logger.debug('Session refresh already in progress, skipping');
      return { success: false, error: new Error('Refresh already in progress') };
    }
    
    setIsRefreshingToken(true);
    try {
      logger.debug('Manually refreshing session');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session refresh timeout')), 30000) // 30 second timeout
      );
      
      const refreshPromise = supabase.auth.refreshSession();
      
      const { data, error } = await Promise.race([
        refreshPromise,
        timeoutPromise
      ]).catch(async (error) => {
        logger.errorWithContext('Session refresh timeout or error', error);
        
        // If refresh fails due to invalid token, sign out the user
        if (error.message && error.message.includes('Invalid Refresh Token')) {
          logger.warn('Invalid refresh token detected, signing out user');
          await signOut();
        }
        throw error;
      }) as any;
      
      if (error) {
        logger.errorWithContext('Manual session refresh', error);
        // If refresh fails due to invalid token, sign out the user
        if (error.message && error.message.includes('Invalid Refresh Token')) {
          logger.warn('Invalid refresh token detected, signing out user');
          await signOut();
        }
        // If there's no session to refresh, this is expected for unconfirmed users
        if (error.name === 'AuthSessionMissingError' || error.message === 'Auth session missing!') {
          logger.debug('No session to refresh - user likely not confirmed yet');
          return { success: false, error };
        }
        return { success: false, error };
      }
      
      if (data?.session?.user) {
        setUser(data.session.user);
        setSession(data.session);
        
        // Update user role with timeout handling
        try {
          // Add timeout to role fetching
          const roleTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Role fetch timeout during session refresh')), 10000)
          );
          
          const rolePromise = getUserRole(data.session.user.id);
          
          const role = await Promise.race([
            rolePromise,
            roleTimeout
          ]).catch(error => {
            logger.errorWithContext('Role fetch timeout during session refresh', error);
            // Return cached role if available
            const cachedRole = localStorage.getItem('cached_role');
            if (cachedRole) {
              logger.info('Using cached role during session refresh timeout', { cachedRole });
              return cachedRole as UserRole;
            }
            return null;
          });
          
          setUserRole(role as UserRole | null);
        } catch (roleError) {
          logger.errorWithContext('getUserRole after manual refresh', roleError);
        }
        
        logger.info('Session refreshed successfully');
        return { success: true, session: data.session };
      }
      
      return { success: false, error: new Error('No session returned') };
    } catch (error) {
      logger.errorWithContext('Manual session refresh exception', error);
      // If we get a network error or other exception, try to sign out
      if (error instanceof Error && (error.name === 'TypeError' || error.message.includes('network') || error.message.includes('Invalid Refresh Token'))) {
        logger.warn('Network error or invalid refresh token during refresh, signing out user');
        await signOut();
      }
      // If there's no session to refresh, this is expected for unconfirmed users
      if (error instanceof Error && (error.name === 'AuthSessionMissingError' || error.message === 'Auth session missing!')) {
        logger.debug('No session to refresh - user likely not confirmed yet');
        return { success: false, error };
      }
      return { success: false, error };
    } finally {
      setIsRefreshingToken(false);
    }
  }, [getUserRole, isRefreshingToken, signOut]);

  // Memoize the context value to prevent unnecessary re-renders
  // This must be defined AFTER all the functions it references
  const contextValue = useMemo(() => ({
    user,
    session,
    userRole,
    loading: initializing || initTimeout, // Use initializing state for initial load, loading for auth checks
    login,
    signUp,
    signOut,
    processPendingProfile,
    clearAllAuthData,
    refreshSession,
    resetAuthState // Add the new function to the context
  }), [user, session, userRole, initializing, initTimeout, login, signUp, signOut, processPendingProfile, clearAllAuthData, refreshSession, resetAuthState]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    logger.error('useSimplifiedAuth called but no AuthProvider found');
    return {
      user: null,
      session: null,
      userRole: null,
      loading: true,
      login: async () => { throw new Error('AuthProvider not mounted'); },
      signUp: async () => { throw new Error('AuthProvider not mounted'); },
      signOut: async () => { /* noop */ },
      processPendingProfile: async () => { /* noop */ },
      clearAllAuthData: async () => { /* noop */ },
      refreshSession: async () => { return { success: false, error: new Error('AuthProvider not mounted') }; },
      resetAuthState: async () => { /* noop */ } // Add the new function to the default context
    } as AuthContextType;
  }

  return context;
};
