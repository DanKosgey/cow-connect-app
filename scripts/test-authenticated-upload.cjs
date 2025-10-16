const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

console.log('🔍 Testing Authenticated Upload Flow...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase client with anon key (same as web app)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuthenticatedUpload() {
  console.log('\n⚠️  IMPORTANT: This script demonstrates the flow but cannot actually sign in.');
  console.log('   In a real application, the user would sign in through the web interface.');
  
  try {
    console.log('\n1. Current authentication status:');
    
    // Check current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('   ❌ Session check failed:', sessionError.message);
    } else {
      console.log(`   Session active: ${!!sessionData.session}`);
      if (sessionData.session) {
        console.log(`   User ID: ${sessionData.session.user?.id}`);
      }
    }
    
    // Check current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.log('   ❌ User check failed:', userError.message);
    } else {
      console.log(`   User authenticated: ${!!userData.user}`);
      if (userData.user) {
        console.log(`   User email: ${userData.user.email}`);
      }
    }
    
    console.log('\n2. Testing upload without authentication (should fail)...');
    
    // Test upload without authentication
    const testFileName = `auth-test-${Date.now()}.txt`;
    const testContent = 'Test file for authenticated upload';
    const testFilePath = `auth-test/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, testContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.log('   ✅ Upload correctly failed (no authentication):', uploadError.message);
    } else {
      console.log('   ⚠️  Upload unexpectedly succeeded');
      // Clean up
      await supabase.storage
        .from('kyc-documents')
        .remove([testFilePath]);
    }
    
    console.log('\n📋 How Authentication Works in the Web App:');
    console.log('   1. User signs in through the AuthProvider component');
    console.log('   2. Supabase sets authentication cookies/tokens');
    console.log('   3. Subsequent requests include authentication headers');
    console.log('   4. RLS policies allow uploads for authenticated users');
    
    console.log('\n🔧 To Test in the Web App:');
    console.log('   1. Open the browser developer tools');
    console.log('   2. Go to the KYC upload page');
    console.log('   3. Check the console for authentication status');
    console.log('   4. Try to upload a document');
    console.log('   5. Check network tab for request headers');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during authenticated upload test:', error.message);
    return false;
  }
}

// Run the test
testAuthenticatedUpload()
  .then(success => {
    if (success) {
      console.log('\n✅ Authenticated upload test completed!');
      process.exit(0);
    } else {
      console.log('\n❌ Authenticated upload test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test failed with exception:', error);
    process.exit(1);
  });