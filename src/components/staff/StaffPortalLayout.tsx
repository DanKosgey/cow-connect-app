import { useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { staffPresence } from '@/services/staff-presence-service';
import { securityService } from '@/services/security-service';
import { notificationService } from '@/services/notification-service';
import { useStaffInfo } from '@/hooks/useStaffData';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole } = useAuth();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !staffInfo) return;

    // Initialize services
    const initializeServices = async () => {
      try {
        // Setup presence tracking
        await staffPresence.initialize(user.id, staffInfo.id);
        
        // Setup notifications
        await notificationService.subscribeToNotifications(user.id);

        // Subscribe to notifications
        const unsubscribe = notificationService.subscribe((notification) => {
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type === 'error' ? 'destructive' : 'default'
          });
        });

        return () => {
          unsubscribe();
          staffPresence.cleanup();
          securityService.cleanup();
        };
      } catch (error) {
        console.error('Error initializing services:', error);
        toast({
          title: 'Service Initialization Failed',
          description: 'Some features may be limited. Please refresh the page.',
          variant: 'destructive'
        });
      }
    };

    initializeServices();
  }, [user, staffInfo, toast]);

  // Update staff presence on route change
  useEffect(() => {
    if (!staffInfo) return;
    
    const updatePresence = () => {
      staffPresence.updateRoute(window.location.pathname);
    };

    updatePresence();
    window.addEventListener('popstate', updatePresence);
    
    return () => {
      window.removeEventListener('popstate', updatePresence);
    };
  }, [staffInfo]);

  // Session timeout handler
  useEffect(() => {
    const handleSessionTimeout = () => {
      toast({
        title: 'Session Expired',
        description: 'Please log in again to continue.',
        variant: 'destructive'
      });
      navigate('/staff/login?reason=session_timeout');
    };

    window.addEventListener('session_timeout', handleSessionTimeout);
    
    return () => {
      window.removeEventListener('session_timeout', handleSessionTimeout);
    };
  }, [navigate, toast]);

  // Show a message if user is authenticated but has no staff record
  if (!staffInfo && user?.id && !staffLoading && userRole !== 'staff') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex flex-col items-center gap-4">
                <AlertCircle className="h-16 w-16 text-yellow-500" />
                <span>Staff Access Required</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Your account is authenticated as a {userRole}, but this portal requires staff access. 
                Please contact your administrator to set up your staff profile or log in with a staff account.
              </p>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => navigate(`/${userRole}/dashboard`)}
                  className="w-full"
                >
                  Go to {userRole === 'farmer' ? 'Farmer' : 'Admin'} Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show loading state while checking for staff record
  if (staffLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}