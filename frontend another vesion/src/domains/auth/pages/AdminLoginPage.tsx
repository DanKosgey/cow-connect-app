import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Milk, Eye, EyeOff, Shield } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import apiService from '@/services/ApiService';

export default function AdminLogin() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showDummyCredentials, setShowDummyCredentials] = useState(true);
  const [showRetryButton, setShowRetryButton] = useState(true);
  const navigate = useNavigate();

  // Check if user is already authenticated by checking localStorage
  const isAuthenticated = !!localStorage.getItem('authToken');

  // Dummy credentials for testing
  const dummyCredentials = {
    admin: { username: 'admin@cheradairy.com', password: 'CheraDairy2025!', role: 'Administrator' },
    admin2: { username: 'admin2', password: 'admin123', role: 'Deputy Admin' }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  // Reset button after 3 seconds on error
  useEffect(() => {
    if (error && !showRetryButton) {
      const timer = setTimeout(() => {
        setShowRetryButton(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, showRetryButton]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!showRetryButton) return; // Prevent multiple submissions during cooldown
    
    setLoginLoading(true);
    setShowRetryButton(false);

    try {
      // Try dummy login first
      const response = await apiService.Auth.dummyLogin(credentials.username, credentials.password);
      if (response.success) {
        // Navigate to admin dashboard
        navigate('/admin');
      } else {
        setError('Login failed. Please try again.');
        setLoginLoading(false);
        // Button will be re-enabled after 3 seconds by the useEffect hook
      }
    } catch (err: any) {
      // If dummy login fails, try regular login
      try {
        const response = await apiService.Auth.login(credentials.username, credentials.password);
        if (response.access_token) {
          // Navigate to admin dashboard
          navigate('/admin');
        } else {
          setError('Login failed. Please try again.');
          setLoginLoading(false);
          // Button will be re-enabled after 3 seconds by the useEffect hook
        }
      } catch (loginErr: any) {
        setError(loginErr.response?.data?.detail || 'Login failed. Please try again.');
        setLoginLoading(false);
        // Button will be re-enabled after 3 seconds by the useEffect hook
      }
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
      const form = document.getElementById('admin-login-form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <Milk className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-blue-700">
              DairyChain Pro
            </CardTitle>
            <CardDescription className="text-blue-600">
              Admin Portal
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form id="admin-login-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-blue-700 font-medium">
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
                className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-700 font-medium">
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
                  className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700"
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
              disabled={loginLoading || !showRetryButton}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : !showRetryButton ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Sign In
                </>
              )}
            </Button>
          </form>

          {showDummyCredentials && (
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials:</h3>
              <div className="space-y-2">
                {Object.entries(dummyCredentials).map(([key, cred]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-blue-700">
                      <strong>{cred.role}:</strong> {cred.username} / {cred.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDummyLogin(cred.username, cred.password)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              ← Back to Homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}