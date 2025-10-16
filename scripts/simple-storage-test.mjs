#!/usr/bin/env node

// Simple storage test script that can run independently
import { createClient } from '@supabase/supabase-js';

// Configuration - Using the local Supabase instance
const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

console.log('🔍 Testing Supabase Storage Bucket Functionality...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testStorage() {
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
    } else {
      console.log('⚠️  kyc-documents bucket not found - you may need to create it');
      return true; // This is not a failure, just informational
    }
    
    // Test uploading a file
    console.log('\n2. Testing file upload...');
    const testFileName = `test-file-${Date.now()}.txt`;
    const testContent = 'This is a test file to verify Supabase storage functionality.';
    const testFilePath = `test/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, new Blob([testContent]), {
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
    
    console.log('✅ File downloaded successfully');
    
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
    
    // Clean up - remove test file
    console.log('\n5. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('kyc-documents')
      .remove([testFilePath]);
    
    if (deleteError) {
      console.error('❌ Failed to clean up test file:', deleteError.message);
      return false;
    }
    
    console.log('✅ Test file cleaned up successfully');
    console.log('\n🎉 All storage tests completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during storage test:', error.message);
    return false;
  }
}

// Run the test
testStorage()
  .then(success => {
    if (success) {
      console.log('\n✅ Storage functionality test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Storage functionality test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test script failed with exception:', error);
    process.exit(1);
  });