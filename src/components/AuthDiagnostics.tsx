import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { authManager } from '@/utils/authManager';
import { networkHealth } from '@/utils/networkHealth';

const AuthDiagnostics = () => {
  const { user, session } = useAuth();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<any>({});

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      logger.info('Running authentication diagnostics');
      
      // Get current session info
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      // Get user info
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      // Check network status
      const networkStatus = await networkHealth.checkNetworkStatus();
      setNetworkStatus(networkStatus);
      
      // Check session validity
      const isSessionValid = await authManager.isSessionValid();
      
      // Get user role if user exists
      let userRole = null;
      if (currentUser?.id) {
        try {
          userRole = await authManager.getUserRole(currentUser.id);
        } catch (roleError) {
          logger.errorWithContext('Error getting user role', roleError);
        }
      }
      
      const diagInfo = {
        timestamp: new Date().toISOString(),
        session: currentSession ? {
          expiresAt: currentSession.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : null,
          expiresIn: currentSession.expires_at ? Math.floor((currentSession.expires_at * 1000 - Date.now()) / 1000) : null,
          hasAccessToken: !!currentSession.access_token,
          hasRefreshToken: !!currentSession.refresh_token,
        } : null,
        user: currentUser ? {
          id: currentUser.id,
          email: currentUser.email,
          role: userRole
        } : null,
        sessionValid: isSessionValid,
        errors: {
          sessionError: sessionError?.message,
          userError: userError?.message
        },
        networkStatus
      };
      
      setDiagnostics(diagInfo);
      logger.info('Diagnostics completed', diagInfo);
    } catch (error) {
      logger.errorWithContext('Diagnostics failed', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAuthCache = async () => {
    try {
      logger.info('Clearing authentication cache');
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_role');
      localStorage.removeItem('auth_cache_timestamp');
      localStorage.removeItem('auth_role_cache');
      
      // Clear all Supabase-related items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      logger.info('Authentication cache cleared');
      runDiagnostics(); // Refresh diagnostics after clearing
    } catch (error) {
      logger.errorWithContext('Error clearing auth cache', error);
    }
  };

  const forceRefreshSession = async () => {
    try {
      logger.info('Forcing session refresh');
      const { data, error } = await supabase.auth.refreshSession();
      logger.info('Session refresh result', { data, error });
      runDiagnostics();
    } catch (error) {
      logger.errorWithContext('Force session refresh', error);
    }
  };

  const checkNetworkHealth = async () => {
    try {
      setLoading(true);
      const status = await networkHealth.checkNetworkStatus();
      setNetworkStatus(status);
      logger.info('Network health check completed', status);
    } catch (error) {
      logger.errorWithContext('Network health check failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Authentication & Network Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? 'Running...' : 'Run Diagnostics'}
            </Button>
            <Button onClick={clearAuthCache} variant="outline">
              Clear Auth Cache
            </Button>
            <Button onClick={forceRefreshSession} variant="outline">
              Force Session Refresh
            </Button>
            <Button onClick={checkNetworkHealth} variant="outline">
              Check Network Health
            </Button>
            <Button onClick={async () => {
              await authManager.signOut();
              window.location.href = '/';
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
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">User Info</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(diagnostics.user, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Validation</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify({
                  sessionValid: diagnostics.sessionValid,
                  errors: diagnostics.errors
                }, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Network Status</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(networkStatus, null, 2)}
              </pre>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Full Diagnostics</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDiagnostics;