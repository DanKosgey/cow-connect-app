import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const toast = useToastNotifications();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if there's a pending registration to complete
        const pendingRegistration = localStorage.getItem('pending_profile');
        
        if (pendingRegistration) {
          // If user is authenticated and has pending registration, go to complete registration
          if (user) {
            // For farmers, redirect to KYC pending approval page
            if (userRole === 'farmer') {
              navigate('/kyc-pending-approval');
            } else {
              navigate('/complete-registration');
            }
          } else {
            // If not authenticated yet, go to email confirmation page
            navigate('/email-confirmation');
          }
        } else {
          // No pending registration, go to appropriate dashboard
          if (user) {
            // Check user role and redirect accordingly
            switch (userRole) {
              case 'admin':
                navigate('/admin/dashboard');
                break;
              case 'staff':
                navigate('/staff/dashboard');
                break;
              case 'farmer':
                // For farmers, check if they have completed KYC
                // In a real implementation, you would check the farmer's KYC status
                navigate('/farmer/dashboard');
                break;
              default:
                navigate('/farmer/dashboard');
            }
          } else {
            // Go to login page
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error('Authentication Error', 'There was an error processing your authentication');
        navigate('/login');
      }
    };

    handleCallback();
  }, [user, userRole, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <CardTitle>Processing Authentication</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">Please wait while we complete your authentication...</p>
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;