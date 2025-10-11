import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { UserRole } from '@/types/auth.types';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'staff' | 'admin' | 'farmer';
}

export default function ProtectedRoute({ children, requiredRole = 'staff' }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // If still loading auth state, don't make access decisions yet
    if (loading) {
      // Set a timer to show loading indicator after 1 second to avoid flickering
      const timer = setTimeout(() => {
        setShowLoading(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }

    // Check if user is authenticated and has the required role
    const isAuthenticated = !!user;
    const hasRequiredRole = userRole === requiredRole;
    
    logger.debug('ProtectedRoute access check', { 
      isAuthenticated, 
      hasRequiredRole, 
      user: user?.id, 
      userRole, 
      requiredRole 
    });
    
    setHasAccess(isAuthenticated && hasRequiredRole);
  }, [user, userRole, loading, requiredRole]);

  // While auth state is loading, show loading skeleton only after 1 second
  if (loading && showLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading your session...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
      </div>
    );
  }

  // If user doesn't have access, redirect to login
  if (!loading && !hasAccess) {
    logger.warn('Access denied - redirecting to login', { 
      user: user?.id, 
      userRole, 
      requiredRole 
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User has access, render the protected content
  return children;
}