import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Milk, Eye, EyeOff, Shield, User } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(true);

  // Get role from query parameter
  const role = searchParams.get('role') || 'admin';

  // Redirect based on role if already authenticated
  if (isAuthenticated) {
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'worker') {
      return <Navigate to="/staff" replace />;
    } else {
      return <Navigate to="/admin" replace />;
    }
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
      const success = await login(credentials.username, credentials.password);
      if (!success) {
        setError('Login failed. Please try again.');
        setLoginLoading(false);
        // Button will be re-enabled after 3 seconds by the useEffect hook
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
      setLoginLoading(false);
      // Button will be re-enabled after 3 seconds by the useEffect hook
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="text-emerald-600 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <Milk className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-emerald-700">
              DairyChain Pro
            </CardTitle>
            <CardDescription className="text-emerald-600">
              {role === 'admin' ? 'Admin Portal' : 'Staff Portal'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-emerald-700 font-medium">
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
                className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-emerald-700 font-medium">
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
                  className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700"
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
              className={`w-full ${
                role === 'admin' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white shadow-lg`}
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
                  {role === 'admin' ? (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Sign In
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Staff Sign In
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-emerald-600">
              Demo credentials: <br />
              Username: <span className="font-mono bg-emerald-100 px-1 rounded">admin@cheradairy.com</span><br />
              Password: <span className="font-mono bg-emerald-100 px-1 rounded">CheraDairy2025!</span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-sm text-emerald-600 hover:text-emerald-700 underline"
            >
              Back to Homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}