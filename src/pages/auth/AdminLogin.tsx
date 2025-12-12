import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);

  // Get the return URL from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/admin/dashboard';

  // Check if user is already logged in with correct role
  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole === UserRole.ADMIN) {
      // Redirect immediately to dashboard
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, userRole, isLoading, navigate, from]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    
    // If user changes role, redirect to appropriate login page
    const rolePaths: Record<string, string> = {
      farmer: '/farmer/login',
      collector: '/collector-only/login',
      staff: '/staff-only/login',
      creditor: '/creditor/login',
      admin: '/admin/login'
    };
    
    if (rolePaths[newRole] && newRole !== UserRole.ADMIN) {
      navigate(rolePaths[newRole]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 gradient-admin rounded-2xl flex items-center justify-center shadow-lg">
              <div className="w-10 h-10 text-primary-foreground">🔒</div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold">Admin Portal</h1>
            <p className="text-muted-foreground mt-2">Access system administration</p>
          </div>
        </div>
        <LoginForm role={role} onRoleChange={handleRoleChange} />
        <div className="text-center mt-6">
          <button
            className="w-full h-11 text-base font-medium border rounded-md hover:bg-muted transition-colors"
            onClick={() => navigate('/')}
          >
            🏠 Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;