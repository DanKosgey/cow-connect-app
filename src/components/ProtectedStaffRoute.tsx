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
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, status')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

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