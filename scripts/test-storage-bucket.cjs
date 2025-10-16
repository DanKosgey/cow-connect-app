#!/usr/bin/env node

// Test script to verify Supabase storage bucket functionality
// This script will:
// 1. Test if the kyc-documents bucket exists
// 2. Upload a test file to the bucket
// 3. Retrieve the file from the bucket
// 4. Generate a public URL for the file
// 5. Clean up the test file

require('dotenv').config(); // Load environment variables
const { createClient } = require('@supabase/supabase-js');

// Configuration - Using environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please ensure you have the following environment variables set:');
  console.error('- VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

async function testStorageBucket() {
  console.log('🔍 Testing Supabase Storage Bucket Functionality...\n');
  
  try {
    // 1. List all buckets to check if kyc-documents exists
    console.log('1. Checking available buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError.message);
      return false;
    }
    
    console.log(`   Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.id})`);
    });
    
    const kycBucket = buckets.find(bucket => bucket.name === 'kyc-documents');
    if (!kycBucket) {
      console.log('❌ kyc-documents bucket not found!');
      return false;
    }
    
    console.log('✅ kyc-documents bucket exists\n');
    
    // 2. Upload a test file
    console.log('2. Uploading test file...');
    const testFileName = `test-file-${Date.now()}.txt`;
    const testContent = 'This is a test file to verify Supabase storage functionality.';
    const testFilePath = `test/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(testFilePath, Buffer.from(testContent), {
        cacheControl: '3600',
        upsert: true,
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return false;
    }
    
    console.log(`✅ File uploaded successfully: ${uploadData.path}\n`);
    
    // 3. Retrieve the file
    console.log('3. Retrieving test file...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('kyc-documents')
      .download(testFilePath);
    
    if (downloadError) {
      console.error('❌ Download failed:', downloadError.message);
      return false;
    }
    
    // Convert Blob to text to verify content
    const downloadedContent = await fileData.text();
    if (downloadedContent === testContent) {
      console.log('✅ File retrieved successfully and content matches\n');
    } else {
      console.log('❌ File content does not match!');
      console.log('Expected:', testContent);
      console.log('Received:', downloadedContent);
      return false;
    }
    
    // 4. Generate public URL
    console.log('4. Generating public URL...');
    const { data: urlData } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(testFilePath);
    
    if (urlData && urlData.publicUrl) {
      console.log(`✅ Public URL generated: ${urlData.publicUrl}\n`);
    } else {
      console.log('⚠️  Could not generate public URL (may not be public bucket)\n');
    }
    
    // 5. Clean up - remove test file
    console.log('5. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('kyc-documents')
      .remove([testFilePath]);
    
    if (deleteError) {
      console.error('❌ Failed to clean up test file:', deleteError.message);
      return false;
    }
    
    console.log('✅ Test file cleaned up successfully\n');
    
    console.log('🎉 All storage tests passed! Bucket is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during storage test:', error.message);
    return false;
  }
}

// Run the test
// Run the test when this script is executed directly
const runTest = async () => {
  try {
    const success = await testStorageBucket();
    if (success) {
      console.log('✅ Storage bucket test completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Storage bucket test failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test script failed with exception:', error);
    process.exit(1);
  }
};

// Check if this script is being run directly
if (require.main === module) {
  runTest();
}

module.exports = { testStorageBucket };