import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { UserRole } from '@/types/auth.types';
import { PageLoader } from '@/components/PageLoader';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);

  // Log authentication state changes for debugging
  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.debug('ProtectedRoute auth state changed', { 
        user: user?.id, 
        userRole, 
        loading,
        requiredRole 
      });
    }
  }, [user, userRole, loading, requiredRole]);

  // Debounce loader to prevent flickering
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowLoader(true);
      }, 150); // Only show loader if loading takes more than 150ms
      return () => clearTimeout(timer);
    } else {
      setShowLoader(false);
    }
  }, [loading]);

  // If user is not authenticated, redirect to appropriate login page
  if (!user) {
    // Store the attempted URL for redirecting after login
    const loginRoutes = {
      [UserRole.ADMIN]: '/admin/login',
      [UserRole.STAFF]: '/staff/login',
      [UserRole.FARMER]: '/farmer/login'
    };
    
    // Only log in development mode to reduce console spam
    if (import.meta.env.DEV) {
      logger.debug('Redirecting to login. Required role:', requiredRole);
    }
    
    return <Navigate to={loginRoutes[requiredRole]} state={{ from: location }} replace />;
  }

  // If we have a user but no role yet (still loading), show loader
  // But be more tolerant of role unavailability during token refresh
  if (!userRole && loading) {
    if (showLoader) {
      return <PageLoader type="dashboard" />;
    }
    return null;
  }

  // If user has a different role than required, redirect to their dashboard
  // But allow access if role is temporarily unavailable (during token refresh)
  if (userRole && userRole !== requiredRole) {
    // Only log in development mode to reduce console spam
    if (import.meta.env.DEV) {
      logger.debug('Role mismatch. User role:', userRole, 'Required role:', requiredRole);
    }
    
    const dashboardRoutes = {
      [UserRole.ADMIN]: '/admin/dashboard',
      [UserRole.STAFF]: '/staff/dashboard',
      [UserRole.FARMER]: '/farmer/dashboard'
    };
    
    return <Navigate to={dashboardRoutes[userRole as UserRole]} replace />;
  }

  // Show loader only if loading is taking time
  if (loading && showLoader) {
    return <PageLoader type="dashboard" />;
  }

  // User is authenticated and has the correct role (or role is still being determined)
  // Allow access even if role is temporarily unavailable during token refresh
  return <>{children}</>;
};