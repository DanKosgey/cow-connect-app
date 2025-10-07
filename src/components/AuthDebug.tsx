import { useState } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AuthDebug = () => {
  const { user, userRole, session, loading, clearAllAuthData, refreshSession } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string>('');

  const handleClearAuth = async () => {
    try {
      await clearAllAuthData();
      setDebugInfo('Authentication data cleared successfully');
    } catch (error) {
      setDebugInfo(`Error clearing auth data: ${error}`);
    }
  };

  const handleRefreshSession = async () => {
    try {
      const result = await refreshSession();
      setDebugInfo(`Session refresh result: ${JSON.stringify(result)}`);
    } catch (error) {
      setDebugInfo(`Error refreshing session: ${error}`);
    }
  };

  const handleShowAuthState = () => {
    setDebugInfo(`
User: ${user ? JSON.stringify(user, null, 2) : 'null'}
Role: ${userRole || 'null'}
Session: ${session ? JSON.stringify(session, null, 2) : 'null'}
Loading: ${loading}
    `);
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Authentication Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleShowAuthState}>Show Auth State</Button>
            <Button onClick={handleClearAuth} variant="destructive">Clear Auth Data</Button>
            <Button onClick={handleRefreshSession} variant="outline">Refresh Session</Button>
          </div>
          
          {debugInfo && (
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};