import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TestDBConnection = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      console.log('Testing database connection...');
      
      // Test 1: Check if we can connect to the database
      const healthCheck = await supabase.from('profiles').select('id').limit(1);
      console.log('Health check result:', healthCheck);
      
      // Test 2: Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check result:', session);
      
      // Test 3: Check if we can query user roles
      const rolesCheck = await supabase.from('user_roles').select('role').limit(1);
      console.log('Roles check result:', rolesCheck);
      
      // Test 4: Check if we can query farmers
      const farmersCheck = await supabase.from('farmers').select('id').limit(1);
      console.log('Farmers check result:', farmersCheck);
      
      setTestResults({
        healthCheck,
        session,
        rolesCheck,
        farmersCheck,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Database connection test failed:', error);
      setTestResults({
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Database Connection Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p>Testing database connection and queries...</p>
                <Button onClick={testConnection} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Run Test'
                  )}
                </Button>
              </div>
              
              {testResults && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Test Results:</h3>
                  <pre className="text-sm overflow-auto max-h-96">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestDBConnection;