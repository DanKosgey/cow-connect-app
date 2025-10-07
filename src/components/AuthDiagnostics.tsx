import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

const AuthDiagnostics = () => {
  const { user, session, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // Get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      // Check user roles
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
      
      // Check localStorage items
      const localStorageItems = {
        cached_user: localStorage.getItem('cached_user'),
        cached_role: localStorage.getItem('cached_role'),
        pending_profile: localStorage.getItem('pending_profile'),
        auth_cache_timestamp: localStorage.getItem('auth_cache_timestamp')
      };
      
      setDiagnostics({
        session: sessionData?.session,
        sessionError,
        user: userData?.user,
        userError,
        userRole: roleData,
        roleError,
        localStorageItems,
        currentContext: {
          contextUser: user,
          contextSession: session,
          contextRole: userRole
        }
      });
    } catch (error) {
      logger.errorWithContext('AuthDiagnostics', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAuthCache = () => {
    localStorage.removeItem('cached_user');
    localStorage.removeItem('cached_role');
    localStorage.removeItem('auth_cache_timestamp');
    localStorage.removeItem('pending_profile');
    runDiagnostics();
  };

  const forceRefreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      logger.info('Session refresh result', { data, error });
      runDiagnostics();
    } catch (error) {
      logger.errorWithContext('Force session refresh', error);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Authentication Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? 'Running...' : 'Run Diagnostics'}
            </Button>
            <Button onClick={clearAuthCache} variant="outline">
              Clear Auth Cache
            </Button>
            <Button onClick={forceRefreshSession} variant="outline">
              Force Session Refresh
            </Button>
            <Button onClick={async () => {
              await signOut();
              navigate('/', { state: { clearAuth: true } });
            }} variant="destructive">
              Sign Out
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Session Info</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(diagnostics.session, null, 2)}
              </pre>
              {diagnostics.sessionError && (
                <p className="text-red-500 text-sm">Error: {diagnostics.sessionError.message}</p>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">User Info</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(diagnostics.user, null, 2)}
              </pre>
              {diagnostics.userError && (
                <p className="text-red-500 text-sm">Error: {diagnostics.userError.message}</p>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Role Info</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(diagnostics.userRole, null, 2)}
              </pre>
              {diagnostics.roleError && (
                <p className="text-red-500 text-sm">Error: {diagnostics.roleError.message}</p>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Context State</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(diagnostics.currentContext, null, 2)}
              </pre>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">LocalStorage Items</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(diagnostics.localStorageItems, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDiagnostics;