import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSessionManager } from '@/hooks/useSessionManager';
import { UserRole } from '@/types/auth.types';
import { PageLoader } from '@/components/PageLoader';
import { handleAuthError, isSessionExpiredError } from '@/utils/authErrorHandler';
import { logger } from '@/utils/logger';

interface EnhancedProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallbackRedirect?: string;
}

/**
 * Enhanced Protected Route with improved session management and error handling
 */
export const EnhancedProtectedRoute: React.FC<EnhancedProtectedRouteProps> = ({
  children,
  requiredRole,
  fallbackRedirect
}) => {
  const {
    isAuthenticated,
    isLoading,
    isSessionRefreshing,
    userRole,
    hasRole,
    refreshSession
  } = useAuth();

  const { validateSession } = useSessionManager({
    refreshInterval: 20 * 60 * 1000, // 20 minutes
    enableAutoRefresh: true
  });

  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Redirect paths
  const loginPath = '/login';
  const dashboardPaths: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/admin/dashboard',
    [UserRole.COLLECTOR]: '/collector-only/dashboard',
    [UserRole.STAFF]: '/staff-only/dashboard',
    [UserRole.FARMER]: '/farmer/dashboard',
    [UserRole.CREDITOR]: '/creditor/dashboard'
  };

  /**
   * Perform enhanced authentication check
   */
  const performAuthCheck = useCallback(async () => {
    if (isLoading || isSessionRefreshing || isCheckingAuth) {
      return;
    }

    setIsCheckingAuth(true);
    setAuthError(null);

    try {
      logger.debug('Performing enhanced auth check');

      // Validate session
      const isValid = await validateSession();

      if (!isValid) {
        logger.warn('Session validation failed during auth check');
        setAuthError('Your session has expired. Please sign in again.');
        return;
      }

      // If user is not authenticated, set error
      if (!isAuthenticated) {
        setAuthError('Authentication required. Please sign in.');
        return;
      }

      // If a specific role is required and user doesn't have it
      if (requiredRole && !hasRole(requiredRole)) {
        setAuthError(`Access denied. This resource requires ${requiredRole} permissions.`);
        return;
      }

      logger.debug('Auth check passed');
    } catch (error) {
      const parsedError = handleAuthError(error);
      setAuthError(parsedError.message);

      // If session expired, redirect to login
      if (isSessionExpiredError(error)) {
        logger.info('Session expired, redirecting to login');
        window.location.href = loginPath;
      }
    } finally {
      setIsCheckingAuth(false);
    }
  }, [
    isAuthenticated,
    isLoading,
    isSessionRefreshing,
    isCheckingAuth,
    requiredRole,
    hasRole,
    validateSession
  ]);

  // Run auth check on mount and when dependencies change
  useEffect(() => {
    performAuthCheck();
  }, [performAuthCheck]);

  // Handle window focus to re-validate auth
  useEffect(() => {
    const handleFocus = () => {
      logger.debug('Window focused, performing auth check');
      performAuthCheck();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [performAuthCheck]);

  // Show loader while checking authentication status
  if (isLoading || isSessionRefreshing || isCheckingAuth) {
    return <PageLoader type="dashboard" />;
  }

  // Show error if there's an auth error
  if (authError) {
    // For session expiration, automatically redirect
    if (authError.includes('session has expired')) {
      return (
        <Navigate
          to={loginPath}
          state={{ from: location, error: authError }}
          replace
        />
      );
    }

    // For role-based access denied, redirect to user's dashboard or fallback
    if (authError.includes('Access denied')) {
      const fallbackUrl = fallbackRedirect || (userRole ? dashboardPaths[userRole] : '/');
      return (
        <Navigate
          to={fallbackUrl}
          state={{ error: authError }}
          replace
        />
      );
    }
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to={loginPath}
        state={{ from: location }}
        replace
      />
    );
  }

  // If a specific role is required and user doesn't have it, redirect appropriately
  if (requiredRole && !hasRole(requiredRole)) {
    const fallbackUrl = fallbackRedirect || (userRole ? dashboardPaths[userRole] : '/');
    return (
      <Navigate
        to={fallbackUrl}
        state={{ error: 'Access denied. Insufficient permissions.' }}
        replace
      />
    );
  }

  // User is authenticated and has the required role (if any)
  return <>{children}</>;
};