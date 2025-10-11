import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const PasswordResetTest = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const testPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult("");

    try {
      // Test the password reset flow
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setResult(`Error: ${error.message}`);
      } else {
        setResult("Password reset email sent successfully! Check your inbox.");
      }
    } catch (error: any) {
      setResult(`Exception: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Password Reset Test</CardTitle>
            <CardDescription>
              Test the password reset functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={testPasswordReset} className="space-y-6">
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
                className="w-full h-11"
                disabled={loading}
              >
                {loading ? "Testing..." : "Test Password Reset"}
              </Button>
            </form>

            {result && (
              <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm">{result}</p>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth/forgot-password')}
              >
                Forgot Password Page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth/reset-password')}
              >
                Reset Password Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordResetTest;