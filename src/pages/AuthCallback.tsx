import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Home, Users, Milk } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const toast = useToastNotifications();
  const [processing, setProcessing] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    console.log('AuthCallback: Component mounted');
    
    // Set a longer timeout to prevent infinite waiting (increased from 10s to 20s)
    const timeoutId = setTimeout(() => {
      console.log('AuthCallback: Timeout reached');
      setTimeoutReached(true);
      if (!user && !processing && !hasNavigated.current) {
        hasNavigated.current = true;
        toast.error('Authentication Timeout', 'Authentication is taking longer than expected. Please try again.');
        navigate('/farmer/login');
      }
    }, 20000); // 20 second timeout

    return () => clearTimeout(timeoutId);
  }, [user, processing, navigate, toast]);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('AuthCallback: Starting authentication process');
        
        // Check for authentication errors in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorCode = urlParams.get('error_code');
        const errorDescription = urlParams.get('error_description');
        const confirmationToken = urlParams.get('confirmation_token');
        const code = urlParams.get('code');
        const token = urlParams.get('token'); // For email verification
        
        console.log('AuthCallback: URL parameters', { error, errorCode, errorDescription, confirmationToken, code, token });
        
        // Handle email verification
        if (token) {
          console.log('AuthCallback: Processing email verification');
          setProcessing(true);
          
          try {
            // Call the verify_email function
            const { data, error: verifyError } = await supabase.rpc('verify_email', {
              p_token: token
            });
            
            if (verifyError) throw verifyError;
            
            if (data?.success && !hasNavigated.current) {
              hasNavigated.current = true;
              toast.success('Email Verified', data.message);
              
              // Redirect based on the response
              if (data.redirect_url) {
                navigate(data.redirect_url);
              } else {
                navigate('/farmer/application-status');
              }
            } else if (!hasNavigated.current) {
              hasNavigated.current = true;
              toast.error('Verification Failed', data?.message || 'Email verification failed');
              navigate('/farmer/login');
            }
          } catch (error) {
            console.error('Email verification error:', error);
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              toast.error('Verification Error', 'Failed to verify email');
              navigate('/farmer/login');
            }
          } finally {
            setProcessing(false);
          }
          return;
        }
        
        // Handle authentication errors
        if (error || errorCode) {
          console.error('Authentication error:', { error, errorCode, errorDescription });
          
          // Handle specific error cases
          if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              toast.error('Link Expired', 'Your email confirmation link has expired. Please sign up again.');
              // Clean up any pending registration data
              localStorage.removeItem('pending_profile');
              navigate('/register');
            }
            return;
          } else if (error === 'access_denied') {
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              toast.error('Access Denied', errorDescription || 'Access was denied. Please try again.');
              navigate('/farmer/login');
            }
            return;
          } else {
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              toast.error('Authentication Error', errorDescription || 'There was an error processing your authentication.');
              navigate('/farmer/login');
            }
            return;
          }
        }
        
        // Check if there's a pending registration to complete
        const pendingRegistrationStr = localStorage.getItem('pending_profile');
        console.log('AuthCallback: Pending registration data', pendingRegistrationStr);
        
        if (pendingRegistrationStr) {
          const pendingData = JSON.parse(pendingRegistrationStr);
          console.log('AuthCallback: Parsed pending data', pendingData);
          
          // If user is authenticated and has pending registration, complete the registration
          if (user) {
            console.log('AuthCallback: User is authenticated, completing registration');
            setProcessing(true);
            
            // For farmers, complete the registration process
            if (userRole === 'farmer') {
              try {
                console.log('AuthCallback: Creating farmer profile');
                
                // Create user profile
                const { error: profileError } = await supabase
                  .from('profiles')
                  .upsert([{
                    id: user.id,
                    full_name: pendingData.fullName,
                    email: pendingData.email,
                    phone: pendingData.phone,
                    gender: pendingData.gender
                  }], {
                    onConflict: 'id'
                  });

                if (profileError) {
                  console.error('AuthCallback: Profile creation failed', profileError);
                  throw new Error(`Profile creation failed: ${profileError.message}`);
                }
                console.log('AuthCallback: Profile created successfully');

                // Create user role
                const { error: roleError } = await supabase
                  .from('user_roles')
                  .upsert([{
                    user_id: user.id,
                    role: 'farmer',
                    active: true
                  }], {
                    onConflict: 'user_id'
                  });

                if (roleError) {
                  console.error('AuthCallback: Role creation failed', roleError);
                  throw new Error(`Role creation failed: ${roleError.message}`);
                }
                console.log('AuthCallback: Role created successfully');

                // Create pending farmer record with pending status
                const { data: pendingFarmerData, error: pendingFarmerError } = await supabase
                  .from('pending_farmers')
                  .insert([{
                    user_id: user.id,
                    full_name: pendingData.fullName,
                    email: pendingData.email,
                    gender: pendingData.gender,
                    age: pendingData.farmerData?.age ? parseInt(pendingData.farmerData.age) : null,
                    id_number: pendingData.farmerData?.idNumber || null,
                    phone_number: pendingData.phone,
                    number_of_cows: pendingData.farmerData?.numberOfCows ? parseInt(pendingData.farmerData.numberOfCows) : null,
                    cow_breeds: pendingData.farmerData?.cowBreeds || [],
                    breeding_method: pendingData.farmerData?.breedingMethod || null,
                    feeding_type: pendingData.farmerData?.feedingType || null,
                    farm_location: pendingData.farmerData?.farmLocation || pendingData.farmLocation,
                    national_id: pendingData.farmerData?.nationalId || pendingData.nationalId,
                    address: pendingData.farmerData?.address || pendingData.address,
                    status: 'pending_verification',
                    email_verified: false,
                    registration_number: `F-${Date.now()}`
                  }])
                  .select()
                  .single();

                if (pendingFarmerError) {
                  console.error('AuthCallback: Pending farmer record creation failed', pendingFarmerError);
                  throw new Error(`Pending farmer record creation failed: ${pendingFarmerError.message}`);
                }
                console.log('AuthCallback: Pending farmer record created successfully', pendingFarmerData);

                // Generate email verification token
                const { data: tokenData, error: tokenError } = await supabase.rpc('generate_email_verification_token', {
                  p_pending_farmer_id: pendingFarmerData.id
                });

                if (tokenError) {
                  console.error('AuthCallback: Token generation failed', tokenError);
                  // Don't throw error here as this is not critical for registration
                } else {
                  console.log('AuthCallback: Email verification token generated', tokenData);
                }

                // Clean up pending registration data
                localStorage.removeItem('pending_profile');
                if (!hasNavigated.current) {
                  hasNavigated.current = true;
                  toast.success('Registration Complete', 'Your farmer account has been created successfully. You can now upload your KYC documents.');
                  // Instead of going to email verification waiting page, go directly to KYC upload
                  navigate('/farmer/kyc-upload');
                }
              } catch (error) {
                console.error('Error completing registration:', error);
                if (!hasNavigated.current) {
                  hasNavigated.current = true;
                  toast.error('Registration Error', 'Failed to complete registration. Please contact support.');
                  navigate('/register');
                }
              } finally {
                setProcessing(false);
              }
            } else {
              // For non-farmers, go to their dashboard
              setProcessing(false);
              if (!hasNavigated.current) {
                hasNavigated.current = true;
                switch (userRole) {
                  case 'admin':
                    navigate('/admin/dashboard');
                    break;
                  case 'staff':
                    navigate('/staff/dashboard');
                    break;
                  default:
                    navigate('/farmer/dashboard');
                }
              }
            }
          } else if (confirmationToken || code) {
            console.log('AuthCallback: Waiting for confirmation token processing');
            // If this is a Supabase confirmation link, wait for auth state to update
            // The AuthProvider will handle the session update
            // After successful confirmation, the user will be authenticated and the above logic will run
            setTimeout(() => {
              // If still no user after a short delay, go to login
              if (!user && !processing && !hasNavigated.current) {
                hasNavigated.current = true;
                navigate('/farmer/login');
              }
            }, 5000); // Increased timeout to 5 seconds
          } else {
            console.log('AuthCallback: No user authenticated, redirecting to login');
            // If not authenticated yet, go to login page
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              navigate('/farmer/login');
            }
          }
        } else {
          console.log('AuthCallback: No pending registration data');
          // No pending registration, go to appropriate dashboard
          if (user) {
            // Check user role and redirect accordingly
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              switch (userRole) {
                case 'admin':
                  navigate('/admin/dashboard');
                  break;
                case 'staff':
                  navigate('/staff/dashboard');
                  break;
                case 'farmer':
                  // For farmers, check if they have completed registration
                  try {
                    // First check if they're in pending_farmers
                    const { data: pendingFarmer, error: pendingError } = await supabase
                      .from('pending_farmers')
                      .select('status')
                      .eq('user_id', user.id)
                      .single();
                    
                    if (!pendingError && pendingFarmer) {
                      // If they're in pending_farmers, redirect to appropriate page based on status
                      if (pendingFarmer.status === 'pending_verification') {
                        // Instead of going to email verification waiting page, go directly to KYC upload
                        navigate('/farmer/kyc-upload');
                      } else if (pendingFarmer.status === 'email_verified') {
                        navigate('/farmer/kyc-upload');
                      } else {
                        navigate('/farmer/kyc-upload');
                      }
                      return;
                    }
                    
                    // If not in pending_farmers, check if they're in farmers table
                    const { data: farmer, error } = await supabase
                      .from('farmers')
                      .select('registration_completed')
                      .eq('user_id', user.id)
                      .single();
                    
                    if (error) throw error;
                    
                    if (farmer && farmer.registration_completed) {
                      navigate('/farmer/dashboard');
                    } else {
                      // Redirect to KYC upload page for farmers who haven't completed registration
                      navigate('/farmer/kyc-upload');
                    }
                  } catch (error) {
                    // If there's an error checking farmer status, go to KYC upload
                    navigate('/farmer/kyc-upload');
                  }
                  break;
                default:
                  navigate('/farmer/dashboard');
              }
            }
          } else {
            // Go to login page
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              navigate('/farmer/login');
            }
          }
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          toast.error('Authentication Error', 'There was an error processing your authentication');
          navigate('/farmer/login');
        }
      }
    };

    // Only run the callback if we're not still loading the auth state
    if (!loading && !processing && !timeoutReached && !hasNavigated.current) {
      console.log('AuthCallback: Auth state loaded, running callback');
      handleCallback();
    } else {
      console.log('AuthCallback: Waiting for auth state to load', { loading, processing, timeoutReached });
    }
  }, [user, userRole, loading, navigate, toast, processing, timeoutReached]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header matching landing page style */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Milk className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">DAIRY FARMERS OF TRANS-NZOIA</span>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-border">
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Processing Authentication</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                {timeoutReached 
                  ? "Authentication is taking longer than expected. Redirecting to login..." 
                  : "Please wait while we complete your authentication..."}
              </p>
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
              {timeoutReached && (
                <Button 
                  onClick={() => navigate('/farmer/login')} 
                  className="mt-4"
                  variant="outline"
                >
                  Go to Login
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;