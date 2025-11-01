import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useStorageDiagnostics } from '@/hooks/useStorageDiagnostics';
import { RefreshCw } from 'lucide-react';

const StorageDiagnostics = () => {
  const toast = useToastNotifications();
  const [pendingFarmerId, setPendingFarmerId] = useState('');
  
  const { 
    useStorageDiagnosticsData, 
    useStoragePoliciesData, 
    useDocumentRecordsData,
    refreshStorageDiagnostics,
    refreshStoragePolicies,
    refreshDocumentRecords,
    invalidateStorageCache
  } = useStorageDiagnostics();
  
  const { data: diagnosticsResults, isLoading: diagnosticsLoading, refetch: refetchDiagnostics } = useStorageDiagnosticsData();
  const { data: policyResults, isLoading: policiesLoading, refetch: refetchPolicies } = useStoragePoliciesData();
  const { data: verificationResults, isLoading: verificationLoading, refetch: refetchVerification } = useDocumentRecordsData(pendingFarmerId);
  
  const loading = diagnosticsLoading || policiesLoading || verificationLoading;

  const handleRunDiagnostics = async () => {
    try {
      await refetchDiagnostics();
      toast.success('Diagnostics', 'Storage diagnostics completed successfully');
    } catch (error: any) {
      console.error('Error running diagnostics:', error);
      toast.error('Error', error.message);
    }
  };

  const handleCheckPolicies = async () => {
    try {
      await refetchPolicies();
      toast.success('Policy Check', 'Storage policies checked successfully');
    } catch (error: any) {
      console.error('Error checking policies:', error);
      toast.error('Error', error.message);
    }
  };

  const handleVerifyDocuments = async () => {
    if (!pendingFarmerId) {
      toast.error('Error', 'Please enter a pending farmer ID');
      return;
    }

    try {
      await refetchVerification();
      toast.success('Verification', `Document verification completed.`);
    } catch (error: any) {
      console.error('Error verifying documents:', error);
      toast.error('Error', error.message);
    }
  };

  const handleRefreshAll = async () => {
    try {
      await Promise.all([
        refetchDiagnostics(),
        refetchPolicies()
      ]);
      toast.success('Refresh', 'All diagnostics refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing diagnostics:', error);
      toast.error('Error', error.message);
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
              <CardTitle className="flex items-center justify-between">
                <span>Storage Diagnostics</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleRunDiagnostics}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
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
                {loading && diagnosticsLoading ? 'Running Diagnostics...' : 'Run Diagnostics'}
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
              <CardTitle className="flex items-center justify-between">
                <span>Policy Check</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCheckPolicies}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${policiesLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
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
                {loading && policiesLoading ? 'Checking Policies...' : 'Check Policies'}
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
              <CardTitle className="flex items-center justify-between">
                <span>Document Verification</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => refetchVerification()}
                  disabled={loading || !pendingFarmerId}
                >
                  <RefreshCw className={`h-4 w-4 ${verificationLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
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
                  {loading && verificationLoading ? 'Verifying...' : 'Verify Documents'}
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

        {/* Refresh All Button */}
        <div className="mt-6 flex justify-center">
          <Button 
            onClick={handleRefreshAll} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh All Diagnostics
          </Button>
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