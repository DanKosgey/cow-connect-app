// Test script for collection-photos bucket
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

async function testCollectionPhotosBucket() {
  console.log('🧪 Testing collection-photos bucket...\n');

  try {
    // 1. Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('⚠️  Not authenticated. Some tests may fail.');
    } else {
      console.log('✅ User authenticated:', user?.email || user?.id);
    }

    // 2. List all buckets
    console.log('\n1. Listing all storage buckets...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('❌ Failed to list buckets:', bucketError.message);
      return;
    }

    const collectionPhotosBucket = buckets.find(b => b.name === 'collection-photos');
    if (collectionPhotosBucket) {
      console.log('✅ collection-photos bucket found');
    } else {
      console.log('❌ collection-photos bucket not found');
      console.log('Available buckets:', buckets.map(b => b.name));
      return;
    }

    // 3. Test upload with a small test file
    console.log('\n2. Testing file upload...');
    const testFileName = `test-photo-${Date.now()}.txt`;
    const testContent = 'Test photo upload';
    
    const { error: uploadError } = await supabase.storage
      .from('collection-photos')
      .upload(testFileName, new Blob([testContent]), {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return;
    }
    console.log('✅ Upload successful');

    // 4. Test public URL generation
    console.log('\n3. Testing public URL generation...');
    const { data: urlData } = supabase.storage
      .from('collection-photos')
      .getPublicUrl(testFileName);

    if (urlData?.publicUrl) {
      console.log('✅ Public URL generated:', urlData.publicUrl);
    } else {
      console.log('❌ Failed to generate public URL');
      return;
    }

    // 5. Clean up test file
    console.log('\n4. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('collection-photos')
      .remove([testFileName]);

    if (deleteError) {
      console.log('⚠️  Failed to clean up test file:', deleteError.message);
    } else {
      console.log('✅ Test file cleaned up');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('The collection-photos bucket is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error.message);
  }
}

// Run the test
testCollectionPhotosBucket();