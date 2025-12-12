import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const KYCAuthDiagnostics = () => {
  const { user, session, userRole, loading } = useAuth();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [isTesting, setIsTesting] = useState(false);

  const runDiagnostics = async () => {
    setIsTesting(true);
    try {
      const results: any = {};
      
      // 1. Check current user
      results.currentUser = user ? {
        id: user.id,
        email: user.email,
        role: userRole
      } : 'No user authenticated';
      
      // 2. Check session
      results.currentSession = session ? {
        expiresAt: session.expires_at,
        refreshToken: !!session.refresh_token,
        accessToken: !!session.access_token
      } : 'No active session';
      
      // 3. Test storage access
      try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        results.bucketAccess = bucketError ? 
          `Failed: ${bucketError.message}` : 
          `Success: Found ${buckets?.length || 0} buckets`;
      } catch (error: any) {
        results.bucketAccess = `Exception: ${error.message}`;
      }
      
      // 4. Test kyc-documents bucket specifically
      try {
        const { data: objects, error: listError } = await supabase.storage
          .from('kyc-documents')
          .list('', { limit: 1 });
        results.kycBucketAccess = listError ? 
          `Failed: ${listError.message}` : 
          `Success: Can list objects`;
      } catch (error: any) {
        results.kycBucketAccess = `Exception: ${error.message}`;
      }
      
      // 5. Test upload capability with a small test file
      try {
        const testFileName = `auth-test-${Date.now()}.txt`;
        const testContent = 'Auth test file';
        const testFilePath = `auth-test/${testFileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(testFilePath, testContent, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'text/plain'
          });
        
        results.uploadTest = uploadError ? 
          `Failed: ${uploadError.message}` : 
          `Success: Uploaded ${uploadData?.path}`;
          
        // Clean up test file if uploaded
        if (uploadData) {
          await supabase.storage
            .from('kyc-documents')
            .remove([testFilePath]);
        }
      } catch (error: any) {
        results.uploadTest = `Exception: ${error.message}`;
      }
      
      setDiagnostics(results);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>KYC Authentication Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={runDiagnostics} 
            disabled={isTesting || loading}
            className="w-full"
          >
            {isTesting ? 'Running Diagnostics...' : 'Run Authentication Diagnostics'}
          </Button>
          
          {loading && (
            <div className="text-center py-4">
              <p>Loading authentication state...</p>
            </div>
          )}
          
          {Object.keys(diagnostics).length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Diagnostics Results:</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(diagnostics).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium w-40">{key}:</span>
                    <span className="flex-1">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KYCAuthDiagnostics;