import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const NavigationDiagnostics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    // Log navigation state changes
    console.log('NavigationDiagnostics: Location changed', {
      pathname: location.pathname,
      search: location.search,
      user: user?.id,
      userRole,
      loading
    });
  }, [location, user, userRole, loading]);

  const testNavigation = (path: string) => {
    console.log('NavigationDiagnostics: Testing navigation to', path);
    navigate(path);
  };

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  return (
    <Card className="m-4 bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="text-yellow-800">Navigation Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div><strong>Current Path:</strong> {location.pathname}</div>
          <div><strong>User:</strong> {user ? user.id : 'Not authenticated'}</div>
          <div><strong>Role:</strong> {userRole || 'No role'}</div>
          <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => testNavigation('/farmer/kyc-upload')}
          >
            Go to KYC Upload
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => testNavigation('/farmer/application-status')}
          >
            Go to Application Status
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => testNavigation('/farmer/dashboard')}
          >
            Go to Dashboard
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NavigationDiagnostics;