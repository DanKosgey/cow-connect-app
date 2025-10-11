import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TestAuthFlow = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    console.log('TestAuthFlow: Component mounted', { user, userRole, loading });
  }, [user, userRole, loading]);

  const runAuthTest = async () => {
    setTestResults({
      timestamp: new Date().toISOString(),
      user: user ? 'Authenticated' : 'Not authenticated',
      userId: user?.id,
      userRole: userRole,
      loading: loading
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Authentication Flow Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p>Testing authentication flow...</p>
                <Button onClick={runAuthTest}>
                  Run Test
                </Button>
              </div>
              
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                  <span>Loading authentication state...</span>
                </div>
              )}
              
              {testResults && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Test Results:</h3>
                  <pre className="text-sm overflow-auto max-h-96">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="flex gap-4">
                <Button onClick={() => navigate('/farmer/login')}>
                  Go to Login
                </Button>
                <Button variant="outline" onClick={() => navigate('/register')}>
                  Go to Register
                </Button>
                <Button variant="outline" onClick={() => navigate('/farmer/kyc-upload')}>
                  Go to KYC Upload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestAuthFlow;