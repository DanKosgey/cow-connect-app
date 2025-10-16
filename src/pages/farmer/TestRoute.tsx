import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TestRoute = () => {
  console.log('[TestRoute] Component mounted');
  console.log('[FarmerPortal] Test route accessed', {
    timestamp: new Date().toISOString()
  });

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Route</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a test route to verify farmer portal routing is working correctly.</p>
          <p>If you can see this page, the farmer routes are functioning properly.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestRoute;