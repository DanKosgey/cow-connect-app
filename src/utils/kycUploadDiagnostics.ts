import { supabase } from '@/integrations/supabase/client';

/**
 * KYC Upload Diagnostics
 * 
 * Utility functions to diagnose KYC document upload issues in the browser
 */

export const diagnoseKYCUpload = async (userId: string) => {
  console.log('🔍 Starting KYC Upload Diagnostics...');
  
  try {
    // 1. Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    console.log('1. User authentication status:', !!user);
    
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }
    
    console.log('   Authenticated user ID:', user.id);
    
    // 2. Test bucket access
    console.log('\n2. Testing bucket access...');
    
    // Try to list buckets (this might fail with anon key, which is expected)
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.log('   Bucket listing failed (expected with anon key):', bucketError.message);
      } else {
        console.log(`   Found ${buckets.length} buckets`);
      }
    } catch (error) {
      console.log('   Bucket listing threw error (expected with anon key):', (error as Error).message);
    }
    
    // 3. Test direct bucket access
    console.log('\n3. Testing direct kyc-documents bucket access...');
    
    try {
      // Try to list objects in the kyc-documents bucket
      const { data: objects, error: listError } = await supabase.storage
        .from('kyc-documents')
        .list(`${userId}/`, { limit: 5 });
      
      if (listError) {
        console.log('   Failed to list user folder:', listError.message);
      } else {
        console.log(`   Successfully listed ${objects?.length || 0} objects in user folder`);
      }
    } catch (error) {
      console.log('   List operation threw error:', (error as Error).message);
    }
    
    // 4. Test upload with a small test file
    console.log('\n4. Testing upload capability...');
    
    try {
      const testFileName = `diagnostics-${Date.now()}.txt`;
      const testContent = 'KYC upload diagnostics test file';
      const testFilePath = `${userId}/diagnostics/${testFileName}`;
      
      console.log('   Creating test file blob...');
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      (testBlob as any).name = testFileName; // Add name property like File object
      
      console.log('   Attempting upload...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(testFilePath, testBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'text/plain'
        });
      
      if (uploadError) {
        console.error('   ❌ Upload failed:', uploadError.message);
        console.error('   Error details:', uploadError);
        return { success: false, error: `Upload failed: ${uploadError.message}`, details: uploadError };
      }
      
      console.log('   ✅ Upload successful:', uploadData?.path);
      
      // 5. Test cleanup
      console.log('\n5. Cleaning up test file...');
      try {
        const { error: deleteError } = await supabase.storage
          .from('kyc-documents')
          .remove([testFilePath]);
        
        if (deleteError) {
          console.log('   ⚠️  Cleanup failed:', deleteError.message);
        } else {
          console.log('   ✅ Test file cleaned up successfully');
        }
      } catch (cleanupError) {
        console.log('   ⚠️  Cleanup threw error:', (cleanupError as Error).message);
      }
      
      console.log('\n🎉 KYC Upload Diagnostics completed successfully!');
      return { success: true, message: 'All tests passed' };
      
    } catch (error) {
      console.error('   ❌ Upload test threw error:', error);
      return { success: false, error: `Upload test failed: ${(error as Error).message}` };
    }
    
  } catch (error) {
    console.error('❌ KYC Upload Diagnostics failed:', error);
    return { success: false, error: `Diagnostics failed: ${(error as Error).message}` };
  }
};

export default {
  diagnoseKYCUpload
};