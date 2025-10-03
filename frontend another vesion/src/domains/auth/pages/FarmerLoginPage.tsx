import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Milk, Eye, EyeOff, Tractor } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import apiService from '@/services/ApiService';

export default function FarmerLogin() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showDummyCredentials, setShowDummyCredentials] = useState(true);
  const navigate = useNavigate();

  // Check if user is already authenticated by checking localStorage
  const isAuthenticated = !!localStorage.getItem('authToken');

  // Dummy credentials for testing
  const dummyCredentials = {
    farmer: { username: 'farmer', password: 'farmer123', role: 'Farmer', farm: 'Doe Dairy Farm' },
    farmer2: { username: 'farmer2', password: 'farmer123', role: 'Farmer', farm: 'Smith Organic Farm' }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/farmer/profile" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);

    try {
      // Try dummy login first
      const response = await apiService.Auth.dummyLogin(credentials.username, credentials.password);
      if (response.success && response.user && response.redirect_url.includes('farmer')) {
        // Navigate to farmer profile
        navigate('/farmer/profile');
      } else {
        setError('Invalid farmer credentials');
      }
    } catch (err: any) {
      // If dummy login fails, try regular login
      try {
        const response = await apiService.Auth.login(credentials.username, credentials.password);
        if (response.access_token) {
          // Navigate to farmer profile
          navigate('/farmer/profile');
        } else {
          setError('Login failed. Please try again.');
        }
      } catch (loginErr: any) {
        setError(loginErr.response?.data?.detail || 'Login failed. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleDummyLogin = (username: string, password: string) => {
    setCredentials({ username, password });
    // Auto-submit after setting credentials
    setTimeout(() => {
      const form = document.getElementById('farmer-login-form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
            <Milk className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-green-700">
              DairyChain Pro
            </CardTitle>
            <CardDescription className="text-green-600">
              Farmer Portal
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form id="farmer-login-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-green-700 font-medium">
                Username or Email
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Enter your username or email"
                required
                className="border-green-200 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-green-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="border-green-200 focus:border-green-500 focus:ring-green-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Tractor className="mr-2 h-4 w-4" />
                  Farmer Login
                </>
              )}
            </Button>
          </form>

          {showDummyCredentials && (
            <div className="mt-6 p-4 bg-green-50 rounded-md">
              <h3 className="text-sm font-medium text-green-900 mb-2">Demo Farmer Accounts:</h3>
              <div className="space-y-2">
                {Object.entries(dummyCredentials).map(([key, cred]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-green-700">
                      <strong>{cred.farm}:</strong> {cred.username} / {cred.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDummyLogin(cred.username, cred.password)}
                      className="text-green-600 hover:text-green-800 underline"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center space-y-2">
            <Link
              to="/farmer/register"
              className="text-green-600 hover:text-green-500 text-sm underline"
            >
              New farmer? Sign up here →
            </Link>
            <br />
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-500 text-sm"
            >
              ← Back to Homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}