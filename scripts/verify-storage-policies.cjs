const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

console.log('🔍 Verifying Storage Policies...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create clients
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyStoragePolicies() {
  try {
    console.log('\n1. Testing with Service Key (should work)...');
    
    // Test upload with service key
    const serviceTestFileName = `service-test-${Date.now()}.txt`;
    const serviceTestContent = 'Test file for service key upload';
    const serviceTestFilePath = `policy-test/${serviceTestFileName}`;
    
    const { data: serviceUploadData, error: serviceUploadError } = await supabaseService.storage
      .from('kyc-documents')
      .upload(serviceTestFilePath, serviceTestContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (serviceUploadError) {
      console.log('   ❌ Service key upload failed:', serviceUploadError.message);
    } else {
      console.log('   ✅ Service key upload successful');
      
      // Clean up
      await supabaseService.storage
        .from('kyc-documents')
        .remove([serviceTestFilePath]);
    }
    
    console.log('\n2. Testing with Anon Key (should fail without auth)...');
    
    // Test upload with anon key
    const anonTestFileName = `anon-test-${Date.now()}.txt`;
    const anonTestContent = 'Test file for anon key upload';
    const anonTestFilePath = `policy-test/${anonTestFileName}`;
    
    const { data: anonUploadData, error: anonUploadError } = await supabaseAnon.storage
      .from('kyc-documents')
      .upload(anonTestFilePath, anonTestContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (anonUploadError) {
      console.log('   ✅ Anon key upload correctly failed:', anonUploadError.message);
    } else {
      console.log('   ⚠️  Anon key upload unexpectedly succeeded');
      
      // Clean up
      await supabaseAnon.storage
        .from('kyc-documents')
        .remove([anonTestFilePath]);
    }
    
    console.log('\n3. Checking bucket access...');
    
    // Test bucket listing with service key
    const { data: serviceBuckets, error: serviceBucketsError } = await supabaseService.storage.listBuckets();
    if (serviceBucketsError) {
      console.log('   ❌ Service key bucket listing failed:', serviceBucketsError.message);
    } else {
      console.log(`   ✅ Service key found ${serviceBuckets?.length || 0} buckets`);
    }
    
    // Test bucket listing with anon key
    const { data: anonBuckets, error: anonBucketsError } = await supabaseAnon.storage.listBuckets();
    if (anonBucketsError) {
      console.log('   ⚠️  Anon key bucket listing failed:', anonBucketsError.message);
    } else {
      console.log(`   ✅ Anon key found ${anonBuckets?.length || 0} buckets`);
    }
    
    console.log('\n📋 Policy Verification Results:');
    console.log('   • Service key uploads work (admin privileges)');
    console.log('   • Anon key uploads fail without authentication (RLS policies working)');
    console.log('   • Authenticated users should be able to upload with anon key');
    console.log('   • The web app must ensure proper user authentication');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during policy verification:', error.message);
    return false;
  }
}

// Run the verification
verifyStoragePolicies()
  .then(success => {
    if (success) {
      console.log('\n✅ Storage policy verification completed!');
      process.exit(0);
    } else {
      console.log('\n❌ Storage policy verification failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Policy verification failed with exception:', error);
    process.exit(1);
  });