import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

import type { 
  UserRole,
  UserRoleRow, 
  UserRoleInsert, 
  FarmerInsert, 
  StaffInsert 
} from '@/types/supabase-types';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Diagnostic hook: set a global flag so runtime checks can detect whether
  // the AuthProvider actually mounted. This helps when multiple bundling
  // or alias issues cause the provider to be missing at runtime.
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = typeof window !== 'undefined' ? (window as any) : undefined;
      if (win) win.__authProviderMounted = true;
    } catch (e) {
      // ignore
    }

    return () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = typeof window !== 'undefined' ? (window as any) : undefined;
        if (win) win.__authProviderMounted = false;
      } catch (e) {
        // ignore
      }
    };
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const getUserRole = async (userId: string): Promise<UserRole | null> => {
    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle() as { data: UserRoleRow | null, error: any };

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    if (!roleData) {
      // No role assigned yet for this user; not necessarily an error.
      console.info('No role found for user:', userId);
      return null;
    }

    return roleData.role;
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', { event, session: session?.user?.id });
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserRole(null);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }

        if (session?.user) {
          setSession(session);
          setUser(session.user);

          // If there is a pending profile (deferred during email-confirmation based signup),
          // process it now that the client is authenticated.
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              const pendingRaw = window.localStorage.getItem('pending_profile');
              if (pendingRaw) {
                const pending = JSON.parse(pendingRaw);
                // expire pending entries older than 24 hours
                const createdAt = pending?.createdAt ? new Date(pending.createdAt) : null;
                const now = new Date();
                if (createdAt && (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000)) {
                  // expired
                  try { window.localStorage.removeItem('pending_profile'); } catch (e) { /* ignore */ }
                } else if (pending && pending.userId === session.user.id) {
                  // Attempt to create profile and role records if they do not already exist
                  // Use upsert/insert with checks to avoid duplicate errors
                  const { error: pErr } = await supabase.from('profiles').upsert([{
                    id: pending.userId,
                    full_name: pending.fullName,
                    email: pending.email,
                    phone: pending.phone
                  }], { onConflict: 'id' });
                  if (pErr) console.error('Error finishing pending profile:', pErr);

                  const { error: rErr } = await supabase.from('user_roles').upsert([{
                    user_id: pending.userId,
                    role: pending.role,
                    active: true
                  }], { onConflict: 'user_id' });
                  if (rErr) console.error('Error finishing pending role insert:', rErr);

                  if (pending.role === 'farmer') {
                    const { error: fErr } = await supabase.from('farmers').upsert([{
                      user_id: pending.userId,
                      full_name: pending.fullName,
                      phone_number: pending.phone,
                      kyc_status: 'pending'
                    }], { onConflict: 'user_id' });
                    if (fErr) console.error('Error finishing pending farmer insert:', fErr);
                  } else if (pending.role === 'staff') {
                    const { error: sErr } = await supabase.from('staff').upsert([{
                      user_id: pending.userId,
                      employee_id: `STAFF-${Date.now()}`
                    }], { onConflict: 'user_id' });
                    if (sErr) console.error('Error finishing pending staff insert:', sErr);
                  }

                  // Remove pending marker
                  try { window.localStorage.removeItem('pending_profile'); } catch (e) { /* ignore */ }
                }
              }
            }
          } catch (e) {
            console.error('Error processing pending profile:', e);
          }

          // Flush any pending auth events queued while unauthenticated
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              const key = 'pending_auth_events';
              const raw = window.localStorage.getItem(key);
              if (raw) {
                const list = JSON.parse(raw) as Array<any>;
                for (const ev of list) {
                  try {
                    // call helper which checks session and writes events
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const { logAuthEvent } = await import('@/lib/supabase/auth');
                    await logAuthEvent(ev.userId, ev.eventType, ev.metadata || {});
                  } catch (e) {
                    console.error('Error flushing pending auth event:', e);
                  }
                }
                try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
              }
            }
          } catch (e) {
            console.error('Error flushing pending auth events:', e);
          }

          // Only fetch role if we don't have it or user changed
          if (!userRole || user?.id !== session.user.id) {
            const role = await getUserRole(session.user.id);
            setUserRole(role);
          }
        }
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          const role = await getUserRole(session.user.id);
          setUserRole(role);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up session refresh
    const setupSessionRefresh = () => {
      const timeoutId = setInterval(async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session refresh error:', error);
          return;
        }
        
        if (session?.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000);
          const now = new Date();
          const timeUntilExpiry = expiresAt.getTime() - now.getTime();
          
          // If token expires in less than 5 minutes, refresh it
          if (timeUntilExpiry < 300000) {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('Error refreshing session:', error);
            }
          }
        }
      }, 60000); // Check every minute

      return () => clearInterval(timeoutId);
    };

    const cleanupRefresh = setupSessionRefresh();

    return () => {
      subscription.unsubscribe();
      cleanupRefresh();
    };
  }, [user?.id, userRole]);

  const checkAccountLockout = async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('check_account_lockout', {
        p_email: email
      });

      if (error) throw error;

      return {
        isLocked: data.is_locked,
        attemptsRemaining: data.attempts_remaining,
        lockedUntil: data.locked_until ? new Date(data.locked_until) : null
      };
    } catch (error) {
      console.error('Error checking account lockout:', error);
      return null;
    }
  };

  const resetAccountLockout = async (email: string) => {
    try {
      await supabase.rpc('reset_account_lockout', {
        p_email: email
      });
    } catch (error) {
      console.error('Error resetting account lockout:', error);
    }
  };

  const login = async ({ email, password, role }: LoginData) => {
    try {
      // Clear any existing session before login
      await supabase.auth.signOut();
      
      console.log('Attempting login with:', { email, role });

      // Check for account lockout
      const lockoutStatus = await checkAccountLockout(email);
      try { console.debug('[AuthContext] checkAccountLockout returned for', email, lockoutStatus); } catch (e) { /* ignore */ }
      if (lockoutStatus?.isLocked) {
        const waitMinutes = Math.ceil(
          (lockoutStatus.lockedUntil!.getTime() - Date.now()) / (1000 * 60)
        );
        throw new Error(
          `Account is locked. Please try again in ${waitMinutes} minutes.`
        );
      }
      
      // Attempt authentication with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Supabase auth error:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // Handle specific error cases
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        throw error;
      }

      if (!data.user || !data.session) {
        console.error('Invalid auth response:', { data });
        throw new Error('Authentication failed');
      }

      // Verify session is valid
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('Session verification failed:', sessionError);
        throw new Error('Session verification failed');
      }

      // Check user role in user_roles table
      const userRole = await getUserRole(data.user.id);
      console.log('Role check response:', { userRole });

      if (!userRole || userRole !== role) {
        await signOut();
        throw new Error(`Invalid ${role} credentials. User does not have ${role} role.`);
      }

      // Ensure token is fresh
      await supabase.auth.refreshSession();

      // Reset lockout counter on successful login
      await resetAccountLockout(email);
      
      return { error: null };
    } catch (error) {
      // Ensure clean state on error
      await signOut();

      // If the error is not a lockout error, it's a failed attempt
      if (error instanceof Error && !error.message.includes('Account is locked')) {
        const lockoutStatus = await checkAccountLockout(email);
        if (lockoutStatus?.attemptsRemaining === 0) {
          return {
            error: new Error(
              `Too many failed attempts. Your account has been locked for 15 minutes.`
            )
          };
        } else if (lockoutStatus?.attemptsRemaining) {
          return {
            error: new Error(
              `Invalid credentials. ${lockoutStatus.attemptsRemaining} attempts remaining.`
            )
          };
        }
      }

      return { error };
    }
  };

  const signUp = async ({ email, password, fullName, phone, role }: SignUpData) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // First, sign up the user
      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
            role: role // Store role in user metadata
          }
        }
      });

      if (signUpResult.error) throw signUpResult.error;
      if (!signUpResult.data.user) throw new Error('User creation failed');

      const userId = signUpResult.data.user.id;

      // If the signup flow did not return a session (email confirmation required),
      // the client is not authenticated and attempting to insert into protected
      // tables (like `profiles`) will produce 401 errors due to RLS.
      // In that case defer creating the profile until the user confirms their
      // email and signs in. Persist the pending profile locally so the UI can
      // complete the profile creation after the user verifies email.
      const hasSession = !!signUpResult.data.session;
      if (!hasSession) {
        try {
          const pending = {
            userId,
            fullName,
            email,
            phone,
            role,
            createdAt: new Date().toISOString()
          };
          // store pending profile details so the app can complete setup after email confirmation
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('pending_profile', JSON.stringify(pending));
          }
        } catch (e) {
          // ignore storage errors
        }

        console.log('Email confirmation required — profile creation deferred for user:', userId);
        return { error: null };
      }

      // Create profile first (only when client has an active session)
      const profileResult = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          full_name: fullName,
          email: email,
          phone: phone
        }]);

      if (profileResult.error) {
        console.error('Error creating profile:', profileResult.error);
        throw profileResult.error;
      }

      // Insert user role
      const roleInsert = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role: role
        }]);

      if (roleInsert.error) {
        console.error('Error creating user role:', roleInsert.error);
        throw roleInsert.error;
      }

      // Create role-specific record
      if (role === 'farmer') {
        const farmerInsert = await supabase
          .from('farmers')
          .insert([{
            user_id: userId,
            registration_number: `F-${Date.now()}`,
            full_name: fullName,
            phone_number: phone,
            kyc_status: 'pending'
          }]);

        if (farmerInsert.error) {
          console.error('Error creating farmer record:', farmerInsert.error);
          throw farmerInsert.error;
        }
      } else if (role === 'staff') {
        const staffInsert = await supabase
          .from('staff')
          .insert([{
            user_id: userId,
            employee_id: `STAFF-${Date.now()}`
          }]);

        if (staffInsert.error) {
          console.error('Error creating staff record:', staffInsert.error);
          throw staffInsert.error;
        }
      }

      // Log successful signup
      if (userId) {
        await supabase.rpc('log_auth_event', {
          p_user_id: userId,
          p_event_type: 'SIGNUP',
          p_metadata: {
            role: role,
            method: 'email'
          }
        });
      }

      return { error: null };
    } catch (err: any) {
      console.error('Signup error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, login, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Helpful runtime diagnostics to surface why the provider might be missing.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = typeof window !== 'undefined' ? (window as any) : undefined;
      if (win) {
        console.error('useAuth called but no AuthProvider found. window.__authProviderMounted=', win.__authProviderMounted);
      } else {
        console.error('useAuth called outside of browser environment and no AuthProvider found.');
      }
    } catch (e) {
      console.error('useAuth diagnostic logging failed', e);
    }

    // Return a safe fallback so the app doesn't crash while we debug mounting issues.
    // Consumers should handle missing provider gracefully; attempting to call the
    // stubbed methods will throw clear errors.
    return {
      user: null,
      session: null,
      userRole: null,
      loading: true,
      login: async () => { throw new Error('AuthProvider not mounted'); },
      signUp: async () => { throw new Error('AuthProvider not mounted'); },
      signOut: async () => { /* noop */ }
    } as AuthContextType;
  }

  return context;
};
