import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'staff' | 'admin' | 'farmer';
}

export default function ProtectedRoute({ children, requiredRole = 'staff' }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          setHasAccess(false);
          return;
        }

        // Check user role
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, status')
          .eq('user_id', user.id)
          .limit(1);

        if (profileError) throw profileError;
        
        // Check if we have any profile data
        if (!profiles || profiles.length === 0) {
          setHasAccess(false);
          return;
        }
        
        const profile = profiles[0];

        const hasRequiredRole = profile?.role === requiredRole;
        const isActive = profile?.status === 'active';
        setHasAccess(hasRequiredRole && isActive);

      } catch (error) {
        console.error('Auth check error:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [requiredRole]);

  if (loading) {
    return <LoadingSkeleton type="form" />;
  }

  if (!hasAccess) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}