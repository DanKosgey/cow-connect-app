import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const StorageTest = () => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
  };

  const testStorageBucket = async () => {
    try {
      setLoading(true);
      setTestResults([]);
      addResult('🔍 Starting Storage Bucket Test...');

      // 1. Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      addResult(`1. User authentication status: ${user ? '✅ Authenticated' : '❌ Not authenticated'}`);
      
      if (!user) {
        toast({
          title: 'Error',
          description: 'User not authenticated. Please sign in first.',
          variant: 'destructive',
        });
        return;
      }

      // 2. List all buckets
      addResult('2. Checking available buckets...');
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        addResult(`❌ Error listing buckets: ${bucketError.message}`);
        toast({
          title: 'Error',
          description: `Failed to list buckets: ${bucketError.message}`,
          variant: 'destructive',
        });
        return;
      }
      
      addResult(`   Found ${buckets?.length || 0} buckets:`);
      buckets?.forEach(bucket => {
        addResult(`   - ${bucket.name} (${bucket.id})`);
      });
      
      const kycBucket = buckets?.find(bucket => bucket.name === 'kyc-documents');
      if (!kycBucket) {
        addResult('❌ kyc-documents bucket not found!');
        toast({
          title: 'Error',
          description: 'kyc-documents bucket not found. Please create it in Supabase dashboard.',
          variant: 'destructive',
        });
        return;
      }
      
      addResult('✅ kyc-documents bucket exists');

      // 3. Upload a test file
      addResult('3. Uploading test file...');
      const testFileName = `test-file-${Date.now()}.txt`;
      const testContent = 'This is a test file to verify Supabase storage functionality.';
      const testFilePath = `${user.id}/test/${testFileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(testFilePath, testContent, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'text/plain'
        });
      
      if (uploadError) {
        addResult(`❌ Upload failed: ${uploadError.message}`);
        toast({
          title: 'Error',
          description: `Upload failed: ${uploadError.message}`,
          variant: 'destructive',
        });
        return;
      }
      
      addResult(`✅ File uploaded successfully: ${uploadData.path}`);

      // 4. Retrieve the file
      addResult('4. Retrieving test file...');
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('kyc-documents')
        .download(testFilePath);
      
      if (downloadError) {
        addResult(`❌ Download failed: ${downloadError.message}`);
        toast({
          title: 'Error',
          description: `Download failed: ${downloadError.message}`,
          variant: 'destructive',
        });
        return;
      }
      
      // Convert Blob to text to verify content
      const downloadedContent = await fileData.text();
      if (downloadedContent === testContent) {
        addResult('✅ File retrieved successfully and content matches');
      } else {
        addResult('❌ File content does not match!');
        addResult(`Expected: ${testContent}`);
        addResult(`Received: ${downloadedContent}`);
        return;
      }

      // 5. Generate public URL
      addResult('5. Generating public URL...');
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(testFilePath);
      
      if (urlData?.publicUrl) {
        addResult(`✅ Public URL generated: ${urlData.publicUrl}`);
      } else {
        addResult('⚠️ Could not generate public URL (may not be public bucket)');
      }

      // 6. Clean up - remove test file
      addResult('6. Cleaning up test file...');
      const { error: deleteError } = await supabase.storage
        .from('kyc-documents')
        .remove([testFilePath]);
      
      if (deleteError) {
        addResult(`❌ Failed to clean up test file: ${deleteError.message}`);
        toast({
          title: 'Warning',
          description: `Failed to clean up test file: ${deleteError.message}`,
          variant: 'default',
        });
        return;
      }
      
      addResult('✅ Test file cleaned up successfully');
      addResult('🎉 All storage tests passed! Bucket is working correctly.');
      
      toast({
        title: 'Success',
        description: 'All storage tests passed! Bucket is working correctly.',
        variant: 'default',
      });

    } catch (error: any) {
      addResult(`❌ Unexpected error: ${error.message}`);
      toast({
        title: 'Error',
        description: `Unexpected error: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Storage Bucket Test</h1>
          <p className="text-muted-foreground">
            Test if the kyc-documents bucket is working correctly
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storage Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testStorageBucket} 
              disabled={loading}
              className="w-full mb-6"
            >
              {loading ? 'Testing Storage...' : 'Test Storage Bucket'}
            </Button>
            
            {testResults.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                <h3 className="font-medium mb-2">Test Results:</h3>
                <div className="space-y-1 text-sm font-mono">
                  {testResults.map((result, index) => (
                    <div key={index} className={result.includes('❌') ? 'text-red-600' : result.includes('✅') ? 'text-green-600' : result.includes('⚠️') ? 'text-yellow-600' : ''}>
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StorageTest;