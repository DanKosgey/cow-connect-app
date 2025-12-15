import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/types/auth.types';
import { authEventManager } from '@/utils/authLogger';

// Constants
const SESSION_VALIDATION_INTERVAL = 30000; // 30 seconds
const SESSION_EXPIRY_BUFFER = 2 * 60 * 1000; // 2 minutes
const REFRESH_TIMEOUT = 10000; // 10 seconds
const RPC_TIMEOUT = 5000; // 5 seconds
const MAX_REFRESH_RETRIES = 3;
const DEBOUNCE_DELAY = 1000; // 1 second debounce for refresh

// Types
interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

// Utility: Create timeout promise
const createTimeoutPromise = (ms: number, message: string): Promise<never> => 
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error(message)), ms)
  );

// Utility: Exponential backoff delay
const exponentialBackoff = (attempt: number, baseDelay: number = 1000): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * baseDelay + Math.random() * 100));

// Rate limiter for role fetching
class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private timeWindow: number;
  
  constructor(maxCalls: number, timeWindowMs: number) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindowMs;
  }
  
  canCall(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter(time => now - time < this.timeWindow);
    
    if (this.calls.length >= this.maxCalls) {
      console.warn('[AuthService] Rate limit exceeded');
      return false;
    }
    
    this.calls.push(now);
    return true;
  }
}

const roleRateLimiter = new RateLimiter(10, 10000); // 10 calls per 10 seconds

