import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, XCircle, AlertCircle, Mail, Home, Milk, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import useToastNotifications from "@/hooks/useToastNotifications";
import { supabase } from "@/integrations/supabase/client";

type ApplicationStatus = 'pending_verification' | 'email_verified' | 'approved' | 'rejected';

interface FarmerData {
  status: 'pending_verification' | 'email_verified' | 'approved' | 'rejected';
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  rejection_count?: number;
  email_verified: boolean;
  kyc_complete: boolean;
  kyc_submitted_at?: string;
  kyc_review_notes?: string;
  required_documents: Array<{
    type: string;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';
    submitted_at?: string;
    rejection_reason?: string;
  }>;
  verification_steps: Array<{
    step: string;
    completed: boolean;
    completed_at?: string;
  }>;
  submitted_at?: string;
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

      console.log("Fetching status for user:", user.id);

      // 1. First check pending_farmers
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_farmers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pendingError) {
        console.error('Error fetching pending farmer data:', pendingError);
      }

      // 2. Then check farmers (in case already approved)
      const { data: approvedData, error: approvedError } = await supabase
        .from('farmers')
        .select('*') // Select minimal needed fields
        .eq('user_id', user.id)
        .maybeSingle();

      if (approvedError) {
        console.error('Error fetching approved farmer data:', approvedError);
      }

      // Determine efficient status
      if (approvedData) {
        setFarmerData({
          status: 'approved',
          full_name: approvedData.first_name + ' ' + approvedData.last_name, // Adjust based on farmers table schema
          email: user.email || '',
          created_at: approvedData.created_at,
          updated_at: approvedData.updated_at,
          email_verified: true,
          kyc_complete: true,
          required_documents: [], // Not needed for approved
          verification_steps: []
        } as FarmerData);

        toast.success("Approved!", "Your application has been approved. Redirecting to dashboard...");
        setTimeout(() => navigate('/farmer/dashboard'), 2000);
        return;
      }

      if (pendingData) {
        setFarmerData(pendingData as FarmerData);
        return;
      }

      // If we reach here, no data was found in either table
      console.warn('No farmer data found in pending_farmers OR farmers for user:', user.id);

      // Fallback: Check if registration was *just* completed (local storage flag?)
      // We will show a "Processing" state instead of "Not Found" if it's confusing
      // For now, we set null, but we'll handle the UI to be less aggressive

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
    toast.show({ title: "Refreshed", description: "Application status updated" });
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
            <CardTitle>Application Not Found</CardTitle>
            <CardDescription>
              We couldn't retrieve your application status at this moment.
              If you just registered, your data might still be processing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchApplicationStatus} className="w-full" variant="default">
              Retry Sync
            </Button>
            <Button onClick={() => navigate('/farmer/signup')} className="w-full" variant="outline">
              Start New Application
            </Button>
            <Button onClick={() => navigate('/farmer/login')} className="w-full" variant="ghost">
              Back to Login
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
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${(farmerData.status === 'pending_verification' || farmerData.status === 'email_verified')
              ? 'bg-blue-100 dark:bg-blue-900/20'
              : 'bg-red-100 dark:bg-red-900/20'
              }`}>
              {(farmerData.status === 'pending_verification' || farmerData.status === 'email_verified') ? (
                <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              ) : (
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Application{" "}
              <span className={(farmerData.status === 'pending_verification' || farmerData.status === 'email_verified') ? 'text-blue-600' : 'text-red-600'}>
                {(farmerData.status === 'pending_verification' || farmerData.status === 'email_verified') ? 'Under Review' : 'Requires Attention'}
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
                    {farmerData.submitted_at
                      ? `Submitted on ${formatDate(farmerData.submitted_at)}`
                      : `Created on ${formatDate(farmerData.created_at)}`}
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
              {/* Under Review Status */}
              {(farmerData.status === 'pending_verification' || farmerData.status === 'email_verified') && (
                <>
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Application Status</AlertTitle>
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
            {(farmerData.status === 'pending_verification' || farmerData.status === 'email_verified') && (
              <Button onClick={() => navigate('/farmer/documents-under-review')}>
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