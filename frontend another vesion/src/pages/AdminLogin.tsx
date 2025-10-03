import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import { Link } from 'react-router-dom';
import { useToastContext } from '@/components/ToastWrapper';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if already authenticated
  React.useEffect(() => {
    setIsAuthenticated(supabaseFastApiAuth.isAuthenticated());
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  // Dummy credentials for testing
  const dummyCredentials = {
    admin: { username: 'admin@cheradairy.com', password: 'CheraDairy2025!', role: 'Administrator' },
    admin2: { username: 'admin2', password: 'admin123', role: 'Deputy Admin' }
  };

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await supabaseFastApiAuth.login({ email, password });

      if (response.user) {
        toast?.showSuccess('Login Successful', response.message || 'Welcome back!');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      toast?.showError('Login Failed', error.message || 'An unexpected error occurred');
      return false;
    }
  };

  const handleLoginSuccess = (redirectPath: string) => {
    navigate(redirectPath);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="w-full max-w-md">
        <LoginForm
          portal="admin"
          onLoginSuccess={handleLoginSuccess}
          showDummyCredentials={true}
          dummyCredentials={dummyCredentials}
          loginFunction={handleLogin}
        />
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm text-emerald-600 hover:text-emerald-700 underline"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}