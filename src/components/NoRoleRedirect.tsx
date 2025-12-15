import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

/**
 * Component to handle redirection for users with no assigned roles
 * This prevents users from getting stuck on a non-existent /dashboard route
 */
const NoRoleRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // If user is authenticated but has no role, redirect to appropriate page
    if (user && !userRole) {
      logger.warn('User authenticated but no role assigned', { userId: user.id });
      
      // Redirect to a page where they can request role assignment
      // or contact admin, rather than a non-existent dashboard
      navigate('/no-role', { replace: true });
    } 
    // If user is not authenticated, redirect to login
    else if (!user) {
      navigate('/login', { replace: true });
    }
    // If user has a role, redirect to their appropriate dashboard
    else {
      switch (userRole) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'staff':
          navigate('/staff/dashboard', { replace: true });
          break;
        case 'collector':
          navigate('/collector/dashboard', { replace: true });
          break;
        case 'farmer':
          navigate('/farmer/dashboard', { replace: true });
          break;
        case 'creditor':
          navigate('/creditor/dashboard', { replace: true });
          break;
        default:
          // For unknown roles, redirect to a general dashboard or no-role page
          navigate('/no-role', { replace: true });
      }
    }
  }, [user, userRole, isLoading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {isLoading ? 'Loading...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
};

export default NoRoleRedirect;