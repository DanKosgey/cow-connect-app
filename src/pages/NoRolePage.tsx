import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, User, Mail, Phone } from 'lucide-react';
import { logger } from '@/utils/logger';

/**
 * Page displayed when a user has no role assigned
 * Provides information and options for getting a role assigned
 */
const NoRolePage: React.FC = () => {
  const { user, logout, refreshSession } = useAuth();

  const handleContactAdmin = () => {
    // In a real app, this would open a support ticket or send a message to admins
    logger.info('User requested role assignment', { userId: user?.id });
    alert('Please contact your system administrator to request a role assignment.');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error('Error logging out', { error });
    }
  };
  // Removed automatic polling to prevent "Invalid Refresh Token" errors and loops.
  // Users should click "Logout" or "Contact Admin" or we can rely on manual refresh/reload.

  const handleCompleteSignup = () => {
    // Allow user to go back to signup if they got stuck here
    window.location.href = '/farmer/signup';
  };

  // If role appears, AuthFlowManager will handle the redirect automatically
  // thanks to our previous fix in AuthFlowManager.tsx

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-yellow-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Role Not Assigned</CardTitle>
          <CardDescription>
            Your account has been created but no role has been assigned yet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              You cannot access the application until an administrator assigns you a role.
            </AlertDescription>
          </Alert>

          {user && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-medium text-gray-900">Account Information</h3>
              <div className="flex items-center text-sm text-gray-600">
                <User className="mr-2 h-4 w-4" />
                <span>{user.email}</span>
              </div>
              {user.user_metadata?.full_name && (
                <div className="flex items-center text-sm text-gray-600">
                  <User className="mr-2 h-4 w-4" />
                  <span>{user.user_metadata.full_name}</span>
                </div>
              )}
              {user.user_metadata?.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="mr-2 h-4 w-4" />
                  <span>{user.user_metadata.phone}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleContactAdmin}
              className="w-full"
            >
              Contact Administrator
            </Button>
            <Button
              variant="secondary"
              onClick={handleCompleteSignup}
              className="w-full"
            >
              Complete Registration
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
              Logout
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <p>
              If you believe this is an error, please contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoRolePage;