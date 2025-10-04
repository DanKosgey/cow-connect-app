import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string, 
    password: string, 
    fullName: string, 
    phone: string, 
    role: string,
    additionalData?: { 
      nationalId?: string; 
      address?: string; 
      farmLocation?: string;
      department?: string;
      assignedRoute?: string;
    }
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            setUserRole(roleData?.role ?? null);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => {
            setUserRole(data?.role ?? null);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    phone: string, 
    role: string,
    additionalData?: { 
      nationalId?: string; 
      address?: string; 
      farmLocation?: string;
      department?: string;
      assignedRoute?: string;
    }
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
        }
      }
    });

    if (error) {
      return { error };
    }

    if (!data.user) {
      return { error: { message: 'Failed to create user' } };
    }

    try {
      // Insert user role
      const { error: roleError } = await supabase.from('user_roles').insert([{
        user_id: data.user.id,
        role: role as 'admin' | 'staff' | 'farmer'
      }]);

      if (roleError) throw roleError;

      // Create role-specific record
      if (role === 'farmer') {
        const { error: farmerError } = await supabase.from('farmers').insert([{
          user_id: data.user.id,
          national_id: additionalData?.nationalId,
          address: additionalData?.address,
          farm_location: additionalData?.farmLocation,
          kyc_status: 'pending',
          registration_completed: true
        }]);
        if (farmerError) throw farmerError;
      } else if (role === 'staff') {
        const { error: staffError } = await supabase.from('staff').insert([{
          user_id: data.user.id,
          department: additionalData?.department,
          assigned_route: additionalData?.assignedRoute
        }]);
        if (staffError) throw staffError;
      }

      return { error: null };
    } catch (err: any) {
      // If role-specific creation fails, we should still allow login
      console.error('Error creating role-specific record:', err);
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
    <AuthContext.Provider value={{ user, session, userRole, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
