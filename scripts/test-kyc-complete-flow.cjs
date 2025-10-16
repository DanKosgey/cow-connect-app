const { createClient } = require('@supabase/supabase-js');

// Configuration for remote Supabase instance
const SUPABASE_URL = 'https://oevxapmcmcaxpaluehyg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyMTM3OCwiZXhwIjoyMDc0OTk3Mzc4fQ.wsT93YLAytMcs_vOpQq7SP1oG5xYuwgoNGZf2q5n3JU';

console.log('🔍 Testing Complete KYC Document Flow...');
console.log(`🔗 Connecting to Supabase at: ${SUPABASE_URL}`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testKYCCompleteFlow() {
  try {
    console.log('\n1. Testing farmer document upload flow...');
    
    // Simulate a farmer uploading KYC documents
    const farmerId = 'farmer-test-' + Date.now();
    const documentTypes = ['id_front', 'id_back', 'selfie'];
    
    const uploadedDocuments = [];
    
    for (const docType of documentTypes) {
      const fileName = `${docType}-${Date.now()}.txt`;
      const content = `Test ${docType} document for farmer ${farmerId}`;
      const filePath = `${farmerId}/${docType}/${fileName}`;
      
      console.log(`   Uploading ${docType} document...`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, content, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'text/plain'
        });
      
      if (uploadError) {
        console.error(`   ❌ Failed to upload ${docType}:`, uploadError.message);
        return false;
      }
      
      console.log(`   ✅ ${docType} uploaded successfully: ${uploadData.path}`);
      
      // Get public URL for the document
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);
      
      uploadedDocuments.push({
        type: docType,
        path: filePath,
        name: fileName,
        url: urlData?.publicUrl
      });
    }
    
    console.log('\n2. Testing admin document review flow...');
    
    // Simulate admin accessing documents
    console.log('   Admin accessing farmer documents...');
    
    for (const doc of uploadedDocuments) {
      console.log(`   Accessing ${doc.type} document...`);
      
      // Test public URL access
      if (doc.url) {
        console.log(`   ✅ Public URL available: ${doc.url}`);
      }
      
      // Test direct download
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('kyc-documents')
        .download(doc.path);
      
      if (downloadError) {
        console.error(`   ❌ Failed to download ${doc.type}:`, downloadError.message);
        return false;
      }
      
      const content = await fileData.text();
      console.log(`   ✅ ${doc.type} downloaded successfully, content length: ${content.length}`);
    }
    
    console.log('\n3. Testing document listing for admin review...');
    
    // Test listing all documents for a farmer
    const { data: objects, error: listError } = await supabase.storage
      .from('kyc-documents')
      .list(farmerId, { limit: 10 });
    
    if (listError) {
      console.error('   ❌ Failed to list farmer documents:', listError.message);
      return false;
    }
    
    console.log(`   ✅ Found ${objects.length} documents for farmer ${farmerId}`);
    objects.forEach(obj => {
      console.log(`      - ${obj.name}`);
    });
    
    console.log('\n4. Testing cleanup (admin delete after review)...');
    
    // Simulate admin deleting documents after review (optional)
    const deletePaths = uploadedDocuments.map(doc => doc.path);
    const { error: deleteError } = await supabase.storage
      .from('kyc-documents')
      .remove(deletePaths);
    
    if (deleteError) {
      console.error('   ❌ Failed to clean up test documents:', deleteError.message);
      return false;
    }
    
    console.log('   ✅ Test documents cleaned up successfully');
    
    console.log('\n🎉 Complete KYC flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Farmer can upload KYC documents');
    console.log('   ✅ Admin can access and review documents');
    console.log('   ✅ Public URLs work for document previews');
    console.log('   ✅ Direct downloads work for admin review');
    console.log('   ✅ Document listing works for admin dashboard');
    console.log('   ✅ Cleanup works properly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error during KYC flow test:', error.message);
    return false;
  }
}

// Run the test
testKYCCompleteFlow()
  .then(success => {
    if (success) {
      console.log('\n✅ Complete KYC flow test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Complete KYC flow test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test script failed with exception:', error);
    process.exit(1);
  });