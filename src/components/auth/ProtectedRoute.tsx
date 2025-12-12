import React, { useEffect } from 'react';
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
  const { isAuthenticated, isLoading, userRole, hasRole } = useAuth();
  const location = useLocation();

  // Redirect paths
  const loginPath = '/auth/login';
  const dashboardPaths: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/admin/dashboard',
    [UserRole.COLLECTOR]: '/collector/dashboard',
    [UserRole.STAFF]: '/staff/dashboard',
    [UserRole.FARMER]: '/farmer/dashboard',
    [UserRole.CREDITOR]: '/creditor/dashboard'
  };

  // Show loader while checking authentication status
  if (isLoading) {
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