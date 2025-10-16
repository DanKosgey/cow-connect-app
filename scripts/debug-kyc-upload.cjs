const { createClient } = require('@supabase/supabase-js');

// Configuration for remote Supabase instance - using SERVICE KEY for full access
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU';

console.log('🔍 Debugging KYC Document Upload...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase client with service key for full access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugKYCUpload() {
  try {
    console.log('\n1. Testing connection...');
    
    // Test listing buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Bucket listing failed:', bucketError.message);
      console.error('Error details:', bucketError);
      return false;
    }
    
    console.log('Found buckets:');
    if (buckets && buckets.length > 0) {
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.id}) - public: ${bucket.public}`);
      });
    } else {
      console.log('   No buckets found');
    }
    
    // Look for any bucket containing 'kyc'
    const kycBuckets = buckets.filter(bucket => bucket.name.toLowerCase().includes('kyc'));
    if (kycBuckets.length > 0) {
      console.log('\nKYC-related buckets found:');
      kycBuckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.id}) - public: ${bucket.public}`);
      });
    }
    
    const kycBucket = buckets.find(bucket => bucket.name === 'kyc-documents');
    if (kycBucket) {
      console.log('\n✅ kyc-documents bucket exists');
    } else {
      console.log('\n❌ kyc-documents bucket not found');
      return false;
    }
    
    // Test uploading a file with the same approach as the web app
    console.log('\n2. Testing file upload with File-like object...');
    const testFileName = `debug-file-${Date.now()}.txt`;
    const testContent = 'This is a debug file to test KYC document upload from web app.';
    const testFilePath = `debug/${testFileName}`;
    
    // Create a Blob (similar to what File is in the browser)
    const fileBlob = new Blob([testContent], { type: 'text/plain' });
    
    // Add name property to mimic File object
    fileBlob.name = testFileName;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, fileBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      console.log('Error details:', uploadError);
      return false;
    }
    
    console.log(`✅ File uploaded successfully: ${uploadData.path}`);
    
    // Clean up - remove test file
    console.log('\n3. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('kyc-documents')
      .remove([testFilePath]);
    
    if (deleteError) {
      console.error('❌ Failed to clean up test file:', deleteError.message);
      return false;
    }
    
    console.log('✅ Test file cleaned up successfully');
    console.log('\n🎉 Debug test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during debug test:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Run the debug test
debugKYCUpload()
  .then(success => {
    if (success) {
      console.log('\n✅ Debug test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Debug test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Debug test failed with exception:', error);
    process.exit(1);
  });