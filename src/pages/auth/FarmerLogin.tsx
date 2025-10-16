import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Milk, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { UserRole } from "@/types/auth.types";

const FarmerLogin = () => {
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
  const from = (location.state as any)?.from?.pathname || '/farmer/dashboard';

  // Check if user is already logged in with correct role
  useEffect(() => {
    console.log('[FarmerLogin] Component mounted', { user: user?.id, userRole });
    
    // Log farmer portal access
    console.log('[FarmerPortal] Farmer accessing login page', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href
    });
    
    if (user && userRole === UserRole.FARMER) {
      console.log('[FarmerLogin] User already logged in, redirecting to dashboard');
      console.log('[FarmerPortal] Authenticated farmer redirected to dashboard', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      // Redirect immediately to dashboard
      navigate(from, { replace: true });
    }
  }, [user, userRole, navigate, from]);

  // Only clear auth data if there's a specific reason (e.g., coming from logout)
  useEffect(() => {
    const shouldClearAuth = (location.state as any)?.clearAuth;
    console.log('[FarmerLogin] Checking if auth data should be cleared', { shouldClearAuth });
    if (shouldClearAuth) {
      const clearAuth = async () => {
        console.log('[FarmerLogin] Clearing auth data');
        console.log('[FarmerPortal] Clearing authentication data for farmer', {
          timestamp: new Date().toISOString()
        });
        await clearAllAuthData();
        console.log('[FarmerLogin] Auth data cleared successfully');
        console.log('[FarmerPortal] Authentication data cleared successfully', {
          timestamp: new Date().toISOString()
        });
      };
      clearAuth();
    }
  }, [clearAllAuthData, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[FarmerLogin] Login attempt started', { email: loginData.email });
    console.log('[FarmerPortal] Farmer attempting login', {
      email: loginData.email,
      timestamp: new Date().toISOString()
    });
    setLoading(true);

    try {
      console.log('[FarmerLogin] Attempting farmer login for:', loginData.email);
      
      const { error } = await login({
        email: loginData.email,
        password: loginData.password,
        role: UserRole.FARMER
      });

      if (error) {
        console.error('[FarmerLogin] Login failed:', error);
        console.log('[FarmerPortal] Farmer login failed', {
          email: loginData.email,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        toast.error('Access Denied', error.message || 'Please verify your farmer credentials.');
        
        // Reset button after 3 seconds as per user preference
        setTimeout(() => {
          setLoading(false);
        }, 3000);
      } else {
        console.log('[FarmerLogin] Login successful, redirecting to dashboard');
        console.log('[FarmerPortal] Farmer login successful', {
          email: loginData.email,
          timestamp: new Date().toISOString()
        });
        toast.success('Welcome Back, Farmer', 'Accessing farmer dashboard...');
        // Redirect to the originally requested page or default dashboard
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('[FarmerLogin] Authentication error:', err);
      console.log('[FarmerPortal] Farmer authentication error', {
        email: loginData.email,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      toast.error('Authentication Error', err instanceof Error ? err.message : 'Failed to authenticate');
      
      // Reset button after 3 seconds as per user preference
      setTimeout(() => {
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
            <div className="w-20 h-20 gradient-farmer rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold">Farmer Portal</h1>
            <p className="text-muted-foreground mt-2">Access your farm management dashboard</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Farmer Login</CardTitle>
            <CardDescription className="text-center">
              Secure access for registered farmers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Farmer Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your farmer email"
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
                ) : "Access Farmer Portal"}
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <Button
                variant="link"
                className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
                onClick={() => {
                  console.log('[FarmerLogin] Forgot password link clicked');
                  console.log('[FarmerPortal] Farmer clicked forgot password link', {
                    timestamp: new Date().toISOString()
                  });
                  navigate('/auth/forgot-password');
                }}
              >
                Forgot Password?
              </Button>
            </div>

            <div className="mt-6 flex justify-between">
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  console.log('[FarmerLogin] New farmer sign up link clicked');
                  console.log('[FarmerPortal] New farmer clicked sign up link', {
                    timestamp: new Date().toISOString()
                  });
                  navigate('/register');
                }}
              >
                New Farmer? Sign Up
              </Button>
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  console.log('[FarmerLogin] Return to home link clicked');
                  console.log('[FarmerPortal] Farmer clicked return to home link', {
                    timestamp: new Date().toISOString()
                  });
                  navigate('/');
                }}
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-sm text-muted-foreground">
          <p>This is a secure area. All login attempts are monitored and logged.</p>
        </div>
      </div>
    </div>
  );
};

export default FarmerLogin;