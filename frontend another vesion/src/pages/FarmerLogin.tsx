import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import { Link } from 'react-router-dom';
import { useToastContext } from '@/components/ToastWrapper';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';

export default function FarmerLogin() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if already authenticated
  React.useEffect(() => {
    setIsAuthenticated(supabaseFastApiAuth.isAuthenticated());
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/farmer/profile" replace />;
  }

  // Dummy credentials for testing
  const dummyCredentials = {
    farmer: { username: 'farmer', password: 'farmer123', role: 'Farmer', farm: 'Doe Dairy Farm' },
    farmer2: { username: 'farmer2', password: 'farmer123', role: 'Farmer', farm: 'Smith Organic Farm' }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="w-full max-w-md">
        <LoginForm
          portal="farmer"
          onLoginSuccess={handleLoginSuccess}
          showDummyCredentials={true}
          dummyCredentials={dummyCredentials}
          loginFunction={handleLogin}
        />
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
      </div>
    </div>
  );
}