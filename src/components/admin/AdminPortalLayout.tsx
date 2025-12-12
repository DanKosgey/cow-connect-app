import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Updated import
import { useToast } from '@/components/ui/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notification-service';
import { securityService } from '@/services/security-service';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

export function AdminPortalLayout({ children }: AdminPortalLayoutProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const initializeServices = async () => {
      try {
        // Set up admin-specific security options
        securityService.setAdminOptions({
          sessionTimeout: 15, // 15 minutes for admins
          maxLoginAttempts: 3, // Stricter for admin accounts
          rateLimitRequests: 200, // Higher limit for admin operations
          rateLimitWindow: 1 // 1 minute window
        });

        // Subscribe to admin notifications
        await notificationService.subscribeToAdminNotifications(user.id);

        // Subscribe to critical system alerts
        const unsubscribe = notificationService.subscribe((notification) => {
          const severity = notification.type === 'critical' ? 'destructive' : 'default';
          toast({
            title: notification.title,
            description: notification.message,
            variant: severity,
            duration: notification.type === 'critical' ? Infinity : 5000
          });
        });

        // Monitor critical system metrics
        startSystemMonitoring();

        return () => {
          unsubscribe();
          securityService.cleanup();
          stopSystemMonitoring();
        };
      } catch (error) {
        console.error('Error initializing admin services:', error);
        toast({
          title: 'Service Initialization Failed',
          description: 'Critical admin services failed to initialize. Please refresh or contact support.',
          variant: 'destructive'
        });
      }
    };

    initializeServices();
  }, [user, toast]);

  // Handle session timeout
  useEffect(() => {
    const handleSessionTimeout = () => {
      toast({
        title: 'Session Expired',
        description: 'For security reasons, please log in again.',
        variant: 'destructive'
      });
      navigate('/admin/login?reason=session_timeout');
    };

    window.addEventListener('session_timeout', handleSessionTimeout);
    
    return () => {
      window.removeEventListener('session_timeout', handleSessionTimeout);
    };
  }, [navigate, toast]);

  // System monitoring functions
  const startSystemMonitoring = () => {
    // Start monitoring critical metrics
    const metrics = [
      'db_connection_pool',
      'api_response_times',
      'error_rates',
      'active_users',
      'system_resources'
    ];

    metrics.forEach(metric => {
      monitorMetric(metric);
    });
  };

  const stopSystemMonitoring = () => {
    // Cleanup monitoring
  };

  const monitorMetric = async (metric: string) => {
    try {
      // Implement metric monitoring logic
      // This would typically involve WebSocket connections or polling
      // for system metrics and triggering alerts when thresholds are exceeded
    } catch (error) {
      console.error(`Error monitoring ${metric}:`, error);
    }
  };

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}