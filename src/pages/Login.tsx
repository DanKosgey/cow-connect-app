import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Milk, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: ""
  });
  const [loading, setLoading] = useState(false);

  // Mock login credentials for demo
  const mockCredentials = {
    admin: { username: "admin", password: "admin123", role: "admin", redirect: "/admin" },
    staff: { username: "staff", password: "staff123", role: "staff", redirect: "/staff" },
    farmer: { username: "farmer", password: "farmer123", role: "farmer", redirect: "/farmer" }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const credential = Object.values(mockCredentials).find(
        cred => cred.username === formData.username && cred.password === formData.password
      );

      if (credential) {
        // Store mock auth data
        localStorage.setItem('dairychain_user', JSON.stringify({
          id: `${credential.role}-${Date.now()}`,
          username: credential.username,
          role: credential.role,
          name: credential.role === 'admin' ? 'System Administrator' : 
                credential.role === 'staff' ? 'Field Agent' : 'John Farmer',
          token: `mock-token-${Date.now()}`
        }));

        toast({
          title: "Login Successful",
          description: `Welcome back, ${credential.role}!`,
        });

        navigate(credential.redirect);
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Try admin/admin123, staff/staff123, or farmer/farmer123",
          variant: "destructive",
        });
      }
      setLoading(false);
    }, 1500);
  };

  const handleDemoLogin = (role: keyof typeof mockCredentials) => {
    const credential = mockCredentials[role];
    setFormData({
      username: credential.username,
      password: credential.password,
      role: credential.role
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-medium">
              <Milk className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Welcome to DairyChain Pro</h1>
            <p className="text-muted-foreground">Sign in to manage your dairy operations</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="farm-card">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="transition-smooth focus:border-primary"
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
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-10 transition-smooth focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="transition-smooth focus:border-primary">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="staff">Field Staff</SelectItem>
                    <SelectItem value="farmer">Farmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                variant="primary"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="farm-card">
          <CardHeader>
            <CardTitle className="text-lg">Demo Credentials</CardTitle>
            <CardDescription>
              Click to auto-fill credentials for different roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('admin')}
                className="justify-start hover:bg-primary hover:text-primary-foreground"
              >
                <span className="font-medium">Admin:</span>
                <span className="ml-2 text-muted-foreground">admin / admin123</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('staff')}
                className="justify-start hover:bg-primary hover:text-primary-foreground"
              >
                <span className="font-medium">Staff:</span>
                <span className="ml-2 text-muted-foreground">staff / staff123</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoLogin('farmer')}
                className="justify-start hover:bg-primary hover:text-primary-foreground"
              >
                <span className="font-medium">Farmer:</span>
                <span className="ml-2 text-muted-foreground">farmer / farmer123</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Landing */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;