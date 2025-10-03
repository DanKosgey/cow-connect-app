import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToastContext } from '@/components/ToastWrapper';

/**
 * Demo component to showcase all toast notification types
 */
export function ToastTypesDemo() {
  const toast = useToastContext();

  const handleShowSuccess = () => {
    toast.showSuccess('Success!', 'Your action was completed successfully.');
  };

  const handleShowError = () => {
    toast.showError('Error!', 'Something went wrong. Please try again.');
  };

  const handleShowWarning = () => {
    toast.showWarning('Warning!', 'This is a warning message.');
  };

  const handleShowInfo = () => {
    toast.showInfo('Information', 'This is an informational message.');
  };

  const handleShowLoading = () => {
    const toastId = toast.showLoading('Loading...', 'Please wait while we process your request.');
    
    // Simulate async operation
    setTimeout(() => {
      toast.updateToast(toastId, 'Success!', 'Your request has been processed.', 'success');
    }, 2000);
  };

  const handlePromiseToast = () => {
    toast.promiseToast(
      new Promise((resolve) => {
        setTimeout(() => {
          resolve('Data loaded successfully');
        }, 2000);
      }),
      {
        loading: 'Loading data...',
        success: 'Data loaded successfully!',
        error: 'Failed to load data'
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toast Notification Types</CardTitle>
        <CardDescription>Demonstration of different toast notification types</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <Button onClick={handleShowSuccess} variant="default" className="w-full">
            Success
          </Button>
          <Button onClick={handleShowError} variant="destructive" className="w-full">
            Error
          </Button>
          <Button onClick={handleShowWarning} variant="outline" className="w-full border-yellow-500 text-yellow-700">
            Warning
          </Button>
          <Button onClick={handleShowInfo} variant="outline" className="w-full border-blue-500 text-blue-700">
            Info
          </Button>
          <Button onClick={handleShowLoading} variant="outline" className="w-full">
            Loading
          </Button>
          <Button onClick={handlePromiseToast} variant="outline" className="w-full">
            Promise
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Click any button above to see the corresponding toast notification type.
        </p>
      </CardContent>
    </Card>
  );
}