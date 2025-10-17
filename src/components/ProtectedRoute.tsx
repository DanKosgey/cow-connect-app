import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { UserRole } from '@/types/auth.types';
import { PageLoader } from '@/components/PageLoader';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Minimal component mount/unmount logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Only log component lifecycle in development
    }
    return () => {
      // Cleanup
    };
  }, [requiredRole]);
  
  // Set a timeout to prevent indefinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.log('ProtectedRoute: Loading timeout');
        }
        setLoadingTimeout(true);
      }, 5000);
      
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading, user?.id, requiredRole]);

  // Minimal authentication state changes logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Only log minimal auth state for debugging
    }
  }, [user?.id, userRole, loading, requiredRole, location.pathname, location.search]);

  // Debounce loader to prevent flickering
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowLoader(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setShowLoader(false);
    }
  }, [loading]);

  // Helper function to get cached role info
  const getCachedRoleInfo = () => {
    const cachedRole = localStorage.getItem('cached_role');
    const cacheTimestamp = localStorage.getItem('auth_cache_timestamp');
    
    if (!cachedRole || !cacheTimestamp) {
      return null;
    }
    
    const cacheAge = Date.now() - parseInt(cacheTimestamp);
    const isValid = cacheAge < 30 * 60 * 1000; // 30 minutes
    
    return { cachedRole, isValid };
  };

  // If user is not authenticated, redirect to appropriate login page
  if (!user) {
    const loginRoutes = {
      [UserRole.ADMIN]: '/admin/login',
      [UserRole.STAFF]: '/staff/login',
      [UserRole.FARMER]: '/farmer/login'
    };
    
    if (import.meta.env.DEV) {
      // Minimal logging for redirects
    }
    
    return <Navigate to={loginRoutes[requiredRole]} state={{ from: location }} replace />;
  }

  // If user has a different role than required, redirect to their dashboard
  if (userRole && userRole !== requiredRole) {
    if (import.meta.env.DEV) {
      // Minimal logging for role mismatch
    }
    
    const dashboardRoutes = {
      [UserRole.ADMIN]: '/admin/dashboard',
      [UserRole.STAFF]: '/staff/dashboard',
      [UserRole.FARMER]: '/farmer/dashboard'
    };
    
    return <Navigate to={dashboardRoutes[userRole]} replace />;
  }
  
  // If we don't have a userRole yet, check cached role
  if (!userRole) {
    const cachedInfo = getCachedRoleInfo();
    
    if (cachedInfo?.isValid) {
      // If cached role matches required role, allow access
      if (cachedInfo.cachedRole === requiredRole) {
        if (import.meta.env.DEV) {
          // Minimal logging for cached role access
        }
        return <>{children}</>;
      }
      
      // If cached role doesn't match, redirect to correct dashboard
      if (import.meta.env.DEV) {
        // Minimal logging for cached role mismatch
      }
      
      const dashboardRoutes = {
        [UserRole.ADMIN]: '/admin/dashboard',
        [UserRole.STAFF]: '/staff/dashboard',
        [UserRole.FARMER]: '/farmer/dashboard'
      };
      
      return <Navigate to={dashboardRoutes[cachedInfo.cachedRole as UserRole]} replace />;
    }
  }

  // Handle loading state
  if (loading && !loadingTimeout) {
    if (import.meta.env.DEV) {
      // Minimal logging for loading state
    }
    return <PageLoader type="dashboard" />;
  }
  
  // If loading timed out, check if we can use cached role
  if (loadingTimeout) {
    const cachedInfo = getCachedRoleInfo();
    
    if (cachedInfo?.isValid && cachedInfo.cachedRole === requiredRole) {
      if (import.meta.env.DEV) {
        // Minimal logging for cached role access after timeout
      }
      return <>{children}</>;
    }
    
    // No valid cached role, continue showing loader
    if (import.meta.env.DEV) {
      // Minimal logging for timeout
    }
    return <PageLoader type="dashboard" />;
  }

  // User is authenticated and has the correct role
  if (import.meta.env.DEV) {
    // Minimal logging for access granted
  }
  
  return <>{children}</>;
}