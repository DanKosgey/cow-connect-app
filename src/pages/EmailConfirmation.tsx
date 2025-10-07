import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';

const EmailConfirmation = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { show: showToast } = useToastNotifications();

  useEffect(() => {
    // Check if there's a pending registration to complete
    const checkPendingRegistration = () => {
      try {
        const pendingData = localStorage.getItem('pending_farmer_registration');
        if (pendingData) {
          showToast({
            title: 'Complete Registration',
            description: 'Please continue your registration process now that your email is confirmed.'
          });
        }
      } catch (error) {
        console.warn('Could not check pending registration:', error);
      }
    };

    checkPendingRegistration();
  }, [showToast]);

  const handleContinueRegistration = () => {
    try {
      const pendingData = localStorage.getItem('pending_farmer_registration');
      if (pendingData) {
        // Navigate to registration completion page
        navigate('/complete-registration');
      } else {
        // Go to login page
        navigate('/login');
      }
    } catch (error) {
      console.warn('Error handling registration continuation:', error);
      navigate('/login');
    }
  };

  const handleCheckStatus = () => {
    // Refresh the page to check if email confirmation was completed
    window.location.reload();
  };

  const handleGoHome = () => {
    try {
      // Clean up pending registration data
      localStorage.removeItem('pending_farmer_registration');
    } catch (error) {
      console.warn('Could not clean up pending registration data:', error);
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Confirmation Required</h1>
          <p className="text-gray-600 mt-2">Please check your email to confirm your account</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-gray-600">
              <p className="mb-4">
                We've sent a confirmation email to your address. Please click the link in the email to verify your account.
              </p>
              <p className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                <strong>Important:</strong> After confirming your email, please return to this page to complete your farmer registration.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                What happens next:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Click the confirmation link in your email</li>
                <li>Sign in with your new account</li>
                <li>Complete your farmer registration</li>
                <li>Upload your required documents</li>
                <li>Wait for admin approval</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={handleContinueRegistration}
                className="flex-1"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Status...
                  </span>
                ) : (
                  <>
                    Continue Registration
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={handleCheckStatus}
                className="flex-1"
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Status
              </Button>
              <Button 
                variant="outline"
                onClick={handleGoHome}
                className="flex-1"
              >
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 mt-6">
          Didn't receive the email? Check your spam folder or contact support.
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;