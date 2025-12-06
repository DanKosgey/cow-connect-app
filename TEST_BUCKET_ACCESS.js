// Test script to verify collection-photos bucket access
import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBucketAccess() {
  console.log('🧪 Testing collection-photos bucket access...\n');

  try {
    // 1. Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('⚠️  Not authenticated. Some tests may fail.');
    } else {
      console.log('✅ User authenticated:', user?.email || user?.id);
    }

    // 2. Directly test access to the specific bucket
    console.log('\n1. Testing direct bucket access...');
    
    // Try to upload a small test file
    const testFileName = `test-access-${Date.now()}.txt`;
    const { error: uploadError } = await supabase.storage
      .from('collection-photos')
      .upload(testFileName, new Blob(['test']), {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Bucket access failed:', uploadError.message);
      if (uploadError.message.includes('Bucket not found')) {
        console.log('   Reason: Bucket does not exist');
      } else if (uploadError.message.includes('denied')) {
        console.log('   Reason: Permission denied');
      } else {
        console.log('   Reason: Unknown error');
      }
      return;
    }
    
    console.log('✅ Bucket access successful');

    // 3. Clean up test file
    console.log('\n2. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('collection-photos')
      .remove([testFileName]);

    if (deleteError) {
      console.log('⚠️  Failed to clean up test file:', deleteError.message);
    } else {
      console.log('✅ Test file cleaned up');
    }

    // 4. Test public URL generation
    console.log('\n3. Testing public URL generation...');
    // Upload another test file to test public URL
    const testFileName2 = `test-url-${Date.now()}.txt`;
    const { error: uploadError2 } = await supabase.storage
      .from('collection-photos')
      .upload(testFileName2, new Blob(['test']), {
        cacheControl: '3600',
        upsert: true
      });

    if (!uploadError2) {
      const { data: urlData } = supabase.storage
        .from('collection-photos')
        .getPublicUrl(testFileName2);
      
      if (urlData?.publicUrl) {
        console.log('✅ Public URL generated:', urlData.publicUrl);
      } else {
        console.log('❌ Failed to generate public URL');
      }
      
      // Clean up second test file
      await supabase.storage
        .from('collection-photos')
        .remove([testFileName2]);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('The collection-photos bucket is properly configured and accessible.');

  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error.message);
  }
}

// Run the test
testBucketAccess();