import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import AdminDebugLogger from '@/utils/adminDebugLogger';
import DatabaseDiagnostics from '@/utils/databaseDiagnostics';

const AuthDiagnosticsPage = () => {
  const { user, userRole, session, loading } = useAuth();
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, any>>({});
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  useEffect(() => {
    AdminDebugLogger.component('AuthDiagnosticsPage mounted', { 
      userPresent: !!user, 
      userRole, 
      loading 
    });
  }, [user, userRole, loading]);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    AdminDebugLogger.log('Starting auth diagnostics...');
    
    try {
      const results: Record<string, any> = {};
      
      // Auth context state
      results.authContext = {
        userPresent: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userRole: userRole,
        sessionPresent: !!session,
        loading: loading
      };
      
      AdminDebugLogger.log('Auth context state:', results.authContext);
      
      // Database diagnostics
      AdminDebugLogger.log('Running database diagnostics...');
      await DatabaseDiagnostics.runAllDiagnostics();
      
      // Session info
      if (session) {
        results.sessionInfo = {
          accessToken: session.access_token ? 'present' : 'missing',
          refreshToken: session.refresh_token ? 'present' : 'missing',
          expiresAt: session.expires_at,
          tokenType: session.token_type
        };
        AdminDebugLogger.log('Session info:', results.sessionInfo);
      }
      
      // Local storage check
      results.localStorage = {
        cachedRole: localStorage.getItem('cached_role'),
        cachedUser: localStorage.getItem('cached_user'),
        authItems: Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key.startsWith('supabase-') || key.includes('auth')
        )
      };
      AdminDebugLogger.log('Local storage info:', results.localStorage);
      
      setDiagnosticResults(results);
      AdminDebugLogger.success('Diagnostics completed successfully');
    } catch (error) {
      AdminDebugLogger.error('Diagnostics error:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Authentication Diagnostics</h1>
        <p className="text-muted-foreground">Comprehensive debugging information for authentication issues</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Diagnostics</CardTitle>
          <CardDescription>
            Execute comprehensive tests to identify authentication issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunningDiagnostics}
            className="w-full"
          >
            {isRunningDiagnostics ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
          </Button>
        </CardContent>
      </Card>

      {Object.keys(diagnosticResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
            <CardDescription>
              Detailed information about authentication state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(diagnosticResults).map(([key, value]) => (
                <div key={key} className="border rounded-lg p-4">
                  <h3 className="font-semibold capitalize mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Auth State</CardTitle>
          <CardDescription>
            Real-time information about your authentication status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">User Information</h3>
              <p><strong>User Present:</strong> {user ? 'Yes' : 'No'}</p>
              {user && (
                <>
                  <p><strong>User ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                </>
              )}
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Role Information</h3>
              <p><strong>Role:</strong> {userRole || 'None'}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Session Information</h3>
              <p><strong>Session Present:</strong> {session ? 'Yes' : 'No'}</p>
              {session && (
                <>
                  <p><strong>Token Type:</strong> {session.token_type}</p>
                  <p><strong>Expires At:</strong> {new Date(session.expires_at * 1000).toLocaleString()}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDiagnosticsPage;