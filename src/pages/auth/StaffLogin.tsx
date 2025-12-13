import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";
import { User } from "@/utils/iconImports";

const StaffLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(UserRole.STAFF);

  // Get the return URL from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/staff-only/dashboard';

  // Check if user is already logged in with correct role
  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole === UserRole.STAFF) {
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
    
    if (rolePaths[newRole] && newRole !== UserRole.STAFF) {
      navigate(rolePaths[newRole]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <LoginForm role={role} onRoleChange={handleRoleChange} />
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 gradient-staff rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold">Office Staff Portal</h1>
            <p className="text-muted-foreground mt-2">Access office administration tools</p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-muted-foreground">
          <p>This is a secure area. All login attempts are monitored and logged.</p>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;