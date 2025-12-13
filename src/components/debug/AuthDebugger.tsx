import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/lib/supabase/auth-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const AuthDebugger: React.FC = () => {
  const { user, session, userRole, isAuthenticated, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [events, setEvents] = useState<any[]>([]);

  // Add auth state change listener
  useEffect(() => {
    const subscription = supabase.auth.onAuthStateChange((event, session) => {
      setEvents(prev => [...prev.slice(-9), { 
        timestamp: new Date().toISOString(), 
        event, 
        hasSession: !!session,
        userId: session?.user?.id ? '[REDACTED]' : null
      }]);
    });

    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  const fetchDebugInfo = async () => {
    try {
      const info: any = {};
      
      // Get session from Supabase client directly
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      info.supabaseSession = {
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id ? '[REDACTED]' : null,
        error: sessionError?.message
      };
      
      // Get user from Supabase client directly
      const { data: userData, error: userError } = await supabase.auth.getUser();
      info.supabaseUser = {
        hasUser: !!userData?.user,
        userId: userData?.user?.id ? '[REDACTED]' : null,
        error: userError?.message
      };
      
      // Check localStorage
      try {
        // Extract project ID from the SUPABASE_URL environment variable
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        if (supabaseUrl) {
          const url = new URL(supabaseUrl);
          const projectId = url.hostname.split('.')[0];
          const tokenKey = `sb-${projectId}-auth-token`;
          const token = localStorage.getItem(tokenKey);
          info.localStorage = {
            key: tokenKey,
            hasToken: !!token,
            tokenPreview: token ? `${token.substring(0, 50)}...` : null
          };
        } else {
          info.localStorage = { error: 'SUPABASE_URL not found in environment variables' };
        }
      } catch (e) {
        info.localStorage = { error: 'Access denied or URL parsing error' };
      }
      
      // Get authService info
      info.authService = {
        currentUser: !!(await authService.getCurrentUser(false)),
        currentSession: !!(await authService.getCurrentSession(false))
      };
      
      setDebugInfo(info);
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  const clearLocalStorage = () => {
    try {
      // Extract project ID from the SUPABASE_URL environment variable
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      if (supabaseUrl) {
        const url = new URL(supabaseUrl);
        const projectId = url.hostname.split('.')[0];
        const tokenKey = `sb-${projectId}-auth-token`;
        localStorage.removeItem(tokenKey);
        alert('Local storage cleared');
      } else {
        alert('SUPABASE_URL not found in environment variables');
      }
    } catch (e) {
      alert('Error clearing local storage: ' + e);
    }
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Auth Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="font-semibold">Current Auth State</h3>
            <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
            <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
            <p>User: {user ? `[REDACTED]` : 'None'}</p>
            <p>Role: {userRole || 'None'}</p>
            <p>Session: {session ? 'Exists' : 'None'}</p>
          </div>
          
          <div>
            <h3 className="font-semibold">Actions</h3>
            <Button onClick={fetchDebugInfo} className="mr-2">Refresh Debug Info</Button>
            <Button onClick={clearLocalStorage} variant="destructive">Clear Local Storage</Button>
          </div>
        </div>
        
        {Object.keys(debugInfo).length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold">Debug Info</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-60">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
        
        <div>
          <h3 className="font-semibold">Recent Auth Events</h3>
          <div className="bg-gray-100 p-2 rounded max-h-60 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="text-xs mb-1">
                <span className="font-mono">{event.timestamp.split('T')[1].split('.')[0]}</span> - 
                <span className="font-semibold"> {event.event}</span> - 
                Session: {event.hasSession ? 'Yes' : 'No'}
              </div>
            ))}
            {events.length === 0 && <p className="text-gray-500">No events yet</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDebugger;