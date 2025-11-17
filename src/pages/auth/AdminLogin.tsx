import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Milk, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { UserRole } from "@/types/auth.types";
import AdminDebugLogger from "@/utils/adminDebugLogger";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastNotifications();
  const { login, user, userRole, clearAuthCache } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  AdminDebugLogger.log('AdminLogin component initialized', { 
    hasUser: !!user, 
    userRole: userRole,
    locationState: location.state
  });

  // Get the return URL from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
  AdminDebugLogger.log('Determined redirect path', { from });

  // Check if user is already logged in with correct role
  useEffect(() => {
    AdminDebugLogger.log('User effect triggered', { user: !!user, userRole, navigateFrom: from });
    if (user && userRole === UserRole.ADMIN) {
      AdminDebugLogger.success('User already authenticated as admin, redirecting to dashboard', { from });
      // Redirect immediately to dashboard
      navigate(from, { replace: true });
    }
  }, [user, userRole, navigate, from]);

  // Only clear auth data if there's a specific reason (e.g., coming from logout)
  useEffect(() => {
    const shouldClearAuth = (location.state as any)?.clearAuth;
    AdminDebugLogger.log('Clear auth effect triggered', { shouldClearAuth, locationState: location.state });
    if (shouldClearAuth) {
      AdminDebugLogger.log('Clearing auth cache due to location state');
      const clearAuth = async () => {
        await clearAuthCache();
        AdminDebugLogger.success('Auth cache cleared');
      };
      clearAuth();
    }
  }, [clearAuthCache, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    AdminDebugLogger.log('Form submitted, setting loading state to true');
    setLoading(true);

    try {
      AdminDebugLogger.log('Attempting admin login for:', loginData.email);
      
      // ✅ Pass role so auth context validates it's an admin
      AdminDebugLogger.log('Calling login function with admin role...');
      const { error, userRole: fetchedRole } = await login({
        email: loginData.email,
        password: loginData.password,
        role: UserRole.ADMIN // ✅ This tells auth to only allow admins
      });

      AdminDebugLogger.log('Login function returned:', { error, fetchedRole });

      if (error) {
        AdminDebugLogger.error('Login failed:', error);
        toast.error('Access Denied', error.message || 'Please verify your admin credentials.');
        
        // Reset button after 3 seconds
        AdminDebugLogger.log('Setting timeout to reset button...');
        setTimeout(() => {
          AdminDebugLogger.log('Resetting loading state after error');
          setLoading(false);
        }, 3000);
        return;
      }

      // Success - auth context already verified it's an admin
      AdminDebugLogger.success('Login successful, showing success toast and navigating...');
      toast.success('Welcome Back, Admin', 'Accessing admin dashboard...');
      navigate(from, { replace: true });
      
    } catch (err) {
      AdminDebugLogger.error('Authentication error:', err);
      AdminDebugLogger.error('Authentication error stack:', err instanceof Error ? err.stack : 'No stack trace');
      toast.error('Authentication Error', err instanceof Error ? err.message : 'Failed to authenticate');
      
      // Reset button after 3 seconds
      AdminDebugLogger.log('Setting timeout to reset button after exception...');
      setTimeout(() => {
        AdminDebugLogger.log('Resetting loading state after exception');
        setLoading(false);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 gradient-admin rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold">Admin Portal</h1>
            <p className="text-muted-foreground mt-2">Access system administration</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Administrator Login</CardTitle>
            <CardDescription className="text-center">
              Secure access for system administrators only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your admin email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-lg font-medium"
                variant="primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></span>
                    Authenticating...
                  </span>
                ) : "Access Admin Panel"}
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <Button
                variant="link"
                className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
                onClick={() => navigate('/auth/forgot-password')}
              >
                Forgot Password?
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Return Home Button */}
        <div className="text-center mt-6">
          <Button
            variant="outline"
            className="w-full h-11 text-base font-medium"
            onClick={() => navigate('/')}
          >
            <Milk className="w-5 h-5 mr-2" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;