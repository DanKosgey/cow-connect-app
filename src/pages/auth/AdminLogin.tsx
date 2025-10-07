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

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastNotifications();
  const { login, user, userRole, clearAllAuthData } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Get the return URL from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/admin/dashboard';

  // Check if user is already logged in with correct role
  useEffect(() => {
    if (user && userRole === UserRole.ADMIN) {
      // Redirect immediately to dashboard
      navigate(from, { replace: true });
    }
  }, [user, userRole, navigate, from]);

  // Only clear auth data if there's a specific reason (e.g., coming from logout)
  useEffect(() => {
    const shouldClearAuth = (location.state as any)?.clearAuth;
    if (shouldClearAuth) {
      const clearAuth = async () => {
        await clearAllAuthData();
      };
      clearAuth();
    }
  }, [clearAllAuthData, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting admin login for:', loginData.email);
      
      const { error } = await login({
        email: loginData.email,
        password: loginData.password,
        role: UserRole.ADMIN
      });

      if (error) {
        console.error('Login failed:', error);
        toast.error('Access Denied', error.message || 'Please verify your admin credentials.');
        
        // Reset button after 3 seconds as per user preference
        setTimeout(() => {
          setLoading(false);
        }, 3000);
      } else {
        toast.success('Welcome Back, Admin', 'Accessing admin dashboard...');
        // Redirect to the originally requested page or default dashboard
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Authentication error:', err);
      toast.error('Authentication Error', err instanceof Error ? err.message : 'Failed to authenticate');
      
      // Reset button after 3 seconds as per user preference
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    }
  };

  // Add a function to handle manual sign out
  const handleSignOut = async () => {
    try {
      await clearAllAuthData();
      // Reset form
      setLoginData({
        email: "",
        password: ""
      });
      // Show success message
      toast.success('Signed Out', 'You have been successfully signed out.');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Sign Out Error', 'Failed to sign out properly.');
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;