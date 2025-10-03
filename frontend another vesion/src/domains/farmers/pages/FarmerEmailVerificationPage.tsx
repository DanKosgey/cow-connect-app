import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  CheckCircle, 
  Clock, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';
import { useToastContext } from '@/components/ToastWrapper';

const FarmerEmailVerificationPage = () => {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToastContext();

  // Get email from search params or local storage
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // Try to get email from local storage
      const storedEmail = localStorage.getItem('pending_verification_email');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [searchParams]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendCode = async () => {
    if (!email) {
      setVerifyError('No email address found. Please enter your email.');
      return;
    }

    setIsVerifying(true);
    setVerifyError('');

    try {
      // Resend verification email using the new FastAPI auth system
      const response = await supabaseFastApiAuth.resendVerification({ email });
      
      // Reset timer
      setTimeLeft(300);
      setVerifyError('');
      
      // Show success message
      if (toast) {
        toast.showSuccess('Verification Sent', response.message || 'Verification email has been resent.');
      }
    } catch (error: any) {
      setVerifyError(error.message || 'Failed to resend verification email. Please try again.');
      
      // Show error toast
      if (toast) {
        toast.showError('Resend Failed', error.message || 'Failed to resend verification email.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifySuccess = () => {
    setVerifySuccess(true);
    
    // Redirect to login after success
    setTimeout(() => {
      navigate('/farmer/login');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {verifySuccess ? 'Email Verified!' : 'Verify Your Email'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {verifySuccess 
              ? 'Your email has been successfully verified.' 
              : 'Please check your email for verification instructions.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {verifySuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-600 mb-6">
                Redirecting you to login page...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            </div>
          ) : (
            <>
              {verifyError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{verifyError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-6">
                {email && (
                  <div className="text-center text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                    Verification email sent to: <strong>{email}</strong>
                  </div>
                )}
                
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Please check your email and follow the verification link to complete your registration.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                    <h4 className="font-medium text-green-900 mb-2">Didn't receive the email?</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Check your spam or junk folder</li>
                      <li>• Verify that you entered the correct email address</li>
                      <li>• Wait a few minutes for the email to arrive</li>
                    </ul>
                  </div>
                </div>
                
                <Button
                  onClick={handleResendCode}
                  disabled={isVerifying || timeLeft > 240} // Disable if less than 1 minute has passed
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isVerifying ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      Sending...
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </Button>
                
                <div className="text-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Resend available in: {formatTime(timeLeft)}
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <Link 
                    to="/farmer/login" 
                    className="flex items-center justify-center text-sm text-green-600 hover:text-green-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Back to Login
                  </Link>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerEmailVerificationPage;