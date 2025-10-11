import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, XCircle, AlertCircle, Mail, Home, Milk, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import useToastNotifications from "@/hooks/useToastNotifications";
import { supabase } from "@/integrations/supabase/client";

type ApplicationStatus = 'pending' | 'rejected' | null;

interface FarmerData {
  status: ApplicationStatus;
  full_name: string;
  email: string;
  created_at: string;
  rejection_reason?: string;
  email_verified: boolean;
}

const ApplicationStatus = () => {
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [farmerData, setFarmerData] = useState<FarmerData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User not authenticated:', userError);
        navigate('/farmer/login');
        return;
      }

      // Fetch farmer data from pending_farmers table
      const { data, error } = await supabase
        .from('pending_farmers')
        .select('status, full_name, email, created_at, rejection_reason, email_verified')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching farmer data:', error);
        toast.error("Error", "Failed to load application status");
        return;
      }

      setFarmerData(data);

      // If approved, redirect to dashboard
      if (data.status === 'approved') {
        toast.success("Approved!", "Your application has been approved. Redirecting to dashboard...");
        setTimeout(() => navigate('/farmer/dashboard'), 2000);
      }

    } catch (error: any) {
      console.error('Error:', error);
      toast.error("Error", error.message || "Failed to load application status");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchApplicationStatus();
    setIsRefreshing(false);
    toast.info("Refreshed", "Application status updated");
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
          <p className="text-muted-foreground">Loading application status...</p>
        </div>
      </div>
    );
  }

  if (!farmerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Application Found</CardTitle>
            <CardDescription>We couldn't find your application</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/farmer/signup')} className="w-full">
              Start New Application
            </Button>
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
          {/* Status Icon and Title */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
              farmerData.status === 'pending' 
                ? 'bg-blue-100 dark:bg-blue-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              {farmerData.status === 'pending' ? (
                <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              ) : (
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Application{" "}
              <span className={farmerData.status === 'pending' ? 'text-blue-600' : 'text-red-600'}>
                {farmerData.status === 'pending' ? 'Under Review' : 'Requires Attention'}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Hello, {farmerData.full_name}
            </p>
          </div>

          {/* Main Status Card */}
          <Card className="shadow-lg border-border mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Application Status</CardTitle>
                  <CardDescription>
                    Submitted on {formatDate(farmerData.created_at)}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pending Status */}
              {farmerData.status === 'pending' && (
                <>
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Review in Progress</AlertTitle>
                    <AlertDescription>
                      Your application is currently being reviewed by our team. 
                      This process typically takes 1-3 business days.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <h3 className="font-semibold">What's Happening:</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <span>Our team is reviewing your submitted documents</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <span>We're verifying your farm details and information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <span>You'll receive an email once the review is complete</span>
                      </li>
                    </ul>
                  </div>

                  {!farmerData.email_verified && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Email Not Verified</AlertTitle>
                      <AlertDescription>
                        Please check your email ({farmerData.email}) and click the verification link.
                        This is required to complete your registration.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {/* Rejected Status */}
              {farmerData.status === 'rejected' && (
                <>
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Application Not Approved</AlertTitle>
                    <AlertDescription>
                      Unfortunately, your application could not be approved at this time.
                    </AlertDescription>
                  </Alert>

                  {farmerData.rejection_reason && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        Reason for Rejection:
                      </h3>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {farmerData.rejection_reason}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-semibold">What You Can Do:</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <span>Review the feedback above carefully</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <span>Prepare updated documents addressing the concerns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <span>Submit a new application with corrected information</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={() => navigate('/farmer/kyc-resubmit')}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Resubmit Application
                    </Button>
                  </div>
                </>
              )}

              {/* Contact Support */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you have any questions or need assistance, please contact our support team:
                </p>
                <Button variant="outline" asChild className="w-full">
                  <a href="mailto:support@dairyapp.com">
                    <Mail className="mr-2 h-4 w-4" />
                    support@dairyapp.com
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
            >
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
            {farmerData.status === 'pending' && (
              <Button onClick={() => navigate('/documents-under-review')}>
                View Submission Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatus;