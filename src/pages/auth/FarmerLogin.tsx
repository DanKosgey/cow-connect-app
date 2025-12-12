import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";

const FarmerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(UserRole.FARMER);

  // Get the return URL from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/farmer/dashboard';

  // Check if user is already logged in with correct role
  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole === UserRole.FARMER) {
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
    
    if (rolePaths[newRole] && newRole !== UserRole.FARMER) {
      navigate(rolePaths[newRole]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <LoginForm role={role} onRoleChange={handleRoleChange} />
      </div>
    </div>
  );
};

export default FarmerLogin;
