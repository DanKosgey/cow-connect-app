import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useToastNotifications from "@/hooks/useToastNotifications";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send password reset email using Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success("Password Reset Email Sent", "Please check your email for instructions to reset your password.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error("Reset Error", error.message || "Failed to send password reset email. Please try again.");
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
              <Mail className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold">Password Reset</h1>
            <p className="text-muted-foreground mt-2">
              {emailSent 
                ? "Check your email for reset instructions" 
                : "Enter your email to receive password reset instructions"}
            </p>
          </div>
        </div>

        {/* Forgot Password Form */}
        <Card className="border-2 border-primary/10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {emailSent ? "Check Your Email" : "Forgot Password"}
            </CardTitle>
            <CardDescription className="text-center">
              {emailSent 
                ? "We've sent password reset instructions to your email address." 
                : "We'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-6">
                <p className="text-center text-muted-foreground">
                  If an account exists with the email <span className="font-semibold">{email}</span>, you will receive password reset instructions.
                </p>
                <Button 
                  onClick={() => setEmailSent(false)}
                  className="w-full"
                  variant="outline"
                >
                  Resend Email
                </Button>
                <Button 
                  onClick={() => navigate('/farmer/login')}
                  className="w-full"
                  variant="ghost"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    required
                  />
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
                      Sending Reset Link...
                    </span>
                  ) : "Send Reset Link"}
                </Button>
                
                <Button 
                  type="button"
                  onClick={() => navigate('/farmer/login')}
                  className="w-full"
                  variant="ghost"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;