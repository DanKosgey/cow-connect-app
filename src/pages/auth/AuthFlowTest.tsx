import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const AuthFlowTest = () => {
  const navigate = useNavigate();
  const { user, userRole, loading, refreshSession, signOut } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
  };

  const testAuthFlow = async () => {
    try {
      addResult("Starting authentication flow test...");
      
      // Test session refresh
      addResult("Testing session refresh...");
      const refreshResult = await refreshSession();
      addResult(`Session refresh result: ${refreshResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      // Test Supabase connection
      addResult("Testing Supabase connection...");
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        addResult(`Supabase connection test: FAILED - ${error.message}`);
      } else {
        addResult(`Supabase connection test: SUCCESS`);
      }
      
      addResult("Authentication flow test completed!");
    } catch (error: any) {
      addResult(`ERROR: ${error.message}`);
    }
  };

  useEffect(() => {
    addResult(`Current auth state - Loading: ${loading}, User: ${user ? 'YES' : 'NO'}, Role: ${userRole || 'NONE'}`);
  }, [loading, user, userRole]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Authentication Flow Test</h1>
          <p className="text-muted-foreground mt-2">
            Testing authentication flow and KYC page access
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              Current authentication state and testing tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-medium">Loading</h3>
                <p className="text-sm text-muted-foreground mt-1">{loading ? 'Yes' : 'No'}</p>
              </div>
              
              <div className="p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-medium">User</h3>
                <p className="text-sm text-muted-foreground mt-1">{user ? 'Authenticated' : 'Not authenticated'}</p>
              </div>
              
              <div className="p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-medium">Role</h3>
                <p className="text-sm text-muted-foreground mt-1">{userRole || 'No role'}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 pt-4">
              <Button onClick={testAuthFlow}>
                Test Auth Flow
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/farmer/kyc-upload')}
              >
                Go to KYC Page
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Results from authentication flow tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="p-3 bg-secondary/50 rounded-lg text-sm">
                  {result}
                </div>
              ))}
              {testResults.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No test results yet. Click "Test Auth Flow" to begin.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthFlowTest;