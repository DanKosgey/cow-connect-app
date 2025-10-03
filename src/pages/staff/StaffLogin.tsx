import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useAuth } from "@/contexts/AuthContext";

const StaffLogin = () => {
  const navigate = useNavigate();
  const { show, error: showError } = useToastNotifications();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await login({
        email: loginData.email,
        password: loginData.password,
        role_type: 'staff'
      });

      if (error) {
        showError('Login Failed', 'Please verify your staff credentials.');
      } else {
        show({ title: 'Welcome Back', description: 'Accessing staff dashboard...' });
        navigate('/staff/dashboard');
      }
    } catch (err) {
      showError('Authentication Error', err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 gradient-staff rounded-2xl flex items-center justify-center shadow-lg">
              <Users2 className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold">Staff Portal</h1>
            <p className="text-muted-foreground mt-2">Field operations management</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Staff Login</CardTitle>
            <CardDescription className="text-center">
              Access your field operations dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Staff Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your staff email"
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
                {loading ? "Authenticating..." : "Access Staff Panel"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/')}
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Need help? Contact your system administrator or support team.</p>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;