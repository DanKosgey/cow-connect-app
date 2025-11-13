import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { UserRole } from '@/types/auth.types';
import { PageLoader } from '@/components/PageLoader';
import { useEffect, useState, useMemo } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Set a timeout to prevent indefinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000); // Increased timeout to 15 seconds
      
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Debounce loader to prevent flickering
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowLoader(true);
      }, 500); // Increased debounce time to 500ms
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

  // Memoize the redirect paths to prevent unnecessary re-renders
  const loginRoutes = useMemo(() => ({
    [UserRole.ADMIN]: '/admin/login',
    [UserRole.STAFF]: '/collector/login',
    [UserRole.FARMER]: '/farmer/login'
  }), []);

  const dashboardRoutes = useMemo(() => ({
    [UserRole.ADMIN]: '/admin/dashboard',
    [UserRole.STAFF]: '/collector/dashboard',
    [UserRole.FARMER]: '/farmer/dashboard'
  }), []);

  // If user is not authenticated, redirect to appropriate login page
  if (!user && !loading) {
    return <Navigate to={loginRoutes[requiredRole]} state={{ from: location }} replace />;
  }

  // If user has a different role than required, redirect to their dashboard
  if (userRole && userRole !== requiredRole && !loading) {
    return <Navigate to={dashboardRoutes[userRole]} replace />;
  }
  
  // If we don't have a userRole yet, check cached role
  if (!userRole && !loading) {
    const cachedInfo = getCachedRoleInfo();
    
    if (cachedInfo?.isValid) {
      // If cached role matches required role, allow access
      if (cachedInfo.cachedRole === requiredRole) {
        return <>{children}</>;
      }
      
      // If cached role doesn't match, redirect to correct dashboard
      return <Navigate to={dashboardRoutes[cachedInfo.cachedRole as UserRole]} replace />;
    }
  }

  // Handle loading state
  if (loading && !loadingTimeout) {
    return showLoader ? <PageLoader type="dashboard" /> : null;
  }
  
  // If loading timed out, check if we can use cached role
  if (loadingTimeout) {
    const cachedInfo = getCachedRoleInfo();
    
    if (cachedInfo?.isValid && cachedInfo.cachedRole === requiredRole) {
      return <>{children}</>;
    }
    
    // No valid cached role, continue showing loader
    return <PageLoader type="dashboard" />;
  }

  // User is authenticated and has the correct role
  return <>{children}</>;
}