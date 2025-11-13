import { useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types/auth.types';

export function MilkApprovalDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user has the correct role
  useEffect(() => {
    if (user && userRole !== UserRole.STAFF) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this portal.',
        variant: 'destructive'
      });
      const dashboardRoutes = {
        [UserRole.ADMIN]: '/admin/dashboard',
        [UserRole.FARMER]: '/farmer/dashboard',
        [UserRole.STAFF]: '/collector/dashboard'
      };
      navigate(dashboardRoutes[userRole as UserRole] || '/');
    }
  }, [user, userRole, navigate, toast]);

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}