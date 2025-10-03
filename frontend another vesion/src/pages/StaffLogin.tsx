import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import { useToastContext } from '@/components/ToastWrapper';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';

export default function StaffLogin() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if already authenticated
  React.useEffect(() => {
    setIsAuthenticated(supabaseFastApiAuth.isAuthenticated());
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Dummy credentials for testing
  const dummyCredentials = {
    worker: { username: 'worker', password: 'worker123', role: 'Field Worker', staffId: 'STAFF001' },
    worker2: { username: 'worker2', password: 'worker123', role: 'Field Worker', staffId: 'STAFF002' },
    manager: { username: 'manager', password: 'manager123', role: 'Manager', staffId: 'STAFF003' }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <LoginForm
          portal="staff"
          onLoginSuccess={handleLoginSuccess}
          showDummyCredentials={true}
          dummyCredentials={dummyCredentials}
          loginFunction={handleLogin}
        />
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}