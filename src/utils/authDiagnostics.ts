import { supabase } from '@/integrations/supabase/client';

export const runAuthDiagnostics = async () => {
  console.log('🔍 Running Authentication Diagnostics...');
  
  const results: any = {};
  
  try {
    // 1. Check current session
    console.log('\n1. Checking current session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    results.session = sessionError ? 
      `❌ Session error: ${sessionError.message}` : 
      (sessionData.session ? 
        `✅ Session active: User ${sessionData.session.user?.id}` : 
        '⚠️ No active session');
    
    // 2. Check current user
    console.log('\n2. Checking current user...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    results.user = userError ? 
      `❌ User error: ${userError.message}` : 
      (userData.user ? 
        `✅ User authenticated: ${userData.user.email} (${userData.user.id})` : 
        '⚠️ No authenticated user');
    
    // 3. Test storage bucket access
    console.log('\n3. Testing storage bucket access...');
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      results.buckets = bucketError ? 
        `❌ Bucket listing failed: ${bucketError.message}` : 
        `✅ Found ${buckets?.length || 0} buckets`;
    } catch (error: any) {
      results.buckets = `❌ Bucket access exception: ${error.message}`;
    }
    
    // 4. Test kyc-documents bucket specifically
    console.log('\n4. Testing kyc-documents bucket access...');
    try {
      const { data: objects, error: listError } = await supabase.storage
        .from('kyc-documents')
        .list('', { limit: 1 });
      results.kycAccess = listError ? 
        `❌ KYC bucket access failed: ${listError.message}` : 
        `✅ KYC bucket accessible`;
    } catch (error: any) {
      results.kycAccess = `❌ KYC access exception: ${error.message}`;
    }
    
    // 5. Test upload capability
    console.log('\n5. Testing upload capability...');
    try {
      const testFileName = `diagnostic-test-${Date.now()}.txt`;
      const testContent = 'Diagnostic test file content';
      const testFilePath = `diagnostic/${testFileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(testFilePath, testContent, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'text/plain'
        });
      
      results.uploadTest = uploadError ? 
        `❌ Upload failed: ${uploadError.message}` : 
        `✅ Upload successful: ${uploadData?.path}`;
        
      // Clean up test file
      if (uploadData) {
        await supabase.storage
          .from('kyc-documents')
          .remove([testFilePath]);
      }
    } catch (error: any) {
      results.uploadTest = `❌ Upload exception: ${error.message}`;
    }
    
    console.log('\n📋 Authentication Diagnostics Results:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    return results;
  } catch (error: any) {
    console.error('❌ Authentication diagnostics failed:', error);
    return { error: error.message };
  }
};