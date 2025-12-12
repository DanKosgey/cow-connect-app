import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Milk, Eye, EyeOff, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { UserRole } from "@/types/auth.types";
import AdminDebugLogger from "@/utils/adminDebugLogger";
import { completeAuthReset } from '@/utils/forceClearAuth';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastNotifications();
  const { login, user, userRole, clearAuthCache, refreshSession, refreshUserRole } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forceClearing, setForceClearing] = useState(false);
  const forceClearAttempted = useRef(false); // Track if we've attempted force clear
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
    // If user exists but role is null, try to fetch the role
    else if (user && userRole === null) {
      AdminDebugLogger.log('User exists but role is null, attempting to refresh role');
      
      // Prevent infinite loop of force clearing
      if (forceClearAttempted.current) {
        AdminDebugLogger.warn('Force clear already attempted, not trying again');
        return;
      }
      
      // Try to refresh the session and role
      const refreshRole = async () => {
        try {
          AdminDebugLogger.log('Attempting to refresh user role...');
          if (user.id) {
            // Try to get role directly using the context method
            const role = await refreshUserRole(user.id);
            AdminDebugLogger.log('Direct role fetch result:', role);
            if (role === UserRole.ADMIN) {
              // Redirect to dashboard
              navigate(from, { replace: true });
            } else if (!role && !forceClearAttempted.current) {
              // If role fetch failed and we haven't tried force clear yet, try it
              AdminDebugLogger.log('Role fetch failed, attempting force clear');
              forceClearAttempted.current = true;
              setTimeout(() => {
                handleForceClear();
              }, 1000);
            }
          }
        } catch (error) {
          AdminDebugLogger.error('Error refreshing role:', error);
        }
      };
      
      // Try to refresh role immediately
      refreshRole();
      
      // Also try after a short delay
      const retryTimer = setTimeout(() => {
        refreshRole();
      }, 3000);
      
      // Clean up timer
      return () => clearTimeout(retryTimer);
    }
  }, [user, userRole, navigate, from, refreshUserRole]);

  const handleRefreshSession = async () => {
    AdminDebugLogger.log('Manual session refresh requested');
    setRefreshing(true);
    try {
      const result = await refreshSession();
      AdminDebugLogger.log('Session refresh result:', result);
      if (result.success) {
        toast.success('Session Refreshed', 'Your session has been refreshed successfully.');
      } else {
        toast.error('Refresh Failed', result.error?.message || 'Failed to refresh session.');
      }
    } catch (error) {
      AdminDebugLogger.error('Session refresh error:', error);
      toast.error('Refresh Error', error instanceof Error ? error.message : 'Failed to refresh session.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleForceClear = async () => {
    AdminDebugLogger.log('Force clear requested');
    setForceClearing(true);
    try {
      toast.success('Clearing Session', 'Clearing all authentication data...');
      // Prevent multiple clicks
      const result = await completeAuthReset('/admin/login');
    } catch (error) {
      AdminDebugLogger.error('Force clear error:', error);
      toast.error('Clear Error', error instanceof Error ? error.message : 'Failed to clear session.');
      // Re-enable the button if there was an error
      setTimeout(() => {
        setForceClearing(false);
      }, 3000);
    }
  };

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
            {user && !userRole && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">
                      Session detected but role not verified
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Click refresh to try again or force clear to reset completely
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleRefreshSession}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-1">Refresh</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={handleForceClear}
                      disabled={forceClearing}
                    >
                      {forceClearing ? (
                        <RotateCcw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      <span className="ml-1">Force Clear</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
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