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
  
  // Log component mount/unmount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('ProtectedRoute: Component mounted', { requiredRole });
    }
    return () => {
      if (import.meta.env.DEV) {
        console.log('ProtectedRoute: Component unmounting', { requiredRole });
      }
    };
  }, [requiredRole]);
  
  // Set a timeout to prevent indefinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.log('ProtectedRoute: Loading timeout reached', { 
            userId: user?.id,
            requiredRole,
            cachedRole: localStorage.getItem('cached_role')
          });
        }
        setLoadingTimeout(true);
      }, 5000);
      
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading, user?.id, requiredRole]);

  // Log authentication state changes for debugging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('ProtectedRoute auth state changed', { 
        user: user?.id, 
        userRole, 
        loading,
        requiredRole,
        pathname: location.pathname,
        search: location.search
      });
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
      console.log('ProtectedRoute: Redirecting to login. Required role:', requiredRole);
    }
    
    return <Navigate to={loginRoutes[requiredRole]} state={{ from: location }} replace />;
  }

  // If user has a different role than required, redirect to their dashboard
  if (userRole && userRole !== requiredRole) {
    if (import.meta.env.DEV) {
      console.log('ProtectedRoute: Role mismatch. User role:', userRole, 'Required role:', requiredRole);
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
          console.log('ProtectedRoute: Allowing access with valid cached role', { 
            user: user.id, 
            cachedRole: cachedInfo.cachedRole,
            requiredRole 
          });
        }
        return <>{children}</>;
      }
      
      // If cached role doesn't match, redirect to correct dashboard
      if (import.meta.env.DEV) {
        console.log('ProtectedRoute: Cached role mismatch', { 
          cachedRole: cachedInfo.cachedRole, 
          requiredRole 
        });
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
      console.log('ProtectedRoute: Loading, showing loader');
    }
    return <PageLoader type="dashboard" />;
  }
  
  // If loading timed out, check if we can use cached role
  if (loadingTimeout) {
    const cachedInfo = getCachedRoleInfo();
    
    if (cachedInfo?.isValid && cachedInfo.cachedRole === requiredRole) {
      if (import.meta.env.DEV) {
        console.log('ProtectedRoute: Allowing access with cached role after timeout', { 
          user: user.id, 
          cachedRole: cachedInfo.cachedRole,
          requiredRole 
        });
      }
      return <>{children}</>;
    }
    
    // No valid cached role, continue showing loader
    if (import.meta.env.DEV) {
      console.log('ProtectedRoute: Timeout reached but no valid cached role');
    }
    return <PageLoader type="dashboard" />;
  }

  // User is authenticated and has the correct role
  if (import.meta.env.DEV) {
    console.log('ProtectedRoute: Allowing access to protected route', { 
      user: user.id, 
      userRole, 
      requiredRole 
    });
  }
  
  return <>{children}</>;
}