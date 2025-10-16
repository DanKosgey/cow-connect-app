import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { diagnoseStorageIssues, checkStoragePolicies, verifyDocumentRecords } from '@/utils/storageDiagnostics';
import useToastNotifications from '@/hooks/useToastNotifications';

const StorageDiagnostics = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(false);
  const [pendingFarmerId, setPendingFarmerId] = useState('');
  const [diagnosticsResults, setDiagnosticsResults] = useState<any>(null);
  const [policyResults, setPolicyResults] = useState<any>(null);
  const [verificationResults, setVerificationResults] = useState<any>(null);

  const handleRunDiagnostics = async () => {
    try {
      setLoading(true);
      const results = await diagnoseStorageIssues();
      setDiagnosticsResults(results);
      
      if (results.success) {
        toast.success('Diagnostics', 'Storage diagnostics completed successfully');
      } else {
        toast.error('Diagnostics Failed', results.error);
      }
    } catch (error: any) {
      console.error('Error running diagnostics:', error);
      toast.error('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPolicies = async () => {
    try {
      setLoading(true);
      const results = await checkStoragePolicies();
      setPolicyResults(results);
      
      if (results.error) {
        toast.error('Policy Check Failed', results.error);
      } else {
        toast.success('Policy Check', 'Storage policies checked successfully');
      }
    } catch (error: any) {
      console.error('Error checking policies:', error);
      toast.error('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocuments = async () => {
    if (!pendingFarmerId) {
      toast.error('Error', 'Please enter a pending farmer ID');
      return;
    }

    try {
      setLoading(true);
      const results = await verifyDocumentRecords(pendingFarmerId);
      setVerificationResults(results);
      
      if (results.success) {
        toast.success('Verification', `Document verification completed. Found ${results.documents?.length || 0} documents`);
      } else {
        toast.error('Verification Failed', results.error);
      }
    } catch (error: any) {
      console.error('Error verifying documents:', error);
      toast.error('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Storage Diagnostics</h1>
          <p className="text-muted-foreground">
            Diagnose issues with KYC document storage and retrieval
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage Diagnostics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Diagnostics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Test if the kyc-documents bucket is properly configured
              </p>
              <Button 
                onClick={handleRunDiagnostics} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
              </Button>
              
              {diagnosticsResults && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <h3 className="font-medium mb-2">Results:</h3>
                  <p className={`text-sm ${diagnosticsResults.success ? 'text-green-600' : 'text-red-600'}`}>
                    {diagnosticsResults.success ? '✅ Success' : '❌ Failed'}: {diagnosticsResults.message || diagnosticsResults.error}
                  </p>
                  {diagnosticsResults.bucket && (
                    <div className="mt-2 text-xs">
                      <p>Bucket ID: {diagnosticsResults.bucket.id}</p>
                      <p>Bucket Name: {diagnosticsResults.bucket.name}</p>
                      <p>Public: {diagnosticsResults.bucket.public ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Policy Check Card */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Check</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Verify storage policies are correctly applied
              </p>
              <Button 
                onClick={handleCheckPolicies} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Checking Policies...' : 'Check Policies'}
              </Button>
              
              {policyResults && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <h3 className="font-medium mb-2">Results:</h3>
                  <div className="text-sm space-y-1">
                    <p className={policyResults.canList ? 'text-green-600' : 'text-red-600'}>
                      {policyResults.canList ? '✅' : '❌'} Can List Objects
                    </p>
                    <p className={policyResults.canUpload ? 'text-green-600' : 'text-red-600'}>
                      {policyResults.canUpload ? '✅' : '❌'} Can Upload Objects
                    </p>
                    {policyResults.listError && (
                      <p className="text-red-600 text-xs">List Error: {policyResults.listError}</p>
                    )}
                    {policyResults.uploadError && (
                      <p className="text-red-600 text-xs">Upload Error: {policyResults.uploadError}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Verification Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Document Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pendingFarmerId">Pending Farmer ID</Label>
                  <Input
                    id="pendingFarmerId"
                    value={pendingFarmerId}
                    onChange={(e) => setPendingFarmerId(e.target.value)}
                    placeholder="Enter pending farmer ID"
                  />
                </div>
                
                <Button 
                  onClick={handleVerifyDocuments} 
                  disabled={loading || !pendingFarmerId}
                  className="w-full"
                >
                  {loading ? 'Verifying...' : 'Verify Documents'}
                </Button>
                
                {verificationResults && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <h3 className="font-medium mb-2">Verification Results:</h3>
                    {verificationResults.success ? (
                      <div className="text-sm">
                        <p className="text-green-600 mb-2">✅ Found {verificationResults.documents?.length || 0} documents</p>
                        <div className="space-y-2">
                          {verificationResults.documents?.map((doc: any, index: number) => (
                            <div key={index} className="border-b pb-2">
                              <p className="font-medium">{doc.file_name}</p>
                              <div className="text-xs space-y-1 mt-1">
                                <p>Type: {doc.document_type}</p>
                                <p>Status: {doc.status}</p>
                                <p className={doc.file_exists ? 'text-green-600' : 'text-red-600'}>
                                  {doc.file_exists ? '✅ File exists in storage' : '❌ File missing from storage'}
                                </p>
                                {doc.public_url && (
                                  <p className="truncate">URL: {doc.public_url}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-600">❌ {verificationResults.error}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Troubleshooting Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium">If documents show as uploaded but don't appear in Supabase:</h4>
                <ul className="mt-1 space-y-1 text-muted-foreground ml-4 list-disc">
                  <li>Check if the kyc-documents bucket exists in Supabase Storage</li>
                  <li>Verify that storage policies are correctly applied</li>
                  <li>Ensure the user has proper authentication and permissions</li>
                  <li>Check browser console for any error messages during upload</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Common Issues:</h4>
                <ul className="mt-1 space-y-1 text-muted-foreground ml-4 list-disc">
                  <li>"new row violates row-level security policy" - Storage policies not applied correctly</li>
                  <li>"Bucket not found" - kyc-documents bucket doesn't exist</li>
                  <li>"Permission denied" - User authentication issues</li>
                  <li>Files uploaded but not visible - Check file paths and bucket configuration</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">To Fix Storage Issues:</h4>
                <ol className="mt-1 space-y-1 text-muted-foreground ml-4 list-decimal">
                  <li>Log into Supabase dashboard</li>
                  <li>Navigate to Storage → Buckets</li>
                  <li>Verify kyc-documents bucket exists</li>
                  <li>Run the SQL commands from setup-storage-bucket.js to apply policies</li>
                  <li>Test document upload again</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StorageDiagnostics;