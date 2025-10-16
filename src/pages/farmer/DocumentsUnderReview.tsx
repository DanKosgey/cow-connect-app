import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, CheckCircle, Clock, AlertCircle, RefreshCw, Home, Milk } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useToastNotifications from "@/hooks/useToastNotifications";
import { supabase } from "@/integrations/supabase/client";

const DocumentsUnderReview = () => {
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      
      try {
        // First, try to get data from localStorage
        const pendingData = localStorage.getItem('pending_registration');
        
        if (pendingData) {
          try {
            const data = JSON.parse(pendingData);
            setEmail(data.email || "");
            setFullName(data.full_name || "");
            setSubmittedAt(data.submitted_at || "");
          } catch (parseError) {
            console.error("Error parsing pending registration data:", parseError);
          }
        }

        // If we don't have data from localStorage, try to get it from the database
        if (!email || !fullName) {
          await fetchUserDataFromDatabase();
        }

        // Check email verification status
        await checkEmailVerificationStatus();
      } catch (error) {
        console.error("Error initializing page:", error);
        toast.error("Error", "Failed to load page data");
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [navigate]);

  const fetchUserDataFromDatabase = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("User not authenticated:", userError);
        navigate('/farmer/login');
        return;
      }

      // Fetch farmer data from pending_farmers table
      const { data: farmerData, error: farmerError } = await supabase
        .from('pending_farmers')
        .select('email, full_name, created_at')
        .eq('user_id', user.id);

      if (farmerError) {
        console.error("Error fetching farmer data:", farmerError);
        // If we can't get data from database and localStorage, redirect to signup
        if (!email || !fullName) {
          navigate('/farmer/signup');
        }
        return;
      }

      // Check if we have data and handle accordingly
      const farmerRecord = farmerData && farmerData.length > 0 ? farmerData[0] : null;

      if (!farmerRecord) {
        console.error("No farmer data found for user:", user.id);
        // If we can't get data from database and localStorage, redirect to signup
        if (!email || !fullName) {
          navigate('/farmer/signup');
        }
        return;
      }

      setEmail(farmerRecord.email || "");
      setFullName(farmerRecord.full_name || "");
      setSubmittedAt(farmerRecord.created_at || "");
    } catch (error) {
      console.error("Error fetching user data from database:", error);
      // If we can't get data from database and localStorage, redirect to signup
      if (!email || !fullName) {
        navigate('/farmer/signup');
      }
    }
  };

  const checkEmailVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if email is verified
        if (user.email_confirmed_at) {
          setEmailVerified(true);
        }
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast.success("Email Resent", "Please check your inbox for the verification email");
    } catch (error: any) {
      console.error("Error resending email:", error);
      toast.error("Failed to Resend", error.message || "Please try again later");
    } finally {
      setIsResending(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading page...</p>
        </div>
      </div>
    );
  }

  // If we still don't have essential data, show an error
  if (!email || !fullName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Unable to Load Page</CardTitle>
            <CardDescription>Required data is missing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We couldn't load your application details. This might be because:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Your session has expired</li>
              <li>• You haven't completed registration</li>
              <li>• There was a technical issue</li>
            </ul>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => navigate('/farmer/signup')}>
                Start New Application
              </Button>
              <Button variant="outline" onClick={() => navigate('/farmer/login')}>
                Log In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header */}
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
        <div className="max-w-3xl mx-auto">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-primary to-primary/80 mb-6">
              <Clock className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Documents <span className="text-primary">Under Review</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Thank you for registering, {fullName}!
            </p>
          </div>

          {/* Main Card */}
          <Card className="shadow-lg border-border mb-6">
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>
                Your registration was submitted on {formatDate(submittedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Information */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Your documents are currently being reviewed
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Our team is carefully reviewing your application and documents. 
                      This process typically takes 1-3 business days.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Verification Status */}
              <div className={`border rounded-lg p-4 ${
                emailVerified 
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
              }`}>
                <div className="flex items-start gap-3">
                  {emailVerified ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                          Email Verified
                        </h3>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Your email address has been successfully verified.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                          Email Verification Required
                        </h3>
                        <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                          We've sent a verification email to <strong>{email}</strong>. 
                          Please check your inbox and click the confirmation link.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResendEmail}
                          disabled={isResending}
                          className="border-orange-300 dark:border-orange-700"
                        >
                          {isResending ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Resending...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Verification Email
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Important Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Important:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Please <strong>check your email</strong> and confirm your email address by clicking the verification link
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      You will be <strong>contacted via email</strong> when the review is complete
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Review typically takes <strong>1-3 business days</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Once approved, you'll be able to access your farmer dashboard
                    </span>
                  </li>
                </ul>
              </div>

              {/* What's Next */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">What's Next?</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. <strong>Verify your email</strong> - Check your inbox for the verification link</p>
                  <p>2. <strong>Wait for review</strong> - Our team will review your documents</p>
                  <p>3. <strong>Get notified</strong> - You'll receive an email when review is complete</p>
                  <p>4. <strong>Access dashboard</strong> - Once approved, log in to access your account</p>
                </div>
              </div>

              {/* Contact Support */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you have any questions or need assistance, please contact our support team:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" asChild>
                    <a href="mailto:support@dairyapp.com">
                      <Mail className="mr-2 h-4 w-4" />
                      support@dairyapp.com
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsUnderReview;