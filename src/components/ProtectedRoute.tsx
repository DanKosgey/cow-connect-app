import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userRole) {
    // Redirect to the appropriate login page based on the required role
    const loginRoutes = {
      [UserRole.ADMIN]: '/admin/login',
      [UserRole.STAFF]: '/staff/login',
      [UserRole.FARMER]: '/farmer/portal'
    };
    return <Navigate to={loginRoutes[requiredRole]} state={{ from: location }} replace />;
  }

  if (userRole !== requiredRole) {
    // Redirect to the appropriate dashboard if logged in with wrong role
    const dashboardRoutes = {
      [UserRole.ADMIN]: '/admin/dashboard',
      [UserRole.STAFF]: '/staff/dashboard',
      [UserRole.FARMER]: '/farmer/dashboard'
    };
    return <Navigate to={dashboardRoutes[userRole as UserRole]} replace />;
  }

  return <>{children}</>;
};
