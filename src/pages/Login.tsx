import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Milk, Eye, EyeOff, ArrowLeft, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user, userRole } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    role: "farmer",
    // Farmer specific
    nationalId: "",
    address: "",
    farmLocation: "",
    // Staff specific
    department: "",
    assignedRoute: "",
    // Admin specific
    adminCode: ""
  });

  useEffect(() => {
    // Redirect if already logged in
    if (user && userRole) {
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        staff: '/staff',
        farmer: '/farmer'
      };
      navigate(redirectMap[userRole] || '/');
    }
  }, [user, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(loginData.email, loginData.password);

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login Successful",
        description: "Welcome back to DairyChain Pro!",
      });
    }
    
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate admin code if admin role
    if (signupData.role === 'admin' && signupData.adminCode !== 'DAIRY2024ADMIN') {
      toast({
        title: "Invalid Admin Code",
        description: "Please contact your administrator for the correct admin code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const additionalData = signupData.role === 'farmer' 
      ? {
          nationalId: signupData.nationalId,
          address: signupData.address,
          farmLocation: signupData.farmLocation
        }
      : signupData.role === 'staff'
      ? {
          department: signupData.department,
          assignedRoute: signupData.assignedRoute
        }
      : undefined;

    const { error } = await signUp(
      signupData.email,
      signupData.password,
      signupData.fullName,
      signupData.phone,
      signupData.role,
      additionalData
    );

    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created!",
        description: "Your account has been created successfully. You can now sign in.",
      });
      // Reset form and switch to login tab
      setSignupStep(1);
      setSignupData({
        email: "",
        password: "",
        fullName: "",
        phone: "",
        role: "farmer",
        nationalId: "",
        address: "",
        farmLocation: "",
        department: "",
        assignedRoute: "",
        adminCode: ""
      });
    }
    
    setLoading(false);
  };

  const canProceedToStep2 = () => {
    return signupData.email && 
           signupData.password && 
           signupData.fullName && 
           signupData.phone && 
           signupData.role;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
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

        {/* Auth Form */}
        <Card className="farm-card">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup" onClick={() => setSignupStep(1)}>Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="transition-smooth focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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

                  <Button 
                    type="submit" 
                    className="w-full"
                    variant="default"
                    disabled={loading}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  {signupStep === 1 
                    ? "Enter your basic information" 
                    : `Complete your ${signupData.role} profile`
                  }
                </CardDescription>
                {signupStep === 2 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex-1 h-1 bg-primary rounded-full" />
                    <div className="flex-1 h-1 bg-primary rounded-full" />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Step 1: Basic Information */}
                  {signupStep === 1 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="signup-role">I am a</Label>
                        <Select 
                          value={signupData.role} 
                          onValueChange={(value) => setSignupData({ ...signupData, role: value })}
                        >
                          <SelectTrigger className="transition-smooth focus:border-primary">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="farmer">🌾 Farmer</SelectItem>
                            <SelectItem value="staff">👨‍💼 Field Staff</SelectItem>
                            <SelectItem value="admin">👑 Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={signupData.fullName}
                          onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                          className="transition-smooth focus:border-primary"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="your.email@example.com"
                            value={signupData.email}
                            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                            className="transition-smooth focus:border-primary"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-phone">Phone Number</Label>
                          <Input
                            id="signup-phone"
                            type="tel"
                            placeholder="+1234567890"
                            value={signupData.phone}
                            onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                            className="transition-smooth focus:border-primary"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password (min. 6 characters)"
                            value={signupData.password}
                            onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                            className="pr-10 transition-smooth focus:border-primary"
                            required
                            minLength={6}
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

                      <Button 
                        type="button"
                        onClick={() => canProceedToStep2() && setSignupStep(2)}
                        className="w-full"
                        variant="default"
                        disabled={!canProceedToStep2()}
                      >
                        Continue <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  )}

                  {/* Step 2: Role-Specific Information */}
                  {signupStep === 2 && (
                    <>
                      {signupData.role === 'farmer' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="national-id">National ID / Government ID</Label>
                            <Input
                              id="national-id"
                              type="text"
                              placeholder="Enter your national ID"
                              value={signupData.nationalId}
                              onChange={(e) => setSignupData({ ...signupData, nationalId: e.target.value })}
                              className="transition-smooth focus:border-primary"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="address">Full Address</Label>
                            <Input
                              id="address"
                              type="text"
                              placeholder="Street, City, State, Postal Code"
                              value={signupData.address}
                              onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                              className="transition-smooth focus:border-primary"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="farm-location">Farm Location</Label>
                            <Input
                              id="farm-location"
                              type="text"
                              placeholder="Farm name or location coordinates"
                              value={signupData.farmLocation}
                              onChange={(e) => setSignupData({ ...signupData, farmLocation: e.target.value })}
                              className="transition-smooth focus:border-primary"
                            />
                          </div>

                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              📋 Your KYC status will be set to "Pending". An admin will review your information before approval.
                            </p>
                          </div>
                        </>
                      )}

                      {signupData.role === 'staff' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Select 
                              value={signupData.department} 
                              onValueChange={(value) => setSignupData({ ...signupData, department: value })}
                            >
                              <SelectTrigger className="transition-smooth focus:border-primary">
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="collection">Milk Collection</SelectItem>
                                <SelectItem value="quality">Quality Control</SelectItem>
                                <SelectItem value="logistics">Logistics</SelectItem>
                                <SelectItem value="operations">Operations</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="assigned-route">Assigned Route (Optional)</Label>
                            <Input
                              id="assigned-route"
                              type="text"
                              placeholder="e.g., North District, Zone A"
                              value={signupData.assignedRoute}
                              onChange={(e) => setSignupData({ ...signupData, assignedRoute: e.target.value })}
                              className="transition-smooth focus:border-primary"
                            />
                          </div>

                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              👨‍💼 Your employee ID will be automatically generated upon account creation.
                            </p>
                          </div>
                        </>
                      )}

                      {signupData.role === 'admin' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="admin-code">Admin Registration Code</Label>
                            <Input
                              id="admin-code"
                              type="password"
                              placeholder="Enter admin registration code"
                              value={signupData.adminCode}
                              onChange={(e) => setSignupData({ ...signupData, adminCode: e.target.value })}
                              className="transition-smooth focus:border-primary"
                              required
                            />
                          </div>

                          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              🔒 Admin accounts require a special registration code. Contact your system administrator if you don't have one.
                            </p>
                          </div>
                        </>
                      )}

                      <div className="flex gap-3">
                        <Button 
                          type="button"
                          onClick={() => setSignupStep(1)}
                          variant="outline"
                          className="flex-1"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        
                        <Button 
                          type="submit" 
                          className="flex-1"
                          variant="default"
                          disabled={loading}
                        >
                          {loading ? "Creating Account..." : "Complete Registration"}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
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
