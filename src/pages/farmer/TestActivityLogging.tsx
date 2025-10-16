import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';

const TestActivityLogging = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    console.log('[TestActivityLogging] Component mounted');
    console.log('[FarmerPortal] Test activity logging page accessed', {
      userId: user?.id,
      userRole,
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log('[TestActivityLogging] Component unmounting');
      console.log('[FarmerPortal] Leaving test activity logging page', {
        userId: user?.id,
        userRole,
        timestamp: new Date().toISOString()
      });
    };
  }, [user, userRole]);

  const handleTestAction = (actionName: string) => {
    console.log(`[TestActivityLogging] Test action triggered: ${actionName}`);
    console.log('[FarmerPortal] Test action performed', {
      action: actionName,
      userId: user?.id,
      userRole,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>Activity Logging Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-secondary/50 rounded-lg p-6">
              <h3 className="font-medium mb-2">Test Farmer Portal Activity Logging</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This page is for testing the enhanced logging features in the farmer portal. 
                Open the browser console to see detailed logs for various user activities.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleTestAction('button_click_1')}>
                  Test Button 1
                </Button>
                <Button onClick={() => handleTestAction('button_click_2')} variant="outline">
                  Test Button 2
                </Button>
                <Button onClick={() => handleTestAction('navigation_test')} variant="secondary">
                  Test Navigation
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">What to Look For in Console Logs</h3>
              <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                <li>Component mount/unmount events</li>
                <li>User action tracking (button clicks)</li>
                <li>Navigation events</li>
                <li>User identification information</li>
                <li>Timestamp information for all events</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">Navigation Tests</h3>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => {
                    handleTestAction('navigate_to_dashboard');
                    navigate('/farmer/dashboard');
                  }}
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={() => {
                    handleTestAction('navigate_to_collections');
                    navigate('/farmer/collections');
                  }}
                  variant="outline"
                >
                  Go to Collections
                </Button>
                <Button 
                  onClick={() => {
                    handleTestAction('navigate_to_payments');
                    navigate('/farmer/payments');
                  }}
                  variant="outline"
                >
                  Go to Payments
                </Button>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="font-medium text-yellow-800 mb-2">User Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">User ID:</p>
                  <p className="text-muted-foreground">{user?.id || 'Not available'}</p>
                </div>
                <div>
                  <p className="font-medium">User Role:</p>
                  <p className="text-muted-foreground">{userRole || 'Not available'}</p>
                </div>
                <div>
                  <p className="font-medium">Current Time:</p>
                  <p className="text-muted-foreground">{new Date().toISOString()}</p>
                </div>
                <div>
                  <p className="font-medium">Page Path:</p>
                  <p className="text-muted-foreground">/farmer/test-activity-logging</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestActivityLogging;