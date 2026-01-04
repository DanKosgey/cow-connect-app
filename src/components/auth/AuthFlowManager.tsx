import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { logger } from '@/utils/logger';

interface AuthFlowManagerProps {
  children: React.ReactNode;
  redirectPath?: string;
}

// Constants
const INIT_DELAY = 300;
const COMPLETION_DELAY = 300;
const PROGRESS_STEP = 50;

/**
 * Authentication Flow Manager
 * Coordinates authentication flow and provides smooth transitions between states
 */
export const AuthFlowManager: React.FC<AuthFlowManagerProps> = ({
  children,
  redirectPath = '/dashboard'
}) => {
  const {
    isAuthenticated,
    isLoading,
    isSessionRefreshing,
    userRole
  } = useAuth();

  // REMOVED: const { validateSession } = useSessionManager(); ← This was causing the loop!
  const navigate = useNavigate();
  const location = useLocation();

  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState(0);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  const hasRedirected = useRef(false);

  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(async () => {
    try {
      logger.debug('Initializing authentication flow');
      setIsInitializing(true);
      setInitProgress(0);

      // Step 1: Check user role
      setInitProgress(PROGRESS_STEP);
      await new Promise(resolve => setTimeout(resolve, INIT_DELAY));

      // Step 2: Finalize
      if (isMounted.current) {
        setInitProgress(100);
        logger.debug('Authentication flow initialized');
      }
    } catch (error) {
      logger.error('Authentication initialization error', error);
    } finally {
      // Small delay to show completion
      setTimeout(() => {
        if (isMounted.current) {
          setIsInitializing(false);
        }
      }, COMPLETION_DELAY);
    }
  }, []);

  /**
   * Determine redirect path based on user role
   */
  const getRedirectPath = useCallback((role: string | null): string => {
    if (!role) return '/no-role'; // Redirect to no-role page instead of generic dashboard

    // Role-based dashboard paths
    const rolePaths: Record<string, string> = {
      admin: '/admin/dashboard',
      farmer: '/farmer/dashboard',
      staff: '/staff-only/dashboard',
      collector: '/collector/dashboard',
      creditor: '/creditor/dashboard'
    };

    return rolePaths[role] || '/no-role'; // Redirect to no-role page for unknown roles
  }, []);

  /**
   * Check if current path is a login/auth page
   */
  const isAuthPage = useCallback((pathname: string): boolean => {
    const authPages = ['/login', '/signup', '/register', '/auth', '/reset-password'];
    return authPages.some(page => pathname.includes(page));
  }, []);

  /**
   * Check if current path is the no-role page
   */
  const isNoRolePage = useCallback((pathname: string): boolean => {
    return pathname === '/no-role';
  }, []);

  /**
   * Handle authentication redirects
   */
  const handleRedirect = useCallback(() => {
    // Prevent multiple redirects, UNLESS we are on the no-role page and now have a role
    // This allows users to be "rescued" from the no-role screen once their role loads
    const isRecoveringFromNoRole = isAuthenticated && userRole && isNoRolePage(location.pathname);

    if (hasRedirected.current && !isRecoveringFromNoRole) {
      console.log('🚀 [AuthFlowManager] Redirect already handled, skipping');
      return;
    }

    const { pathname, state } = location;
    const from = state?.from;

    console.log('🚀 [AuthFlowManager] Evaluating redirect:', {
      isAuthenticated,
      userRole,
      pathname,
      from,
      isAuthPage: isAuthPage(pathname),
      isNoRolePage: isNoRolePage(pathname)
    });

    // Case 1: User is authenticated and came from a specific page
    if (isAuthenticated && from && from.pathname !== pathname) {
      console.log('🚀 [AuthFlowManager] Redirecting to original destination:', from.pathname);
      logger.debug('Redirecting to original destination', from);
      hasRedirected.current = true;
      navigate(from, { replace: true });
      return;
    }

    // Case 2: User is authenticated but on an auth page (login/signup/register)
    if (isAuthenticated && isAuthPage(pathname)) {
      // Special handling for signup/register: If they are on signup or register, 
      // DO NOT redirect. Let them finish the form.
      // Even if they have a role (assigned early or from OTP verification), they need to finish the wizard.
      if (pathname.includes('/signup') || pathname.includes('/register')) {
        console.log('🚀 [AuthFlowManager] Authenticated on signup/register - staying on page to complete registration');
        return;
      }

      const targetPath = getRedirectPath(userRole);
      console.log('🚀 [AuthFlowManager] Redirecting from auth page to:', targetPath);
      logger.debug('Redirecting authenticated user to dashboard', { targetPath, userRole });
      hasRedirected.current = true;
      navigate(targetPath, { replace: true });
      return;
    }

    // Case 3: User is authenticated but has no role
    if (isAuthenticated && !userRole) {
      console.log('🚀 [AuthFlowManager] User authenticated but no role, redirecting to no-role page');
      hasRedirected.current = true;
      navigate('/no-role', { replace: true });
      return;
    }

    // Case 4: User is authenticated, has a role, but is on the no-role page
    // This handles the case where a user was previously on no-role page but now has a role assigned
    if (isAuthenticated && userRole && isNoRolePage(pathname)) {
      const targetPath = getRedirectPath(userRole);
      console.log('🚀 [AuthFlowManager] User now has role, redirecting from no-role page to:', targetPath);
      logger.debug('Redirecting user with newly assigned role', { targetPath, userRole });
      hasRedirected.current = true;
      navigate(targetPath, { replace: true });
      return;
    }

    console.log('🚀 [AuthFlowManager] No redirect needed');
  }, [isAuthenticated, userRole, location, navigate, isAuthPage, isNoRolePage, getRedirectPath]);

  // Initialize on mount ONLY ONCE
  useEffect(() => {
    initializeAuth();

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
    };
  }, []); // ← Empty deps array - only run once on mount

  // Reset redirect flag when location changes
  useEffect(() => {
    hasRedirected.current = false;
  }, [location.pathname]);

  // Handle redirects after authentication state is settled
  // IMPORTANT: Don't run this during session refresh to prevent loops
  useEffect(() => {
    // Skip redirect logic entirely during session refresh
    if (isSessionRefreshing) {
      console.log('🚀 [AuthFlowManager] Session refreshing, skipping redirect logic');
      return;
    }

    const shouldCheckRedirect = !isInitializing && !isLoading;

    console.log('🚀 [AuthFlowManager] Redirect check:', {
      isInitializing,
      isLoading,
      isSessionRefreshing,
      isAuthenticated,
      userRole,
      pathname: location.pathname,
      shouldCheckRedirect,
      hasRedirected: hasRedirected.current
    });

    if (shouldCheckRedirect) {
      handleRedirect();
    }
  }, [
    isAuthenticated,
    isLoading,
    isInitializing,
    location.pathname,
    userRole,
    handleRedirect
    // REMOVED: isSessionRefreshing from deps to prevent triggering on every refresh
  ]);

  // Show loading screen during initialization or initial load ONLY
  // Don't show loading during session refresh to prevent loop
  if (isInitializing || (isLoading && !isSessionRefreshing)) {
    return (
      <AuthLoadingScreen
        message={getLoadingMessage(isInitializing, isSessionRefreshing)}
        showProgress={isInitializing}
        progress={initProgress}
      />
    );
  }

  // Render children once initialization is complete
  return <>{children}</>;
};

/**
 * Get appropriate loading message based on state
 */
function getLoadingMessage(isInitializing: boolean, isRefreshing: boolean): string {
  if (isRefreshing) return "Refreshing your session...";
  if (isInitializing) return "Initializing secure session...";
  return "Loading your profile...";
}