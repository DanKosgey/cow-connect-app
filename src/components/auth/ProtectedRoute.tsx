import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';
import { PageLoader } from '@/components/PageLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, isLoading, isSessionRefreshing, userRole, hasRole, refreshSession } = useAuth();
  const location = useLocation();
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const lastCheckRef = useRef<number>(0); // Track last check time

  // Redirect paths
  const loginPath = '/login';
  const dashboardPaths: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/admin/dashboard',
    [UserRole.COLLECTOR]: '/collector/dashboard',
    [UserRole.STAFF]: '/staff/dashboard',
    [UserRole.FARMER]: '/farmer/dashboard',
    [UserRole.CREDITOR]: '/creditor/dashboard'
  };

  // Check session validity when component mounts with rate limiting
  useEffect(() => {
    const checkSession = async () => {
      const now = Date.now();
      // Prevent checking more than once every 30 seconds
      if (now - lastCheckRef.current < 30000) {
        return;
      }
      
      if (!isLoading && !isSessionRefreshing && !isCheckingSession && isAuthenticated) {
        // Additional check to ensure we don't call refresh too frequently
        setIsCheckingSession(true);
        lastCheckRef.current = now;
        
        try {
          // Only attempt refresh if the session is close to expiring
          // Supabase handles automatic token refresh, so we don't need to force it
          console.log('ProtectedRoute: Session check - relying on Supabase automatic refresh');
        } catch (error) {
          console.error('Session check failed:', error);
        } finally {
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();
  }, [isLoading, isSessionRefreshing, isAuthenticated, isCheckingSession]);

  // Show loader while checking authentication status
  if (isLoading || isSessionRefreshing || isCheckingSession) {
    return <PageLoader type="dashboard" />;
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

  // If a specific role is required and user doesn't have it, redirect to their dashboard
  if (requiredRole && !hasRole(requiredRole)) {
    // Redirect to user's own dashboard
    const userDashboard = userRole ? dashboardPaths[userRole] : '/';
    return (
      <Navigate 
        to={userDashboard} 
        replace 
      />
    );
  }

  // User is authenticated and has the required role (if any)
  return <>{children}</>;
};