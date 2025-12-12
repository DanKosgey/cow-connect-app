import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Home, Mail, Users, Milk } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';

const EmailVerificationWaiting = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const toast = useToastNotifications();
  const [pendingFarmer, setPendingFarmer] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    const fetchPendingFarmer = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('pending_farmers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        setPendingFarmer(data);
      } catch (error) {
        console.error('Error fetching pending farmer:', error);
        // Handle the PGRST116 error specifically
        if (error.code === 'PGRST116') {
          console.warn('No pending farmer found for user ID:', user.id);
          // It's okay if no pending farmer is found - this might mean they've already completed registration
          setPendingFarmer(null);
        } else {
          toast.error('Error', 'Failed to load farmer data');
        }
      } finally {
        setCheckingStatus(false);
      }
    };

    if (!loading && user) {
      fetchPendingFarmer();
    }
  }, [user, loading, toast]);

  // Handle navigation for email verified users
  useEffect(() => {
    if (pendingFarmer && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate('/farmer/kyc-upload');
    }
  }, [pendingFarmer, navigate]);

  // Handle navigation for non-farmer users
  useEffect(() => {
    if (!loading && user && userRole !== 'farmer' && !hasNavigated.current) {
      hasNavigated.current = true;
      switch (userRole) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'staff':
          navigate('/collector/dashboard');
          break;
        default:
          navigate('/farmer/dashboard');
      }
    }
  }, [user, userRole, loading, navigate]);

  // If user is already verified, redirect immediately
  useEffect(() => {
    if (!loading && user && !hasNavigated.current) {
      // Go directly to KYC upload
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigate('/farmer/kyc-upload');
      }
    }
  }, [user, loading, navigate]);

  const handleResendEmail = async () => {
    if (!user || !pendingFarmer) return;
    
    try {
      setIsResending(true);
      
      // In a real implementation, this would trigger a resend of the verification email
      // For now, we'll just show a success message
      toast.success('Email Resent', 'Verification email has been resent to your inbox');
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error('Error', 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  // Show loading state while auth is loading
  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking verification status...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Authentication required</p>
          <Button onClick={() => navigate('/farmer/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // If not a farmer, we'll handle navigation in the useEffect above
  // Just show a loading state while redirecting
  if (userRole !== 'farmer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If email is verified, we'll handle navigation in the useEffect above
  // Just show a loading state while redirecting
  if (pendingFarmer && pendingFarmer.email_verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to KYC upload...</p>
        </div>
      </div>
    );
  }

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
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-border">
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Email Verification Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="bg-secondary/50 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <h3 className="font-medium">Thank you for registering!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can now upload your KYC documents for review.
                      Our team will review your application and notify you of the outcome.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <h3 className="font-medium">
                      What happens next?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload your KYC documents now. Our team will review your application and notify you of the outcome.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 font-medium">
                      Reviews typically take 1-3 business days
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <p className="text-muted-foreground text-sm">
                  Didn't receive the email? Check your spam folder or contact support.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="flex-1"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go to Home
                  </Button>
                  <Button
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="flex-1"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationWaiting;