import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TestEnhancedLogging = () => {
  const navigate = useNavigate();

  const handleTestNavigation = () => {
    console.log('TestEnhancedLogging: Navigating to KYC upload page');
    navigate('/farmer/kyc-upload');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>Enhanced Logging Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-secondary/50 rounded-lg p-6">
              <h3 className="font-medium mb-2">Test Enhanced KYC Document Upload Logging</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This page will navigate to the KYC document upload page where you can test the enhanced logging features.
                Open the browser console to see detailed logs for document loading, validation, and upload processes.
              </p>
              <Button onClick={handleTestNavigation}>
                Go to KYC Upload Page
              </Button>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">What to Look For in Console Logs</h3>
              <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                <li>Document selection and validation logs</li>
                <li>File upload progress and success verification</li>
                <li>Existing document detection and state updates</li>
                <li>Submission process and verification logs</li>
                <li>Error handling and toast notification logs</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestEnhancedLogging;