import { supabase } from './client';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/types/auth.types';

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

// Authentication Service
class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  private constructor() {
    // Initialize auth state listener
    this.initializeAuthListener();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize auth state listener
  private initializeAuthListener() {
    supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          this.currentUser = session?.user || null;
          this.currentSession = session;
          break;
        case 'SIGNED_OUT':
          this.currentUser = null;
          this.currentSession = null;
          break;
        case 'TOKEN_REFRESHED':
          this.currentSession = session;
          this.currentUser = session?.user || null;
          break;
        case 'USER_UPDATED':
          this.currentUser = session?.user || null;
          break;
      }
    });
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      this.currentUser = user;
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      this.currentSession = session;
      return session;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      this.currentUser = data.user;
      this.currentSession = data.session;

      return {
        user: data.user,
        session: data.session,
        error: null
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        user: null,
        session: null,
        error: error as Error
      };
    }
  }

  // Sign up with email and password
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const { email, password, fullName, phone, role } = data;
      
      // Create user account
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
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Sign up failed - no user returned');
      }

      // Store user role in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: authData.user.id,
            role: role
          }
        ]);

      if (roleError) {
        console.error('Error setting user role:', roleError);
        // Don't throw here as the account was created successfully
      }

      // Create role-specific profile
      await this.createRoleProfile(authData.user.id, role, fullName, phone);

      return {
        user: authData.user,
        session: authData.session,
        error: null
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        user: null,
        session: null,
        error: error as Error
      };
    }
  }

  // Create role-specific profile
  private async createRoleProfile(userId: string, role: UserRole, fullName: string, phone: string) {
    try {
      switch (role) {
        case UserRole.FARMER:
          await supabase.from('farmers').insert([
            {
              user_id: userId,
              full_name: fullName,
              phone_number: phone,
              kyc_status: 'pending'
            }
          ]);
          break;
          
        case UserRole.STAFF:
          await supabase.from('staff').insert([
            {
              user_id: userId,
              full_name: fullName
            }
          ]);
          break;
          
        // Add other roles as needed
      }
    } catch (error) {
      console.error(`Error creating ${role} profile:`, error);
    }
  }

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      this.currentUser = null;
      this.currentSession = null;

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as Error };
    }
  }

  // Refresh session
  async refreshSession(): Promise<{ session: Session | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }

      this.currentSession = data.session;
      this.currentUser = data.session?.user || null;

      return { session: data.session, error: null };
    } catch (error) {
      console.error('Session refresh error:', error);
      return { session: null, error: error as Error };
    }
  }

  // Request password reset
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        throw error;
      }

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

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Password update error:', error);
      return { error: error as Error };
    }
  }

  // Get user role
  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data?.role as UserRole || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  // Check if user has required role
  async hasRole(requiredRole: UserRole): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      
      if (!user) {
        return false;
      }

      const userRole = await this.getUserRole(user.id);
      return userRole === requiredRole;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

export default authService;