import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Milk, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import useToastNotifications from "@/hooks/useToastNotifications";

const EmailVerificationCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToastNotifications();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState("Verifying your email...");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    handleEmailVerification();
  }, []);

  const handleEmailVerification = async () => {
    try {
      // Get the token from URL
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      if (!token_hash || type !== 'signup') {
        throw new Error('Invalid verification link. Please check your email for the correct link.');
      }

      // Verify the email with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
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
        .eq('user_id', data.user.id)
        .single();

      if (farmerError) {
        console.error('Error fetching farmer data:', farmerError);
        // If error fetching farmer data, redirect to documents under review
        toast.success("Under Review", "Your application is still under review");
        navigate('/documents-under-review');
        return;
      }

      // Update email_verified status if not already set
      if (!farmerData.email_verified) {
        const { error: updateError } = await supabase
          .from('pending_farmers')
          .update({ email_verified: true })
          .eq('user_id', data.user.id);

        if (updateError) {
          console.error('Error updating email verification status:', updateError);
        }
      }

      // Redirect based on farmer status
      if (farmerData.status === 'approved') {
        // Farmer is approved - create profile if not exists and redirect to dashboard
        await createFarmerProfile(data.user.id, farmerData);
        toast.success("Welcome!", `Welcome ${farmerData.full_name}! Your application has been approved. Redirecting to dashboard...`);
        setTimeout(() => navigate('/farmer/dashboard'), 2000);
      } else if (farmerData.status === 'rejected') {
        // Farmer is rejected - redirect to application status page
        toast.success("Application Status", "Please check your application status for more details");
        setTimeout(() => navigate('/application-status'), 2000);
      } else {
        // Farmer is still pending - redirect to documents under review
        toast.success("Under Review", "Your application is still under review. Please check back later.");
        setTimeout(() => navigate('/documents-under-review'), 2000);
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
          console.log('Found pending KYC documents for user, attempting to upload...');
          
          // Get the data URLs from localStorage
          const idFrontDataUrl = localStorage.getItem(`kyc_file_${userId}_id_front`);
          const idBackDataUrl = localStorage.getItem(`kyc_file_${userId}_id_back`);
          const selfieDataUrl = localStorage.getItem(`kyc_file_${userId}_selfie`);
          
          if (idFrontDataUrl && idBackDataUrl && selfieDataUrl) {
            try {
              // Convert data URLs back to files and upload them
              const idFrontFile = dataURLToFile(idFrontDataUrl, fileData.idFront.name || 'id_front.jpg');
              const idBackFile = dataURLToFile(idBackDataUrl, fileData.idBack.name || 'id_back.jpg');
              const selfieFile = dataURLToFile(selfieDataUrl, fileData.selfie.name || 'selfie.jpg');
              
              // Upload the files
              const idFrontUrl = await uploadKYCDocument(idFrontFile, `${userId}/id_front`);
              const idBackUrl = await uploadKYCDocument(idBackFile, `${userId}/id_back`);
              const selfieUrl = await uploadKYCDocument(selfieFile, `${userId}/selfie`);
              
              // Update the pending_farmer record with the document URLs
              const { error: updateError } = await supabase
                .from('pending_farmers')
                .update({
                  id_front_url: idFrontUrl,
                  id_back_url: idBackUrl,
                  selfie_url: selfieUrl
                })
                .eq('user_id', userId);
                
              if (updateError) {
                console.error('Error updating farmer record with document URLs:', updateError);
                toast.error("Document Update Error", "There was an issue updating your document records. Please contact support.");
              } else {
                console.log('Successfully uploaded KYC documents and updated farmer record');
                toast.success("Documents Uploaded", "Your KYC documents have been successfully uploaded and are under review.");
              }
            } catch (uploadError) {
              console.error('Error uploading KYC documents:', uploadError);
              toast.error("Upload Error", "There was an issue uploading your documents. Please contact support.");
            }
          }
          
          // Clean up localStorage
          localStorage.removeItem('pending_kyc_files');
          localStorage.removeItem(`kyc_file_${userId}_id_front`);
          localStorage.removeItem(`kyc_file_${userId}_id_back`);
          localStorage.removeItem(`kyc_file_${userId}_selfie`);
        }
      }
    } catch (error) {
      console.error('Error handling pending KYC documents:', error);
      // Don't throw error as this shouldn't break the verification flow
      toast.error("Processing Error", "There was an issue processing your documents. Please contact support.");
    }
  };

  const dataURLToFile = (dataUrl: string, filename: string): File => {
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      return new File([u8arr], filename, { type: mime });
    } catch (error) {
      console.error('Error converting data URL to file:', error);
      // Fallback to a default file
      return new File([], filename, { type: 'image/jpeg' });
    }
  };

  const uploadKYCDocument = async (file: File, path: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload document: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadKYCDocument:', error);
      throw error;
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