import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';
import { PageLoader } from '@/components/PageLoader';
import { useEffect, useState, useMemo, useRef } from 'react';
import AdminDebugLogger from '@/utils/adminDebugLogger';
import { authManager } from '@/utils/authManager';

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
  const checkSessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPerformedRedirect = useRef(false);
  
  AdminDebugLogger.log('Rendering ProtectedRoute component', { 
    requiredRole, 
    userPresent: !!user, 
    userRole,
    loading,
    userId: user?.id,
    userEmail: user?.email
  });
  
  // Check session validity when component mounts and when loading state changes
  useEffect(() => {
    const checkSession = async () => {
      // Prevent multiple simultaneous checks
      if (sessionChecked || hasPerformedRedirect.current) {
        return;
      }
      
      // ✅ Only check session validity if we don't have a user yet
      // Don't aggressively check if user is already authenticated
      if (loading && !user) {
        AdminDebugLogger.log('Checking session validity...');
        
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session check timeout')), 30000) // Keep at 30s
          );
          
          const validationPromise = authManager.validateAndRefreshSession();
          const isValid = await Promise.race([validationPromise, timeoutPromise]) as boolean;
          
          setSessionChecked(true);
          
          if (!isValid) {
            AdminDebugLogger.error('Session is not valid');
            // Try to refresh session one more time before signing out
            const refreshSuccess = await authManager.refreshSession();
            if (!refreshSuccess) {
              await authManager.signOut();
              // Force redirect only if we haven't already redirected
              if (!hasPerformedRedirect.current) {
                hasPerformedRedirect.current = true;
                window.location.href = loginRoutes[requiredRole];
              }
            } else {
              AdminDebugLogger.log('Session successfully refreshed');
            }
          } else {
            AdminDebugLogger.log('Session is valid');
          }
        } catch (error) {
          AdminDebugLogger.error('Error during session check:', error);
          // Try to refresh session as fallback before signing out
          try {
            const refreshSuccess = await authManager.refreshSession();
            if (!refreshSuccess) {
              // On any error, sign out but ensure we don't get in a redirect loop
              if (!hasPerformedRedirect.current) {
                await authManager.signOut();
                hasPerformedRedirect.current = true;
                window.location.href = loginRoutes[requiredRole];
              }
            } else {
              AdminDebugLogger.log('Session successfully refreshed on fallback');
            }
          } catch (refreshError) {
            AdminDebugLogger.error('Error during session refresh fallback:', refreshError);
            if (!hasPerformedRedirect.current) {
              await authManager.signOut();
              hasPerformedRedirect.current = true;
              window.location.href = loginRoutes[requiredRole];
            }
          }
        }
      }
    };
    
    checkSession();
    
    // Cleanup timeout on unmount
    return () => {
      if (checkSessionTimeoutRef.current) {
        clearTimeout(checkSessionTimeoutRef.current);
      }
    };
  }, [loading, user, requiredRole, sessionChecked]); // ✅ Also depend on user state

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