import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testEndToEndPaymentWorkflow } from '@/utils/test-end-to-end-payment-workflow';

export const TestPaymentWorkflow: React.FC = () => {
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const runTest = async () => {
    setTestStatus('running');
    setTestMessage('Running end-to-end payment workflow test...');
    
    try {
      const result = await testEndToEndPaymentWorkflow();
      if (result) {
        setTestStatus('success');
        setTestMessage('Test completed successfully!');
      } else {
        setTestStatus('error');
        setTestMessage('Test failed. Check console for details.');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Workflow Test</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={runTest} 
            disabled={testStatus === 'running'}
            className="w-full"
          >
            {testStatus === 'running' ? 'Running Test...' : 'Run End-to-End Payment Workflow Test'}
          </Button>
          
          {testMessage && (
            <div className={`p-3 rounded ${
              testStatus === 'success' ? 'bg-green-100 text-green-800' :
              testStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {testMessage}
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            <p>This test verifies the complete payment workflow:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Payment generation for pending collections only</li>
              <li>Marking payments as paid updates collection statuses</li>
              <li>Rollback functionality (paid → pending)</li>
              <li>No duplicate payment records</li>
              <li>New collections are properly tracked</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestPaymentWorkflow;