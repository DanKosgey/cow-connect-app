import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';

const AuthTestPage = () => {
  const { user, session, userRole, loading, resetAuthState, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const runAuthTests = async () => {
    setTesting(true);
    try {
      // Test 1: Current auth state
      const authState = {
        user: user ? 'Present' : 'None',
        userId: user?.id || 'N/A',
        userEmail: user?.email || 'N/A',
        userRole: userRole || 'None',
        session: session ? 'Present' : 'None',
        loading: loading
      };

      // Test 2: Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Test 3: Current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      // Test 4: User roles
      let roleData = null;
      let roleError = null;
      if (userData?.user?.id) {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        roleData = data;
        roleError = error;
      }
      
      // Test 5: Local storage items
      const localStorageItems = {
        cached_user: localStorage.getItem('cached_user'),
        cached_role: localStorage.getItem('cached_role'),
        auth_cache_timestamp: localStorage.getItem('auth_cache_timestamp'),
        pending_profile: localStorage.getItem('pending_profile')
      };
      
      // Test 6: Supabase-specific items
      const supabaseItems: Record<string, string> = {};
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase-')) {
          supabaseItems[key] = localStorage.getItem(key) || '';
        }
      });
      
      setTestResults({
        authState,
        session: {
          data: sessionData?.session ? 'Present' : 'None',
          error: sessionError?.message || 'None'
        },
        user: {
          data: userData?.user ? 'Present' : 'None',
          error: userError?.message || 'None'
        },
        role: {
          data: roleData,
          error: roleError?.message || 'None'
        },
        localStorage: localStorageItems,
        supabaseItems,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error running auth tests:', error);
      setTestResults({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runAuthTests();
  }, [user, session, userRole, loading]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-heading font-bold">Authentication Test</h1>
          <Button onClick={() => navigate(-1)}>Back</Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={runAuthTests} 
                disabled={testing}
                className="w-full"
              >
                {testing ? 'Testing...' : 'Run Authentication Tests'}
              </Button>
              
              <Button 
                onClick={async () => {
                  await resetAuthState();
                  window.location.reload();
                }}
                variant="destructive"
                className="w-full"
              >
                Reset Authentication State
              </Button>
              
              <Button 
                onClick={async () => {
                  const result = await refreshSession();
                  console.log('Session refresh result:', result);
                  runAuthTests();
                }}
                variant="outline"
                className="w-full"
              >
                Refresh Session
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AuthTestPage;