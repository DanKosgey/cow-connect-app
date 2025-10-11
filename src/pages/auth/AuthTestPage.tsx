import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { UserRole } from "@/types/auth.types";

const AuthTestPage = () => {
  const navigate = useNavigate();
  const { user, userRole, session, loading, signOut, refreshSession } = useAuth();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runAuthTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Test session refresh
      const refreshResult = await refreshSession();
      
      if (refreshResult.success) {
        setTestResult("Authentication test passed! Session refreshed successfully.");
      } else {
        setTestResult(`Authentication test completed with warnings: ${refreshResult.error?.message || 'Unknown issue'}`);
      }
    } catch (error: any) {
      setTestResult(`Authentication test failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Authentication Diagnostics</h1>
          <p className="text-muted-foreground mt-2">
            Test and verify authentication functionality
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Authentication Status</CardTitle>
            <CardDescription>
              View your current authentication state and session information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p>Loading authentication state...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h3 className="font-medium">User Status</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {user ? `Authenticated as ${user.email}` : "Not authenticated"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h3 className="font-medium">User Role</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {userRole || "No role assigned"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h3 className="font-medium">Session Status</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {session ? "Active session" : "No active session"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h3 className="font-medium">Loading State</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {loading ? "Loading..." : "Ready"}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button onClick={runAuthTest} disabled={isTesting}>
                    {isTesting ? "Testing..." : "Run Authentication Test"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/auth/forgot-password')}
                  >
                    Test Password Reset
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/auth/reset-test')}
                  >
                    Password Reset Test Page
                  </Button>
                  
                  {user && (
                    <Button variant="destructive" onClick={signOut}>
                      Sign Out
                    </Button>
                  )}
                  
                  <Button variant="ghost" onClick={() => navigate(-1)}>
                    Back
                  </Button>
                </div>
                
                {testResult && (
                  <div className="p-4 bg-secondary/50 rounded-lg mt-4">
                    <h3 className="font-medium">Test Result</h3>
                    <p className="text-sm mt-1">{testResult}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Flow Testing</CardTitle>
            <CardDescription>
              Test different authentication scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/register')}
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <span>Farmer Registration</span>
                <span className="text-xs text-muted-foreground">Test signup flow</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/farmer/login')}
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <span>Farmer Login</span>
                <span className="text-xs text-muted-foreground">Test farmer login</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <span>Role Selection</span>
                <span className="text-xs text-muted-foreground">Test role-based login</span>
              </Button>
            </div>
            
            <div className="pt-4">
              <h3 className="font-medium mb-2">Quick Navigation</h3>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => navigate('/auth/forgot-password')}
                >
                  Forgot Password
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => navigate('/auth/reset-password')}
                >
                  Reset Password
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => navigate('/auth/reset-test')}
                >
                  Reset Test Page
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => navigate('/auth/callback')}
                >
                  Auth Callback
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthTestPage;