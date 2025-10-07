import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { testSupabaseConnection } from '@/utils/connectionTest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ConnectionTestPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  const testConnection = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      // Test network connectivity first
      setConnectionStatus('Testing network connectivity...');
      
      // Check if we can reach the Supabase URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            mode: 'no-cors' // Use no-cors to avoid CORS issues in initial check
          });
          setNetworkInfo({
            url: supabaseUrl,
            status: response.status,
            statusText: response.statusText,
            reachable: true
          });
        } catch (networkError) {
          setNetworkInfo({
            url: supabaseUrl,
            error: networkError.message,
            reachable: false
          });
        }
      }
      
      // Run detailed Supabase tests
      setConnectionStatus('Running detailed Supabase tests...');
      const results = await testSupabaseConnection();
      setTestResults(results);
      setConnectionStatus('Tests completed');
    } catch (error) {
      console.error('Connection test error:', error);
      setTestResults({
        error: error.message
      });
      setConnectionStatus('Tests failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold">Supabase Connection Test</h1>
          <p className="text-muted-foreground mt-2">Testing connection between app and Supabase</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-lg">{connectionStatus}</span>
              <Button onClick={testConnection} disabled={loading}>
                {loading ? 'Testing...' : 'Re-run Tests'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {networkInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Network Connectivity</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
                {JSON.stringify(networkInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not found'}
              </div>
              <div>
                <strong>VITE_SUPABASE_PUBLISHABLE_KEY:</strong> {import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Found (hidden for security)' : 'Not found'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supabase Client Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Client initialized:</strong> {supabase ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Auth methods available:</strong> {supabase?.auth ? 'Yes' : 'No'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Check environment variables:</strong> Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are correctly set in your .env file</li>
              <li><strong>Restart development server:</strong> After changing .env variables, restart your development server with `npm run dev`</li>
              <li><strong>Check network connectivity:</strong> Ensure you can access {import.meta.env.VITE_SUPABASE_URL || 'your Supabase URL'} in your browser</li>
              <li><strong>Verify Supabase project:</strong> Check that your Supabase project is active and not blocked by firewall/proxy</li>
              <li><strong>Check browser console:</strong> Look for any JavaScript errors or CORS issues</li>
              <li><strong>Try different network:</strong> Test on a different network to rule out local network issues</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectionTestPage;