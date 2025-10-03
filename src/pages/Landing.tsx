
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import useToastNotifications from "@/hooks/useToastNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { checkAccountLockout, logAuthEvent } from "@/lib/supabase/auth";
import { UserRole } from "@/types/auth.types";
import bgImage from "@/assets/dairy-farm-hero.jpg";

const Landing = () => {
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const { login, signUp } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Default to Farmer view for public signup; only farmers may self-register.
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.FARMER);
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    role: UserRole.FARMER
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt with:', loginData);
    setLoading(true);

    try {
      // Check for account lockout first
      const lockStatus = await checkAccountLockout(loginData.email);
        if (lockStatus?.isLocked) {
        toast.error('Account Locked', 'Too many failed attempts. Please try again later or contact support.');
        return;
      }

      const { error } = await login({
        email: loginData.email,
        password: loginData.password,
        role: selectedRole.toLowerCase() as 'farmer' | 'staff' | 'admin'
      });

      if (error) {
        // Log failed attempt
        await logAuthEvent(loginData.email, 'login_failed', {
          role_type: selectedRole,
          reason: error.message
        });

        toast.error('Login Failed', error.message);
      } else {
        // Log successful login
        await logAuthEvent(loginData.email, 'login_success', {
          role_type: selectedRole
        });

        toast.success('Login Successful', 'Welcome back!');

        // Role-based navigation
        switch (selectedRole) {
          case UserRole.ADMIN:
            navigate('/admin/dashboard');
            break;
          case UserRole.STAFF:
            navigate('/staff/dashboard');
            break;
          case UserRole.FARMER:
            navigate('/farmer/dashboard');
            break;
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login Failed', err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (signupData.password !== signupData.confirmPassword) {
        toast.error('Signup Failed', 'Passwords do not match');
        return;
      }

      const { error } = await signUp({
        email: signupData.email,
        password: signupData.password,
        fullName: signupData.fullName,
        phone: signupData.phone,
        role: UserRole.FARMER
      });

      if (error) {
        // Log failed signup attempt
        await logAuthEvent(signupData.email, 'signup_failed', {
          role_type: UserRole.FARMER,
          reason: error.message
        });

        toast.error('Signup Failed', error.message);
      } else {
        // Log successful signup
        await logAuthEvent(signupData.email, 'signup_success', {
          role_type: UserRole.FARMER
        });

        toast.success('Signup Successful', 'Please check your email for verification.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Signup Failed', err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background font-display justify-between">
      <div className="flex-grow">
        {/* Hero Image */}
        <div className="relative w-full h-80">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Login Form */}
        <div className="px-6 py-8 space-y-6 max-w-md mx-auto -mt-20 relative z-10">
          <Card className="p-6 shadow-xl">
            <CardContent className="space-y-6 p-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tighter text-center">
                Welcome to DairyConnect
              </h1>

              {/* Role Selection */}
              <RadioGroup
                defaultValue={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
                className="flex h-12 items-center justify-center rounded-lg bg-secondary/20 p-1"
              >
                <div className="grid grid-cols-3 gap-1 w-full">
                  {[UserRole.ADMIN, UserRole.STAFF, UserRole.FARMER].map((role) => (
                    <Label
                      key={role}
                      className={`flex h-full cursor-pointer items-center justify-center rounded px-2 text-sm font-medium transition-all
                        ${selectedRole === role ? 'bg-primary text-white' : 'text-primary hover:bg-secondary/30'}`}
                    >
                      <RadioGroupItem value={role} className="hidden" />
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Label>
                  ))}
                </div>
              </RadioGroup>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="pl-12 h-14"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pl-12 pr-12 h-14"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? 
                      <EyeOff className="h-5 w-5 text-muted-foreground" /> : 
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    }
                  </button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-14 text-base font-bold"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Log In"}
                </Button>
              </form>

              {/* Sign Up Dialog */}
              {selectedRole === UserRole.FARMER && (
                <Dialog>
                  <DialogTrigger asChild>
                    <p className="text-muted-foreground text-sm text-center">
                      Don't have an account? <Button variant="link" className="p-0">Sign Up</Button>
                    </p>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Farmer Account</DialogTitle>
                      <DialogDescription>
                        Register as a new farmer to start managing your dairy operations
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={signupData.fullName}
                          onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={signupData.phone}
                          onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={signupData.password}
                            onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                            className="pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showPassword ? 
                              <EyeOff className="h-4 w-4 text-muted-foreground" /> : 
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            }
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={signupData.confirmPassword}
                            onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                            className="pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showPassword ? 
                              <EyeOff className="h-4 w-4 text-muted-foreground" /> : 
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            }
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creating Account..." : "Sign Up"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Landing;