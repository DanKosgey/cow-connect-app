const { createClient } = require('@supabase/supabase-js');

// Configuration for remote Supabase instance
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU';

console.log('🔍 Testing KYC Document Storage Functionality...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testKYCStorage() {
  try {
    console.log('\n1. Testing connection by listing buckets...');
    
    // List all buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError.message);
      return false;
    }
    
    console.log(`✅ Successfully connected! Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.id})`);
    });
    
    // Look for kyc-documents bucket
    const kycBucket = buckets.find(bucket => bucket.name === 'kyc-documents');
    if (kycBucket) {
      console.log('✅ kyc-documents bucket exists');
      console.log('   Bucket details:', {
        id: kycBucket.id,
        name: kycBucket.name,
        public: kycBucket.public
      });
    } else {
      console.log('❌ kyc-documents bucket not found');
      console.log('   You need to create the kyc-documents bucket in Supabase Storage');
      return false;
    }
    
    // Test uploading a file
    console.log('\n2. Testing file upload...');
    const testFileName = `test-file-${Date.now()}.txt`;
    const testContent = 'This is a test file to verify KYC document storage functionality.';
    const testFilePath = `test/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, testContent, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return false;
    }
    
    console.log(`✅ File uploaded successfully: ${uploadData.path}`);
    
    // Test downloading the file
    console.log('\n3. Testing file download...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('kyc-documents')
      .download(testFilePath);
    
    if (downloadError) {
      console.error('❌ Download failed:', downloadError.message);
      return false;
    }
    
    // Verify content
    const downloadedContent = await fileData.text();
    if (downloadedContent === testContent) {
      console.log('✅ File content matches');
    } else {
      console.error('❌ File content does not match');
      return false;
    }
    
    // Test public URL generation
    console.log('\n4. Testing public URL generation...');
    const { data: urlData } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(testFilePath);
    
    if (urlData?.publicUrl) {
      console.log(`✅ Public URL generated: ${urlData.publicUrl}`);
    } else {
      console.log('⚠️  Could not generate public URL (bucket may not be public)');
    }
    
    // Test listing files
    console.log('\n5. Testing file listing...');
    const { data: objects, error: listError } = await supabase.storage
      .from('kyc-documents')
      .list('test', { limit: 10 });
    
    if (listError) {
      console.error('❌ File listing failed:', listError.message);
      return false;
    }
    
    console.log(`✅ File listing successful. Found ${objects.length} objects in test directory`);
    objects.forEach(obj => {
      console.log(`   - ${obj.name} (${obj.id})`);
    });
    
    // Clean up - remove test file
    console.log('\n6. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('kyc-documents')
      .remove([testFilePath]);
    
    if (deleteError) {
      console.error('❌ Failed to clean up test file:', deleteError.message);
      return false;
    }
    
    console.log('✅ Test file cleaned up successfully');
    console.log('\n🎉 All KYC storage tests completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during storage test:', error.message);
    return false;
  }
}

// Run the test
testKYCStorage()
  .then(success => {
    if (success) {
      console.log('\n✅ KYC storage functionality test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ KYC storage functionality test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test script failed with exception:', error);
    process.exit(1);
  });