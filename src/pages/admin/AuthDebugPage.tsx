import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthDebugger } from '@/utils/authDebugger';
import { logger } from '@/utils/logger';

const AuthDebugPage = () => {
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleGetCurrentSession = async () => {
    try {
      const sessionResult = await AuthDebugger.getCurrentSession();
      const userResult = await AuthDebugger.getUser();
      
      let roleResult = { role: null, error: null };
      if (userResult.user?.id) {
        roleResult = await AuthDebugger.getUserRole(userResult.user.id);
      }
      
      setDebugInfo({
        session: sessionResult.session,
        user: userResult.user,
        role: roleResult.role,
        localStorage: AuthDebugger.getLocalStorageItems(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting current session:', error);
      setDebugInfo({ error: error.message });
    }
  };

  const handleClearAllAuthData = async () => {
    try {
      const result = await AuthDebugger.clearAllAuthData();
      setDebugInfo({ message: 'Auth data cleared', result });
    } catch (error) {
      logger.error('Error clearing auth data:', error);
      setDebugInfo({ error: error.message });
    }
  };

  const handleTestLogin = async () => {
    if (!loginData.email || !loginData.password) {
      setDebugInfo({ error: 'Please enter email and password' });
      return;
    }
    
    setLoading(true);
    try {
      const result = await AuthDebugger.testLogin(loginData.email, loginData.password);
      setDebugInfo({ loginTest: result });
    } catch (error) {
      logger.error('Error testing login:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold">Authentication Debug</h1>
          <p className="text-muted-foreground mt-2">Debug authentication issues</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGetCurrentSession} className="w-full">
                Get Current Session
              </Button>
              <Button onClick={handleClearAllAuthData} variant="destructive" className="w-full">
                Clear All Auth Data
              </Button>
              <Button onClick={handleGoToLogin} variant="outline" className="w-full">
                Go to Login Page
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Login Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <Button 
                onClick={handleTestLogin} 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test Login'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo ? (
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">No debug information yet. Click an action button above.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>Click "Get Current Session" to see your current authentication state</li>
              <li>If you see session data, click "Clear All Auth Data"</li>
              <li>Click "Go to Login Page" to navigate to the login form</li>
              <li>Try logging in with your credentials</li>
              <li>If login fails, use the "Login Test" section to test your credentials directly</li>
              <li>Check the browser console for any error messages</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthDebugPage;