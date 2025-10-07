import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import AuthDiagnostics from '@/components/AuthDiagnostics';
import { logger } from '@/utils/logger';

const AuthTestPage = () => {
  const navigate = useNavigate();
  const { login, signOut, user, userRole } = useAuth();
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'staff' | 'farmer'
  });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      logger.info('Attempting login', loginData);
      
      const { error } = await login({
        email: loginData.email,
        password: loginData.password,
        role: loginData.role
      });
      
      if (error) {
        logger.errorWithContext('Login failed', error);
        alert(`Login failed: ${error.message}`);
      } else {
        logger.info('Login successful');
        alert('Login successful!');
      }
    } catch (error) {
      logger.errorWithContext('Login exception', error);
      alert(`Login exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      logger.info('Signing out');
      await signOut();
      logger.info('Signed out successfully');
      alert('Signed out successfully!');
      // Navigate to home with clearAuth flag
      navigate('/', { state: { clearAuth: true } });
    } catch (error) {
      logger.errorWithContext('Sign out failed', error);
      alert(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 rounded">
            <p><strong>Current User:</strong> {user ? user.email : 'None'}</p>
            <p><strong>Current Role:</strong> {userRole || 'None'}</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={loginData.role}
                onChange={(e) => setLoginData({...loginData, role: e.target.value as any})}
                className="w-full p-2 border rounded"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="farmer">Farmer</option>
              </select>
            </div>
            
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              <Button type="button" onClick={handleSignOut} variant="outline">
                Sign Out
              </Button>
              <Button type="button" onClick={() => navigate('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <AuthDiagnostics />
    </div>
  );
};

export default AuthTestPage;