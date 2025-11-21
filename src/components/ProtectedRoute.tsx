import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { UserRole } from '@/types/auth.types';
import { PageLoader } from '@/components/PageLoader';
import { useEffect, useState, useMemo } from 'react';
import AdminDebugLogger from '@/utils/adminDebugLogger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, loading, refreshSession, signOut } = useAuth();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  AdminDebugLogger.log('Rendering ProtectedRoute component', { 
    requiredRole, 
    userPresent: !!user, 
    userRole,
    loading,
    userId: user?.id,
    userEmail: user?.email
  });
  
  // Set a timeout to prevent indefinite loading
  useEffect(() => {
    AdminDebugLogger.log('Setting up loading timeout effect', { loading });
    if (loading) {
      const timeout = setTimeout(() => {
        AdminDebugLogger.log('Loading timeout reached');
        setLoadingTimeout(true);
      }, 15000); // Increased timeout to 15 seconds
      
      return () => {
        AdminDebugLogger.log('Clearing loading timeout');
        clearTimeout(timeout);
      };
    } else {
      AdminDebugLogger.log('Loading finished, clearing timeout state');
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Debounce loader to prevent flickering
  useEffect(() => {
    AdminDebugLogger.log('Setting up loader debounce effect', { loading });
    if (loading) {
      const timer = setTimeout(() => {
        AdminDebugLogger.log('Debounce timer finished, showing loader');
        setShowLoader(true);
      }, 500); // Reduced debounce time
      
      return () => {
        AdminDebugLogger.log('Clearing loader debounce timer');
        clearTimeout(timer);
      };
    } else {
      AdminDebugLogger.log('Loading finished, hiding loader immediately');
      setShowLoader(false);
    }
  }, [loading]);

  // Check session validity when component mounts and when loading state changes
  useEffect(() => {
    const checkSession = async () => {
      if (loading && !sessionChecked) {
        setSessionChecked(true);
        AdminDebugLogger.log('Checking session validity...');
        
        try {
          // Try to refresh the session if it might be expired
          const { success, error } = await refreshSession();
          
          if (!success) {
            AdminDebugLogger.error('Session refresh failed:', error);
            
            // If it's an auth error, sign out and redirect to login
            if (error?.message?.includes('Invalid authentication credentials') || 
                error?.message?.includes('JWT expired') ||
                error?.message?.includes('Not authenticated')) {
              AdminDebugLogger.log('Session invalid, signing out...');
              await signOut();
            }
          } else {
            AdminDebugLogger.log('Session refresh successful');
          }
        } catch (error) {
          AdminDebugLogger.error('Error during session check:', error);
        }
      }
    };
    
    checkSession();
  }, [loading, sessionChecked, refreshSession, signOut]);

  const getCachedRoleInfo = () => {
    try {
      const cachedRole = localStorage.getItem('cached_role');
      const cacheTimestamp = localStorage.getItem('auth_cache_timestamp');
      
      AdminDebugLogger.log('Checking cached role info', { cachedRole, cacheTimestamp });
      
      if (!cachedRole || !cacheTimestamp) {
        AdminDebugLogger.log('No cached role found');
        return null;
      }
      
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      const isValid = cacheAge < 30 * 60 * 1000; // 30 minutes
      
      AdminDebugLogger.log('Cache validation:', { cacheAge, isValid });
      return { cachedRole, isValid };
    } catch (error) {
      AdminDebugLogger.error('Error checking cached role:', error);
      return null;
    }
  };

  // Memoize the redirect paths to prevent unnecessary re-renders
  const loginRoutes = useMemo(() => ({
    [UserRole.ADMIN]: '/admin/login',
    [UserRole.STAFF]: '/staff-only/login',
    [UserRole.COLLECTOR]: '/collector/login',
    [UserRole.CREDITOR]: '/creditor/login',
    [UserRole.FARMER]: '/farmer/login'
  }), []);

  const dashboardRoutes = useMemo(() => ({
    [UserRole.ADMIN]: '/admin/dashboard',
    [UserRole.STAFF]: '/staff-only/dashboard',
    [UserRole.COLLECTOR]: '/collector/dashboard',
    [UserRole.CREDITOR]: '/creditor/dashboard',
    [UserRole.FARMER]: '/farmer/dashboard'
  }), []);

  // If user is not authenticated, redirect to appropriate login page
  AdminDebugLogger.log('Checking authentication status', { userPresent: !!user, loading });
  if (!user && !loading) {
    AdminDebugLogger.log('User not authenticated, redirecting to login', { 
      requiredRole, 
      redirectPath: loginRoutes[requiredRole] 
    });
    return <Navigate to={loginRoutes[requiredRole]} state={{ from: location }} replace />;
  }

  // If user has a different role than required, redirect to their dashboard
  AdminDebugLogger.log('Checking role match', { userRole, requiredRole, loading });
  if (userRole && userRole !== requiredRole && !loading) {
    AdminDebugLogger.log('Role mismatch, redirecting to user dashboard', { 
      userRole, 
      requiredRole, 
      redirectPath: dashboardRoutes[userRole] 
    });
    return <Navigate to={dashboardRoutes[userRole]} replace />;
  }
  
  // If we don't have a userRole yet, check cached role
  AdminDebugLogger.log('Checking for cached role', { userRolePresent: !!userRole, loading });
  if (!userRole && !loading) {
    AdminDebugLogger.log('No user role found, checking cache...');
    const cachedInfo = getCachedRoleInfo();
    
    if (cachedInfo?.isValid) {
      AdminDebugLogger.success('Valid cached role found', cachedInfo);
      // If cached role matches required role, allow access
      if (cachedInfo.cachedRole === requiredRole) {
        AdminDebugLogger.success('Cached role matches required role, allowing access');
        return <>{children}</>;
      }
      
      // If cached role doesn't match, redirect to correct dashboard
      AdminDebugLogger.log('Cached role mismatch, redirecting to cached role dashboard', { 
        cachedRole: cachedInfo.cachedRole, 
        redirectPath: dashboardRoutes[cachedInfo.cachedRole as UserRole] 
      });
      return <Navigate to={dashboardRoutes[cachedInfo.cachedRole as UserRole]} replace />;
    } else {
      AdminDebugLogger.log('No valid cached role found');
    }
  }

  // Handle loading state
  AdminDebugLogger.log('Handling loading state', { loading, loadingTimeout, showLoader });
  if (loading && !loadingTimeout) {
    AdminDebugLogger.log('Still loading, showing loader:', showLoader);
    return showLoader ? <PageLoader type="dashboard" /> : null;
  }
  
  // If loading timed out, check if we can use cached role
  if (loadingTimeout) {
    AdminDebugLogger.log('Loading timeout reached, checking cache...');
    const cachedInfo = getCachedRoleInfo();
    
    if (cachedInfo?.isValid && cachedInfo.cachedRole === requiredRole) {
      AdminDebugLogger.success('Loading timeout but valid cached role matches, allowing access');
      return <>{children}</>;
    }
    
    // No valid cached role, redirect to login
    AdminDebugLogger.log('Loading timeout and no valid cached role, redirecting to login');
    return <Navigate to={loginRoutes[requiredRole]} state={{ from: location, sessionExpired: true }} replace />;
  }

  // User is authenticated and has the correct role
  AdminDebugLogger.success('User authenticated with correct role, rendering children');
  return <>{children}</>;
};