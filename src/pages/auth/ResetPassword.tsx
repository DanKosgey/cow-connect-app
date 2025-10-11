import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useToastNotifications from "@/hooks/useToastNotifications";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToastNotifications();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });

  // Handle Supabase password reset flow
  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Get the token hash from URL parameters
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        // If this is a password reset link from Supabase
        if (token_hash && type === 'recovery') {
          // Verify the token and set the session
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash
          });
          
          if (error) {
            console.error("Error verifying password reset token:", error);
            toast.error("Invalid Reset Link", "The password reset link is invalid or has expired. Please request a new one.");
            navigate('/auth/forgot-password');
            return;
          }
          
          // Session is now set, user can reset their password
          console.log("Password reset session verified");
        } else {
          // Check if user already has a session
          const { data: { session } } = await supabase.auth.getSession();
          
          // If no session and no token, redirect to forgot password
          if (!session) {
            navigate('/auth/forgot-password');
            return;
          }
        }
      } catch (error) {
        console.error("Error handling password reset:", error);
        toast.error("Reset Error", "There was an error processing your password reset request.");
        navigate('/auth/forgot-password');
      }
    };

    handlePasswordReset();
  }, [navigate, searchParams, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (formData.password.length < 6) {
      toast.error("Password too short", "Password must be at least 6 characters long.");
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Password mismatch", "Passwords do not match.");
      return false;
    }
    
    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) throw error;

      setPasswordReset(true);
      toast.success("Password Reset Successful", "Your password has been updated successfully. You can now log in with your new password.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error("Reset Error", error.message || "Failed to reset password. Please try again.");
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
            <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold">
              {passwordReset ? "Password Updated" : "Reset Password"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {passwordReset 
                ? "Your password has been successfully updated" 
                : "Create a new password for your account"}
            </p>
          </div>
        </div>

        {/* Reset Password Form */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {passwordReset ? "Password Changed" : "New Password"}
            </CardTitle>
            <CardDescription className="text-center">
              {passwordReset 
                ? "You can now log in with your new password" 
                : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {passwordReset ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <p className="text-muted-foreground">
                  Your password has been successfully updated. You can now log in with your new password.
                </p>
                <Button 
                  onClick={() => navigate('/farmer/login')}
                  className="w-full h-11 text-lg font-medium"
                  variant="primary"
                >
                  Go to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pr-10 h-11"
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
                  <p className="text-xs text-muted-foreground">At least 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="pr-10 h-11"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                      Updating Password...
                    </span>
                  ) : "Update Password"}
                </Button>
                
                <Button 
                  type="button"
                  onClick={() => navigate('/farmer/login')}
                  className="w-full"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;