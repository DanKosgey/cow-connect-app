import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { invitationService } from '@/services/invitation-service';
import { OtpService } from '@/services/otp-service';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { UserRole } from '@/types/auth.types';

interface InvitationData {
  email: string;
  role: 'admin' | 'staff' | 'farmer';
  invitedBy: string;
  message?: string;
}

const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { show, error: showError } = useToastNotifications();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid invitation link. No token provided.');
      setLoading(false);
      return;
    }

    // Validate the invitation token and fetch invitation details
    const validateToken = async () => {
      try {
        // Fetch the actual invitation details
        const invitation = await invitationService.getInvitationByToken(token);
        if (!invitation) {
          setError('Invalid or expired invitation link.');
          setLoading(false);
          return;
        }

        // Check if invitation is valid
        const isValid = await invitationService.validateInvitationToken(token);
        if (!isValid) {
          setError('Invalid or expired invitation link.');
          setLoading(false);
          return;
        }

        // Set the invitation data
        setInvitationData({
          email: invitation.email,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          message: invitation.message
        });

        // Automatically send OTP when the page loads
        if (invitation.email) {
          setSendingOtp(true);
          try {
            // Send OTP to the email
            await OtpService.sendOtp(invitation.email, {
              full_name: '',
              phone: '',
              role: invitation.role
            });
            
            setOtpSent(true);
            show({
              title: 'OTP Sent',
              description: 'A verification code has been sent to your email. Please check your inbox.'
            });
          } catch (err: any) {
            console.error('Error sending OTP:', err);
            setError('Failed to send verification code. Please try again.');
          } finally {
            setSendingOtp(false);
          }
        }
      } catch (err) {
        console.error('Error validating invitation:', err);
        setError('Failed to validate invitation link.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleSendOtp = async () => {
    if (!invitationData?.email) return;
    
    setSendingOtp(true);
    try {
      // Send OTP to the email
      await OtpService.sendOtp(invitationData.email, {
        full_name: formData.fullName,
        phone: formData.phone,
        role: invitationData.role
      });
      
      setOtpSent(true);
      show({
        title: 'OTP Sent',
        description: 'A verification code has been sent to your email. Please check your inbox.'
      });
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      showError('OTP Error', err?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!invitationData?.email || !formData.otp) return;
    
    setVerifyingOtp(true);
    try {
      // Verify OTP
      const result = await OtpService.verifyOtp(invitationData.email, formData.otp);
      
      if (result.success) {
        setOtpVerified(true);
        show({
          title: 'Email Verified',
          description: 'Your email has been successfully verified.'
        });
      }
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      showError('OTP Error', err?.message || 'Failed to verify code. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      showError('Validation Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      showError('Validation Error', 'Password must be at least 6 characters long');
      return;
    }

    if (!formData.fullName.trim()) {
      showError('Validation Error', 'Full name is required');
      return;
    }

    // If OTP is required but not verified, show error
    if (otpSent && !otpVerified) {
      showError('Validation Error', 'Please verify your email with the OTP code before proceeding');
      return;
    }

    setAccepting(true);
    try {
      const token = searchParams.get('token');
      if (!token) {
        throw new Error('Invalid invitation token');
      }

      // Validate the invitation token first
      const isValid = await invitationService.validateInvitationToken(token);
      if (!isValid) {
        throw new Error('Invalid or expired invitation token');
      }

      let userId: string;

      if (otpVerified) {
        // User already verified via OTP, get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('No active session found. Please verify your email again.');
        }
        userId = session.user.id;
      } else {
        // Create the user account with Supabase Auth (traditional signup)
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: invitationData?.email || '',
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone
            }
          }
        });

        if (signUpError) {
          // Handle rate limiting error specifically
          if (signUpError.message.includes('For security purposes, you can only request this after')) {
            // Extract the wait time from the error message
            const match = signUpError.message.match(/after (\d+) seconds/);
            const waitTime = match ? parseInt(match[1]) : 30;
            
            throw new Error(`You are trying to accept the invitation too frequently. Please wait ${waitTime} seconds before trying again.`);
          }
          throw new Error(`Failed to create account: ${signUpError.message}`);
        }

        if (!data.user) {
          throw new Error('Failed to create user account');
        }

        userId = data.user.id;

        // Update the user's profile with full name and phone
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            phone: formData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          // This is not critical, we can continue
        }
      }

      // Accept the invitation and assign the role
      const acceptSuccess = await invitationService.acceptInvitation(token, userId);
      if (!acceptSuccess) {
        throw new Error('Failed to accept invitation. Please check the console for more details or contact support.');
      }

      show({
        title: 'Welcome to the Team!',
        description: 'Your account has been created successfully. You can now access the system.'
      });

      // Automatically log in the user and redirect to the appropriate dashboard
      if (invitationData?.role) {
        // Convert string role to UserRole enum
        let userRole: UserRole;
        switch (invitationData.role) {
          case 'admin':
            userRole = UserRole.ADMIN;
            break;
          case 'staff':
            userRole = UserRole.STAFF;
            break;
          case 'farmer':
            userRole = UserRole.FARMER;
            break;
          default:
            throw new Error(`Invalid role: ${invitationData.role}`);
        }

        // Attempt to log in the user with the credentials they just created
        const { error: loginError } = await login({
          email: invitationData.email,
          password: formData.password,
          role: userRole
        });

        if (loginError) {
          console.error('Auto-login failed:', loginError);
          // If auto-login fails, redirect to login page
          navigate('/login');
        } else {
          // Redirect to the appropriate dashboard based on role
          const dashboardRoutes = {
            'admin': '/admin/dashboard',
            'staff': '/collector/dashboard',
            'farmer': '/farmer/dashboard'
          };
          
          const targetRoute = dashboardRoutes[invitationData.role] || '/login';
          navigate(targetRoute);
        }
      } else {
        // Fallback to login page if role is not available
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      
      // Handle rate limiting error specifically
      if (err?.message.includes('You are trying to accept the invitation too frequently')) {
        showError('Acceptance Failed', err.message);
      } else {
        showError('Acceptance Failed', err?.message || 'Failed to accept invitation. Please try again or contact support if the problem persists.');
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Validating invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Invalid Invitation</CardTitle>
            <CardDescription>
              {error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-900">You've Been Invited!</CardTitle>
          <CardDescription>
            You've been invited to join as a <strong>{invitationData.role}</strong> member.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {invitationData.message && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {invitationData.message}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={invitationData.email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
            </div>

            {/* OTP Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Email Verification</h3>
              
              {sendingOtp ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  <span>Sending verification code to your email...</span>
                </div>
              ) : !otpSent ? (
                <div className="py-4">
                  <p className="text-sm text-gray-600 text-center">
                    A verification code will be sent to your email automatically. Please check your inbox.
                  </p>
                </div>
              ) : !otpVerified ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    A verification code has been sent to your email. Please enter it below to verify your account.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={formData.otp}
                      onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value }))}
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                    />
                  </div>
                  
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="w-full"
                    disabled={verifyingOtp || !formData.otp || formData.otp.length !== 6}
                  >
                    {verifyingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>
                </div>
              ) : (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Email successfully verified! You can now create your account.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800"
              disabled={accepting || (otpSent && !otpVerified)}
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Invitation & Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <button 
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitePage;