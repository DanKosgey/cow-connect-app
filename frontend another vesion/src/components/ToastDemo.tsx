import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToastContext } from '@/components/ToastWrapper';

/**
 * Demo component showing how to use toast notifications
 */
const ToastDemo: React.FC = () => {
  const toast = useToastContext();

  const handleSuccess = () => {
    toast.showSuccess('Success!', 'Your operation completed successfully.');
  };

  const handleError = () => {
    toast.showError('Error!', 'Something went wrong. Please try again.');
  };

  const handleWarning = () => {
    toast.showWarning('Warning!', 'This action cannot be undone.');
  };

  const handleInfo = () => {
    toast.showInfo('Information', 'New features are available.');
  };

  const handleLoading = () => {
    const toastId = toast.showLoading('Loading...', 'Processing your request');
    
    // Simulate async operation
    setTimeout(() => {
      toast.updateToast(toastId, 'Success!', 'Operation completed', 'success');
    }, 2000);
  };

  const handlePromise = () => {
    toast.promiseToast(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          // Randomly resolve or reject for demo purposes
          if (Math.random() > 0.5) {
            resolve('Success!');
          } else {
            reject(new Error('Failed!'));
          }
        }, 2000);
      }),
      {
        loading: 'Processing...',
        success: 'Operation completed successfully!',
        error: 'Operation failed. Please try again.'
      }
    );
  };

  const handleAction = () => {
    toast.showInfo('Action Required', 'Would you like to save your changes?', {
      action: {
        label: 'Save',
        onClick: () => {
          toast.showSuccess('Saved!', 'Your changes have been saved.');
        }
      },
      duration: 10000
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toast Notifications Demo</CardTitle>
        <CardDescription>
          Examples of different toast notification types and usage patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <Button onClick={handleSuccess} variant="default">
            Success
          </Button>
          <Button onClick={handleError} variant="destructive">
            Error
          </Button>
          <Button onClick={handleWarning} variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-50">
            Warning
          </Button>
          <Button onClick={handleInfo} variant="outline" className="border-blue-500 text-blue-700 hover:bg-blue-50">
            Info
          </Button>
          <Button onClick={handleLoading} variant="secondary">
            Loading
          </Button>
          <Button onClick={handlePromise} variant="secondary">
            Promise
          </Button>
          <Button onClick={handleAction} variant="outline">
            With Action
          </Button>
        </div>
        
        <div className="text-sm text-gray-500 mt-4">
          <p><strong>Tip:</strong> Try clicking multiple buttons to see how toasts stack.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ToastDemo;