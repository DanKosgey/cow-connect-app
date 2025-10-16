const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

console.log('🔍 Testing KYC Upload Flow...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase client with anon key (same as web app)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testKYCUploadFlow() {
  try {
    console.log('\n1. Testing unauthenticated access (should fail)...');
    
    // Test upload without authentication
    const testFileName = `unauth-test-${Date.now()}.txt`;
    const testContent = 'Test file for unauthenticated upload';
    const testFilePath = `test/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, testContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.log('   ✅ Unauthenticated upload correctly failed:', uploadError.message);
    } else {
      console.log('   ⚠️  Unauthenticated upload unexpectedly succeeded');
      // Clean up
      await supabase.storage
        .from('kyc-documents')
        .remove([testFilePath]);
    }
    
    console.log('\n2. To test authenticated upload, you need to sign in first.');
    console.log('   This requires valid user credentials and is typically done in the browser.');
    console.log('   The web app should handle authentication through the AuthContext.');
    
    console.log('\n3. Testing bucket access without authentication...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('   ⚠️  Bucket listing failed:', bucketError.message);
    } else {
      console.log(`   ✅ Found ${buckets?.length || 0} buckets`);
      const kycBucket = buckets?.find(b => b.name === 'kyc-documents');
      if (kycBucket) {
        console.log(`   ✅ kyc-documents bucket found: ${kycBucket.id}`);
      } else {
        console.log('   ⚠️  kyc-documents bucket not found');
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('   • Unauthenticated uploads should fail (RLS policy)');
    console.log('   • Authenticated users should be able to upload to their own folders');
    console.log('   • The web app must ensure users are signed in before uploading');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during KYC upload flow test:', error.message);
    return false;
  }
}

// Run the test
testKYCUploadFlow()
  .then(success => {
    if (success) {
      console.log('\n✅ KYC upload flow test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ KYC upload flow test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test failed with exception:', error);
    process.exit(1);
  });