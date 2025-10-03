import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToastContext } from '@/components/ToastWrapper';
import type { User } from '@/types';

interface DummyCredential {
  username: string;
  password: string;
  role: string;
  [key: string]: any;
}

interface LoginFormProps {
  portal: 'admin' | 'staff' | 'farmer';
  onLoginSuccess: (redirectPath: string) => void;
  showDummyCredentials?: boolean;
  dummyCredentials?: Record<string, DummyCredential>;
  loginFunction?: (email: string, password: string) => Promise<boolean>;
}

export default function LoginForm({
  portal,
  onLoginSuccess,
  showDummyCredentials = false,
  dummyCredentials = {},
  loginFunction
}: LoginFormProps) {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const toast = useToastContext();

  const portalConfig = {
    admin: {
      title: 'Admin Portal',
      gradient: 'from-emerald-50 to-teal-50',
      cardGradient: 'bg-gradient-to-br from-white to-teal-50/30',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
      inputClass: 'border-blue-200 focus:border-blue-500 focus:ring-blue-500',
      textClass: 'text-blue-700',
      iconColor: 'text-blue-600 hover:text-blue-700',
      successMessage: 'Welcome to DairyChain Pro Admin Portal',
      redirectPath: '/admin'
    },
    staff: {
      title: 'Staff Portal',
      gradient: 'from-blue-50 to-indigo-50',
      cardGradient: 'bg-gradient-to-br from-white to-blue-50/30',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
      inputClass: 'border-blue-200 focus:border-blue-500 focus:ring-blue-500',
      textClass: 'text-blue-700',
      iconColor: 'text-blue-600 hover:text-blue-700',
      successMessage: 'Welcome to DairyChain Pro Staff Portal',
      redirectPath: '/staff/dashboard'
    },
    farmer: {
      title: 'Farmer Portal',
      gradient: 'from-green-50 to-emerald-50',
      cardGradient: 'bg-gradient-to-br from-white to-green-50/30',
      buttonClass: 'bg-green-600 hover:bg-green-700',
      inputClass: 'border-green-200 focus:border-green-500 focus:ring-green-500',
      textClass: 'text-green-700',
      iconColor: 'text-green-600 hover:text-green-700',
      successMessage: 'Welcome to DairyChain Pro Farmer Portal',
      redirectPath: '/farmer/profile'
    }
  };

  const config = portalConfig[portal];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);

    try {
      // Use the provided login function or a default one
      const loginFn = loginFunction || (async (email: string, password: string) => {
        // Default login implementation - in login pages, this will be replaced with actual login
        console.log('Login attempt with email:', email);
        return true;
      });
      
      const success = await loginFn(credentials.email, credentials.password);
      if (success) {
        toast.showSuccess('Login Successful', config.successMessage);
        onLoginSuccess(config.redirectPath);
      } else {
        toast.showError('Login Failed', 'Invalid email or password');
        setLoginLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      toast.showError('Login Error', err.message || 'An unexpected error occurred');
      setLoginLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleDummyLogin = (email: string, password: string) => {
    setCredentials({ email, password });
    // Just populate the fields, don't auto-submit
    // User can then click the login button if they wish
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.gradient} p-4`}>
      <div className={`w-full max-w-md shadow-xl border-0 ${config.cardGradient} backdrop-blur-sm rounded-xl`}>
        <div className="space-y-4 text-center p-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 8L12 3L3 8V21H21V8Z" />
              <path d="M12 3V12" />
              <path d="M3 8L12 12L21 8" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              DairyChain Pro
            </h2>
            <p className={`text-sm ${config.textClass}`}>
              {config.title}
            </p>
          </div>
        </div>

        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className={`font-medium ${config.textClass}`}>
                Username or Email
              </Label>
              <Input
                id="email"
                name="email"
                type="text"
                value={credentials.email}
                onChange={handleChange}
                placeholder="Enter your username or email"
                required
                className={config.inputClass}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={`font-medium ${config.textClass}`}>
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
                  className={`${config.inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${config.iconColor}`}
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
              className={`w-full ${config.buttonClass} text-white shadow-lg`}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  {portal === 'admin' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  )}
                  {portal === 'staff' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  )}
                  {portal === 'farmer' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  )}
                  {portal === 'admin' && 'Admin Sign In'}
                  {portal === 'staff' && 'Staff Sign In'}
                  {portal === 'farmer' && 'Farmer Login'}
                </>
              )}
            </Button>
          </form>

          {showDummyCredentials && Object.keys(dummyCredentials).length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-md border border-emerald-200">
              <h3 className="text-sm font-medium text-emerald-900 mb-2">Demo Credentials:</h3>
              <div className="space-y-2">
                {Object.entries(dummyCredentials).map(([key, cred]) => (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-emerald-800">{cred.username}</span>
                      <span className="text-emerald-600 mx-2">|</span>
                      <span className="font-mono text-emerald-700">{cred.password}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs h-6 px-2"
                      onClick={() => handleDummyLogin(cred.username, cred.password)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}