import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

const AuthDiagnostics = () => {
  const { user, session, userRole, signOut, resetAuthState } = useAuth();
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

  const clearAuthCache = async () => {
    setLoading(true);
    try {
      await resetAuthState();
      // Run diagnostics again to see updated state
      setTimeout(runDiagnostics, 1000);
    } catch (error) {
      logger.error('Error clearing auth cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut();
      navigate('/login');
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
        <h1 className="text-3xl font-bold text-gray-900">Auth Diagnostics</h1>
        <p className="text-gray-600 mt-2">Diagnose and troubleshoot authentication issues</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runDiagnostics} 
              disabled={loading}
              className="w-full"
            >
              Run Diagnostics
            </Button>
            
            <Button 
              onClick={clearAuthCache} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              Clear Auth Cache & Reset State
            </Button>
            
            <Button 
              onClick={signOutUser} 
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Auth State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>User:</strong> {user ? 'Logged in' : 'Not logged in'}</div>
              <div><strong>Role:</strong> {userRole || 'None'}</div>
              <div><strong>Session:</strong> {session ? 'Active' : 'None'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostics Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDiagnostics;