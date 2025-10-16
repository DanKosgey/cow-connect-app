import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Milk, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from '@/hooks/useToastNotifications';
import { cleanupOldStorageItems } from '@/utils/storageQuotaManager';

const EmailVerificationCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToastNotifications();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'waiting'>('verifying');
  const [message, setMessage] = useState("Verifying your email...");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Clean up old storage items when component mounts
    cleanupOldStorageItems();
    
    const token = searchParams.get('token');
    const email = searchParams.get('email') || 
      JSON.parse(localStorage.getItem('pending_registration') || '{}').email;
    
    if (token && email) {
      handleEmailVerification(token, email);
    } else if (email) {
      setStatus('waiting');
      setMessage('Please check your email for the verification link.');
    } else {
      setStatus('error');
      setMessage('Invalid verification link. Please try registering again.');
    }
  }, [searchParams]);

  const handleEmailVerification = async (token: string, email: string) => {
    try {
      // Verify the email with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('User not found. Please try again or contact support.');
      }

      setStatus('success');
      setMessage('Email verified successfully!');
      toast.success("Email Verified", "Processing your application...");

      // Handle pending KYC document uploads
      await handlePendingKYCDocuments(data.user.id);

      // Wait a moment before checking status
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check farmer's verification status in the database
      const { data: farmerData, error: farmerError } = await supabase
        .from('pending_farmers')
        .select('status, email_verified, full_name, email')
        .eq('user_id', data.user.id);

      if (farmerError) {
        console.error('Error fetching farmer data:', farmerError);
        // If error fetching farmer data, redirect to documents under review
        toast.success("Under Review", "Your application is still under review");
        navigate('/farmer/documents-under-review');
        return;
      }

      // Check if we have data and handle accordingly
      const farmerRecord = farmerData && farmerData.length > 0 ? farmerData[0] : null;

      if (!farmerRecord) {
        console.error('No farmer data found for user:', data.user.id);
        // If no farmer data found, redirect to documents under review
        toast.success("Under Review", "Your application is still under review");
        navigate('/farmer/documents-under-review');
        return;
      }

      // Update email_verified status and status field if not already set
      if (!farmerRecord.email_verified) {
        const { error: updateError } = await supabase
          .from('pending_farmers')
          .update({ 
            email_verified: true,
            status: 'email_verified'
          })
          .eq('user_id', data.user.id);

        if (updateError) {
          console.error('Error updating email verification status:', updateError);
        }
      }

      // Redirect based on farmer status
      if (farmerRecord.status === 'approved') {
        // Farmer is approved - create profile if not exists and redirect to dashboard
        await createFarmerProfile(data.user.id, farmerRecord);
        toast.success("Welcome!", `Welcome ${farmerRecord.full_name}! Your application has been approved. Redirecting to dashboard...`);
        setTimeout(() => navigate('/farmer/dashboard'), 2000);
      } else if (farmerRecord.status === 'rejected') {
        // Farmer is rejected - redirect to application status page
        toast.success("Application Status", "Please check your application status for more details");
        setTimeout(() => navigate('/application-status'), 2000);
      } else {
        // Farmer is still pending - redirect to documents under review
        toast.success("Under Review", "Your application is still under review. Please check back later.");
        setTimeout(() => navigate('/farmer/documents-under-review'), 2000);
      }

    } catch (error: any) {
      console.error('Email verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to verify email. Please try again or contact support.');
      toast.error("Verification Failed", error.message || "Please try again or contact support");
    }
  };

  const handlePendingKYCDocuments = async (userId: string) => {
    try {
      // Check if there are pending KYC documents to upload
      const pendingFilesData = localStorage.getItem('pending_kyc_files');
      
      if (pendingFilesData) {
        const fileData = JSON.parse(pendingFilesData);
        
        // Only process if the files are for this user
        if (fileData.userId === userId) {
          console.log('Found pending KYC documents for user, redirecting to upload page...');
          
          // Instead of trying to process files from localStorage (which we no longer store due to quota issues),
          // redirect the user to the document upload page where they can upload their documents
          toast.show({ title: "Document Upload", description: "Please upload your KYC documents now." });
          setTimeout(() => navigate('/farmer/kyc-upload'), 2000);
        }
      }
    } catch (error) {
      console.error('Error handling pending KYC documents:', error);
      // Don't throw error as this shouldn't break the verification flow
      toast.error("Processing Error", "There was an issue processing your documents. Please contact support.");
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      // Get email from URL params or localStorage
      const email = searchParams.get('email') || 
        JSON.parse(localStorage.getItem('pending_registration') || '{}').email;
      
      if (!email) {
        throw new Error('Email not found. Please restart the registration process.');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast.success("Email Resent", "Please check your inbox for the verification email");
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast.error("Failed to Resend", error.message || "Please try again later");
    } finally {
      setIsResending(false);
    }
  };

  const createFarmerProfile = async (userId: string, farmerData: any) => {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        console.log('Profile already exists');
        return;
      }

      // Create farmer profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: farmerData.full_name,
          phone: farmerData.phone,
          email: farmerData.email,
          role: 'farmer',
          gender: farmerData.gender
        });

      if (profileError) throw profileError;

      // Create farmer-specific data
      const { error: farmerDetailsError } = await supabase
        .from('farmers')
        .insert({
          user_id: userId,
          farm_location: farmerData.farm_location,
          number_of_cows: farmerData.number_of_cows,
          feeding_type: farmerData.feeding_type,
          age: farmerData.age,
          id_number: farmerData.id_number,
          breeding_method: farmerData.breeding_method,
          cow_breeds: farmerData.cow_breeds
        });

      if (farmerDetailsError) throw farmerDetailsError;

      console.log('Farmer profile created successfully');
    } catch (error) {
      console.error('Error creating farmer profile:', error);
      // Don't throw error - let user proceed to dashboard
      // Admin can manually create profile if needed
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header matching other pages in the app */}
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

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* Status Card */}
          <Card className="shadow-lg border-border">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {status === 'verifying' && (
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                )}
                {status === 'success' && (
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                )}
                {status === 'error' && (
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                )}
              </div>
              <CardTitle>
                {status === 'verifying' && 'Verifying Email'}
                {status === 'success' && 'Email Verified'}
                {status === 'error' && 'Verification Failed'}
              </CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-muted-foreground">
                {status === 'verifying' && (
                  <p>Please wait while we verify your email address...</p>
                )}
                {status === 'success' && (
                  <p>Redirecting you based on your application status...</p>
                )}
                {status === 'error' && (
                  <div className="space-y-4">
                    <p>There was an issue verifying your email address.</p>
                    <div className="pt-2">
                      <Button
                        onClick={handleResendEmail}
                        disabled={isResending}
                        className="w-full"
                      >
                        {isResending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Resending...
                          </>
                        ) : (
                          'Resend Verification Email'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Additional Info for Error State */}
              {status === 'error' && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Need help? Contact support at:
                  </p>
                  <a 
                    href="mailto:support@dairyapp.com" 
                    className="text-primary hover:underline font-medium"
                  >
                    support@dairyapp.com
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationCallback;