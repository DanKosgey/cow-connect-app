import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';
import { NetworkDiagnostics } from '@/utils/networkDiagnostics';
import { RefreshCw, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';

const NetworkDiagnosticsPage = () => {
  const { user, session, userRole, signOut, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

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
        auth_cache_timestamp: localStorage.getItem('auth_cache_timestamp'),
        pending_profile: localStorage.getItem('pending_profile')
      };
      
      // Check for Supabase-specific items
      const supabaseItems: Record<string, string> = {};
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase-')) {
          supabaseItems[key] = localStorage.getItem(key) || '';
        }
      });
      
      setDiagnostics({
        session: sessionData?.session,
        sessionError,
        user: userData?.user,
        userError,
        role: roleData,
        roleError,
        localStorageItems,
        supabaseItems,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error running diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const testNetworkConnection = async () => {
    setLoading(true);
    try {
      const result = await NetworkDiagnostics.testSupabaseConnection();
      setTestResults(result);
    } catch (error) {
      logger.error('Error testing network connection:', error);
      setTestResults({ success: false, error });
    } finally {
      setLoading(false);
    }
  };

  const clearNetworkCache = async () => {
    setLoading(true);
    try {
      await NetworkDiagnostics.clearNetworkCache();
      // Refresh the page to ensure cache is cleared
      window.location.reload();
    } catch (error) {
      logger.error('Error clearing network cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const forceSessionRefresh = async () => {
    setLoading(true);
    try {
      const result = await refreshSession();
      logger.info('Session refresh result:', result);
      // Run diagnostics again to see updated state
      setTimeout(runDiagnostics, 1000);
    } catch (error) {
      logger.error('Error refreshing session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Network & Auth Diagnostics</h1>
        <p className="text-gray-600 mt-2">Diagnose and troubleshoot network and authentication issues</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Connection Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testNetworkConnection} 
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Test Supabase Connection
            </Button>
            
            <Button 
              onClick={clearNetworkCache} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Clear Network Cache
            </Button>
            
            {testResults && (
              <div className={`p-4 rounded-lg ${testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {testResults.success ? (
                  <div className="flex items-center text-green-700">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>Connection Test Successful</span>
                  </div>
                ) : (
                  <div className="flex items-start text-red-700">
                    <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <div>Connection Test Failed</div>
                      {testResults.error && (
                        <div className="text-sm mt-1 font-mono">
                          {testResults.error.message || JSON.stringify(testResults.error)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Session Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={forceSessionRefresh} 
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Force Session Refresh
            </Button>
            
            <Button 
              onClick={signOutUser} 
              variant="destructive"
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Auth State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">User Information</h3>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto mt-2">
                {JSON.stringify({ user, userRole }, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Session Information</h3>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto mt-2">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">Diagnostics Data</h3>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto mt-2">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkDiagnosticsPage;