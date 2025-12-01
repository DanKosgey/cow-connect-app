import { useState, useEffect } from 'react';
import { testPaymentFunctions } from '@/utils/test-payment-functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TestPaymentFunctions() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTestFunctions = async () => {
    setLoading(true);
    try {
      const testResults = await testPaymentFunctions();
      setResults(testResults);
      console.log('Test results:', testResults);
    } catch (error) {
      console.error('Error running tests:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Collector Payment Functions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestFunctions} disabled={loading}>
            {loading ? 'Testing...' : 'Test Payment Functions'}
          </Button>
          
          {results && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Test Results:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}