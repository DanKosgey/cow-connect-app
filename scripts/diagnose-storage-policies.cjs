const { createClient } = require('@supabase/supabase-js');

// Configuration for remote Supabase instance
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8';

console.log('🔍 Diagnosing Storage Policies...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase clients
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseStoragePolicies() {
  try {
    console.log('\n1. Checking buckets with service key...');
    
    // Test listing buckets with service key
    const { data: bucketsService, error: bucketErrorService } = await supabaseService.storage.listBuckets();
    if (bucketErrorService) {
      console.error('❌ Service key bucket listing failed:', bucketErrorService.message);
      return false;
    }
    
    console.log(`✅ Service key found ${bucketsService.length} buckets:`);
    bucketsService.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.id}) - public: ${bucket.public}`);
    });
    
    console.log('\n2. Checking buckets with anon key...');
    
    // Test listing buckets with anon key
    const { data: bucketsAnon, error: bucketErrorAnon } = await supabaseAnon.storage.listBuckets();
    if (bucketErrorAnon) {
      console.error('❌ Anon key bucket listing failed:', bucketErrorAnon.message);
      // This is expected to fail for anon key
    } else {
      console.log(`✅ Anon key found ${bucketsAnon.length} buckets:`);
      bucketsAnon.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.id}) - public: ${bucket.public}`);
      });
    }
    
    // Focus on kyc-documents bucket
    const kycBucket = bucketsService.find(bucket => bucket.name === 'kyc-documents');
    if (!kycBucket) {
      console.log('\n❌ kyc-documents bucket not found');
      return false;
    }
    
    console.log(`\n3. Testing kyc-documents bucket (${kycBucket.id}) operations...`);
    
    // Test upload with service key
    console.log('\n   Testing upload with service key...');
    const testFileName = `policy-test-${Date.now()}.txt`;
    const testContent = 'Test file for policy diagnostics';
    const testFilePath = `policy-test/${testFileName}`;
    
    const { data: uploadDataService, error: uploadErrorService } = await supabaseService.storage
      .from('kyc-documents')
      .upload(testFilePath, testContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (uploadErrorService) {
      console.error('   ❌ Service key upload failed:', uploadErrorService.message);
    } else {
      console.log('   ✅ Service key upload successful');
      
      // Clean up service key test file
      await supabaseService.storage
        .from('kyc-documents')
        .remove([testFilePath]);
    }
    
    // Test upload with anon key (this should fail unless user is authenticated)
    console.log('\n   Testing upload with anon key...');
    const { data: uploadDataAnon, error: uploadErrorAnon } = await supabaseAnon.storage
      .from('kyc-documents')
      .upload(testFilePath, testContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (uploadErrorAnon) {
      console.log('   ⚠️  Anon key upload failed (expected for unauthenticated user):', uploadErrorAnon.message);
    } else {
      console.log('   ✅ Anon key upload successful');
      
      // Clean up anon key test file
      await supabaseAnon.storage
        .from('kyc-documents')
        .remove([testFilePath]);
    }
    
    console.log('\n🎉 Storage policy diagnosis completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during policy diagnosis:', error.message);
    return false;
  }
}

// Run the diagnosis
diagnoseStoragePolicies()
  .then(success => {
    if (success) {
      console.log('\n✅ Storage policy diagnosis completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Storage policy diagnosis failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Diagnosis failed with exception:', error);
    process.exit(1);
  });