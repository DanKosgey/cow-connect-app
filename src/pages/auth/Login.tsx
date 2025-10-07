import { useNavigate } from "react-router-dom";
import { Lock, Users, UserCog, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@/types/auth.types";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { useEffect } from "react";

const Login = () => {
  const navigate = useNavigate();
  const { user, userRole, loading, resetAuthState } = useAuth();
  const roleOptions = [
    { value: UserRole.FARMER, label: 'Farmer', icon: <Users className="h-4 w-4" /> },
    { value: UserRole.STAFF, label: 'Staff', icon: <UserCog className="h-4 w-4" /> },
    { value: UserRole.ADMIN, label: 'Admin', icon: <Shield className="h-4 w-4" /> }
  ];

  // Check if user is already logged in and redirect appropriately
  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, redirect to their dashboard
      const dashboardRoutes = {
        [UserRole.ADMIN]: '/admin/dashboard',
        [UserRole.STAFF]: '/staff/dashboard',
        [UserRole.FARMER]: '/farmer/dashboard'
      };
      
      // If we have a user role, redirect to their dashboard
      if (userRole) {
        const targetRoute = dashboardRoutes[userRole] || '/admin/dashboard';
        navigate(targetRoute, { replace: true });
      }
      // If we don't have a user role yet but have a user, wait for role to load
      // This can happen during token refresh
    }
  }, [user, userRole, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-medium">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-heading font-bold">DAIRY FARMERS OF TRANS-NZOIA</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <Card className="farm-card shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-lg font-medium">I am a:</Label>
                <div className="grid grid-cols-3 gap-3">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => {
                        const rolePaths: Record<UserRole, string> = {
                          farmer: '/farmer/login',
                          staff: '/staff/login',
                          admin: '/admin/login'
                        };
                        navigate(rolePaths[role.value]);
                      }}
                      className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer relative shadow-sm hover:shadow-md"
                    >
                      {role.icon}
                      <span className="mt-2 text-sm font-medium">{role.label}</span>
                      <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 hover:opacity-20 transition-opacity"></div>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-center text-muted-foreground">
                Select your role above to be redirected to the appropriate login page
              </p>
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/register')}
              >
                Don't have an account? Register
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostic Actions */}
        <div className="mt-6 text-center space-y-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            Back to Home
          </Button>
          
          {/* Add a button to reset auth state for troubleshooting */}
          <div className="pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await resetAuthState();
                window.location.reload();
              }}
              className="text-destructive hover:text-destructive-foreground"
            >
              Reset Auth State
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Use this if you're experiencing login issues
            </p>
          </div>
          
          {/* Add a link to the auth test page for debugging */}
          <div className="pt-2">
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/auth-test')}
              className="text-muted-foreground"
            >
              Authentication Diagnostics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;