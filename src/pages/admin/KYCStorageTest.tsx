import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { testKYCStorage, verifyDocumentIntegrity } from '@/utils/kycStorageTest';
import useToastNotifications from '@/hooks/useToastNotifications';

const KYCStorageTest = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(false);
  const [pendingFarmerId, setPendingFarmerId] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [verificationResults, setVerificationResults] = useState<any>(null);

  const handleTestStorage = async () => {
    try {
      setLoading(true);
      const results = await testKYCStorage();
      setTestResults(results);
      
      if (results.success) {
        toast.success('Storage Test', 'KYC storage test completed successfully');
      } else {
        toast.error('Storage Test Failed', results.error);
      }
    } catch (error: any) {
      console.error('Error running storage test:', error);
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
      const results = await verifyDocumentIntegrity(pendingFarmerId);
      setVerificationResults(results);
      
      if (results.success) {
        toast.success('Verification', `Document integrity check completed. All files exist: ${results.allFilesExist}`);
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
          <h1 className="text-3xl font-bold mb-2">KYC Document Storage Test</h1>
          <p className="text-muted-foreground">
            Test KYC document storage and retrieval functionality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storage Test Card */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Test</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Test if the kyc-documents bucket exists and documents can be retrieved
              </p>
              <Button 
                onClick={handleTestStorage} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Run Storage Test'}
              </Button>
              
              {testResults && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <h3 className="font-medium mb-2">Results:</h3>
                  <p className={`text-sm ${testResults.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.success ? '✅ Success' : '❌ Failed'}: {testResults.message || testResults.error}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Verification Card */}
          <Card>
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
                    <p className={`text-sm ${verificationResults.success ? 'text-green-600' : 'text-red-600'}`}>
                      {verificationResults.success ? '✅ Success' : '❌ Failed'}
                    </p>
                    {verificationResults.documents && (
                      <div className="mt-2 text-sm">
                        <p>All files exist: {verificationResults.allFilesExist ? 'Yes' : 'No'}</p>
                        <ul className="mt-2 space-y-1">
                          {verificationResults.documents.map((doc: any, index: number) => (
                            <li key={index} className="flex items-center">
                              <span className={`mr-2 ${doc.file_exists ? 'text-green-500' : 'text-red-500'}`}>
                                {doc.file_exists ? '✅' : '❌'}
                              </span>
                              <span className="truncate">{doc.file_name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>1. Storage Test:</strong> Verifies that the kyc-documents bucket exists and can be accessed</p>
              <p><strong>2. Document Verification:</strong> Checks if specific farmer's documents exist in storage</p>
              <p className="text-muted-foreground mt-3">
                Note: This test requires valid pending farmer IDs. You can find them in the KYC Pending Farmers dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KYCStorageTest;