// Role cache
const roleCache = new Map<string, { role: string; timestamp: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clear cache utility
export const clearRoleCache = () => {
  roleCache.clear();
};

// Authentication Service
class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private userRole: UserRole | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<{ session: Session | null; error: Error | null }> | null = null;
  private lastValidationTime = 0;
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private isFetchingRole = false;

  private constructor() {
    // No longer initialize auth listener here since it's handled in AuthContext
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private clearAuthState(): void {
    this.currentUser = null;
    this.currentSession = null;
    this.userRole = null;
    this.lastValidationTime = 0;
  }

  // Get current user with optional validation
  async getCurrentUser(validate = true): Promise<User | null> {
    try {
      if (validate && this.shouldValidateSession()) {
        const isValid = await this.validateSession();
        this.lastValidationTime = Date.now();
        
        if (!isValid) {
          this.clearAuthState();
          return null;
        }
      }
      
      if (this.currentUser) {
        return this.currentUser;
      }
      
      // Defensive destructuring
      const userRes = await supabase.auth.getUser();
      console.log('🔐 [AuthService] getUser result:', {
        hasUser: !!userRes.data?.user,
        userId: userRes.data?.user?.id || null,
        error: userRes.error?.message || null
      });
      
      if (userRes.error) throw userRes.error;
      const user = userRes.data?.user ?? null;
      
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      this.clearAuthState();
      return null;
    }
  }

  private shouldValidateSession(): boolean {
    return Date.now() - this.lastValidationTime > SESSION_VALIDATION_INTERVAL;
  }

  // Validate current session
  async validateSession(): Promise<boolean> {
    try {
      // Defensive destructuring
      const sessionRes = await supabase.auth.getSession();
      console.log('🔐 [AuthService] validateSession result:', {
        hasSession: !!sessionRes.data?.session,
        hasAccessToken: !!sessionRes.data?.session?.access_token,
        accessTokenLength: sessionRes.data?.session?.access_token?.length || 0,
        error: sessionRes.error?.message || null
      });
      
      if (sessionRes.error) throw sessionRes.error;
      const session = sessionRes.data?.session ?? null;
      
      if (!session?.expires_at) {
        return false;
      }
      
      return this.isSessionValid(session.expires_at);
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  private isSessionValid(expiresAt: number): boolean {
    const expirationTime = expiresAt * 1000;
    const currentTime = Date.now();
    return expirationTime > currentTime + SESSION_EXPIRY_BUFFER;
  }

  // Get current session with validation
  async getCurrentSession(validate = true): Promise<Session | null> {
    try {
      if (validate && this.shouldValidateSession()) {
        const isValid = await this.validateSession();
        this.lastValidationTime = Date.now();
        
        if (!isValid) {
          this.clearAuthState();
          return null;
        }
      }
      
      if (this.currentSession && this.isCachedSessionValid()) {
        return this.currentSession;
      }
      
      // Defensive destructuring
      const sessionRes = await supabase.auth.getSession();
      console.log('🔐 [AuthService] getSession result:', {
        hasSession: !!sessionRes.data?.session,
        hasAccessToken: !!sessionRes.data?.session?.access_token,
        accessTokenLength: sessionRes.data?.session?.access_token?.length || 0,
        error: sessionRes.error?.message || null
      });
      
      if (sessionRes.error) throw sessionRes.error;
      const session = sessionRes.data?.session ?? null;
      
      this.currentSession = session;
      return session;
    } catch (error) {
      console.error('Error getting current session:', error);
      this.clearAuthState();
      return null;
    }
  }

  private isCachedSessionValid(): boolean {
    if (!this.currentSession?.expires_at) return false;
    return this.isSessionValid(this.currentSession.expires_at);
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    authEventManager.logLoginAttempt(email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        authEventManager.logLoginFailure(email, error.message);
        throw error;
      }

      this.currentUser = data.user;
      this.currentSession = data.session;
      
      authEventManager.logLoginSuccess(data.user);

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, session: null, error: error as Error };
    }
  }

  // Sign up with email and password
  async signUp(data: SignUpData): Promise<AuthResponse> {
    const { email, password, fullName, phone, role } = data;
    
    authEventManager.logSignupAttempt(email, role);
    
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (signUpError) {
        authEventManager.logSignupFailure(email, role, signUpError.message);
        throw signUpError;
      }

      if (!authData.user) {
        const error = new Error('Sign up failed - no user returned');
        authEventManager.logSignupFailure(email, role, error.message);
        throw error;
      }

      await this.setUserRole(authData.user.id, role);
      await this.createRoleProfile(authData.user.id, role, fullName, phone);
      
      authEventManager.logSignupSuccess(authData.user, role);

      return { user: authData.user, session: authData.session, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, session: null, error: error as Error };
    }
  }

  private async setUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);

      if (error) {
        console.error('Error setting user role:', error);
      }
    } catch (error) {
      console.error('Error setting user role:', error);
    }
  }

  // Create role-specific profile
  private async createRoleProfile(
    userId: string, 
    role: UserRole, 
    fullName: string, 
    phone: string
  ): Promise<void> {
    try {
      const profileData = this.getProfileData(userId, role, fullName, phone);
      if (!profileData) return;

      const { table, data } = profileData;
      const { error } = await supabase.from(table).insert([data]);
      
      if (error) {
        console.error(`Error creating ${role} profile:`, error);
      }
    } catch (error) {
      console.error(`Error creating ${role} profile:`, error);
    }
  }

  private getProfileData(
    userId: string, 
    role: UserRole, 
    fullName: string, 
    phone: string
  ): { table: string; data: Record<string, any> } | null {
    switch (role) {
      case UserRole.FARMER:
        return {
          table: 'farmers',
          data: {
            user_id: userId,
            full_name: fullName,
            phone_number: phone,
            kyc_status: 'pending'
          }
        };
        
      case UserRole.STAFF:
        return {
          table: 'staff',
          data: {
            user_id: userId,
            full_name: fullName
          }
        };
        
      default:
        return null;
    }
  }

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const userId = this.currentUser?.id;
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;

      authEventManager.logLogout(userId);
      this.clearAuthState();

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as Error };
    }
  }

  // Debounced refresh session
  async debouncedRefreshSession(): Promise<{ session: Session | null; error: Error | null }> {
    // Clear any pending refresh
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    // Debounce by 1 second
    return new Promise((resolve) => {
      this.refreshTimeout = setTimeout(async () => {
        // Additional check to prevent concurrent refreshes
        if (this.isRefreshing) {
          console.log('[AuthService] Refresh already in progress, skipping');
          resolve({ session: null, error: new Error('Refresh already in progress') });
          return;
        }
        
        this.isRefreshing = true;
        // Add a safety timeout to ensure isRefreshing is reset even if something goes wrong
        const safetyTimeout = setTimeout(() => {
          if (this.isRefreshing) {
            console.warn('[AuthService] Safety timeout: Forcing isRefreshing to false');
            this.isRefreshing = false;
          }
        }, REFRESH_TIMEOUT + 5000); // 5 seconds after the refresh timeout
        
        try {
          console.log('[AuthService] Starting session refresh');
          
          const refreshPromise = supabase.auth.refreshSession();
          const timeoutPromise = createTimeoutPromise(
            REFRESH_TIMEOUT, 
            'Session refresh timeout'
          );
          
          // Safer Promise.race handling with timeout
          try {
            const res = await Promise.race([refreshPromise, timeoutPromise]);
            
            if (!res || typeof res !== 'object') throw new Error('Unexpected refresh response');
            
            const { data, error } = res as any;
            
            if (error) throw error;

            const session = data?.session ?? null;
            this.currentSession = session;
            this.currentUser = session?.user || null;
            resolve({ session, error: null });
          } catch (e) {
            throw e;
          }
        } catch (error) {
          console.error('[AuthService] Session refresh error:', error);
          resolve({ session: null, error: error as Error });
        } finally {
          this.isRefreshing = false;
          clearTimeout(safetyTimeout); // Clear the safety timeout
        }
      }, DEBOUNCE_DELAY);
    });
  }

  // Refresh session with retry logic
  async refreshSession(maxRetries = MAX_REFRESH_RETRIES): Promise<{ 
    session: Session | null; 
    error: Error | null 
  }> {
    if (this.isRefreshing && this.refreshPromise) {
      console.log('Session refresh in progress, returning existing promise');
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.attemptRefreshWithRetry(maxRetries);
    
    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async attemptRefreshWithRetry(
    maxRetries: number
  ): Promise<{ session: Session | null; error: Error | null }> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.performRefresh();
        
        this.logRefreshAttempt(result.session, result.error);
        
        if (result.session && !result.error) {
          return result;
        }
      } catch (error) {
        console.error(`Refresh attempt ${attempt + 1} failed:`, error);
        
        this.logRefreshAttempt(null, error as Error);
        
        if (attempt === maxRetries - 1) {
          return { session: null, error: error as Error };
        }
        
        await exponentialBackoff(attempt);
      }
    }
    
    const error = new Error('Max refresh retries exceeded');
    this.logRefreshAttempt(null, error);
    return { session: null, error };
  }

  private logRefreshAttempt(session: Session | null, error: Error | null): void {
    authEventManager.logSessionRefresh(
      this.currentUser?.id,
      !!session && !error,
      error?.message
    );
  }

  // Perform session refresh
  private async performRefresh(): Promise<{ 
    session: Session | null; 
    error: Error | null 
  }> {
    try {
      console.log('Starting session refresh');
      
      const refreshPromise = supabase.auth.refreshSession();
      const timeoutPromise = createTimeoutPromise(
        REFRESH_TIMEOUT, 
        'Session refresh timeout'
      );
      
      // Safer Promise.race handling
      try {
        const res = await Promise.race([refreshPromise, timeoutPromise]);
        
        if (!res || typeof res !== 'object') throw new Error('Unexpected refresh response');
        
        const { data, error } = res as any;
        
        if (error) throw error;

        const session = data?.session ?? null;
        this.currentSession = session;
        this.currentUser = session?.user || null;
        
        console.log('Session refresh completed');
        return { session, error: null };
      } catch (e) {
        throw e;
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      return { session: null, error: error as Error };
    }
  }

  // Password reset
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error: error as Error };
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Password update error:', error);
      return { error: error as Error };
    }
  }

  // Get user role with improved reliability, caching, and rate limiting
  async getUserRole(userId: string): Promise<UserRole | null> {
    console.log('🔐 [AuthService] getUserRole called for:', userId);
    
    // Check cache first
    const cached = roleCache.get(userId);
    if (cached && Date.now() - cached.timestamp < ROLE_CACHE_TTL) {
      console.log(`🔐 [AuthService] Returning cached role: ${cached.role}`);
      return cached.role as UserRole;
    }
    
    // Rate limiting
    if (!roleRateLimiter.canCall()) {
      console.warn('🔐 [AuthService] getUserRole rate limited, using cache');
      const cached = roleCache.get(userId);
      return (cached?.role as UserRole) || null;
    }
    
    try {
      // Add a small delay to ensure auth is fully initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try RPC first with consistent timeout and retry logic
      const role = await this.fetchUserRoleFromRPC(userId, RPC_TIMEOUT, 2); // 5 second timeout with 2 retries
      
      if (role) {
        console.log('🔐 [AuthService] Role found via RPC:', role);
        // Cache the result
        roleCache.set(userId, { role: role as string, timestamp: Date.now() });
        return role;
      }

      console.log('🔐 [AuthService] No role from RPC, trying direct query');
      
      // If RPC returns null (not error), try direct query
      const directRole = await this.fetchUserRoleDirectly(userId);
      if (directRole) {
        console.log('🔐 [AuthService] Role found via direct query:', directRole);
        // Cache the result
        roleCache.set(userId, { role: directRole as string, timestamp: Date.now() });
        return directRole;
      }

      console.log('🔐 [AuthService] No role found for user');
      return null;
    } catch (error) {
      console.error('🔐 [AuthService] Error getting role:', error);
      
      // On error, try direct query as final fallback
      try {
        console.log('🔐 [AuthService] Trying emergency fallback query');
        const fallbackRole = await this.fetchUserRoleDirectly(userId);
        if (fallbackRole) {
          console.log('🔐 [AuthService] Emergency fallback succeeded:', fallbackRole);
          // Cache the result
          roleCache.set(userId, { role: fallbackRole as string, timestamp: Date.now() });
          return fallbackRole;
        }
      } catch (fallbackError) {
        console.error('🔐 [AuthService] All methods failed:', fallbackError);
      }
      
      return null;
    }
  }

  private async fetchUserRoleFromRPC(
    userId: string, 
    timeout: number = RPC_TIMEOUT,
    maxRetries: number = 2
  ): Promise<UserRole | null> {
    // Add small delay if called immediately after sign-in to ensure auth is ready
    if (Date.now() - this.lastValidationTime < 1000) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔐 [AuthService] Attempting RPC call (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Ensure we have a valid session before making the RPC call
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 [AuthService] Session check result:', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          accessTokenLength: session?.access_token?.length || 0,
          sessionError: sessionError?.message || null
        });
        
        if (sessionError || !session) {
          console.warn('🔐 [AuthService] No valid session for RPC call');
          return null;
        }
        
        const rpcPromise = supabase.rpc('get_user_role_optimized', {
          user_id_param: userId
        });
        
        const timeoutPromise = createTimeoutPromise(timeout, `RPC timeout after ${timeout}ms`);
        
        // Safer Promise.race handling
        try {
          const res = await Promise.race([rpcPromise, timeoutPromise]);
          
          if (!res || typeof res !== 'object') throw new Error('Unexpected RPC response');
          
          const { data, error } = res as any;
          
          if (error) {
            console.warn('🔐 [AuthService] Optimized RPC error:', error.message);
            
            // If it's a timeout and we have retries left, continue
            if ((error.message.includes('timeout') || error.name === 'TimeoutError') && attempt < maxRetries) {
              console.log(`🔐 [AuthService] Retrying RPC after timeout (attempt ${attempt + 1})`);
              await exponentialBackoff(attempt, 500);
              continue;
            }
            
            return null;
          }

          // Handle scalar or array response
          if (typeof data === 'string') {
            console.log('🔐 [AuthService] RPC returned scalar:', data);
            return data as UserRole;
          }
          
          if (Array.isArray(data) && data.length) {
            // If function returns row(s), data could be [{ get_user_role_optimized: 'farmer' }] or [{ role: 'farmer' }]
            const first = data[0];
            const role = (first.role ?? first.get_user_role_optimized ?? Object.values(first)[0]) as UserRole;
            console.log('🔐 [AuthService] RPC returned array, extracted role:', role);
            return role;
          }
          
          console.log('🔐 [AuthService] RPC returned unexpected data:', data);
          return data as UserRole || null;
        } catch (e) {
          throw e;
        }
      } catch (error) {
        // Timeout or other error
        console.warn(`🔐 [AuthService] Optimized RPC failed on attempt ${attempt + 1}:`, error instanceof Error ? error.message : 'Unknown error');
        
        // If it's the last attempt, return null
        if (attempt === maxRetries) {
          return null;
        }
        
        // Wait before retry with exponential backoff
        await exponentialBackoff(attempt, 500);
      }
    }
    
    return null;
  }

  private async fetchUserRoleDirectly(userId: string): Promise<UserRole | null> {
    try {
      // Ensure we have a valid session before making the query
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 [AuthService] Direct query session check:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        accessTokenLength: session?.access_token?.length || 0,
        sessionError: sessionError?.message || null
      });
      
      if (sessionError || !session) {
        console.warn('🔐 [AuthService] No valid session for direct query');
        return null;
      }
      
      // Use the optimized view first
      const viewRes = await supabase
        .from('user_roles_view')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!viewRes.error && viewRes.data?.role) {
        return viewRes.data.role as UserRole;
      }

      // Fallback to direct table query if view fails
      const res = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (res.error) {
        console.error('🔐 [AuthService] Direct query error:', res.error);
        return null;
      }
      
      return res.data?.role as UserRole || null;
    } catch (error) {
      console.error('🔐 [AuthService] Direct query failed:', error);
      return null;
    }
  }

  private async tryAutoAssignRole(userId: string): Promise<UserRole | null> {
    console.log('🔐 [AuthService] Checking email for auto-assignment');
    
    try {
      // Defensive destructuring
      const userRes = await supabase.auth.getUser();
      if (userRes.error || !userRes.data?.user?.email) {
        return null;
      }

      const role = this.determineRoleFromEmail(userRes.data.user.email);
      if (!role) {
        return null;
      }

      console.log('🔐 [AuthService] Auto-assigning role:', role);
      
      // NOTE: This approach is flawed - roles should be assigned by admins or during registration
      // For now, we'll just return the determined role without attempting to insert it
      // The actual role should be created by backend processes or admin UI
      return role;
    } catch (error) {
      console.error('🔐 [AuthService] Auto-assignment error:', error);
      return null;
    }
  }

  private determineRoleFromEmail(email: string): UserRole | null {
    const lowerEmail = email.toLowerCase();
    
    // Check for role keywords in email
    if (lowerEmail.includes('admin') || lowerEmail === 'admin2@g.com') {
      return 'admin' as UserRole;
    }
    if (lowerEmail.includes('collector')) return 'collector' as UserRole;
    if (lowerEmail.includes('staff')) return 'staff' as UserRole;
    if (lowerEmail.includes('farmer')) return 'farmer' as UserRole;
    if (lowerEmail.includes('creditor')) return 'creditor' as UserRole;
    
    return null;
  }

  // Check if user has required role
  async hasRole(requiredRole: UserRole): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      const userRole = await this.getUserRole(user.id);
      return userRole === requiredRole;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  // Cleanup method
  destroy(): void {
    // Clear any pending refresh timeouts
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    this.clearAuthState();
  }
}

// Export singleton
export const authService = AuthService.getInstance();
export default authService;