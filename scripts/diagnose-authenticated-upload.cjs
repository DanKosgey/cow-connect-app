const { createClient } = require('@supabase/supabase-js');

// Configuration for remote Supabase instance
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

console.log('🔍 Diagnosing Authenticated Upload...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseAuthenticatedUpload() {
  try {
    console.log('\n1. Testing unauthenticated upload (should fail)...');
    
    // Test upload without authentication
    const testFileName = `unauth-test-${Date.now()}.txt`;
    const testContent = 'Test file for unauthenticated upload';
    const testFilePath = `unauth-test/${testFileName}`;
    
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
      
      // Clean up test file
      await supabase.storage
        .from('kyc-documents')
        .remove([testFilePath]);
    }
    
    console.log('\n2. To test authenticated upload, you need to sign in first.');
    console.log('   This requires valid user credentials and is typically done in the browser.');
    console.log('   The web app should handle authentication through the AuthContext.');
    
    console.log('\n3. Checking if we can at least list the bucket contents...');
    
    // Test listing files (this might work with public buckets)
    const { data: objects, error: listError } = await supabase.storage
      .from('kyc-documents')
      .list('', { limit: 5 });
    
    if (listError) {
      console.log('   ⚠️  Unable to list bucket contents:', listError.message);
    } else {
      console.log(`   ✅ Successfully listed ${objects.length} objects in bucket`);
      objects.forEach(obj => {
        console.log(`      - ${obj.name}`);
      });
    }
    
    console.log('\n🎉 Authenticated upload diagnosis completed!');
    console.log('\n📋 Summary:');
    console.log('   • Unauthenticated uploads should fail (RLS policy)');
    console.log('   • Authenticated users should be able to upload to their own folders');
    console.log('   • The web app must ensure users are signed in before uploading');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during diagnosis:', error.message);
    return false;
  }
}

// Run the diagnosis
diagnoseAuthenticatedUpload()
  .then(success => {
    if (success) {
      console.log('\n✅ Authenticated upload diagnosis completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Authenticated upload diagnosis failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Diagnosis failed with exception:', error);
    process.exit(1);
  });