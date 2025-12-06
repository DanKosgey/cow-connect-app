// Storage Test Component - Add this to test storage functionality
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StorageTestComponent = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const testStorage = async () => {
    setIsTesting(true);
    setTestResult('Testing storage access...');
    
    try {
      // Test 1: Try to upload a small test file
      const testFileName = `test-${Date.now()}.txt`;
      const { error: uploadError } = await supabase.storage
        .from('collection-photos')
        .upload(testFileName, new Blob(['test']), {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        setTestResult(`❌ Upload failed: ${uploadError.message}`);
        return;
      }

      setTestResult('✅ Upload successful. Testing public URL...');

      // Test 2: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('collection-photos')
        .getPublicUrl(testFileName);
      
      if (!publicUrl) {
        setTestResult('❌ Failed to generate public URL');
        // Clean up
        await supabase.storage.from('collection-photos').remove([testFileName]);
        return;
      }

      setTestResult(`✅ Public URL generated: ${publicUrl}`);

      // Test 3: Clean up
      const { error: deleteError } = await supabase.storage
        .from('collection-photos')
        .remove([testFileName]);

      if (deleteError) {
        setTestResult(`⚠️ Upload and URL test successful, but cleanup failed: ${deleteError.message}`);
      } else {
        setTestResult('✅ All tests passed: Storage is properly configured!');
      }
    } catch (error: any) {
      setTestResult(`❌ Test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Storage Configuration Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click the button below to test if the collection-photos storage bucket is properly configured.
        </p>
        <Button onClick={testStorage} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Test Storage Configuration'}
        </Button>
        {testResult && (
          <div className="p-3 bg-muted rounded">
            <p className="text-sm">{testResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StorageTestComponent;